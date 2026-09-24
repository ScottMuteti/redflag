"""Load the serialized logistic regression pipeline and expose predict()."""

import json
from pathlib import Path

import joblib
import pandas as pd

MODEL_DIR = Path(__file__).resolve().parent.parent / "models"
MODEL_PATH = MODEL_DIR / "latest.joblib"
METADATA_PATH = MODEL_DIR / "metadata.json"

_model = None
_metadata = None


def load_model():
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                "No trained model found. Run `python -m app.generate_sample_data && "
                "python -m app.train` first."
            )
        _model = joblib.load(MODEL_PATH)
    return _model


def load_metadata():
    global _metadata
    if _metadata is None:
        _metadata = json.loads(METADATA_PATH.read_text()) if METADATA_PATH.exists() else {}
    return _metadata


def predict(features: dict) -> float:
    model = load_model()
    frame = pd.DataFrame([features])
    return float(model.predict_proba(frame)[0][1])
