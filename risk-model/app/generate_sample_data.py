"""Synthetic training data generator.

A freshly deployed RedFlag instance has no real simulation history yet, so
this generates a plausible demo dataset (with a genuine, learnable signal)
purely so the training pipeline and its AUC-ROC target are runnable and
demoable now. Not used anywhere in the live scoring path.
"""

from pathlib import Path

import numpy as np
import pandas as pd

RNG = np.random.default_rng(42)
DEPARTMENTS = ["Finance", "IT", "Sales", "Operations", "HR", "Customer Support"]
# Rough, illustrative risk deltas per department (IT skews more skeptical of
# phishing attempts; Finance/Sales skew more susceptible).
DEPARTMENT_RISK = {
    "Finance": 0.15,
    "IT": -0.25,
    "Sales": 0.20,
    "Operations": 0.0,
    "HR": 0.05,
    "Customer Support": 0.10,
}


def generate(n=2000):
    tenure_days = RNG.integers(30, 3650, size=n).astype(float)
    department = RNG.choice(DEPARTMENTS, size=n)
    campaigns_sent = RNG.integers(3, 20, size=n)

    tenure_risk = 1 - (tenure_days / 3650)  # newer employees are riskier
    dept_risk = np.array([DEPARTMENT_RISK[d] for d in department])
    noise = RNG.normal(0, 0.3, size=n)

    latent = -0.5 + 1.8 * tenure_risk + dept_risk + noise
    click_prob = 1 / (1 + np.exp(-latent))

    clicked = RNG.binomial(campaigns_sent, click_prob)
    opened = np.minimum(campaigns_sent, clicked + RNG.integers(0, 3, size=n))
    submitted = RNG.binomial(clicked, click_prob * 0.6)
    reported = RNG.binomial(np.maximum(campaigns_sent - clicked, 0), 0.3)

    click_rate = clicked / campaigns_sent
    submit_rate = np.divide(submitted, clicked, out=np.zeros(n), where=clicked > 0)

    susceptible = (click_prob > 0.5).astype(int)

    # ~5% missing tenure, so KNN imputation has something real to do.
    missing_mask = RNG.random(n) < 0.05
    tenure_days[missing_mask] = np.nan

    return pd.DataFrame(
        {
            "tenure_days": tenure_days,
            "department": department,
            "campaigns_sent": campaigns_sent,
            "opened": opened,
            "clicked": clicked,
            "submitted": submitted,
            "reported": reported,
            "click_rate": click_rate,
            "submit_rate": submit_rate,
            "susceptible": susceptible,
        }
    )


if __name__ == "__main__":
    out_dir = Path(__file__).resolve().parent.parent / "data"
    out_dir.mkdir(exist_ok=True)
    df = generate()
    out_path = out_dir / "sample_susceptibility.csv"
    df.to_csv(out_path, index=False)
    print(f"Wrote {len(df)} rows to {out_path}")
