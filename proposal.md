# Node.js Backend Developer - Case Study

## Problem definitions

From the brief, and what each one costs:

| Problem | Symptom | Remedy (below) |
|---|---|---|
| API definition happens too late | FE blocked, waits for BE | Contract before code, mock from day 1 |
| Spec skill is scarce | Few people can write a good API spec | Template + Zod as the spec, reviewed by a senior |
| PMs have limited technical depth | Stories handed to juniors are vague | PM owns the product half of the RFC, BE owns the contract half |
| FE frustrated by API delays | Idle time, rework after integration | Mock server + generated types, contract tests stop drift |
| No backend for the dashboard view | Screen cannot ship | Task 2: aggregate endpoint + resource endpoints |

## Jargon

- Business owner/admin: Target user. In charge of managing corporate credit cards and multi-company spend.
- Dashboard: A company-scoped page for card state, billing, spend, and transactions.
- Core entities:
	- Company: The legal entity the card belongs to. A user can be a member of several (the switcher).
	- Card: Issued card for the company. Physical or virtual. Status drives UI actions (e.g. Activate card).
	- Transaction: Ledger entry for the company. Visible on the dashboard as soon as it exists.
	- Invoice: Monthly statement. Created when a billing cycle closes. Settled transactions in that period are attached to it.
	- Spend limit: User-set cap for the period (the 10 000 kr in the view). Not the same as the credit limit Qred underwrites.
- Spend widget: used this period vs the limit (5 400 used of 10 000 kr). It is not the invoice amount.

## Collaboration workflow

1. Discovery (30–45 min)
PM + FE + BE go through the wireframe and name the entities, states, and actions.
The output is the product half of the RFC, written in plain language. This closes the PM's technical gap through a shared vocabulary for the domain.
Example: "Remaining spend 5 400 / 10 000" could be read as 5 400 left or 5 400 used. We settled on used, here in discovery, not in code review.

2. Contract definition (same or next day)
BE writes the Zod schemas first, then generates OpenAPI (zod-openapi): endpoints, example payloads per state, HTTP statuses, error codes.
The contract PR comes before any handlers. FE is a required reviewer (CODEOWNERS on the schemas and the spec).

3. Mocking
Prism serves a live mock from the generated spec. FE builds against it right away.
The examples cover each UI state (card pending vs active, no invoice due, no transactions), so FE can build every state before the backend exists.
FE generates typed clients from the same spec (openapi-typescript). The types come from the contract, so nobody hand-copies them.

4. Implementation and contract testing
BE implements against the spec. Tests parse every response with the same Zod schema, so the implementation cannot drift from the contract.
Additive, optional fields are non-breaking. Removing or renaming a field or changing its type is breaking and needs a new version (`/v2`) or a deprecation window.
CI diffs the spec against main (oasdiff) and fails on an unannounced breaking change.

5. Integration
FE switches the base URL from the mock to the real API. If the contract held, nothing else changes.

### Required for collaboration

- One-page API RFC per screen or feature, with owners per section:
	- PM: problem, screen, user actions, empty and error states, what "done" means
	- BE: endpoints, fields, statuses, errors, open questions
	- FE: sign-off on the contract
- Definition of Ready: a story cannot enter the sprint until its contract is merged and the mock is live
- Contract changelog, updated in the same PR as any schema change
- The template and the Zod-first setup are how spec skill scales: less experienced devs fill in a known shape, and a senior reviews one PR instead of writing the spec

### How we'd know it works

- Time from design handoff to a usable API (mock) for FE: days → hours
- Number of contract changes after implementation starts
- FE blocked time reported in retro

## Domain modeling and API design

### DB

Relational Postgres. Constraints, joins, and one consistent read matter more here than document flexibility.

```
users           id, name
companies       id, name
memberships     user_id, company_id, role                         PK(user_id, company_id)
cards           id, company_id, status, brand, last4, issued_at, activated_at
spend_limits    company_id (PK), amount_minor, currency, basis   basis = user_set_limit | credit_limit
invoices        id, company_id, period_start, period_end, due_date, amount_minor, currency, status
transactions    id, company_id, card_id, amount_minor, currency, merchant, occurred_at, status, invoice_id
```

`transactions.invoice_id` is nullable. It is set when the billing cycle closes, not when the purchase happens.
Money is stored as integer minor units (öre) + currency. No floats. Positive amount = spend, negative = refund/credit.
No PAN on cards, only last4.
Used spend is computed from transaction rows in the current period (pending and settled). Nothing is stored as a running total, so it cannot drift.
Index: `transactions(company_id, occurred_at DESC, id DESC)` serves the latest-3 query, the count, and cursor pagination.

