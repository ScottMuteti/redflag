"""Load the serialized logistic-regression pipeline and its metadata.

The pipeline is produced by ml/train.py and pinned via models/metadata.json.
If RISK_MODEL_VERSION is set, its checksum in models/registry.json is verified
on load so serving can't silently drift onto a different artifact.
"""

import hashlib
import json
import os
from pathlib import Path

import joblib

MODEL_DIR = Path(__file__).resolve().parent.parent / "models"
MODEL_PATH = MODEL_DIR / "latest.joblib"
METADATA_PATH = MODEL_DIR / "metadata.json"
REGISTRY_PATH = MODEL_DIR / "registry.json"

_model = None
_metadata = None


def _verify_pinned(path):
    version = os.environ.get("RISK_MODEL_VERSION")
    if not version or not REGISTRY_PATH.exists():
        return
    registry = json.loads(REGISTRY_PATH.read_text())
    entry = next((m for m in registry.get("models", []) if m["version"] == version), None)
    if entry is None:
        raise RuntimeError(f"Pinned RISK_MODEL_VERSION {version} not in registry")
    checksum = hashlib.sha256(path.read_bytes()).hexdigest()
    if checksum != entry["sha256"]:
        raise RuntimeError(f"Model checksum mismatch for pinned version {version}")


def load_model():
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                "No trained model found. Run `python -m ml.train` first."
            )
        _verify_pinned(MODEL_PATH)
        _model = joblib.load(MODEL_PATH)
    return _model


def load_metadata():
    global _metadata
    if _metadata is None:
        _metadata = json.loads(METADATA_PATH.read_text()) if METADATA_PATH.exists() else {}
    return _metadata
