"""SYNTHETIC training data for the susceptibility model.

A freshly deployed RedFlag has no real simulation history, so this fabricates a
plausible one to make the training pipeline and its AUC target runnable now.
IT IS NOT REAL DATA and must never be presented as real-world effectiveness.

How it avoids a circular label
-------------------------------
Each employee has a hidden persona (careful / average / hurried / high-risk)
that sets how likely they are to fall for a simulation. We play out a time
sequence of campaigns. For each employee and campaign k (k >= 1) we build one
row whose FEATURES summarise campaigns 0..k-1 (their past behaviour) and the
upcoming campaign's difficulty/vector, and whose LABEL is whether they fail
campaign k. Features come strictly from the past, the label strictly from the
next event, so there's no leakage and the persona itself is never a feature.
"""

from pathlib import Path

import numpy as np
import pandas as pd

DEPARTMENTS = ["Finance", "IT", "Sales", "Operations", "HR", "Customer Support"]

# Base per-campaign probability of failing (clicking/submitting) by persona.
PERSONAS = {
    "careful": 0.08,
    "average": 0.22,
    "hurried": 0.45,
    "high_risk": 0.70,
}
PERSONA_WEIGHTS = [0.3, 0.4, 0.2, 0.1]

# Departments nudge the base rate a little (illustrative, not empirical).
DEPARTMENT_DELTA = {
    "Finance": 0.05,
    "IT": -0.10,
    "Sales": 0.08,
    "Operations": 0.0,
    "HR": 0.02,
    "Customer Support": 0.04,
}
DIFFICULTY_DELTA = {"easy": -0.08, "medium": 0.0, "hard": 0.10}
VECTORS = ["email", "sms"]
DIFFICULTIES = ["easy", "medium", "hard"]


def _clip(p):
    return float(min(0.97, max(0.02, p)))


def generate(config):
    """Return a per-(employee, campaign) DataFrame with FEATURE_COLUMNS + TARGET."""
    rng = np.random.default_rng(config["seed"])
    n = config["data"]["n_employees"]
    n_campaigns = config["data"]["n_campaigns"]
    train_after = config["data"]["training_intervention_after"]

    personas = rng.choice(list(PERSONAS), size=n, p=PERSONA_WEIGHTS)
    departments = rng.choice(DEPARTMENTS, size=n)
    tenure_days = rng.integers(30, 3650, size=n).astype(float)
    # Employees who complete remedial training at the mid-point intervention.
    will_train = rng.random(n) < 0.5

    campaigns = [
        {
            "difficulty": rng.choice(DIFFICULTIES),
            "vector": rng.choice(VECTORS),
        }
        for _ in range(n_campaigns)
    ]

    rows = []
    for i in range(n):
        base = PERSONAS[personas[i]] + DEPARTMENT_DELTA[departments[i]]
        history = {"sent": 0, "opened": 0, "clicked": 0, "reported": 0}
        trained = 0
        for k, campaign in enumerate(campaigns):
            # Completing training before campaign k lowers this employee's risk.
            if k == train_after and will_train[i]:
                trained = 1
            trained_effect = -0.18 if trained else 0.0
            p_fail = _clip(base + DIFFICULTY_DELTA[campaign["difficulty"]] + trained_effect)

            # Build the training row from history BEFORE this campaign.
            if k >= 1:
                rows.append(
                    {
                        "tenure_days": tenure_days[i],
                        "prior_sent": history["sent"],
                        "prior_open_rate": history["opened"] / history["sent"],
                        "prior_click_rate": history["clicked"] / history["sent"],
                        "prior_report_rate": history["reported"] / history["sent"],
                        "training_completed": trained,
                        "department": departments[i],
                        "difficulty": campaign["difficulty"],
                        "vector": campaign["vector"],
                        "failed": 0,  # filled in just below
                        "_persona": personas[i],
                    }
                )

            # Simulate the outcome of campaign k and fold it into history.
            failed = rng.random() < p_fail
            opened = failed or (rng.random() < p_fail + 0.3)
            reported = (not failed) and (rng.random() < (0.35 if trained else 0.15))
            history["sent"] += 1
            history["opened"] += int(opened)
            history["clicked"] += int(failed)
            history["reported"] += int(reported)
            if k >= 1:
                rows[-1]["failed"] = int(failed)

    df = pd.DataFrame(rows)

    # ~5% missing tenure so KNN imputation has genuine work to do.
    missing = rng.random(len(df)) < config["data"]["missing_tenure_fraction"]
    df.loc[missing, "tenure_days"] = np.nan
    return df


if __name__ == "__main__":  # pragma: no cover - manual data dump
    import yaml

    cfg = yaml.safe_load((Path(__file__).parent / "config.yaml").read_text())
    out = generate(cfg)
    dest = Path(__file__).resolve().parent.parent / "data" / "synthetic_susceptibility.csv"
    dest.parent.mkdir(exist_ok=True)
    out.drop(columns=["_persona"]).to_csv(dest, index=False)
    print(f"Wrote {len(out)} SYNTHETIC rows to {dest}")
