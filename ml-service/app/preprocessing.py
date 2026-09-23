"""Preprocessing pipeline: KNN imputation + scaling for numeric features,
most-frequent imputation + one-hot encoding for the department feature."""

from sklearn.compose import ColumnTransformer
from sklearn.impute import KNNImputer, SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

NUMERIC_FEATURES = [
    "tenure_days",
    "campaigns_sent",
    "opened",
    "clicked",
    "submitted",
    "reported",
    "click_rate",
    "submit_rate",
]
CATEGORICAL_FEATURES = ["department"]


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
            # handle_unknown="ignore" so a department absent from the training
            # set doesn't crash inference — it's just encoded as all-zeros.
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    return ColumnTransformer(
        [
            ("numeric", numeric_pipeline, NUMERIC_FEATURES),
            ("categorical", categorical_pipeline, CATEGORICAL_FEATURES),
        ]
    )
