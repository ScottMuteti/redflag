from pathlib import Path

import yaml
from fastapi.testclient import TestClient

import app.model as model_module
import ml.train as train_module

CONFIG = yaml.safe_load((Path(__file__).resolve().parent.parent / "ml" / "config.yaml").read_text())


def _train_to(tmp_path, monkeypatch):
    models_dir = tmp_path / "models"
    monkeypatch.setattr(train_module, "MODEL_DIR", models_dir)
    monkeypatch.setattr(train_module, "RUNS_DIR", tmp_path / "runs")
    cfg = dict(CONFIG)
    cfg["data"] = {**CONFIG["data"], "n_employees": 120}
    train_module.train(cfg)

    monkeypatch.setattr(model_module, "MODEL_PATH", models_dir / "latest.joblib")
    monkeypatch.setattr(model_module, "METADATA_PATH", models_dir / "metadata.json")
    monkeypatch.setattr(model_module, "REGISTRY_PATH", models_dir / "registry.json")
    monkeypatch.setattr(model_module, "_model", None)
    monkeypatch.setattr(model_module, "_metadata", None)


def test_predict_endpoint_returns_scored_contract(tmp_path, monkeypatch):
    _train_to(tmp_path, monkeypatch)
    from app.api import app as fastapi_app

    client = TestClient(fastapi_app)
    response = client.post(
        "/predict",
        json={
            "tenure_days": 60,
            "department": "Sales",
            "prior_sent": 5,
            "prior_open_rate": 0.8,
            "prior_click_rate": 0.6,
            "prior_report_rate": 0.0,
            "training_completed": 0,
            "difficulty": "hard",
            "vector": "email",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert 0.0 <= body["score"] <= 1.0
    assert body["risk_level"] in {"low", "medium", "high"}
    assert body["model_version"]
    assert body["low_data"] is False


def test_cold_start_is_flagged_low_data(tmp_path, monkeypatch):
    _train_to(tmp_path, monkeypatch)
    from app.api import app as fastapi_app

    client = TestClient(fastapi_app)
    response = client.post(
        "/predict",
        json={"department": "HR", "prior_sent": 0, "difficulty": "easy", "vector": "sms"},
    )
    assert response.status_code == 200
    assert response.json()["low_data"] is True


def test_predict_returns_503_without_a_model(tmp_path, monkeypatch):
    monkeypatch.setattr(model_module, "MODEL_PATH", tmp_path / "missing.joblib")
    monkeypatch.setattr(model_module, "_model", None)
    from app.api import app as fastapi_app

    client = TestClient(fastapi_app)
    response = client.post("/predict", json={"prior_sent": 3})
    assert response.status_code == 503
