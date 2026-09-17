# RedFlag

Simulates phishing/smishing attacks and predicts employee susceptibility with
logistic regression. Final year project for Kenyan organizations.

## Stack

- Backend: Node/Express, JWT + bcrypt auth, RBAC
- Frontend: React (Vite) — admin + employee portals
- DB: PostgreSQL, 3NF, multi-tenant
- ML: Python/scikit-learn logistic regression scoring service
- Integrations: Gophish (email), Africa's Talking (SMS)

## Layout

```
/backend      Express API
/frontend     React app
/ml-service   Python scoring microservice
```

## Run locally

1. Create a `.env` (see `docker-compose.yml` / `backend/src/config/env.js`)
2. `docker compose up --build`

Ports: Postgres `5432`, backend `4000`, ml-service `8000`, frontend `5173`.

Or run each service on its own: `npm run dev` (backend/frontend) or
`uvicorn app.api:app --reload` (ml-service, after `pip install -r requirements.txt`).

## Status

Scaffolding only — no app logic yet.
