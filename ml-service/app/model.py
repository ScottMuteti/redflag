"""Load the serialized logistic regression pipeline and expose predict()."""

import joblib

MODEL_PATH = "models/susceptibility_model.joblib"

_model = None


def load_model():
    global _model
    if _model is None:
        _model = joblib.load(MODEL_PATH)
    return _model


def predict(features: dict) -> float:
    # TODO: transform features and return predicted probability
    raise NotImplementedError
