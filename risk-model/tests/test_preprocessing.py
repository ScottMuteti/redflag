import pandas as pd

from app.preprocessing import CATEGORICAL_FEATURES, NUMERIC_FEATURES, build_preprocessing_pipeline


def test_pipeline_handles_missing_values():
    df = pd.DataFrame(
        {
            "tenure_days": [100, None, 500],
            "campaigns_sent": [5, 10, 3],
            "opened": [4, 8, 2],
            "clicked": [2, 5, 1],
            "submitted": [1, 2, 0],
            "reported": [1, 1, 1],
            "click_rate": [0.4, 0.5, 0.33],
            "submit_rate": [0.5, 0.4, 0.0],
            "department": ["Finance", "IT", None],
        }
    )

    pipeline = build_preprocessing_pipeline()
    transformed = pipeline.fit_transform(df[NUMERIC_FEATURES + CATEGORICAL_FEATURES])

    assert transformed.shape[0] == 3


def test_pipeline_ignores_unseen_department_at_inference():
    train_df = pd.DataFrame(
        {
            "tenure_days": [100, 200],
            "campaigns_sent": [5, 10],
            "opened": [4, 8],
            "clicked": [2, 5],
            "submitted": [1, 2],
            "reported": [1, 1],
            "click_rate": [0.4, 0.5],
            "submit_rate": [0.5, 0.4],
            "department": ["Finance", "IT"],
        }
    )
    pipeline = build_preprocessing_pipeline()
    pipeline.fit(train_df[NUMERIC_FEATURES + CATEGORICAL_FEATURES])

    unseen_df = train_df.iloc[[0]].copy()
    unseen_df["department"] = "Marketing"  # never seen during fit
    transformed = pipeline.transform(unseen_df[NUMERIC_FEATURES + CATEGORICAL_FEATURES])

    assert transformed.shape[0] == 1
