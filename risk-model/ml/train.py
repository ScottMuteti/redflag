"""Train the susceptibility model and write a reproducible evidence run.

Pipeline: KNN impute + scale (numeric) / impute + one-hot (categorical)
-> SMOTE (training folds only) -> logistic regression, with GridSearchCV over
a small grid inside stratified 5-fold CV on the 80% training split. The 20%
held-out set is untouched until the final report.

Baselines (majority-class and a plain logistic regression) are scored first so
the full pipeline's AUC can be read against something. Every run writes to
ml/runs/<run_id>/ with the git commit, dataset hash, dependency freeze, params,
metrics, plots and held-out predictions, then the winning pipeline is
serialised with a checksum and recorded in models/registry.json.
"""

import hashlib
import json
import platform
import subprocess
import sys
import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import yaml
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline as ImbPipeline
from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV, StratifiedKFold, cross_val_score, train_test_split

from ml import evaluate
from ml.data_generation import generate
from ml.preprocessing import (
    CATEGORICAL_FEATURES,
    FEATURE_COLUMNS,
    NUMERIC_FEATURES,
    TARGET,
    build_preprocessing_pipeline,
)

ROOT = Path(__file__).resolve().parent.parent
MODEL_DIR = ROOT / "models"
RUNS_DIR = Path(__file__).resolve().parent / "runs"
CONFIG_PATH = Path(__file__).resolve().parent / "config.yaml"


def _git_commit():
    # Env var first: the serving container has no git/.git, so callers can pass
    # the commit in for reproducible run records.
    import os

    env_commit = os.environ.get("GIT_COMMIT")
    if env_commit:
        return env_commit.strip()
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, stderr=subprocess.DEVNULL
        ).decode().strip()
    except Exception:
        return "unknown"


def _pip_freeze():
    try:
        return subprocess.check_output(
            [sys.executable, "-m", "pip", "freeze"], stderr=subprocess.DEVNULL
        ).decode().splitlines()
    except Exception:
        return []


def _sha256_bytes(data):
    return hashlib.sha256(data).hexdigest()


def _full_pipeline(seed):
    return ImbPipeline(
        [
            ("preprocessing", build_preprocessing_pipeline()),
            ("smote", SMOTE(random_state=seed)),
            ("classifier", LogisticRegression(max_iter=1000, random_state=seed)),
        ]
    )


def _coefficients(pipeline):
    """Map fitted coefficients back to readable feature names."""
    pre = pipeline.named_steps["preprocessing"]
    ohe = pre.named_transformers_["categorical"].named_steps["onehot"]
    cat_names = list(ohe.get_feature_names_out(CATEGORICAL_FEATURES))
    names = NUMERIC_FEATURES + cat_names
    coefs = pipeline.named_steps["classifier"].coef_[0]
    return {name: round(float(c), 4) for name, c in zip(names, coefs)}


