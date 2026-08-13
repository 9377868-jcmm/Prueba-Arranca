"""
Multivariate logistic regression for delinquent_4, controlling score, term
length, payment plan, branch, brand and origination-quarter simultaneously --
needed because several of these are confounded with each other (branch~state,
payment_type~fees_number, model~price; see the association matrix from
06_stats_v2.py). Writes only the fitted coefficients/odds-ratios to
../data/logit_odds_ratios.csv, never record-level data.
"""
import os

import numpy as np
import pandas as pd
import statsmodels.formula.api as smf
from sqlalchemy import create_engine, text

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql:///arranca_moros")
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def main() -> None:
    engine = create_engine(DATABASE_URL)
    df = pd.read_sql(text("SELECT * FROM analysis.lease_features_v2"), engine)
    motos = df[df["category_id"].isin(["1", "13"])].copy()
    motos = motos[motos["model_norm"].notna()]

    # restrict to leases mature enough for delinquent_4 to even be reachable
    motos = motos[motos["n_due_observed"] >= 4].copy()

    motos["score_z"] = (motos["score"] - motos["score"].mean()) / motos["score"].std()
    motos["fees_number_z"] = (motos["fees_number"] - motos["fees_number"].mean()) / motos["fees_number"].std()

    top_locations = motos["location"].value_counts()
    top_locations = top_locations[top_locations >= 60].index
    motos["location_grp"] = np.where(motos["location"].isin(top_locations), motos["location"], "Otra")

    # quarter as a linear index: with a mature-only subset there isn't enough
    # depth per quarter x branch x plan cell to fit a full categorical
    # quarter effect without separation.
    quarters_sorted = sorted(motos["quarter"].unique())
    motos["quarter_idx"] = motos["quarter"].map({q: i for i, q in enumerate(quarters_sorted)})

    model_df = motos.dropna(
        subset=["score_z", "fees_number_z", "payment_type", "location_grp", "brand_norm", "quarter_idx"]
    ).copy()
    brand_counts = model_df["brand_norm"].value_counts()
    model_df = model_df[model_df["brand_norm"].isin(brand_counts[brand_counts >= 15].index)]

    formula = (
        "delinquent_4 ~ score_z + fees_number_z + quarter_idx "
        "+ C(payment_type, Treatment('monthly')) "
        "+ C(location_grp, Treatment('Caracas')) + C(brand_norm, Treatment('EMPIRE'))"
    )
    res = smf.logit(formula, data=model_df).fit(disp=0)
    print(res.summary())

    odds = np.exp(res.params)
    conf = np.exp(res.conf_int())
    out = pd.DataFrame({"odds_ratio": odds, "ci_low": conf[0], "ci_high": conf[1], "p": res.pvalues}).round(3)
    out.to_csv(os.path.join(DATA_DIR, "logit_odds_ratios.csv"))
    print(f"\nn={len(model_df)}, pseudo-R2={res.prsquared:.3f}, converged={res.mle_retvals['converged']}")
    print(f"Wrote logit_odds_ratios.csv -> {DATA_DIR}")


if __name__ == "__main__":
    main()
