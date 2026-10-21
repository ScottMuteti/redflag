"""FastAPI serving layer for the susceptibility model.

Thin on purpose: it loads the pinned pipeline, maps the request to the feature
contract in ml/preprocessing.py, and returns a 0-1 score with its risk bucket,
model version and a low_data flag. It never trains and never captures anything
beyond the behavioural features it is sent.
"""

from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict

from app.model import load_metadata, load_model
from ml.predict import is_low_data, predict_proba

app = FastAPI(title="RedFlag Susceptibility Scoring Service")


class SusceptibilityRequest(BaseModel):
    # Matches ml.preprocessing.FEATURE_COLUMNS. Rates are 0-1; the engine
    # computes them from each employee's simulation history.
    tenure_days: Optional[float] = None
    department: Optional[str] = None
    prior_sent: int = 0
    prior_open_rate: Optional[float] = None
    prior_click_rate: Optional[float] = None
    prior_report_rate: Optional[float] = None
    training_completed: int = 0
    difficulty: Optional[str] = None
    vector: Optional[str] = None


class SusceptibilityResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    score: float
    risk_level: str
    model_version: str
    low_data: bool


def bucket(score: float) -> str:
    if score < 0.33:
        return "low"
    if score < 0.66:
        return "medium"
    return "high"


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/model/info")
def model_info():
    metadata = load_metadata()
    if not metadata:
        raise HTTPException(status_code=404, detail="No trained model available")
    return metadata


@app.post("/predict", response_model=SusceptibilityResponse)
def predict(request: SusceptibilityRequest):
    features = request.model_dump()
    try:
        model = load_model()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    score = predict_proba(model, features)
    metadata = load_metadata()
    return SusceptibilityResponse(
        score=score,
        risk_level=bucket(score),
        model_version=metadata.get("version", "unknown"),
        low_data=is_low_data(features),
    )