def train(config=None):
    config = config or yaml.safe_load(CONFIG_PATH.read_text())
    seed = config["seed"]

    df = generate(config)
    personas = df["_persona"]
    df = df.drop(columns=["_persona"])
    X = df[FEATURE_COLUMNS]
    y = df[TARGET]

    dataset_csv = df.to_csv(index=False).encode()
    dataset_hash = _sha256_bytes(dataset_csv)

    X_train, X_test, y_train, y_test, _, persona_test = train_test_split(
        X, y, personas, test_size=config["split"]["test_size"], stratify=y, random_state=seed
    )

    cv = StratifiedKFold(n_splits=config["split"]["n_folds"], shuffle=True, random_state=seed)

    # --- Baselines -------------------------------------------------------
    majority = DummyClassifier(strategy="most_frequent").fit(X_train, y_train)
    majority_proba = majority.predict_proba(X_test)[:, 1]

    plain = ImbPipeline(
        [
            ("preprocessing", build_preprocessing_pipeline()),
            ("classifier", LogisticRegression(max_iter=1000, random_state=seed)),
        ]
    )
    plain_cv = cross_val_score(plain, X_train, y_train, cv=cv, scoring="roc_auc")
    plain.fit(X_train, y_train)
    plain_proba = plain.predict_proba(X_test)[:, 1]

    # --- Full pipeline with grid search ----------------------------------
    search = GridSearchCV(
        _full_pipeline(seed),
        param_grid=config["grid"],
        cv=cv,
        scoring="roc_auc",
        refit=True,
    )
    search.fit(X_train, y_train)
    best = search.best_estimator_

    fold_aucs = cross_val_score(best, X_train, y_train, cv=cv, scoring="roc_auc")
    test_proba = best.predict_proba(X_test)[:, 1]

    metrics = {
        "baselines": {
            "majority_class": evaluate.classification_metrics(y_test, majority_proba),
            "plain_logreg": {
                "cv_auc_roc_mean": round(float(plain_cv.mean()), 4),
                "cv_auc_roc_std": round(float(plain_cv.std()), 4),
                "holdout": evaluate.classification_metrics(y_test, plain_proba),
            },
        },
        "full_pipeline": {
            "best_params": search.best_params_,
            "cv_auc_roc_mean": round(float(fold_aucs.mean()), 4),
            "cv_auc_roc_std": round(float(fold_aucs.std()), 4),
            "cv_auc_roc_folds": [round(float(a), 4) for a in fold_aucs],
            "holdout": evaluate.classification_metrics(y_test, test_proba),
        },
        "target_auc_roc": config["target_auc_roc"],
        "target_met": bool(evaluate.classification_metrics(y_test, test_proba)["auc_roc"]
                           >= config["target_auc_roc"]),
    }

    # --- Serialise the winning pipeline ----------------------------------
    version = time.strftime("%Y%m%d%H%M%S")
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    model_path = MODEL_DIR / f"susceptibility_{version}.joblib"
    joblib.dump(best, model_path)
    checksum = _sha256_bytes(model_path.read_bytes())
    joblib.dump(best, MODEL_DIR / "latest.joblib")

    model_metadata = {
        "version": version,
        "trained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "synthetic": True,
        "sha256": checksum,
        "features": FEATURE_COLUMNS,
        "cv_auc_roc": metrics["full_pipeline"]["cv_auc_roc_mean"],
        "holdout_auc_roc": metrics["full_pipeline"]["holdout"]["auc_roc"],
        "n_samples": len(df),
        "dataset_sha256": dataset_hash,
    }
    (MODEL_DIR / "metadata.json").write_text(json.dumps(model_metadata, indent=2))

    registry_path = MODEL_DIR / "registry.json"
    registry = json.loads(registry_path.read_text()) if registry_path.exists() else {"models": []}
    registry["models"].append(
        {"version": version, "sha256": checksum, "trained_at": model_metadata["trained_at"],
         "synthetic": True, "holdout_auc_roc": model_metadata["holdout_auc_roc"]}
    )
    # Keep the earliest model as the frozen baseline for later comparison.
    registry["baseline_frozen"] = registry.get("baseline_frozen") or version
    registry_path.write_text(json.dumps(registry, indent=2))

    # --- Evidence run folder ---------------------------------------------
    run_id = f"{version}_{_git_commit()[:8]}"
    run_dir = RUNS_DIR / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    coefficients = _coefficients(best)
    evaluate.save_plots(y_test.to_numpy(), test_proba, run_dir, coefficients)

    held_out = X_test.copy()
    held_out["actual_failed"] = y_test.to_numpy()
    held_out["predicted_proba"] = np.round(test_proba, 4)
    held_out["persona"] = persona_test.to_numpy()
    held_out.to_csv(run_dir / "holdout_predictions.csv", index=False)

    evaluate.write_json(run_dir / "metrics.json", metrics)
    evaluate.write_json(run_dir / "coefficients.json", coefficients)
    evaluate.write_json(
        run_dir / "run.json",
        {
            "run_id": run_id,
            "git_commit": _git_commit(),
            "dataset_sha256": dataset_hash,
            "model_sha256": checksum,
            "model_version": version,
            "python": platform.python_version(),
            "config": config,
            "seed": seed,
        },
    )
    (run_dir / "dependencies.txt").write_text("\n".join(_pip_freeze()))
    _error_analysis(held_out, run_dir)

    print(f"Full-pipeline held-out AUC-ROC: {model_metadata['holdout_auc_roc']}")
    print(f"Target {config['target_auc_roc']} met: {metrics['target_met']}")
    print(f"Run written to {run_dir}")
    return {"metrics": metrics, "model_metadata": model_metadata, "run_dir": str(run_dir)}


def _error_analysis(held_out, run_dir):
    """Where the model is wrong, grouped by persona — honest reporting."""
    pred = (held_out["predicted_proba"] >= 0.5).astype(int)
    by_persona = held_out.assign(pred=pred, correct=pred == held_out["actual_failed"]).groupby(
        "persona"
    ).agg(n=("correct", "size"), accuracy=("correct", "mean"),
          actual_fail_rate=("actual_failed", "mean")).round(3)
    by_persona.to_csv(run_dir / "error_analysis_by_persona.csv")


if __name__ == "__main__":
    train()
