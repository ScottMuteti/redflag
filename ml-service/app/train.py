"""Logistic regression training pipeline: 80/20 split, 5-fold CV, SMOTE
applied only within each training fold, target AUC-ROC >= 0.85."""

import json
import sys
import time
from pathlib import Path

import joblib
import pandas as pd
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline as ImbPipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split

from app.preprocessing import CATEGORICAL_FEATURES, NUMERIC_FEATURES, build_preprocessing_pipeline

MODEL_DIR = Path(__file__).resolve().parent.parent / "models"


def train(csv_path):
    df = pd.read_csv(csv_path)
    feature_cols = NUMERIC_FEATURES + CATEGORICAL_FEATURES
    X = df[feature_cols]
    y = df["susceptible"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    pipeline = ImbPipeline(
        [
            ("preprocessing", build_preprocessing_pipeline()),
            ("smote", SMOTE(random_state=42)),
            ("classifier", LogisticRegression(max_iter=1000)),
        ]
    )

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(pipeline, X_train, y_train, cv=cv, scoring="roc_auc")
    print(f"5-fold CV AUC-ROC: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")

    pipeline.fit(X_train, y_train)
    test_auc = roc_auc_score(y_test, pipeline.predict_proba(X_test)[:, 1])
    print(f"Holdout AUC-ROC: {test_auc:.4f}")

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    version = time.strftime("%Y%m%d%H%M%S")
    model_path = MODEL_DIR / f"susceptibility_model_v{version}.joblib"
    joblib.dump(pipeline, model_path)
    joblib.dump(pipeline, MODEL_DIR / "latest.joblib")

    metadata = {
        "version": version,
        "trained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "cv_auc_roc": round(float(cv_scores.mean()), 4),
        "holdout_auc_roc": round(float(test_auc), 4),
        "n_samples": len(df),
    }
    with open(MODEL_DIR / "metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"Model saved: {model_path}")
    return metadata


if __name__ == "__main__":
    default_csv = Path(__file__).resolve().parent.parent / "data" / "sample_susceptibility.csv"
    train(sys.argv[1] if len(sys.argv) > 1 else default_csv)
