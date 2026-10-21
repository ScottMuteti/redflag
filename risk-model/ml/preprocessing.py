"""Feature contract and preprocessing pipeline for the susceptibility model.

This is the single source of truth for the model's features. Both training
(ml/train.py) and serving (app/) rely on it, and the Node engine's
scoring.service.js builds exactly these keys.

Preprocessing: KNN imputation + standard scaling for numeric features;
most-frequent/constant imputation + one-hot encoding for categoricals. All of
it is fit on the training fold only (it lives inside the sklearn Pipeline that
GridSearchCV/cross_val_score refit per fold), so no statistic leaks from the
validation or held-out data.
"""

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


def build_preprocessing_pipeline():
    numeric_pipeline = Pipeline(
        [
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
