"""Shared prediction helpers used by the serving app.

Keeps the cold-start rule and the 0-1 score in one place so the FastAPI layer
stays thin. A raw model probability is NOT a calibrated confidence; see the
run's calibration curve before reading it as one.
"""

import pandas as pd

from ml.preprocessing import FEATURE_COLUMNS

# Below this much simulation history the estimate is a low-data prior, flagged
# to the UI rather than presented as a measured score.
COLD_START_MIN_PRIOR_SENT = 2


def is_low_data(features: dict) -> bool:
    return (features.get("prior_sent") or 0) < COLD_START_MIN_PRIOR_SENT


def predict_proba(model, features: dict) -> float:
    row = {col: features.get(col) for col in FEATURE_COLUMNS}
    frame = pd.DataFrame([row])
    return float(model.predict_proba(frame)[0][1])
