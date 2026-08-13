"""
Delinquency analysis by age and sex.
Extracts customers with birth_date, calculates age cohorts, and analyzes morosidad by demographics.
"""
import os
from datetime import datetime, date

import numpy as np
import pandas as pd
from sqlalchemy import create_engine, text

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql:///arranca_moros")
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def main() -> None:
    engine = create_engine(DATABASE_URL)

    # Extract leases with customer demographics and morosidad v2
    print("Loading customer demographics and morosidad data...")
    df = pd.read_sql(text("""
        SELECT
            l.lease_id,
            l.customer_id,
            l.delinquent_4,
            l.max_arrears,
            l.n_due_observed,
            c.birth_date,
            c.sex,
            l.origination_date
        FROM analysis.lease_features_v2 l
        LEFT JOIN raw.customers_customer c ON l.customer_id = c.id
        WHERE l.category_id IN ('1', '13')
          AND l.model_norm IS NOT NULL
          AND c.birth_date IS NOT NULL
          AND c.sex IS NOT NULL
    """), engine)

    print(f"Loaded {len(df)} leases with complete demographics")

    # Filter to v2-eligible (mature enough for delinquent_4)
    df = df[df["n_due_observed"] >= 4].copy()
    print(f"After maturity filter: {len(df)} leases")

    # Calculate age at origination
    df["birth_date"] = pd.to_datetime(df["birth_date"])
    df["origination_date"] = pd.to_datetime(df["origination_date"])
    df["age_at_origination"] = (
        (df["origination_date"] - df["birth_date"]).dt.days / 365.25
    ).round(1)

    # Age cohorts
    df["age_group"] = pd.cut(
        df["age_at_origination"],
        bins=[0, 25, 35, 45, 55, 65, 100],
        labels=["18-25", "26-35", "36-45", "46-55", "56-65", "65+"],
        right=False
    )

    # Normalize sex (uppercase, handle nulls)
    df["sex"] = df["sex"].astype(str).str.upper().replace({"NONE": None, "NAN": None, "": None})

    print(f"\nAge groups distribution:\n{df['age_group'].value_counts().sort_index()}")
    print(f"\nSex distribution:\n{df['sex'].value_counts()}")

    # Delinquency by age group
    age_summary = df.groupby("age_group", observed=True).agg(
        n_leases=("lease_id", "count"),
        pct_delinquent_4=("delinquent_4", "mean"),
        avg_max_arrears=("max_arrears", "mean"),
        avg_age=("age_at_origination", "mean")
    ).reset_index()
    age_summary["pct_delinquent_4"] = (age_summary["pct_delinquent_4"] * 100).round(1)
    age_summary["avg_max_arrears"] = age_summary["avg_max_arrears"].round(2)
    age_summary["avg_age"] = age_summary["avg_age"].round(1)

    # Delinquency by sex
    sex_summary = df.groupby("sex", observed=True).agg(
        n_leases=("lease_id", "count"),
        pct_delinquent_4=("delinquent_4", "mean"),
        avg_max_arrears=("max_arrears", "mean"),
        avg_age=("age_at_origination", "mean")
    ).reset_index()
    sex_summary["pct_delinquent_4"] = (sex_summary["pct_delinquent_4"] * 100).round(1)
    sex_summary["avg_max_arrears"] = sex_summary["avg_max_arrears"].round(2)
    sex_summary["avg_age"] = sex_summary["avg_age"].round(1)

    # Delinquency by age × sex
    age_sex_summary = df.groupby(["age_group", "sex"], observed=True).agg(
        n_leases=("lease_id", "count"),
        pct_delinquent_4=("delinquent_4", "mean"),
        avg_max_arrears=("max_arrears", "mean")
    ).reset_index()
    age_sex_summary = age_sex_summary[age_sex_summary["n_leases"] >= 5]  # Min n=5
    age_sex_summary["pct_delinquent_4"] = (age_sex_summary["pct_delinquent_4"] * 100).round(1)
    age_sex_summary["avg_max_arrears"] = age_sex_summary["avg_max_arrears"].round(2)

    # Save
    age_summary.to_csv(os.path.join(DATA_DIR, "age_summary.csv"), index=False)
    sex_summary.to_csv(os.path.join(DATA_DIR, "sex_summary.csv"), index=False)
    age_sex_summary.to_csv(os.path.join(DATA_DIR, "age_sex_summary.csv"), index=False)

    print("\n=== DELINQUENCY BY AGE ===")
    print(age_summary.to_string(index=False))

    print("\n=== DELINQUENCY BY SEX ===")
    print(sex_summary.to_string(index=False))

    print("\n=== DELINQUENCY BY AGE × SEX ===")
    print(age_sex_summary.to_string(index=False))

    print(f"\nWrote age_summary.csv, sex_summary.csv, age_sex_summary.csv -> {DATA_DIR}")


if __name__ == "__main__":
    main()
