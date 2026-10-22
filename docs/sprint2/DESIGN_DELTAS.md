# Design Deltas — code vs Chapter 4

Where the implementation diverges from the Chapter 4 diagrams, with the reason.
The developer should reconcile each: update the code or update the diagram.

> The Chapter 4 diagrams are not in the repo yet. Drop them in `docs/chapter4/`
> and this list will be checked against them. Until then, these are deltas
> inferred from the code and the brief's stated data model.

| # | Area | Chapter 4 (intended) | Code (actual) | Reason / action |
|---|------|----------------------|---------------|-----------------|
| D1 | Features | historical open/click/report rate, tenure, department, training-completion, difficulty, vector | exactly these (`ml/preprocessing.py`) | Matches. Older code used raw counts; updated this sprint. |
| D2 | Model score scale | 0–100 per employee | stored 0–1 (`susceptibility_scores.score`), shown ×100 | Delta: storage is 0–1, presentation is 0–100. Update diagram note or add a derived column. |
| D3 | QuizResult entity | separate `QuizResult` table | `training_quiz_attempts`, one row per attempt (questions, answers, score, pass, lesson misses); summary kept on `training_assignments` | Matches. Name differs; update the ERD label. |
| D4 | Campaign status | draft/scheduled/running/completed | added `launching`, `failed` | Delta: two states added for a safe launch handshake and honest failure reporting. Update the activity diagram. |
| D5 | Authorisation | implied | explicit `authorised_by`/`authorised_at` on campaigns | Delta: added to satisfy the ethics requirement. Add to the ERD. |
| D6 | PhishingReport | not in original ERD | `phishing_reports` table | Delta: employees can report suspicious messages (O2). Add to the ERD. |
| D7 | Scoring trigger | sequence diagram shows scoring after events | implemented as post-commit rescore in `recordEvent` | Matches intent; confirm the sequence diagram shows a live prediction never triggering training (it does not). |

## Action for the developer
Export the class, ERD, sequence and activity diagrams into `docs/chapter4/`,
walk this table against them, and either amend the diagram or raise a code
change. The report, code, UI and diagrams must describe one system.

## Template & training library expansion (2026-10-21)
The default library grew from 4 to **21 global templates** across **10 Kenyan
lure categories** (mpesa, bank, safaricom, kra, invoice, it-support, hr-payroll,
delivery, ceo-fraud, sacco) and all three difficulty levels (easy/medium/hard),
on both channels. Email templates for medium/hard use Gophish merge tags
(`{{.FirstName}}`, `{{.Position}}`) for realism; SMS uses `{{link}}`. Added as
idempotent seed rows in `migrations/004_template_library.sql`.
Training modules grew from 4 to **10** — one interactive module (read /
spot-the-flag / choice + quiz) per category, so every template category has a
matching remedial module (`training.starter.js`). New orgs get all 10 at
registration; existing orgs pick up new categories via `installStarterModules`.

## Internal sample generator (2026-10-21)
Added a client-side (in-browser) generator that produces editable example lure
drafts on demand — no external AI, no network, no API key. `portal/src/content/
banks.js` holds human-written phrase banks per category/channel/difficulty;
`generator.js` is a pure, seeded function that recombines them into a renewable
pool of drafts. In the New Campaign wizard, "Generate example messages" yields 5
editable options (category + level, or "any" for a mixed batch); saving a draft
persists it as a reusable org template via the existing `POST /templates` and
selects it. Pure logic is unit-tested (`generator.test.mjs`, 7 tests, run with
`node`). The same pure module can later be imported server-side to pick a
different variant per recipient for mixed-batch sending.

## Mixed-batch sending (2026-10-21)
A campaign can carry a `template_pool`; at launch each recipient is assigned one
variant via seeded round-robin (`migrations/005_mixed_batch.sql`,
`simulation_attempts.template_key` records which). SMS sends per-recipient
directly; email becomes one Gophish sub-campaign per variant
(`campaign_gophish_sends`), and the webhook resolves a campaign from either its
own Gophish id or any sub-send id. Portal: a "Mixed batch" toggle in the
campaign wizard turns the template list into a multi-select pool. Defeats the
"identical message to everyone at once" tell. Send-time jitter is the remaining
piece (deferred).
