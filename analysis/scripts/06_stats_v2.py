"""
Association matrix + group summaries for the v2 (payment-based) delinquency
definition. Reads analysis.lease_features_v2 (built by 05_build_delinquency_v2.py)
and writes only aggregated, non-identifying CSVs to ../data/.
"""
import itertools
import os

import numpy as np
import pandas as pd
from scipy import stats
from sqlalchemy import create_engine, text

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql:///arranca_moros")
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
MIN_N = 15

CAT_VARS = ["model_norm", "brand_norm", "location", "payment_type", "quarter",
            "marital_status", "state", "compra_venta", "removed_gps", "removed_seguro",
            "has_guarantor"]
NUM_VARS = ["fees_number", "monthly_fee", "cash_price", "score", "monthly_income"]
TARGETS = ["delinquent_4", "max_arrears"]
ALL_VARS = CAT_VARS + NUM_VARS + TARGETS


def cramers_v(a: pd.Series, b: pd.Series):
    ct = pd.crosstab(a, b)
    ct = ct.loc[ct.sum(axis=1) >= 5, ct.sum(axis=0) >= 5]
    if ct.shape[0] < 2 or ct.shape[1] < 2:
        return np.nan, np.nan
    chi2, p, _, _ = stats.chi2_contingency(ct)
    n, k = ct.values.sum(), min(ct.shape) - 1
    return (np.sqrt(chi2 / (n * k)) if k > 0 else np.nan), p


def correlation_ratio(cats: pd.Series, values: pd.Series):
    d = pd.DataFrame({"c": cats, "v": values}).dropna()
    groups = [g["v"].to_numpy() for _, g in d.groupby("c") if len(g) >= 5]
    if len(groups) < 2:
        return np.nan, np.nan
    _, p = stats.f_oneway(*groups)
    grand_mean = d["v"].mean()
    ss_between = sum(len(g) * (g.mean() - grand_mean) ** 2 for g in groups)
    ss_total = ((d["v"] - grand_mean) ** 2).sum()
    eta = np.sqrt(ss_between / ss_total) if ss_total > 0 else np.nan
    return eta, p


def pearson(a: pd.Series, b: pd.Series):
    d = pd.DataFrame({"a": a, "b": b}).dropna()
    if len(d) < 30:
        return np.nan, np.nan
    return stats.pearsonr(d["a"], d["b"])


def group_summary(df: pd.DataFrame, col: str, min_n: int = MIN_N) -> pd.DataFrame:
    g = df.groupby(col).agg(
        n_leases=("lease_id", "count"),
        pct_delinquent_4=("delinquent_4", "mean"),
        avg_max_arrears=("max_arrears", "mean"),
        avg_n_due_observed=("n_due_observed", "mean"),
    )
    g["pct_delinquent_4"] = (g["pct_delinquent_4"] * 100).round(1)
    g["avg_max_arrears"] = g["avg_max_arrears"].round(2)
    g["avg_n_due_observed"] = g["avg_n_due_observed"].round(1)
    return g[g["n_leases"] >= min_n].sort_values("pct_delinquent_4", ascending=False)


def main() -> None:
    engine = create_engine(DATABASE_URL)
    df = pd.read_sql(text("SELECT * FROM analysis.lease_features_v2"), engine)
    motos = df[df["category_id"].isin(["1", "13"])].copy()
    motos = motos[motos["model_norm"].notna()]
    motos["arrears_rate"] = motos["max_arrears"] / motos["n_due_observed"].replace(0, np.nan)

    for c in CAT_VARS:
        motos[c] = motos[c].astype(str).replace({"None": np.nan, "nan": np.nan, "": np.nan})

    kind = {v: ("cat" if v in CAT_VARS else "num") for v in ALL_VARS}
    assoc = pd.DataFrame(index=ALL_VARS, columns=ALL_VARS, dtype=float)
    pval = pd.DataFrame(index=ALL_VARS, columns=ALL_VARS, dtype=float)

    for v1, v2 in itertools.combinations(ALL_VARS, 2):
        k1, k2 = kind[v1], kind[v2]
        if k1 == "cat" and k2 == "cat":
            val, p = cramers_v(motos[v1], motos[v2])
        elif k1 == "num" and k2 == "num":
            val, p = pearson(motos[v1], motos[v2])
        elif k1 == "cat":
            val, p = correlation_ratio(motos[v1], motos[v2])
        else:
            val, p = correlation_ratio(motos[v2], motos[v1])
        assoc.loc[v1, v2] = assoc.loc[v2, v1] = val
        pval.loc[v1, v2] = pval.loc[v2, v1] = p
    for v in ALL_VARS:
        assoc.loc[v, v] = 1.0

    assoc.to_csv(os.path.join(DATA_DIR, "association_matrix.csv"))
    pval.to_csv(os.path.join(DATA_DIR, "association_pvalues.csv"))

    rows = [
        {"target": t, "factor": v, "assoc": assoc.loc[t, v], "p": pval.loc[t, v]}
        for t in TARGETS for v in ALL_VARS if v != t and v not in TARGETS
    ]
    ranked = pd.DataFrame(rows).sort_values(["target", "assoc"], ascending=[True, False])
    ranked.to_csv(os.path.join(DATA_DIR, "target_associations.csv"), index=False)

    # model / branch / payment_type / quarter summaries (v2 definition)
    model_summary_v2 = motos.groupby(["model_norm", "brand_norm"]).agg(
        n_leases=("lease_id", "count"),
        pct_delinquent_4=("delinquent_4", "mean"),
        avg_max_arrears=("max_arrears", "mean"),
        avg_customer_score=("score", "mean"),
    ).reset_index()
    model_summary_v2 = model_summary_v2[model_summary_v2["n_leases"] >= MIN_N]
    model_summary_v2["pct_delinquent_4"] = (model_summary_v2["pct_delinquent_4"] * 100).round(1)
    model_summary_v2["avg_max_arrears"] = model_summary_v2["avg_max_arrears"].round(2)
    model_summary_v2 = model_summary_v2.sort_values("pct_delinquent_4", ascending=False)
    model_summary_v2.to_csv(os.path.join(DATA_DIR, "model_summary_v2.csv"), index=False)

    group_summary(motos, "location").to_csv(os.path.join(DATA_DIR, "branch_summary_v2.csv"))

    pay = motos.groupby("payment_type").agg(
        n=("lease_id", "count"), pct_d4=("delinquent_4", "mean"), avg_rate=("arrears_rate", "mean"))
    pay["pct_d4"] = (pay["pct_d4"] * 100).round(1)
    pay["avg_rate"] = (pay["avg_rate"] * 100).round(1)
    pay.sort_values("pct_d4", ascending=False).to_csv(os.path.join(DATA_DIR, "payment_summary_v2.csv"))

    q = motos.groupby("quarter").agg(
        n=("lease_id", "count"), pct_d4=("delinquent_4", "mean"),
        avg_due=("n_due_observed", "mean"), avg_rate=("arrears_rate", "mean"))
    q["pct_d4"] = (q["pct_d4"] * 100).round(1)
    q["avg_rate"] = (q["avg_rate"] * 100).round(1)
    q["avg_due"] = q["avg_due"].round(1)
    q.sort_index().to_csv(os.path.join(DATA_DIR, "quarter_summary.csv"))

    print(ranked.to_string(index=False))
    print(f"\nWrote association_matrix.csv, target_associations.csv, model_summary_v2.csv, "
          f"branch_summary_v2.csv, payment_summary_v2.csv, quarter_summary.csv -> {DATA_DIR}")


if __name__ == "__main__":
    main()
