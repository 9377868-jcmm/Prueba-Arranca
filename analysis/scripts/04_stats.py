"""Statistical tests + aggregate exports for the moto-model vs. morosidad
analysis. Reads analysis.lease_features (built by sql/03_build_lease_features.sql)
plus raw.users_user for the customer-score correlation, and writes only
aggregated, non-identifying CSVs to ../data/.

Connection: set DATABASE_URL (e.g. postgresql:///arranca_moros) or rely on
libpq defaults / PG* env vars.
"""
import os

import numpy as np
import pandas as pd
import psycopg2
from scipy import stats

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
MIN_GROUP_N = 15


def load(conn) -> pd.DataFrame:
    df = pd.read_sql("SELECT * FROM analysis.lease_features", conn)
    users = pd.read_sql(
        "SELECT id, score, monthly_income, marital_status, state FROM raw.users_user", conn
    )
    df = df.merge(users, left_on="user_id", right_on="id", how="left", suffixes=("", "_user"))
    df["score"] = pd.to_numeric(df["score"], errors="coerce")
    df["monthly_income"] = pd.to_numeric(df["monthly_income"], errors="coerce")
    return df


def chi2_test(df: pd.DataFrame, col: str, min_n: int = MIN_GROUP_N):
    ct = pd.crosstab(df[col].fillna("NA"), df["ever_delinquent"])
    ct = ct[ct.sum(axis=1) >= min_n]
    if ct.shape[0] < 2:
        return None
    chi2, p, dof, _ = stats.chi2_contingency(ct)
    n, k = ct.values.sum(), min(ct.shape) - 1
    cramers_v = np.sqrt(chi2 / (n * k)) if k > 0 else float("nan")
    return chi2, p, cramers_v


def pb_corr(df: pd.DataFrame, col: str):
    sub = df.dropna(subset=[col])
    if len(sub) < 30:
        return None
    r, p = stats.pointbiserialr(sub["ever_delinquent"], sub[col])
    return r, p


def main() -> None:
    conn = psycopg2.connect(os.environ.get("DATABASE_URL", "dbname=arranca_moros"))
    df = load(conn)
    motos = df[df["category_id"].isin(["1", "13"])].copy()

    # --- per-model summary ---
    model_summary = (
        motos.groupby(["model_norm", "brand_norm"])
        .agg(
            n_leases=("lease_id", "count"),
            pct_ever_delinquent=("ever_delinquent", "mean"),
            pct_severe=("ever_severe_delinquent", "mean"),
            avg_negative_events=("n_negative_events", "mean"),
            avg_cash_price=("cash_price", "mean"),
            avg_fees_number=("fees_number", "mean"),
            avg_customer_score=("score", "mean"),
        )
        .reset_index()
    )
    model_summary = model_summary[model_summary["n_leases"] >= MIN_GROUP_N]
    for c in ("pct_ever_delinquent", "pct_severe"):
        model_summary[c] = (model_summary[c] * 100).round(1)
    model_summary = model_summary.sort_values("pct_ever_delinquent", ascending=False)
    model_summary.to_csv(os.path.join(DATA_DIR, "model_summary.csv"), index=False)

    # --- branch / payment_type / cohort year summaries ---
    def group_summary(col, min_n=MIN_GROUP_N):
        g = motos.groupby(col).agg(n_leases=("lease_id", "count"), pct_ever_delinquent=("ever_delinquent", "mean"))
        g["pct_ever_delinquent"] = (g["pct_ever_delinquent"] * 100).round(1)
        return g[g["n_leases"] >= min_n].sort_values("pct_ever_delinquent", ascending=False)

    group_summary("location").to_csv(os.path.join(DATA_DIR, "branch_summary.csv"))
    group_summary("payment_type", min_n=1).to_csv(os.path.join(DATA_DIR, "payment_summary.csv"))

    motos["year"] = pd.to_datetime(motos["created_at"], errors="coerce", utc=True).dt.year
    group_summary("year", min_n=1).sort_index().to_csv(os.path.join(DATA_DIR, "year_summary.csv"))

    # --- significance tests ---
    rows = []
    for label, col, kind in [
        ("Modelo de moto", "model_norm", "chi2"),
        ("Marca", "brand_norm", "chi2"),
        ("Sucursal / sede", "location", "chi2"),
        ("Plan de pago", "payment_type", "chi2"),
        ("Estado civil", "marital_status", "chi2"),
        ("Entidad federal (state)", "state", "chi2"),
        ("Score de crédito del cliente", "score", "pb"),
        ("Ingreso mensual declarado", "monthly_income", "pb"),
        ("Precio de contado", "cash_price", "pb"),
        ("Cuota mensual", "monthly_fee", "pb"),
        ("Plazo (nº de cuotas)", "fees_number", "pb"),
    ]:
        if kind == "chi2":
            res = chi2_test(motos, col)
            if res is None:
                continue
            chi2, p, v = res
            rows.append({"factor": label, "stat": f"chi2={chi2:.1f}", "effect_size": f"V={v:.3f}", "p_value": p})
        else:
            res = pb_corr(motos, col)
            if res is None:
                continue
            r, p = res
            rows.append({"factor": label, "stat": f"r={r:.3f}", "effect_size": f"r={r:.3f}", "p_value": p})

    stats_summary = pd.DataFrame(rows)
    stats_summary["significant_p<0.05"] = stats_summary["p_value"] < 0.05
    stats_summary.to_csv(os.path.join(DATA_DIR, "stats_summary.csv"), index=False)

    print(stats_summary.to_string(index=False))
    print(f"\nWrote model_summary.csv ({len(model_summary)} models), "
          f"branch_summary.csv, payment_summary.csv, year_summary.csv, stats_summary.csv -> {DATA_DIR}")


if __name__ == "__main__":
    main()
