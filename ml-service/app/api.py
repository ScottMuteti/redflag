from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict

from app.model import load_metadata, predict as run_prediction

app = FastAPI(title="RedFlag Susceptibility Scoring Service")


class SusceptibilityRequest(BaseModel):
    tenure_days: Optional[float] = None
    department: Optional[str] = None
    campaigns_sent: int
    opened: int
    clicked: int
    submitted: int
    reported: int
    click_rate: Optional[float] = None
    submit_rate: Optional[float] = None


class SusceptibilityResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    score: float
    risk_level: str
    model_version: str


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
    try:
        score = run_prediction(request.model_dump())
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    metadata = load_metadata()
    return SusceptibilityResponse(
        score=score, risk_level=bucket(score), model_version=metadata.get("version", "unknown")
    )
