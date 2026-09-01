"""
Payment-based delinquency (v2): reconstructs, per lease, the scheduled
installment due dates (from payment_type cadence) and the actual cumulative
payments made (from payments_payment), then derives how many installments
were overdue at each due date.

"Morosidad" = reached 4 or more overdue installments at once. By construction
(cumulative/FIFO allocation of payments to the oldest due installment first),
an arrears count of K installments is always the K most recent consecutive
due dates -- so "K installments in arrears" and "K consecutive overdue
installments" are the same thing here.

Writes analysis.lease_features_v2 back to Postgres (record-level; used as
input by 06_stats_v2.py / 07_logit_v2.py, never exported to CSV as-is --
only the aggregated summaries those scripts produce are versioned).
"""
import calendar
import os

import numpy as np
import pandas as pd
from dateutil.relativedelta import relativedelta
from sqlalchemy import create_engine, text

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql:///arranca_moros")
AS_OF = pd.Timestamp("2026-07-22")  # max observed activity in the backup


def quincena_due_dates(start: pd.Timestamp, k_max: int) -> list[pd.Timestamp]:
    """'15last' cadence: due on the 15th and last day of each month."""
    y, m = start.year, start.month
    boundaries = []
    while len(boundaries) < k_max + 3:
        last_day = calendar.monthrange(y, m)[1]
        boundaries.append(pd.Timestamp(year=y, month=m, day=15))
        boundaries.append(pd.Timestamp(year=y, month=m, day=last_day))
        m += 1
        if m > 12:
            m, y = 1, y + 1
    boundaries = [b for b in boundaries if b > start]
    return boundaries[:k_max]


def schedule_due_dates(start: pd.Timestamp, cadence: str, k_max: int) -> list[pd.Timestamp]:
    if cadence == "weekly":
        return [start + pd.Timedelta(weeks=k) for k in range(1, k_max + 1)]
    if cadence == "monthly":
        return [start + relativedelta(months=k) for k in range(1, k_max + 1)]
    if cadence == "15last":
        return quincena_due_dates(start, k_max)
    raise ValueError(cadence)


def compute_arrears(lease_row, pay_group: pd.DataFrame) -> dict:
    fees_number = int(lease_row.fees_number)
    monthly_fee = float(lease_row.monthly_fee)
    start = lease_row.delivered_date if pd.notna(lease_row.delivered_date) else lease_row.created_at

    due_dates = schedule_due_dates(start, lease_row.payment_type, fees_number)
    due_dates = [d for d in due_dates if d <= AS_OF]
    if not due_dates:
        return {"n_due_observed": 0, "max_arrears": 0, "final_arrears": 0, "installments_paid": 0}

    pay_dates = pay_group["date"].to_numpy()
    pay_amounts = pay_group["amount"].to_numpy(dtype=float)
    order = np.argsort(pay_dates)
    pay_dates = pay_dates[order]
    cum_paid = np.cumsum(pay_amounts[order])

    due_arr = np.array(due_dates, dtype="datetime64[ns]")
    if len(cum_paid) == 0:
        paid_by_due = np.zeros(len(due_arr))
    else:
        idx = np.searchsorted(pay_dates, due_arr, side="right") - 1
        paid_by_due = np.where(idx >= 0, cum_paid[np.clip(idx, 0, len(cum_paid) - 1)], 0.0)

    installments_paid_series = np.floor(paid_by_due / monthly_fee)
    due_count_series = np.arange(1, len(due_dates) + 1)
    arrears_series = np.clip(due_count_series - installments_paid_series, 0, None)

    total_paid = cum_paid[-1] if len(cum_paid) else 0.0
    return {
        "n_due_observed": len(due_dates),
        "max_arrears": int(arrears_series.max()),
        "final_arrears": int(arrears_series[-1]),
        "installments_paid": int(np.floor(total_paid / monthly_fee)),
    }


def main() -> None:
    engine = create_engine(DATABASE_URL)

    leases = pd.read_sql(text("""
        SELECT l.id AS lease_id, l.status AS lease_status,
               NULLIF(l.created_at,'')::timestamptz AS created_at,
               NULLIF(l.delivered_date,'')::timestamptz AS delivered_date,
               NULLIF(l.monthly_fee,'')::numeric AS monthly_fee,
               NULLIF(l.fees_number,'')::numeric AS fees_number,
               l.payment_type, l.location, l.product_id, l.user_id,
               l.compra_venta, l.removed_gps, l.removed_seguro
        FROM raw.leases_lease l
        WHERE l.status NOT IN ('REJECTED','ANNULLED','CANCELED','PENDING_APPROVAL','WAITING')
    """), engine)

    payments = pd.read_sql(text("""
        SELECT lease_id, NULLIF(date,'')::timestamptz AS date, NULLIF(amount,'')::numeric AS amount
        FROM raw.payments_payment WHERE status = 'PAID' AND initial = 'f'
    """), engine)

    products = pd.read_sql(text("""
        SELECT id AS product_id, upper(trim(name)) AS model_norm, upper(trim(brand)) AS brand_norm,
               category_id, NULLIF(cash_price,'')::numeric AS cash_price
        FROM raw.products_product
    """), engine)

    users = pd.read_sql(text("""
        SELECT id AS user_id, NULLIF(score,'')::numeric AS score,
               NULLIF(monthly_income,'')::numeric AS monthly_income,
               marital_status, state,
               (guarantor IS NOT NULL AND guarantor NOT IN ('', '{}')) AS has_guarantor
        FROM raw.users_user
    """), engine)

    for c in ["created_at", "delivered_date"]:
        leases[c] = pd.to_datetime(leases[c], utc=True).dt.tz_localize(None)
    payments["date"] = pd.to_datetime(payments["date"], utc=True).dt.tz_localize(None)

    usable = leases[
        leases["monthly_fee"].gt(0)
        & leases["fees_number"].gt(0)
        & leases["payment_type"].isin(["weekly", "15last", "monthly"])
        & leases["created_at"].notna()
    ].copy()
    usable["delivered_date"] = usable["delivered_date"].fillna(usable["created_at"])

    pay_by_lease = {lid: g for lid, g in payments.groupby("lease_id")}
    empty = payments.iloc[0:0]

    records = []
    for row in usable.itertuples(index=False):
        res = compute_arrears(row, pay_by_lease.get(row.lease_id, empty))
        res["lease_id"] = row.lease_id
        records.append(res)

    out = usable.merge(pd.DataFrame(records), on="lease_id", how="inner")
    out["delinquent_4"] = (out["max_arrears"] >= 4).astype(int)
    out = out.merge(products, on="product_id", how="left")
    out = out.merge(users, on="user_id", how="left")
    out["quarter"] = out["created_at"].dt.to_period("Q").astype(str)

    with engine.begin() as conn:
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS analysis"))
    out.to_sql("lease_features_v2", engine, schema="analysis", if_exists="replace", index=False)

    print(f"Wrote analysis.lease_features_v2: {len(out)} rows")
    motos = out[out["category_id"].isin(["1", "13"])]
    print(f"Moto subset delinquent_4 rate: {motos['delinquent_4'].mean():.4f} (n={len(motos)})")


if __name__ == "__main__":
    main()
