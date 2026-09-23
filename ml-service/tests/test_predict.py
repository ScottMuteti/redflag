from fastapi.testclient import TestClient

import app.model as model_module
import app.train as train_module
from app.generate_sample_data import generate


def test_predict_endpoint(tmp_path, monkeypatch):
    df = generate(n=300)
    csv_path = tmp_path / "sample.csv"
    df.to_csv(csv_path, index=False)

    models_dir = tmp_path / "models"
    train_module.MODEL_DIR = models_dir
    train_module.train(csv_path)

    monkeypatch.setattr(model_module, "MODEL_PATH", models_dir / "latest.joblib")
    monkeypatch.setattr(model_module, "METADATA_PATH", models_dir / "metadata.json")
    monkeypatch.setattr(model_module, "_model", None)
    monkeypatch.setattr(model_module, "_metadata", None)

    from app.api import app as fastapi_app

    client = TestClient(fastapi_app)
    response = client.post(
        "/predict",
        json={
            "tenure_days": 60,
            "department": "Sales",
            "campaigns_sent": 10,
            "opened": 8,
            "clicked": 6,
            "submitted": 3,
            "reported": 1,
            "click_rate": 0.6,
            "submit_rate": 0.5,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert 0 <= body["score"] <= 1
    assert body["risk_level"] in {"low", "medium", "high"}
    assert body["model_version"]


def test_predict_returns_503_without_a_trained_model(monkeypatch, tmp_path):
    monkeypatch.setattr(model_module, "MODEL_PATH", tmp_path / "missing.joblib")
    monkeypatch.setattr(model_module, "_model", None)

    from app.api import app as fastapi_app

    client = TestClient(fastapi_app)
    response = client.post(
        "/predict",
        json={"campaigns_sent": 1, "opened": 1, "clicked": 0, "submitted": 0, "reported": 0},
    )

    assert response.status_code == 503
