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
| D3 | QuizResult entity | separate `QuizResult` table | quiz state on `training_assignments` (`quiz_attempts`, `last_score`, `last_attempt_at`) | Delta: denormalised onto the assignment. Normalise to `quiz_results` in Sprint III if the diagram requires per-attempt history. |
| D4 | Campaign status | draft/scheduled/running/completed | added `launching`, `failed` | Delta: two states added for a safe launch handshake and honest failure reporting. Update the activity diagram. |
| D5 | Authorisation | implied | explicit `authorised_by`/`authorised_at` on campaigns | Delta: added to satisfy the ethics requirement. Add to the ERD. |
| D6 | PhishingReport | not in original ERD | `phishing_reports` table | Delta: employees can report suspicious messages (O2). Add to the ERD. |
| D7 | Scoring trigger | sequence diagram shows scoring after events | implemented as post-commit rescore in `recordEvent` | Matches intent; confirm the sequence diagram shows a live prediction never triggering training (it does not). |

## Action for the developer
Export the class, ERD, sequence and activity diagrams into `docs/chapter4/`,
walk this table against them, and either amend the diagram or raise a code
change. The report, code, UI and diagrams must describe one system.
