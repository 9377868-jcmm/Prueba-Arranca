"""
Monte Carlo bootstrap: insurance vs. self-funded reserve for total-loss risk
(theft/robo, choque, daño total -- NOT the RCV/third-party liability slice,
which this simulation excludes since it protects a different exposure).

Severity model: for the 41 high-confidence loss events (SINISTER/DAMAGED/
INDEMNIFIED), 5 have an actual resale-matched loss amount (avg loss ratio
~0.79 of original price); the other 36 were never matched to a recovered-bike
resale record, which in this business is what a genuine theft/total loss
looks like (nothing to resell) -- so those are modeled at 100% of the
lease's own price. This is a documented assumption, not a measured fact:
if some of those 36 were instead resolved off-system, this overstates
severity for the model. It does NOT overstate it for actual theft.

Frequency model: Poisson with rate = high-confidence events per bike-year,
applied to the current active fleet as the forward-looking exposure base.
"""
import os

import numpy as np
import pandas as pd
from sqlalchemy import create_engine, text

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql:///arranca_moros")
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

ANNUAL_PREMIUM_PER_BIKE = 81.0   # $100 all-risk policy minus $19 RCV (third-party liability, out of scope here)
N_SIM = 50_000
RNG = np.random.default_rng(20260901)


def main() -> None:
    engine = create_engine(DATABASE_URL)
    le = pd.read_sql(text("SELECT * FROM analysis.lease_exposure"), engine)
    ev = pd.read_sql(text("SELECT * FROM analysis.loss_events WHERE confidence='high'"), engine)

    total_bike_years = le["bike_years"].sum()
    n_events = len(ev)
    freq_rate = n_events / total_bike_years  # events per bike-year

    # severity per event: actual where matched, else 100% of that lease's own price
    ev["severity"] = ev["estimated_loss"].fillna(ev["price_clean"])
    ev = ev[ev["severity"].notna()].copy()
    fleet_avg_price = le["price_clean"].mean()
    severities = ev["severity"].to_numpy()

    fleet_size = int((le["lease_status"] == "ACTIVE").sum())  # current active fleet, forward-looking base

    print(f"Frequency: {n_events} events / {total_bike_years:.0f} bike-years = {freq_rate*100:.3f} per 100 bike-years")
    print(f"Severity sample: n={len(severities)}, mean=${severities.mean():.0f}, median=${np.median(severities):.0f}, "
          f"p90=${np.percentile(severities,90):.0f}")
    print(f"Fleet size (active): {fleet_size}, avg price ${fleet_avg_price:.0f}")

    lam = freq_rate * fleet_size  # expected events per year for the fleet
    print(f"Expected events/year for fleet of {fleet_size}: {lam:.2f}")

    # ---- Monte Carlo: N_SIM simulated years ----
    n_events_sim = RNG.poisson(lam, size=N_SIM)
    annual_losses = np.zeros(N_SIM)
    for i, n in enumerate(n_events_sim):
        if n > 0:
            annual_losses[i] = RNG.choice(severities, size=n, replace=True).sum()

    expected_loss = annual_losses.mean()
    premium_cost = ANNUAL_PREMIUM_PER_BIKE * fleet_size

    percentiles = {p: np.percentile(annual_losses, p) for p in [50, 75, 90, 95, 99, 99.5]}
    prob_loss_exceeds_premium = (annual_losses > premium_cost).mean()

    # ruin analysis for a self-funded reserve of various sizes
    fund_sizes = np.linspace(0, percentiles[99.5] * 1.2, 25)
    ruin_probs = []
    # multi-year ruin: fund replenished by (premium_cost-equivalent budget) each year, or NOT replenished (worst case)
    # here: static one-shot annual VaR framing (matches how a board sizes a reserve), plus a 5-year no-replenishment stress
    for f in fund_sizes:
        ruin_probs.append((annual_losses > f).mean())

    n_years_stress = 5
    stress_losses = np.zeros(N_SIM)
    for y in range(n_years_stress):
        n_events_sim_y = RNG.poisson(lam, size=N_SIM)
        for i, n in enumerate(n_events_sim_y):
            if n > 0:
                stress_losses[i] += RNG.choice(severities, size=n, replace=True).sum()
    stress_p95 = np.percentile(stress_losses, 95)

    results = pd.DataFrame({"fund_size": fund_sizes, "prob_exceed_in_a_year": ruin_probs})
    results.round(2).to_csv(os.path.join(DATA_DIR, "fund_sizing_curve.csv"), index=False)

    # ---- Sensitivity / stress scenarios: how fragile is the conclusion? ----
    from scipy import stats as sps
    lo_ci = sps.chi2.ppf(0.025, 2 * n_events) / 2 / total_bike_years if n_events > 0 else 0
    hi_ci = sps.chi2.ppf(0.975, 2 * (n_events + 1)) / 2 / total_bike_years

    ev_low = pd.read_sql(text("SELECT * FROM analysis.loss_events WHERE confidence IN ('high','low')"), engine)
    ev_low["severity"] = ev_low["estimated_loss"].fillna(ev_low["price_clean"])
    sev_low = ev_low[ev_low["severity"].notna()]["severity"].to_numpy()
    rate_stress = len(ev_low) / total_bike_years

    scenarios = {
        "point_estimate": (freq_rate, severities),
        "upper_95ci_frequency": (hi_ci, severities),
        "stress_include_fiscalia": (rate_stress, sev_low),
    }
    rows = []
    for name, (rate, sev) in scenarios.items():
        lam_s = rate * fleet_size
        n_sim = RNG.poisson(lam_s, size=N_SIM)
        losses_s = np.zeros(N_SIM)
        for i, n in enumerate(n_sim):
            if n > 0:
                losses_s[i] = RNG.choice(sev, size=n, replace=True).sum()
        rows.append({
            "scenario": name,
            "rate_per_100_bikeyears": round(rate * 100, 3),
            "expected_events_year": round(lam_s, 1),
            "expected_annual_loss": round(losses_s.mean(), 0),
            "p95_annual_loss": round(np.percentile(losses_s, 95), 0),
            "p99_annual_loss": round(np.percentile(losses_s, 99), 0),
            "prob_loss_exceeds_premium": round((losses_s > premium_cost).mean(), 4),
        })
    stress_df = pd.DataFrame(rows)
    stress_df.to_csv(os.path.join(DATA_DIR, "stress_scenarios.csv"), index=False)
    print("\n=== STRESS SCENARIOS ===")
    print(stress_df.to_string(index=False))

    summary = pd.DataFrame([{
        "fleet_size": fleet_size,
        "freq_per_100_bikeyears": round(freq_rate * 100, 3),
        "expected_events_per_year": round(lam, 2),
        "severity_mean": round(severities.mean(), 0),
        "severity_median": round(float(np.median(severities)), 0),
        "expected_annual_loss": round(expected_loss, 0),
        "p50_annual_loss": round(percentiles[50], 0),
        "p75_annual_loss": round(percentiles[75], 0),
        "p90_annual_loss": round(percentiles[90], 0),
        "p95_annual_loss": round(percentiles[95], 0),
        "p99_annual_loss": round(percentiles[99], 0),
        "p99_5_annual_loss": round(percentiles[99.5], 0),
        "annual_premium_cost": round(premium_cost, 0),
        "prob_loss_exceeds_premium": round(prob_loss_exceeds_premium, 4),
        "indifference_premium_per_bike": round(expected_loss / fleet_size, 2),
        "5yr_stress_p95_cumulative_loss": round(stress_p95, 0),
        "capital_needed_p95_vs_premium_x_years": round(percentiles[95] / premium_cost, 2) if premium_cost else None,
    }])
    summary.to_csv(os.path.join(DATA_DIR, "simulation_summary.csv"), index=False)

    print("\n=== SIMULATION SUMMARY ===")
    print(summary.T.to_string())
    print(f"\nWrote fund_sizing_curve.csv, simulation_summary.csv -> {DATA_DIR}")


if __name__ == "__main__":
    main()
