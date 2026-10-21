# Deployment Requirements (Sprint III target)

Not deployed yet. This captures what each component needs so Sprint III can execute.

## Components

| Component | Runtime | Port | Health | External deps |
|-----------|---------|------|--------|---------------|
| simulation-engine | Node 20 / Express | 4000 | `GET /health` | Postgres, risk-model, Gophish, Africa's Talking |
| risk-model | Python 3.11 / FastAPI | 8000 | `GET /health` | pinned model artifact at startup |
| portal | React build (static) | 80 | — | simulation-engine API |
| postgres | PostgreSQL 16 | 5432 | — | persistent volume |
| gophish | Gophish 0.12 | 3333 (admin), 8080 (phish) | — | reachable SMTP; public HTTPS for tracking + webhooks |

## Secrets (externalised, never in git)
`JWT_SECRET` (strong; engine refuses the placeholder in production),
`GOPHISH_API_KEY`, `GOPHISH_WEBHOOK_SECRET`, `GMAIL_USER`/`GMAIL_APP_PASSWORD`
(or another SMTP relay), `AT_API_KEY`, DB credentials. All documented in
`.env.example`.

## Hard realities
- **Gophish needs a public, reachable listener** for tracking pixels, click
  links and webhooks. `localhost` works only for a local demo. Production needs
  public HTTPS (a domain + TLS) pointing at the phish server, and the webhook
  URL must reach the engine.
- **Africa's Talking is sandbox only** — no custom sender ID, messages go to the
  simulator. A production sender ID needs AT approval, which is in tension with
  their acceptable-use policy for phishing simulation. Documented limitation.
- **The Python scoring service is not a static/edge workload** — it loads a
  scikit-learn model and needs a real Python runtime (container host), not
  Cloudflare Pages/Workers.
- The model must load at startup from a **pinned** artifact (`RISK_MODEL_VERSION`
  + checksum in `models/registry.json`), not retrain on boot in production.

## Candidate routes (to agree with the PO)
- Portal: Cloudflare Pages / Netlify (static).
- Engine + risk-model + Postgres + Gophish: a container host (Render, Fly.io,
  AWS ECS, or a single VPS with Docker Compose). Gophish and the engine need
  public HTTPS endpoints.
- Cost: keep to free/low tiers for the pilot; Postgres managed or on the VPS.

## Pre-deploy checklist
- [ ] All services containerised with pinned deps and `/health` (engine, risk-model done).
- [ ] Config fully externalised (done via env).
- [ ] Model artifact pinned and checksum-verified on load (done).
- [ ] Migrations run on deploy (`npm run migrate`).
- [ ] Public HTTPS + domain for Gophish tracking and webhooks.
- [ ] Backups for Postgres.
