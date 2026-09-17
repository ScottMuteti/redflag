from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="RedFlag Susceptibility Scoring Service")


class SusceptibilityRequest(BaseModel):
    # TODO: define employee feature schema
    features: dict


class SusceptibilityResponse(BaseModel):
    score: float
    risk_level: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict", response_model=SusceptibilityResponse)
def predict(request: SusceptibilityRequest):
    # TODO: load pipeline via model.py and return a prediction
    raise NotImplementedError("Scoring model not yet trained")