The dashboard is company-scoped. Membership is the ACL.
The demo has one card per company, as in the mock. The schema allows N cards, and the dashboard shows the most recently issued one.

### API architecture

Everything company-scoped lives under `/companies/:companyId`, so one middleware enforces membership for the whole tree.

Resource endpoints (the chevron destinations and the one write):

```
GET  /api/v1/companies                                          switcher
GET  /api/v1/companies/:companyId/cards/:cardId                 card chevron
POST /api/v1/companies/:companyId/cards/:cardId/activate        Activate card
GET  /api/v1/companies/:companyId/invoices/:invoiceId           Invoice due chevron
GET  /api/v1/companies/:companyId/transactions?cursor&limit     "54 more items"
```

Activate is idempotent: a second call on an already-active card returns 200 with the same body and does not change `activated_at`. Activating a blocked card returns 409.
The update is a single conditional `UPDATE ... WHERE status = 'pending_activation'`, so it is safe under a double tap.

#### Aggregate endpoint

For mobile:

- Network efficiency: one round-trip on a phone connection instead of five
- Snapshot consistency: the used spend and the latest three transactions must not disagree
- Calling several resource endpoints ties FE to our internal split

BFF/aggregator: one round-trip and one point-in-time read (a single read-only REPEATABLE READ transaction):

`GET /api/v1/companies/:companyId/dashboard`

The server makes the business decisions (used and remaining amounts, which actions are enabled). The FE only renders and formats (`Intl.NumberFormat` for "5 400 kr").
Card artwork and the support link are FE-owned: artwork is chosen by `brand`, and the API sends neither image URLs nor the support URL.

Demo auth: `Authorization: Bearer demo`. Production: session/OIDC + a membership check on companyId.

Sample:

```json
{
  "asOf": "2026-09-27T10:00:00Z",
  "company": { "id": "cmp_1", "name": "Company AB" },
  "companies": [
    { "id": "cmp_1", "name": "Company AB" },
    { "id": "cmp_2", "name": "Other AB" }
  ],
  "invoiceDue": {
    "id": "inv_1",
    "status": "due",
    "dueDate": "2026-09-30",
    "amount": { "minor": 312000, "currency": "SEK" }
  },
  "card": {
    "id": "crd_1",
    "status": "pending_activation",
    "brand": "VISA",
    "last4": "4242",
    "activatedAt": null
  },
  "spend": {
    "limit": { "minor": 1000000, "currency": "SEK" },
    "used": { "minor": 540000, "currency": "SEK" },
    "remaining": { "minor": 460000, "currency": "SEK" },
    "basis": "user_set_limit"
  },
  "transactions": {
    "latest": [
      {
        "id": "txn_057",
        "merchantName": "ICA Maxi",
        "amount": { "minor": 12900, "currency": "SEK" },
        "occurredAt": "2026-09-27T08:03:00Z",
        "status": "pending"
      }
    ],
    "totalCount": 57,
    "remainingCount": 54
  },
  "actions": {
    "activateCard": { "enabled": true }
  }
}
```

Empty states are part of the contract: `invoiceDue`, `card`, and `spend` are nullable, and `latest` can be `[]` with counts of 0.

Errors share one shape: `{ "error": { "code": "COMPANY_FORBIDDEN", "message": "..." } }`
400 validation, 401 no/bad token, 403 not a member of the company, 404 entity not found in that company, 409 invalid card state.

## Implementation

Controller → Service → Repository
Node.js 24, TypeScript (strict, ESM), Express 5, Knex + pg, Zod
zod-openapi generates the OpenAPI spec from the Zod schemas; Prism mocks from it
Testing: node:test + SuperTest + Testcontainers (real Postgres, same image as compose)
The seed matches the view and uses dates relative to now, so the demo works on any day: Company AB, 5 400 of 10 000 kr used, 57 transactions, card pending activation, invoice due
Git history follows the workflow: contract commit → mock → migrations/seed → handlers → tests

## Alignment with Qred's values

- **Transparency:**
	- Teams agree before anyone writes code; the RFC records it
	- Contract, examples, and error codes are visible to all teams, and FE reviews every change
	- Contract changelog
- **Innovation:**
	- Mock server and generated types from the spec, so FE is never blocked
	- Contract-driven development, with CI enforcing it rather than trusting it
	- A BFF gives mobile one consistent read instead of several resource calls
- **Passion:**
	- Own the dashboard journey, not a single table
	- Treat FE idle time as a product defect and measure it
	- Commitment to developer experience and product velocity

## Future improvements

- Filters on the transaction list (date range, card, status)
- Breaking-change detection in CI (oasdiff)
- Real auth, rate limiting, structured logs with request ids, tracing
