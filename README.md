# Qred Card Dashboard API

Backend for the mobile card home screen. Design: [proposal.md](proposal.md) · Contract: [docs/RFC.md](docs/RFC.md)

## Requirements

- Node.js 24+
- Docker

## Run

- `npm install`
- `cp .env.example .env`
- `make db-reset` (starts Postgres, creates the tables, loads demo data)
- `npm run dev` (starts the API on http://localhost:3000)

## Explore

- API docs (Swagger UI): http://localhost:3000/docs
- OpenAPI spec: http://localhost:3000/openapi.json
- Auth header on every `/api/v1` call: `Authorization: Bearer demo`
- Request examples: [http/api.http](http/api.http)

## Endpoints

- `GET /api/v1/companies`: the user's companies
- `GET /api/v1/companies/:companyId/dashboard`: the whole home screen in one call
- `GET /api/v1/companies/:companyId/cards/:cardId`: card details
- `POST /api/v1/companies/:companyId/cards/:cardId/activate`: activate a card (idempotent)
- `GET /api/v1/companies/:companyId/invoices/:invoiceId`: invoice details
- `GET /api/v1/companies/:companyId/transactions?limit&cursor`: all transactions, newest first

## Demo data

- `cmp_1` Company AB: 5 400 of 10 000 kr used, 57 transactions, invoice due, card `crd_1` pending activation
- `cmp_2` Other AB: active card, nothing due
- `cmp_3` Stranger AB: not a member (403)

## Docker

- Whole system (Postgres + migrations + API): `make prod-up`, or `make prod-demo` with demo data
- Stop: `make prod-down`, or `make prod-clean` to delete the data
- All targets: `make help`
- Settings come from `.env` (read at runtime; not baked into the image)

## CI

- GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)): typecheck, lint, format check, build, tests, then the Docker image (pushed to GHCR on `main`)

## Other commands

- `npm run mock`: Prism mock server from the spec on http://localhost:4010
- `npm run openapi`: regenerate `docs/openapi.json` after a schema change
- `npm test`: tests (Testcontainers, needs Docker)
- `npm run typecheck`, `npm run lint`, `npm run build`
