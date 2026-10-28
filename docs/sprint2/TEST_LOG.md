# Sprint II Test Log

Two kinds of evidence: **automated** (Jest/Supertest for the engine, pytest for
the risk model — run with `npm test` and `pytest`) and **manual/live** (run
against the Docker stack on 2026-10-21, recorded below).

Automated totals on 2026-10-22: engine **70 passed**, risk-model **9 passed**. On 2026-10-28: engine **103 passed**.

| ID | Requirement / Obj | Input / conditions | Expected | Actual | P/F | Evidence |
|----|-------------------|--------------------|----------|--------|-----|----------|
| T-01 | Register org+admin (O3) | POST /auth/register valid | 201, token, starter modules created | as expected (superseded 2026-10-28: sign-up closed, see T-48) | ✅ | `auth.test.js` |
| T-02 | Duplicate org/email | second register, same email | 409, rolled back | as expected (superseded, see T-49) | ✅ | `auth.test.js` |
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
| T-31 | Public surface isolation | admin paths on public app (4001) | 404 (route not mounted); track served | `/api/employees`→404 on 4001 vs 401 on 4000; 3 asserts | ✅ | `public-app.test.js`; live curl |
| T-29 | Gophish email live (O4) | launch email campaign, click link in Gmail via public tunnel | webhook fires, attempt+score rows | external click → webhook → clicked=t, training assigned, score 0.45 recomputed; untargeted employee untouched | ✅ | live run 2026-10-21; DB query |
| T-30 | Injection in template fields | `<script>…'; DROP TABLE employees;--` in body | stored as text; bound parameter, not inline SQL | param contains the string verbatim; SQL has no `DROP TABLE` | ✅ | `campaigns.test.js` |
| T-32 | Full loop via public port | SMS click on the tunnelled public URL (:4001) | click recorded, training assigned, score rescored | emp 34: clicked=t 14:49:58, training 1→2, score 5→6; emp 30 score 0.5942→0.6151 model `20261021074019` | ✅ | live run 2026-10-21; DB query |
| T-33 | Mixed-batch variant spread | launch pooled SMS campaign (3 variants) to 10 | each recipient gets one variant, evenly | 10/10 sent, spread 4/3/3; click via public tunnel recorded variant `mpesa-sms-easy` | ✅ | `campaigns.test.js` + live run 2026-10-21 |
| T-34 | Oversize payload | POST >1 MB CSV | 413 | 413 | ✅ | `employees.test.js` |
| T-35 | Failed quiz recorded (O4) | score below 80% | status `failed`, attempt logged | `failed`; row in `training_quiz_attempts` | ✅ | `training.test.js`; live run 2026-10-22 |
| T-36 | Retake gets new questions (O4) | start quiz after a failed attempt | questions not in the last attempt; options shuffled | 3 new of 6; same set on resume | ✅ | `training.test.js`; live run 2026-10-22 |
| T-37 | Lesson misses count (O4) | 6 misses, perfect quiz | combined score < 80%, fail | lessons 45%, quiz 100%, overall 66%, failed | ✅ | `training.test.js`; live run 2026-10-22 |
| T-38 | Retake needs lessons redone (O4) | start quiz after a fail, lessons not redone | 409 | 409; lessons reset to 0 | ✅ | `training.test.js`; live run 2026-10-22 |
| T-39 | Email 2FA on login | correct password | challenge only, no token; code verifies once | as expected | ✅ | `auth.test.js` |
| T-40 | 20-min session | verify code | JWT exp − iat = 1200 s | as expected | ✅ | `auth.test.js` |
| T-41 | Google, pre-approved only | verified Google email, no account | 403 NOT_APPROVED | as expected | ✅ | `auth.test.js` |
| T-42 | Passkey, unknown credential | assertion for unregistered passkey | 403 NOT_APPROVED | as expected | ✅ | `auth.test.js` |
| T-43 | Suspended org blocked | valid code, org suspended | 403 ORG_SUSPENDED | as expected | ✅ | `auth.test.js` |
| T-44 | Password reset | forgot (known/unknown), reset (valid/used/short) | same reply either way; token single-use | as expected | ✅ | `auth.test.js` |
| T-45 | System admin isolation | org admin calls /api/system | 403 | as expected | ✅ | `system.test.js` |
| T-46 | Onboard org + invite | system admin POST /system/organizations | 201, set-password link emailed | as expected | ✅ | `system.test.js` |
| T-48 | Sign-up closed | POST /auth/register; POST /auth/access-requests | 404; 202, request stored, nothing else created, platform admins notified | as expected | ✅ | `auth.test.js` |
| T-49 | Approve request | system admin approves pending request | org + admin + starter modules in one transaction, invite emailed; re-approve 404 | as expected | ✅ | `system.test.js` |
| T-50 | Decline request | system admin declines | 204, contact emailed | as expected | ✅ | `system.test.js` |
| T-47 | Send window | sendWindowMinutes 5000 / 60 | 400 / stored | as expected | ✅ | `system.test.js` |

## Pending (before/at review)
- **Integration tests against a real Postgres in CI** — unit tests currently mock the DB; wiring a Postgres service container into CI is cut to Sprint III (documented on the board).

## Corrective actions taken this sprint
- **Leaky ML label** (circular `susceptible = click_prob > 0.5`) → relabeled as failure on the *next* simulation; AUC fell from 0.96 to 0.71 (honest). See AI_ASSISTANCE_LOG entry 1.
- **Landing page captured passwords** → `capture_credentials/passwords=false`; T-07 added.
- **Webhook overwrote timestamps on replay** → first-seen `COALESCE`/`IS NULL` guard; T-08 added.
