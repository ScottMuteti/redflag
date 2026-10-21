# Chapter 5 — Implementation and Testing (draft notes)

Draft notes for the write-up. Formal, evidence-based, APA 7 where citing.
Each section names the evidence file the figure/table comes from. Numbers are
from the 2026-10-21 runs; do not restate them from memory — pull from the files.

## 5.1 Implementation overview
Three services: `simulation-engine` (Node/Express REST, JWT + bcrypt, RBAC,
multi-tenant), `portal` (React, admin + employee), `risk-model` (Python/FastAPI
logistic regression). PostgreSQL in 3NF with organisation-level isolation.
Integrations: Gophish (email) and Africa's Talking (SMS, sandbox).

- *Table 5.1*: components, responsibilities, ports → DEPLOYMENT_REQUIREMENTS.md.
- *Figure 5.1*: architecture (presentation / application / data / model-service).

## 5.2 Core workflow (input → processing → output)
Register → roster (manual + CSV import) → authorised campaign → send (Gophish /
AT) → tracked events (idempotent, org-scoped) → versioned score → adaptive
training by vector → dashboard.

- *Figure 5.2*: the live SMS loop — 10/10 sent, click recorded, training
  assigned, score 0.59 stored (model `20261021074019`). Evidence: TEST_LOG T-19,
  T-20.

## 5.3 Tools and why
- Express/Node: one language across engine and portal tooling; mature REST/JWT.
- PostgreSQL: relational 3NF fits the entity model; JSONB for quiz content.
- scikit-learn: logistic regression is interpretable (coefficients), suited to
  a small, explainable model (O3).
- Gophish: proven phishing-simulation engine with a REST API and webhooks.
- Africa's Talking: Kenyan SMS gateway; sandbox for safe simulation.
- *Table 5.2*: tool → role → justification.

## 5.4 Integration decisions
- Strict engine↔model JSON contract; 5 s timeout; a reply without
  `model_version` is treated as unavailable (no fake score). Evidence: T-21, T-22.
- Event ingestion is idempotent and transactional (event + training assignment),
  with rescoring after commit. Evidence: T-08, T-20.
- Tenant identity always from the JWT, never the request body. Evidence: T-09, T-18.
- A live prediction never triggers training (only tracked failures do).

## 5.5 Initial testing results
- Automated: engine 59, risk-model 9 (2026-10-21). Evidence: TEST_LOG.
- Manual/live: full SMS loop, authorisation gate, replay safety, scoring outage.
- *Table 5.3*: the test log (import TEST_LOG.md).

## 5.6 Initial ML evaluation
Question (O3): can simulation-behaviour features predict failure on the *next*
simulation? Data: persona-based **synthetic** (400 employees, 6 campaigns,
mid-point training intervention), label = failure on the next campaign — no
leakage (features from the past only).

Pipeline: KNN impute + scale / one-hot → SMOTE in training folds only →
logistic regression; 80/20 split, stratified 5-fold CV, GridSearchCV in-fold.

Results (held-out, synthetic):
- Majority-class AUC 0.50; plain LR AUC 0.70; full pipeline AUC **0.71**
  (CV 0.718 ± 0.036). SMOTE lifts recall 0.17 → 0.62.
- **Target AUC ≥ 0.85 NOT met.** State plainly: the honest, non-circular label
  is harder; early-campaign rows (little history) are near-unpredictable, which
  supports the cold-start low-data flag. These are synthetic-data numbers and
  say nothing about real-world effectiveness.
- *Figures 5.3–5.7*: ROC, PR, calibration, confusion, coefficients from
  `ml/runs/20261021074019_2eaeab35/`.
- *Table 5.4*: metrics.json (baselines vs full pipeline).

Calibration: see the calibration curve + Brier (0.215). A raw score is **not** a
calibrated probability; the UI labels it "risk score", never "confidence".

## 5.7 Honesty and limitations
Synthetic data; SMS sandbox only; email live-run pending the Gophish key at time
of writing; single-organisation pilot to come. See the known-issues section of
SPRINT2_BOARD.md.

## 5.8 Security by design
- **Least public surface.** The engine runs two listeners: the full admin API
  (port 4000, private) and a separate internet-facing app (port 4001) that
  mounts *only* the click-tracking endpoint. Only the public port is exposed
  (a Cloudflare quick tunnel locally; a gateway in production). Reaching an
  admin path on the public URL is a 404 — the route is not in that process —
  so containment holds by architecture, not by remembering to close a tunnel.
  Guaranteed by `tests/public-app.test.js`. Decision: `docs/decisions/003`.
- Tracking tokens are opaque random values (no tenant data on the public path);
  the Gophish webhook is HMAC-signed and stays on the private network.
- Tenant identity always from the JWT; credentials never captured by the
  landing pages (`capture_credentials:false`); quiz answer keys stripped from
  employee payloads.
- *Table 5.5*: public vs private surface → DEPLOYMENT_REQUIREMENTS.md.
