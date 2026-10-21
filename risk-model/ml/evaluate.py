"""Metrics and plots for a fitted pipeline on the held-out set.

Kept separate from train.py so the same reporting can run against any model
version. Plots use a non-interactive backend so this works headless in CI/Colab.
"""

import json

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from sklearn.calibration import calibration_curve  # noqa: E402
from sklearn.metrics import (  # noqa: E402
    accuracy_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)


def classification_metrics(y_true, y_proba, threshold=0.5):
    y_pred = (y_proba >= threshold).astype(int)
    return {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        "precision": round(float(precision_score(y_true, y_pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_true, y_pred, zero_division=0)), 4),
        "f1": round(float(f1_score(y_true, y_pred, zero_division=0)), 4),
        "auc_roc": round(float(roc_auc_score(y_true, y_proba)), 4),
        "brier": round(float(brier_score_loss(y_true, y_proba)), 4),
    }


def save_plots(y_true, y_proba, out_dir, coefficients=None):
    y_pred = (y_proba >= 0.5).astype(int)

    fpr, tpr, _ = roc_curve(y_true, y_proba)
    _line_plot(fpr, tpr, "False positive rate", "True positive rate", "ROC curve",
               out_dir / "roc_curve.png", diagonal=True)

    precision, recall, _ = precision_recall_curve(y_true, y_proba)
    _line_plot(recall, precision, "Recall", "Precision", "Precision-Recall curve",
               out_dir / "pr_curve.png")

    frac_pos, mean_pred = calibration_curve(y_true, y_proba, n_bins=10, strategy="quantile")
    _line_plot(mean_pred, frac_pos, "Mean predicted probability", "Observed fraction",
               "Calibration curve", out_dir / "calibration_curve.png", diagonal=True)

    cm = confusion_matrix(y_true, y_pred)
    fig, ax = plt.subplots(figsize=(4, 4))
    ax.imshow(cm, cmap="Blues")
    ax.set_xticks([0, 1], ["pred safe", "pred fail"])
    ax.set_yticks([0, 1], ["safe", "fail"])
    for (r, c), v in np.ndenumerate(cm):
        ax.text(c, r, str(v), ha="center", va="center")
    ax.set_title("Confusion matrix (held-out)")
    fig.tight_layout()
    fig.savefig(out_dir / "confusion_matrix.png", dpi=120)
    plt.close(fig)

    if coefficients is not None:
        names, values = zip(*sorted(coefficients.items(), key=lambda kv: kv[1]))
        fig, ax = plt.subplots(figsize=(6, max(3, len(names) * 0.3)))
        ax.barh(range(len(names)), values, color="#2563eb")
        ax.set_yticks(range(len(names)), names)
        ax.set_xlabel("Logistic regression coefficient (log-odds)")
        ax.set_title("Feature coefficients")
        fig.tight_layout()
        fig.savefig(out_dir / "coefficients.png", dpi=120)
        plt.close(fig)


def _line_plot(x, y, xlabel, ylabel, title, path, diagonal=False):
    fig, ax = plt.subplots(figsize=(4, 4))
    ax.plot(x, y, color="#2563eb")
    if diagonal:
        ax.plot([0, 1], [0, 1], "--", color="#94a3b8", linewidth=1)
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    ax.set_title(title)
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)


def write_json(path, obj):
    path.write_text(json.dumps(obj, indent=2))
