"""
Loss-event and exposure base for insurance-vs-fund risk analysis.

Builds analysis.lease_exposure (bike-years per lease, insured flag) and
analysis.loss_events (siniestro-type events with severity where available)
in Postgres, then exports aggregated, non-identifying CSVs to ../data/.

Data reality (documented, not hidden): the source system has no dedicated
"claim type" field. Robo/hurto/choque only show up as free text in
leases_observations and recovered_recovered.observaciones, with very few
literal hits (robo=3, hurto=1 across 4,651 contracts) -- too sparse to
report a per-peril rate. What IS reliably structured is:
  - status_records_statusrecord.status IN ('SINISTER','DAMAGED','INDEMNIFIED')
    -- explicit collection/lease-status codes for a loss event (high confidence)
  - status_records_statusrecord.status = 'FISCALIA' -- legal action, usually
    filed after a disputed loss/fraud (lower confidence, kept as a separate
    category, not merged into "siniestro")
  - recovered_recovered, joined to leases via license plate, gives
    monto_invertido / precio_venta -- real severity data, but this table
    mixes repossession-for-nonpayment with actual damage/theft recoveries.
    We only use it to attach severity to leases that ALSO have a high-
    confidence loss-event status; we do not treat "recovered" alone as a
    siniestro (that would conflate credit risk with insurance risk).
"""
import os

import numpy as np
import pandas as pd
from sqlalchemy import create_engine, text

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql:///arranca_moros")
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
NOW = pd.Timestamp("2026-07-22", tz="UTC")  # max created_at observed in the dump

# terminal lease statuses -> exposure stops accruing once a lease reaches these
TERMINAL_STATUSES = {"FINISHED", "FINISHED_PAYMENT_AGREEMENT", "CANCELED", "ANNULLED", "DONE", "REJECTED"}

HIGH_CONF_STATUSES = ["SINISTER", "DAMAGED", "INDEMNIFIED"]
LOW_CONF_STATUSES = ["FISCALIA"]
KEYWORD_PATTERNS = ["robo", "hurto", "choque", "accidente", "chocad", "siniestr", "perdida total", "pérdida total"]


