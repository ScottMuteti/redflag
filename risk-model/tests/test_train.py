import app.train as train_module
from app.generate_sample_data import generate


def test_train_produces_model_and_metadata(tmp_path):
    df = generate(n=400)
    csv_path = tmp_path / "sample.csv"
    df.to_csv(csv_path, index=False)

    train_module.MODEL_DIR = tmp_path / "models"

    metadata = train_module.train(csv_path)

    assert (train_module.MODEL_DIR / "latest.joblib").exists()
    assert (train_module.MODEL_DIR / "metadata.json").exists()
    assert 0 <= metadata["cv_auc_roc"] <= 1
    assert 0 <= metadata["holdout_auc_roc"] <= 1
    assert metadata["n_samples"] == 400
