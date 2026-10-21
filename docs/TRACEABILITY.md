# Traceability Matrix

Objective/requirement → component → test/evaluation → evidence. Seeded in
Sprint II; extended in Sprint III.

| Objective | Requirement | Component(s) | Test / Evaluation | Evidence |
|-----------|-------------|--------------|-------------------|----------|
| O1 | Assess employee vulnerability | roster (`employees.routes.js`), scores (`susceptibility_scores`), analytics | T-01, T-15..T-18 | board S2-03/04, per-employee score in portal |
| O1 | Import a real roster | CSV import `POST /employees/import` | T-15..T-18 | `employees.test.js` |
| O2 | Measure & compare awareness | analytics (`analytics.routes.js`): org risk, dept comparison, click/report rates, training completion | (dashboard, manual) | portal admin Overview/Analytics |
| O3 | Predict vulnerability (logistic regression) | `risk-model/ml/` pipeline | T-24..T-28, run metrics | `ml/runs/20261021074019_2eaeab35/metrics.json` |
| O3 | No leakage / honest evaluation | `ml/train.py`, `ml/preprocessing.py` | T-24, T-25, T-26 | `test_ml_pipeline.py` |
| O3 | Monitor over time (versioned, timestamped) | `susceptibility_scores`, `scoring.service.js` | T-20, T-21 | live score history (3 rows, 3 model versions) |
| O3 | Cold-start handling | `ml/predict.py` low_data | T-28 | `test_predict.py` |
| O4 | Email simulation | Gophish client + `gophish/setup.js` + webhook | T-05..T-11, T-23; T-29 pending | `campaigns.test.js` |
| O4 | SMS simulation | AT client, tracking link | T-19, T-20 | live run (msgId `ATXid_179e2c…`) |
| O4 | Adaptive training by vector | `training.routes.js`, `maybeAssignTraining` | T-12..T-14, T-20 | decision 002; live 2 assignments after click |
| ethics | Authorised targets only | launch ack + stored approver | T-05 | live 422; migration 003 |
| ethics | Never store credentials | safe landing page + webhook drops `details` | T-07 | `campaigns.test.js` |
| ethics | Server-side permissions, tenant from JWT | `middleware/auth.js`, tenant-scoped queries | T-04, T-09, T-18 | tests |

## Gaps to close (Sprint III)
- O2 dashboard needs documented empty/loading/error states verified against real data.
- O4 email path needs the live Gophish run (T-29).
- Real pilot data evaluation (min 30 employees, two waves) — issue #6.