def main() -> None:
    engine = create_engine(DATABASE_URL)

    # ---- 1. Base lease universe (motos only) with product/branch attrs ----
    leases = pd.read_sql(text("""
        SELECT
            l.id AS lease_id, l.status AS lease_status, l.created_at, l.delivered_date,
            l.location, l.product_id, l.insurance_company, l.removed_seguro,
            l.full_product_price, l.license_plate,
            p.name AS product_name, p.brand AS brand_raw, p.category_id, p.cash_price AS product_cash_price
        FROM raw.leases_lease l
        LEFT JOIN raw.products_product p ON p.id = l.product_id
        WHERE p.category_id IN ('1', '13')
    """), engine)

    for col in ["created_at", "delivered_date"]:
        leases[col] = pd.to_datetime(leases[col], utc=True, errors="coerce")

    # brand/model normalization (mirrors 03_build_lease_features.sql logic, simplified)
    leases["brand_norm"] = leases["brand_raw"].str.upper().str.strip()
    leases["brand_norm"] = leases["brand_norm"].replace({
        "EMPIRE": "EMPIRE KEEWAY", "EMPIRE KEEWAY": "EMPIRE KEEWAY", "KEEWAY": "EMPIRE KEEWAY",
        "INCOME": "EMPIRE KEEWAY",
    })

    # exposure start = delivered_date (fallback created_at); price outlier guard (>$50k excluded from $ metrics only)
    leases["exposure_start"] = leases["delivered_date"].fillna(leases["created_at"])
    price = pd.to_numeric(leases["full_product_price"], errors="coerce")
    leases["price_clean"] = price.where((price > 0) & (price <= 50000))

    # ---- 2. Exposure end: last status_records event for the lease, else now ----
    last_status = pd.read_sql(text("""
        SELECT lease_id, max(created_at) AS last_event
        FROM raw.status_records_statusrecord
        GROUP BY lease_id
    """), engine)
    last_status["last_event"] = pd.to_datetime(last_status["last_event"], utc=True)
    leases = leases.merge(last_status, on="lease_id", how="left")

    is_terminal = leases["lease_status"].isin(TERMINAL_STATUSES)
    leases["exposure_end"] = np.where(
        is_terminal & leases["last_event"].notna(),
        leases["last_event"],
        NOW,
    )
    leases["exposure_end"] = pd.to_datetime(leases["exposure_end"], utc=True)
    leases["exposure_end"] = leases[["exposure_end"]].apply(lambda r: min(r["exposure_end"], NOW), axis=1)

    leases["bike_years"] = (
        (leases["exposure_end"] - leases["exposure_start"]).dt.total_seconds() / (365.25 * 86400)
    ).clip(lower=0)
    leases = leases[leases["exposure_start"].notna() & (leases["bike_years"] >= 0)].copy()

    leases["insured"] = leases["insurance_company"].fillna("").str.strip().ne("")

    # ---- 3. High/low confidence status-based loss events ----
    events = pd.read_sql(text("""
        SELECT id AS event_id, lease_id, status, created_at
        FROM raw.status_records_statusrecord
        WHERE status IN ('SINISTER','DAMAGED','INDEMNIFIED','FISCALIA')
    """), engine)
    events["created_at"] = pd.to_datetime(events["created_at"], utc=True)
    events["confidence"] = np.where(events["status"].isin(HIGH_CONF_STATUSES), "high", "low")
    events["event_type"] = events["status"]

    # ---- 4. Keyword flags from free text (very low confidence, informational only) ----
    obs = pd.read_sql(text("""
        SELECT lease_id, title, observation, created_at
        FROM raw.leases_observations
    """), engine)
    obs["created_at"] = pd.to_datetime(obs["created_at"], utc=True)
    text_blob = (obs["title"].fillna("") + " " + obs["observation"].fillna("")).str.lower()
    kw_mask = pd.Series(False, index=obs.index)
    for kw in KEYWORD_PATTERNS:
        kw_mask |= text_blob.str.contains(kw, na=False)
    kw_events = obs[kw_mask].copy()
    kw_events["event_type"] = "KEYWORD_MENTION"
    kw_events["confidence"] = "very_low"
    kw_events["event_id"] = "obs_" + kw_events.index.astype(str)
    kw_events = kw_events[["event_id", "lease_id", "event_type", "created_at", "confidence"]]

    events = pd.concat([
        events[["event_id", "lease_id", "event_type", "created_at", "confidence"]],
        kw_events
    ], ignore_index=True)

    # ---- 5. Severity via recovered_recovered matched on license plate ----
    recovered = pd.read_sql(text("""
        SELECT placa, status AS recovered_status,
               NULLIF(monto_invertido,'')::numeric AS monto_invertido,
               NULLIF(precio_venta,'')::numeric AS precio_venta,
               NULLIF(valoracion,'')::numeric AS valoracion
        FROM raw.recovered_recovered
    """), engine)

    events = events.merge(leases[["lease_id", "license_plate", "price_clean", "location", "brand_norm",
                                   "product_name", "insured"]], on="lease_id", how="left")
    events = events.merge(recovered, left_on="license_plate", right_on="placa", how="left")

    # estimated economic loss: original price minus what was recovered on resale (only where matched)
    events["estimated_loss"] = np.where(
        events["precio_venta"].notna() & events["price_clean"].notna(),
        (events["price_clean"] - events["precio_venta"]).clip(lower=0),
        np.nan
    )

    # ---- 6. Write to DB (record-level stays local; only aggregates exported) ----
    with engine.begin() as conn:
        leases.drop(columns=["license_plate"]).to_sql(
            "lease_exposure", conn, schema="analysis", if_exists="replace", index=False)
        events.drop(columns=["license_plate", "placa"]).to_sql(
            "loss_events", conn, schema="analysis", if_exists="replace", index=False)

    # ---- 7. Aggregated, anonymized exports ----
    high_conf = events[events["confidence"] == "high"]

    total_bike_years = leases["bike_years"].sum()
    n_high = len(high_conf)
    print(f"Total exposure: {total_bike_years:.0f} bike-years across {len(leases)} moto leases")
    print(f"High-confidence loss events (SINISTER/DAMAGED/INDEMNIFIED): {n_high}")
    print(f"  -> frequency: {n_high / total_bike_years * 100:.2f} events per 100 bike-years")
    print(f"Low-confidence (FISCALIA): {len(events[events['confidence']=='low'])}")
    print(f"Very-low-confidence keyword mentions: {len(events[events['confidence']=='very_low'])}")
    print(f"High-conf events with matched severity data: {high_conf['estimated_loss'].notna().sum()}")

    # by branch
    branch_exp = leases.groupby("location", observed=True)["bike_years"].sum().rename("bike_years")
    branch_ev = high_conf.groupby("location", observed=True).size().rename("n_events")
    branch = pd.concat([branch_exp, branch_ev], axis=1).fillna(0)
    branch["freq_per_100_bikeyears"] = (branch["n_events"] / branch["bike_years"] * 100).round(2)
    branch = branch[branch["bike_years"] >= 5].sort_values("freq_per_100_bikeyears", ascending=False)
    branch.round(2).to_csv(os.path.join(DATA_DIR, "risk_by_branch.csv"))

    # by model (brand_norm + product_name)
    model_exp = leases.groupby(["brand_norm", "product_name"], observed=True)["bike_years"].sum().rename("bike_years")
    model_ev = high_conf.groupby(["brand_norm", "product_name"], observed=True).size().rename("n_events")
    model = pd.concat([model_exp, model_ev], axis=1).fillna(0)
    model["freq_per_100_bikeyears"] = (model["n_events"] / model["bike_years"] * 100).round(2)
    model = model[model["bike_years"] >= 5].sort_values("freq_per_100_bikeyears", ascending=False)
    model.round(2).to_csv(os.path.join(DATA_DIR, "risk_by_model.csv"))

    # insured vs not
    ins_exp = leases.groupby("insured", observed=True)["bike_years"].sum().rename("bike_years")
    ins_n = leases.groupby("insured", observed=True).size().rename("n_leases")
    ins_ev = high_conf.groupby("insured", observed=True).size().rename("n_events")
    ins = pd.concat([ins_exp, ins_n, ins_ev], axis=1).fillna(0)
    ins["freq_per_100_bikeyears"] = (ins["n_events"] / ins["bike_years"] * 100).round(2)
    ins.round(2).to_csv(os.path.join(DATA_DIR, "risk_insured_vs_not.csv"))

    # severity distribution (matched events only)
    sev = high_conf[high_conf["estimated_loss"].notna()][["estimated_loss"]].copy()
    sev.round(2).to_csv(os.path.join(DATA_DIR, "loss_severity_sample.csv"), index=False)

    # event type breakdown overall
    type_summary = events.groupby(["event_type", "confidence"], observed=True).size().rename("n").reset_index()
    type_summary.to_csv(os.path.join(DATA_DIR, "event_type_summary.csv"), index=False)

    # exposure summary stats (for the report header)
    summary = pd.DataFrame([{
        "total_leases": len(leases),
        "total_bike_years": round(total_bike_years, 1),
        "n_high_conf_events": n_high,
        "freq_per_100_bikeyears": round(n_high / total_bike_years * 100, 3),
        "n_insured_leases": int(leases["insured"].sum()),
        "n_uninsured_leases": int((~leases["insured"]).sum()),
        "avg_price": round(leases["price_clean"].mean(), 2),
        "total_fleet_value": round(leases["price_clean"].sum(), 2),
        "n_severity_matched": int(high_conf["estimated_loss"].notna().sum()),
        "avg_severity_matched": round(sev["estimated_loss"].mean(), 2) if len(sev) else None,
        "median_severity_matched": round(sev["estimated_loss"].median(), 2) if len(sev) else None,
    }])
    summary.to_csv(os.path.join(DATA_DIR, "risk_summary.csv"), index=False)

    print("\nWrote risk_by_branch.csv, risk_by_model.csv, risk_insured_vs_not.csv, "
          f"loss_severity_sample.csv, event_type_summary.csv, risk_summary.csv -> {DATA_DIR}")
    print(f"\n{summary.to_string(index=False)}")


if __name__ == "__main__":
    main()
