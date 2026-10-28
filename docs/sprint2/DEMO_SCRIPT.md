# Sprint II Demo Script (~10 minutes)

Shows input → processing → output through every layer. Data really flows; no mock screens.

## Before the review
1. Start Docker Desktop. From the repo root:
   ```
   docker compose up -d postgres simulation-engine risk-model gophish
   npm --workspace=portal run dev       # portal on http://localhost:5173
   ```
2. Fresh demo data (clean org):
   ```
   docker compose exec simulation-engine npm run seed:demo
   ```
   Admin `admin@demo.redflag` / `Demo1234!`; employees `*@demo.redflag` / `Employee123!`.
3. For the **email** segment only: set `GOPHISH_API_KEY`, `GMAIL_USER`,
   `GMAIL_APP_PASSWORD` in `.env`, then `docker compose up -d --force-recreate
   simulation-engine` and `docker compose exec simulation-engine npm run
   gophish:setup`. If email isn't ready, run the SMS segment — it exercises the
   same loop.
4. Keep a terminal open for the live DB check.

## Demo flow
1. **Register / log in (O3).** Log in as the demo admin. Show the dashboard.
   *(New-org story: the org requests access at `/request-access`; the system
   admin approves it under Organisations, which creates the org, admin and
   starter training in one transaction and emails a set-password invite.)*
2. **Roster + CSV import (O1).** Employees page → Import CSV. Paste a small CSV
   including one bad row (bad phone). Show valid rows imported and the bad row
   reported with a reason. *(Server-side validation.)*
3. **Create + authorise a campaign (O4, ethics).** New campaign → Kenya-specific
   template (M-Pesa SMS, or Safaricom email). Show the preview marked as a
   simulation. On the launch step, show the **authorisation checkbox** — try to
   launch without it (blocked, 422), then tick it and launch.
4. **Processing (O4).** SMS: messages go through the Africa's Talking sandbox
   ("10/10 messages sent"). Email: Gophish sends to the Gmail plus-aliases.
5. **A click (O3, O4).** Click the tracking link (SMS link in the sandbox
   simulator, or the email in Gmail). Show the awareness landing page — it tells
   the employee it was a simulation and **collects nothing**.
6. **Automatic consequences.** In the live DB terminal, show the new rows:
   ```
   docker compose exec postgres psql -U redflag -d redflag -c "
     select e.full_name, sa.clicked_at, ss.score, ss.model_version, ss.low_data
     from simulation_attempts sa
     join employees e on e.id=sa.employee_id
     left join susceptibility_scores ss on ss.employee_id=e.id
     where sa.clicked_at is not null order by ss.computed_at desc limit 5;"
   ```
   Point out: click recorded, a **versioned, timestamped score**, training
   auto-assigned for that vector.
7. **Employee view (O4).** Log in as the clicked employee. Show the assigned
   module, take the quiz (server-graded, 80% to pass), show completion. Note the
   quiz never ships the answer key. Lesson misses count toward the score; a fail
   is logged, sends you back through the lessons, and the retake uses new questions.
8. **Admin analytics (O1, O2).** Org risk score, department comparison, campaign
   click/report rates, training completion. Point out honest empty states where
   there's no data yet.
9. **ML evidence (O3).** Open `risk-model/ml/runs/20261021074019_2eaeab35/`:
   `metrics.json` (baselines vs full pipeline), ROC/PR/calibration/confusion
   plots, coefficients, per-persona error analysis. State plainly: held-out
   AUC-ROC **0.71 on synthetic data**, below the 0.85 target, and why that's the
   honest number.

## Mixed scenario to show (resilience)
- A **click** (above) → training + score.
- A **report**: employee reports a message → `phishing_reports` row; reporting counts positively.
- An **ignore**: an employee who neither opens nor clicks → stays low-risk.
- **Gophish down**: stop the gophish container, launch an email campaign → 502,
  campaign shown **failed** with the reason, nothing falsely "sent".
- **Cross-tenant attempt**: log in as org A, request org B's campaign id in the
  URL → 404/empty (tenant comes from the JWT).

## Fallback
If the live stack misbehaves, screenshots of each step and the committed
`ml/runs/` artifacts stand in. Have them ready.
