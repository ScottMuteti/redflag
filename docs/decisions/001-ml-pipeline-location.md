# 001 — ML pipeline lives in `risk-model/ml/`

**Date:** 2026-10-21
**Status:** Accepted

## Context
The Sprint II brief puts the offline ML pipeline in a top-level `ml/` folder. The repo already has a `risk-model/` service (FastAPI serving + the training code).

## Options
1. Top-level `ml/` as the brief says; `risk-model/` imports from it.
2. `risk-model/ml/` next to the serving app; both share one `preprocessing.py`, one requirements file, one Docker image.

## Decision
Option 2. The offline pipeline and the serving app share a feature contract (`ml/preprocessing.py`), so keeping them in one package avoids a second dependency set and a cross-package import path. One `pip install`, one image.

## Consequence
Deviation from the brief's literal layout, recorded here. `python -m ml.train` and `uvicorn app.api:app` both run from `risk-model/`. If the ML work later grows into its own service, it can move out with the contract intact.
