"""Feature contract and preprocessing pipeline for the susceptibility model.

This is the single source of truth for the model's features. Both training
(ml/train.py) and serving (app/) rely on it, and the Node engine's
scoring.service.js builds exactly these keys.

Preprocessing: rate smoothing + KNN imputation + standard scaling for numeric features;
most-frequent/constant imputation + one-hot encoding for categoricals. All of
it is fit on the training fold only (it lives inside the sklearn Pipeline that
GridSearchCV/cross_val_score refit per fold), so no statistic leaks from the
validation or held-out data.
"""

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.compose import ColumnTransformer
from sklearn.impute import KNNImputer, SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

# History-derived behaviour plus tenure and whether remedial training is done.
NUMERIC_FEATURES = [
    "tenure_days",
    "prior_sent",
    "prior_open_rate",
    "prior_click_rate",
    "prior_report_rate",
    "training_completed",
]
# Who they are and what the upcoming simulation looks like.
CATEGORICAL_FEATURES = ["department", "difficulty", "vector"]
FEATURE_COLUMNS = NUMERIC_FEATURES + CATEGORICAL_FEATURES
TARGET = "failed"

RATE_FEATURES = ["prior_open_rate", "prior_click_rate", "prior_report_rate"]
# A rate counts as this many extra simulations at the average rate.
SMOOTHING_STRENGTH = 2.0


class RateSmoother(BaseEstimator, TransformerMixin):
    """Pull rates built on little history towards the training-fold average.

    1 click out of 1 is weaker evidence than 5 out of 5. The average is learned
    in fit() only, and only from past behaviour, never from the label.
    """

    def __init__(self, strength=SMOOTHING_STRENGTH):
        self.strength = strength

    @staticmethod
    def _numeric(X):
        return X.apply(pd.to_numeric, errors="coerce").astype(float)

    def fit(self, X, y=None):
        X = self._numeric(X)
        sent = X["prior_sent"].fillna(0)
        self.means_ = {}
        for col in RATE_FEATURES:
            known = X[col].notna() & (sent > 0)
            self.means_[col] = (
                float(np.average(X.loc[known, col], weights=sent[known])) if known.any() else 0.0
            )
        return self

    def transform(self, X):
        X = self._numeric(X)
        for col in RATE_FEATURES:
            sent = X["prior_sent"].fillna(0).where(X[col].notna(), 0)
            total = X[col].fillna(0) * sent + self.strength * self.means_[col]
            X[col] = total / (sent + self.strength)
        return X


def build_preprocessing_pipeline():
    numeric_pipeline = Pipeline(
        [
            ("smoother", RateSmoother()),
            ("imputer", KNNImputer(n_neighbors=5)),
            ("scaler", StandardScaler()),
        ]
    )
    categorical_pipeline = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="constant", fill_value="Unknown")),
            # handle_unknown="ignore": a department/vector unseen in training is
            # encoded all-zeros rather than crashing inference.
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    return ColumnTransformer(
        [
            ("numeric", numeric_pipeline, NUMERIC_FEATURES),
            ("categorical", categorical_pipeline, CATEGORICAL_FEATURES),
        ]
    )
