# AI Assistance Log — Sprint II

Material AI assistance (Claude Code) during Sprint II, for institutional
disclosure. The developer reviewed and accepted/rejected each change; drafts
below are for the developer to edit.

## Entry 1 — Verified: leaky ML label (accepted)
**AI suggestion:** The baseline model's reported AUC-ROC (CV 0.946, holdout
0.967) was inflated by target leakage. The label was `susceptible = click_prob
> 0.5`, and `click_prob` is the same latent quantity that generates `clicked`
and `click_rate`, which were input features. The target also described the
present, not a future event.
**What I checked:** Read `generate_sample_data.py`. Confirmed `click_prob`
drives both the label and the `clicked`/`click_rate` features — circular.
**Decision:** Accepted. Rewrote the generator so each row's features summarise
past campaigns and the label is failure on the *next* campaign (temporal
separation, no leakage). Added `test_ml_pipeline.py` leakage checks.
**Result:** Honest held-out AUC-ROC fell to 0.71. Below the 0.85 target, and
reported as such. This is the more defensible number.

## Entry 2 — Accepted: safety fixes
**AI suggestion:** (a) the Gophish landing page captured credentials/passwords;
(b) launches had no authorisation step; (c) employees received the quiz answer
key in the API payload.
**What I checked:** Reproduced each in code. (a) `capture_credentials:true`;
(b) no ack field or stored approver; (c) `correctIndex` present in
`GET /training/assignments`.
**Decision:** Accepted all three. Landing page captures nothing; launch/schedule
require `acknowledgeAuthorisation` and store approver+timestamp; answer key
stripped server-side.

## Entry 3 — (developer to complete)
Record one suggestion you **rejected or modified**, with your reasoning, so the
log shows genuine oversight, not blanket acceptance.

## How AI was used
- Pair-programming on the engine, ML pipeline, portal and tests.
- All generated code was run (unit tests, live stack) before acceptance.
- Secrets were never handled by the AI; the developer placed them in `.env`.
