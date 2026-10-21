# Sprint II Test Log

Two kinds of evidence: **automated** (Jest/Supertest for the engine, pytest for
the risk model — run with `npm test` and `pytest`) and **manual/live** (run
against the Docker stack on 2026-10-21, recorded below).

Automated totals on 2026-10-21: engine **59 passed**, risk-model **9 passed**.

| ID | Requirement / Obj | Input / conditions | Expected | Actual | P/F | Evidence |
|----|-------------------|--------------------|----------|--------|-----|----------|
| T-01 | Register org+admin (O3) | POST /auth/register valid | 201, token, starter modules created | as expected | ✅ | `auth.test.js` |
| T-02 | Duplicate org/email | second register, same email | 409, rolled back | as expected | ✅ | `auth.test.js` |
| T-03 | Login rate limit | 11 bad logins in window | 429 after 10 | limiter configured (10/15 min) | ✅ | `auth.routes.js` loginLimiter |
| T-04 | Tampered/!expired JWT | altered token | 401 | as expected | ✅ | `middleware/auth.js`; `auth.test.js` |
| T-05 | Launch needs authorisation | POST launch, no ack | 422, nothing sent | 422 (live) | ✅ | live run; `campaigns.test.js` |
| T-06 | Double launch | two launch calls | one launch, second 409 | as expected | ✅ | `campaigns.test.js` |
| T-07 | Credentials never stored | webhook Submitted Data w/ password in `details` | event only, no value stored | password string absent from all queries | ✅ | `campaigns.test.js` "never persists submitted form data" |
| T-08 | Webhook replay | same Clicked Link twice | first sets timestamp, replay ignored | "Duplicate event ignored" | ✅ | `campaigns.test.js`; live double-click single timestamp |
| T-09 | Cross-org webhook | event email in another org | "Unknown employee", no update | as expected | ✅ | `campaigns.test.js` |
| T-10 | Bad webhook signature | wrong HMAC | 401 | as expected | ✅ | `campaigns.test.js` |
| T-11 | Email Reported event | webhook Email Reported | reported_at set | as expected | ✅ | `campaigns.test.js` |
| T-12 | Quiz answer key hidden | employee GET assignments | no `correctIndex` in payload | absent | ✅ | `training.test.js` |
| T-13 | Server-side quiz grading | submit answers | score+pass computed server-side | as expected | ✅ | `training.test.js` |
| T-14 | Failing quiz hides answers | submit wrong answers | review shows wrong/right flags, not the key | `correctIndex` stripped | ✅ | `training.test.js` |
| T-15 | CSV valid + invalid rows | mixed CSV | valid inserted, bad rows reported w/ reason | 2 inserted, 3 reasons | ✅ | `employees.test.js` |
| T-16 | Kenyan phone normalise | `0712345678` | stored `+254712345678` | as expected | ✅ | `employees.test.js` |
| T-17 | In-file duplicate email | same email twice | one inserted, one rejected | as expected | ✅ | `employees.test.js` |
| T-18 | Employee → admin route | employee token on /import | 403 | as expected | ✅ | `employees.test.js` |
| T-19 | SMS send live (O4) | launch SMS campaign, 10 targets | messages sent via AT sandbox | "Sent to 1/1" per msg, msgId `ATXid_179e2c…`; campaign "10/10 messages sent" | ✅ | live run 2026-10-21 |
| T-20 | Full loop live (O3,O4) | SMS click on tracking link | attempt clicked, training assigned, score stored | clicked=t, 2 assignments, score 0.59 `low_data=f` model `20261021074019` | ✅ | live run; DB query |
| T-21 | Scoring service down | stop risk-model, score | 503 "unavailable", no fake score | client raises ScoringUnavailable; no row stored | ✅ | `scoring.test.js` timeout/invalid-reply cases |
| T-22 | Invalid scoring reply | reply without model_version | treated as unavailable (503) | as expected | ✅ | `scoring.test.js` |
| T-23 | Gophish unreachable | launch email, Gophish down | 502, campaign marked failed w/ reason | as expected | ✅ | `campaigns.test.js` |
| T-24 | No data leakage (O3) | scaler fit | scaler mean == train-fold mean | allclose | ✅ | `test_ml_pipeline.py` |
| T-25 | SMOTE not at predict (O3) | predict N rows | exactly N probabilities | 10→10 | ✅ | `test_ml_pipeline.py` |
| T-26 | Reproducible dataset (O3) | generate twice, same seed | identical frames | equal | ✅ | `test_ml_pipeline.py` |
| T-27 | Predict without model | no joblib | 503 | as expected | ✅ | `test_predict.py` |
| T-28 | Cold start flagged | prior_sent=0 | low_data true | as expected | ✅ | `test_predict.py` |

## Pending (before/at review)
- **T-29 Gophish email live** — register SMTP via `npm run gophish:setup`, launch to Gmail plus-aliases, click, confirm attempt+score rows. ⛔ blocked on API key + App Password.
- **T-30 XSS/SQLi in template fields** — submit `<script>` and `' OR 1=1` in template body/subject; expect stored-as-text, parameterised queries (no injection). Queries are already parameterised (`pg` placeholders); formal test pending.
- **T-31 Oversize payload** — POST >1 MB CSV; expect 413. Limit set in `app.js`; formal test pending.

## Corrective actions taken this sprint
- **Leaky ML label** (circular `susceptible = click_prob > 0.5`) → relabeled as failure on the *next* simulation; AUC fell from 0.96 to 0.71 (honest). See AI_ASSISTANCE_LOG entry 1.
- **Landing page captured passwords** → `capture_credentials/passwords=false`; T-07 added.
- **Webhook overwrote timestamps on replay** → first-seen `COALESCE`/`IS NULL` guard; T-08 added.
