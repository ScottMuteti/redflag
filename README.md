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
`uvicorn app.api:app --reload` (ml-service, Python 3.11, after `pip install -r requirements.txt`).

## ML model

- Docker: trains on first start if `ml-service/models/latest.joblib` is missing
- Manual: `python -m app.generate_sample_data && python -m app.train` (in `ml-service/`)
- Trained on synthetic data until real simulation history exists

## Status

- Auth, org registration, employee roster
- Email (Gophish) and SMS (Africa's Talking) campaigns, scheduling, template customisation
- Susceptibility scoring, adaptive training with quizzes, analytics dashboard

## Known constraints

- Africa's Talking sandbox: no custom sender ID; messages go to the simulator only
- Schema is a single `schema.sql` run on first DB init — no migration tool yet
