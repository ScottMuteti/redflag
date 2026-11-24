"""Guards on the ML pipeline: no leakage, a stable feature contract, and
reproducibility. These back the Sprint II claims that the evaluation is honest.
"""

from pathlib import Path

import numpy as np
import yaml

import ml.train as train_module
from ml.data_generation import generate
from ml.preprocessing import (
    CATEGORICAL_FEATURES,
    FEATURE_COLUMNS,
    NUMERIC_FEATURES,
    TARGET,
    RateSmoother,
)

CONFIG = yaml.safe_load((Path(__file__).resolve().parent.parent / "ml" / "config.yaml").read_text())


def _small_config():
    cfg = dict(CONFIG)
    cfg["data"] = {**CONFIG["data"], "n_employees": 150}
    return cfg


def test_dataset_generation_is_reproducible():
    a = generate(_small_config()).drop(columns=["_persona", "_employee"])
    b = generate(_small_config()).drop(columns=["_persona", "_employee"])
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
    df = generate(cfg).drop(columns=["_persona", "_employee"])
    X, y = df[FEATURE_COLUMNS], df[TARGET]
    groups = generate(cfg)["_employee"]
    train_idx, _ = train_module.group_holdout_split(
        X, y, groups, cfg["split"]["test_size"], cfg["seed"]
    )
    X_train, y_train = X.iloc[train_idx], y.iloc[train_idx]

    pipeline = train_module._full_pipeline(cfg["seed"])
    pipeline.fit(X_train, y_train)

    scaler = pipeline.named_steps["preprocessing"].named_transformers_["numeric"].named_steps[
        "scaler"
    ]
    smoother = pipeline.named_steps["preprocessing"].named_transformers_["numeric"].named_steps[
        "smoother"
    ]
    # Smooth and KNN-impute the train split the same way, then compare means.
    imputer = pipeline.named_steps["preprocessing"].named_transformers_["numeric"].named_steps[
        "imputer"
    ]
    train_imputed = imputer.transform(smoother.transform(X_train[NUMERIC_FEATURES]))
    np.testing.assert_allclose(scaler.mean_, train_imputed.mean(axis=0), rtol=1e-6)


def test_smote_is_absent_at_prediction_time():
    """SMOTE must resample only during fit, never transform inputs at predict."""
    cfg = _small_config()
    df = generate(cfg).drop(columns=["_persona", "_employee"])
    X, y = df[FEATURE_COLUMNS], df[TARGET]
    pipeline = train_module._full_pipeline(cfg["seed"]).fit(X, y)

    # predict_proba on N rows must return exactly N rows (no oversampling leak).
    proba = pipeline.predict_proba(X.head(10))
    assert proba.shape[0] == 10


def test_categorical_feature_list_matches_generator():
    df = generate(_small_config())
    for col in CATEGORICAL_FEATURES:
        assert df[col].notna().all()


def test_holdout_split_keeps_each_employee_on_one_side():
    """No leakage across people: an employee's rows are all train or all test."""
    cfg = _small_config()
    df = generate(cfg)
    train_idx, test_idx = train_module.group_holdout_split(
        df[FEATURE_COLUMNS], df[TARGET], df["_employee"], cfg["split"]["test_size"], cfg["seed"]
    )
    train_people = set(df["_employee"].iloc[train_idx])
    test_people = set(df["_employee"].iloc[test_idx])
    assert train_people.isdisjoint(test_people)
    assert len(train_idx) + len(test_idx) == len(df)
    # Still roughly the configured hold-out size and both classes present.
    assert abs(len(test_idx) / len(df) - cfg["split"]["test_size"]) < 0.05
    assert df[TARGET].iloc[test_idx].nunique() == 2


def test_nested_cv_scores_every_row_out_of_fold():
    """Each row is predicted by a model tuned without it; one score per outer fold."""
    cfg = _small_config()
    cfg["grid"] = {"classifier__C": [0.1, 1.0]}
    df = generate(cfg)
    aucs, params, oof = train_module.nested_cv(
        df[FEATURE_COLUMNS], df[TARGET], df["_employee"], cfg, cfg["seed"]
    )
    assert len(aucs) == len(params) == cfg["split"]["n_folds"]
    assert ((oof > 0) & (oof < 1)).all()


def test_bootstrap_interval_brackets_the_point_estimate():
    from ml import evaluate

    df = generate(_small_config())
    rng = np.random.default_rng(0)
    proba = np.clip(df[TARGET] * 0.4 + rng.random(len(df)) * 0.6, 0, 1)
    point = evaluate.classification_metrics(df[TARGET], proba)
    ci = evaluate.grouped_bootstrap_ci(df[TARGET], proba, df["_employee"], n_boot=200, seed=0)
    for name in ("auc_roc", "recall", "precision"):
        low, high = ci[name]
        assert low <= point[name] <= high


def test_rate_smoother_uses_training_averages_only():
    """Averages come from fit(), thin history shrinks more, no history -> average."""
    df = generate(_small_config())[NUMERIC_FEATURES]
    smoother = RateSmoother().fit(df.head(200))
    mean = smoother.means_["prior_click_rate"]

    other = df.iloc[200:203].copy()
    other["prior_sent"] = [1, 5, 0]
    other["prior_click_rate"] = [1.0, 1.0, None]
    out = smoother.transform(other)["prior_click_rate"].to_numpy()
    assert smoother.means_["prior_click_rate"] == mean
    assert mean < out[0] < out[1] < 1
    np.testing.assert_allclose(out[2], mean)
