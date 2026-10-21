# Sprint II Board — Core Functionality, Integration, Initial Testing

Scrum Master/Developer: Scott Muteti. Product Owner: Mr. James Gikera.
Objectives: **O1** vulnerability assessment · **O2** measurement challenges ·
**O3** logistic-regression prediction/monitoring · **O4** email+SMS simulation
with adaptive training.

Status key: ✅ done · 🟡 in progress · ⛔ blocked · ⬜ not started.

## Tasks

| ID | Task | Obj | Status | Evidence |
|----|------|-----|--------|----------|
| S2-01 | Versioned DB migrations runner | O3 | ✅ | `simulation-engine/src/db/migrate.js`, `migrations/00*.sql`; commit `refactor(db)` |
| S2-02 | Auth + multi-tenancy (register, JWT, roles, rate limit) | O3,O4 | ✅ | `auth.routes.js`, `middleware/auth.js`; `tests/auth.test.js` |
| S2-03 | Employee roster CRUD, tenant-scoped | O1 | ✅ | `employees.routes.js` |
| S2-04 | Validated CSV roster import | O1 | ✅ | `POST /employees/import`; `tests/employees.test.js`; TEST_LOG T-15..T-18 |
| S2-05 | Kenya-specific template library (4 lures, difficulty) | O4 | ✅ | `migrations/001`, `002`; `GET /campaigns/templates` |
| S2-06 | Launch authorisation acknowledgement (who/when stored) | ethics | ✅ | `campaigns.routes.js`; TEST_LOG T-05; live 422 verified |
| S2-07 | Email campaigns via Gophish (launch, idempotent webhook) | O4 | ✅ | Live external click via Cloudflare tunnel → webhook → clicked, training, score 0.45; TEST_LOG T-29 |
| S2-08 | SMS campaigns via Africa's Talking sandbox | O4 | ✅ | Live: 10/10 sent, msgId `ATXid_179e2c…`; TEST_LOG T-19 |
| S2-09 | Safe landing page (never captures credentials) | ethics | ✅ | `gophishClient.createLandingPage`, `gophish/setup.js`; TEST_LOG T-07 |
| S2-10 | Replay-safe, org-scoped event ingestion | O3 | ✅ | `recordEvent`; `tests/campaigns.test.js` (replay, cross-org, no-store) |
| S2-11 | ML pipeline: data gen, train, evaluate, run folder | O3 | ✅ | `risk-model/ml/`, `ml/runs/20261021074019_2eaeab35/` |
| S2-12 | Scoring integration (events → features → stored score) | O3 | ✅ | `scoring.service.js`, `scoringClient.js`; live score 0.59 after click |
| S2-13 | Cold-start low-data flag | O3 | ✅ | `ml/predict.py`; `tests/test_predict.py` |
| S2-14 | Adaptive training by failed vector + server-graded quiz | O4 | ✅ | `training.routes.js`; TEST_LOG T-12..T-14 |
| S2-15 | Analytics dashboard (org/dept/campaign/training) | O1,O2 | ✅ | `AnalyticsPage.jsx` — honest empty state per panel (trend/range/funnel/departments); null org score shows — |
| S2-16 | Score display: value/100, date, version, low-data badge | O2 | ✅ | `EmployeesPage.jsx` detail: /100, computed date, model version, low-data badge, "no score yet" state |
| S2-17 | Security/failure test sweep | all | ✅ | 64 Jest + 9 pytest: cross-org, tokens, rate limit, injection (T-30), replay, double-launch, scoring/Gophish down, public-surface isolation (T-31) |
| S2-18 | Docs: board, test log, traceability, ch5, decisions, demo | all | ✅ | `docs/sprint2`, `TRACEABILITY.md`, `chapter5`, `decisions/001-003` |
| S2-19 | Deployment requirements write-up | — | ✅ | `DEPLOYMENT_REQUIREMENTS.md` |

## Known issues / outstanding defects
- **ML AUC-ROC 0.71 on synthetic data, below the 0.85 target.** Honest: the non-circular label (predict the *next* simulation's outcome) is genuinely harder than the previous leaky setup. See `TEST_LOG` T-20 and Chapter 5 notes.
- **Africa's Talking is sandbox** — SMS links are clickable externally (via the public tunnel) but messages land in the AT simulator, not a real handset. A real handset needs a paid AT account + a CA-approved sender ID. Documented limitation.
- Test DB for integration tests is not yet wired into CI (unit tests mock the DB) — cut to Sprint III.

## Cut to Sprint III
Playwright E2E, full accessibility sweep, normalised `quiz_results` table, Makefile, actual deployment, retrain on real pilot data (issue #6).
