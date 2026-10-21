"""Guards on the ML pipeline: no leakage, a stable feature contract, and
reproducibility. These back the Sprint II claims that the evaluation is honest.
"""

from pathlib import Path

import numpy as np
import yaml
from sklearn.model_selection import train_test_split

import ml.train as train_module
from ml.data_generation import generate
from ml.preprocessing import CATEGORICAL_FEATURES, FEATURE_COLUMNS, NUMERIC_FEATURES, TARGET

CONFIG = yaml.safe_load((Path(__file__).resolve().parent.parent / "ml" / "config.yaml").read_text())


def _small_config():
    cfg = dict(CONFIG)
    cfg["data"] = {**CONFIG["data"], "n_employees": 150}
    return cfg


def test_dataset_generation_is_reproducible():
    a = generate(_small_config()).drop(columns=["_persona"])
    b = generate(_small_config()).drop(columns=["_persona"])
    assert a.equals(b)


def test_dataset_has_the_feature_contract_and_binary_label():
    df = generate(_small_config())
    for col in FEATURE_COLUMNS + [TARGET]:
        assert col in df.columns
    assert set(df[TARGET].unique()) <= {0, 1}
    # The label must be both classes, or AUC is meaningless.
    assert df[TARGET].nunique() == 2


def test_scaler_is_fit_on_training_data_only():
    """No leakage: scaler statistics come from the train split, not all data."""
    cfg = _small_config()
    df = generate(cfg).drop(columns=["_persona"])
    X, y = df[FEATURE_COLUMNS], df[TARGET]
    X_train, _, y_train, _ = train_test_split(
        X, y, test_size=cfg["split"]["test_size"], stratify=y, random_state=cfg["seed"]
    )

    pipeline = train_module._full_pipeline(cfg["seed"])
    pipeline.fit(X_train, y_train)

    scaler = pipeline.named_steps["preprocessing"].named_transformers_["numeric"].named_steps[
        "scaler"
    ]
    # KNN-impute the train split the same way, then compare means.
    imputer = pipeline.named_steps["preprocessing"].named_transformers_["numeric"].named_steps[
        "imputer"
    ]
    train_imputed = imputer.transform(X_train[NUMERIC_FEATURES])
    np.testing.assert_allclose(scaler.mean_, train_imputed.mean(axis=0), rtol=1e-6)


def test_smote_is_absent_at_prediction_time():
    """SMOTE must resample only during fit, never transform inputs at predict."""
    cfg = _small_config()
    df = generate(cfg).drop(columns=["_persona"])
    X, y = df[FEATURE_COLUMNS], df[TARGET]
    pipeline = train_module._full_pipeline(cfg["seed"]).fit(X, y)

    # predict_proba on N rows must return exactly N rows (no oversampling leak).
    proba = pipeline.predict_proba(X.head(10))
    assert proba.shape[0] == 10


def test_categorical_feature_list_matches_generator():
    df = generate(_small_config())
    for col in CATEGORICAL_FEATURES:
        assert df[col].notna().all()
