# RFC: Card home screen API

| | |
|---|---|
| Status | Accepted, contract v1.0.0 |
| Screen | Mobile app, card home (Appendix 1) |
| Contract | [`openapi.json`](openapi.json), generated from the Zod schemas in `src/modules/*/*.schema.ts` |
| Changes | [`CONTRACT_CHANGELOG.md`](CONTRACT_CHANGELOG.md) |

## Product (owner: PM)

### Problem

A business owner opens the app and needs to see at a glance, for one of their companies: whether a bill is due, their card, how much of their monthly limit they have used, and what was bought recently. A new card must be activated before it can be used.

### Screen

| # | Element | What the user sees | Tap goes to |
|---|---|---|---|
| 1 | Company switcher | Current company, list of their companies | Switches the whole screen |
| 2 | Invoice due | Banner when a bill is unpaid | Invoice details |
| 3 | Card | Card artwork, last 4 digits | Card details |
| 4 | Spend | "5 400 / 10 000 kr", based on your set limit | (limit settings, out of scope) |
| 5 | Latest transactions | 3 newest + "54 more items" | Full transaction list |
| 6 | Activate card | Button, only while the card is not activated | Activates the card |
| 7 | Contact support | Button, always | Support page (app-owned link) |

### States

- No unpaid invoice: the banner is hidden.
- No card yet: the card tile and the Activate button are hidden.
- No limit set: the spend widget is hidden.
- No transactions: the list shows an empty state, with no "more items" link.
- Card already active or blocked: the Activate button is hidden.
- The user opens a company they don't belong to: an error, and no data is shown.

### Done means

The screen loads with a single request, and every state above can be built against the mock before the backend ships.

## Contract (owner: BE)

### Endpoints

All require `Authorization: Bearer <token>` and are scoped to a company the caller belongs to.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/companies` | Company switcher |
| GET | `/api/v1/companies/{companyId}/dashboard` | The whole home screen, one snapshot |
| GET | `/api/v1/companies/{companyId}/cards/{cardId}` | Card details |
| POST | `/api/v1/companies/{companyId}/cards/{cardId}/activate` | Activate, idempotent |
| GET | `/api/v1/companies/{companyId}/invoices/{invoiceId}` | Invoice details |
| GET | `/api/v1/companies/{companyId}/transactions?cursor&limit` | Full list, newest first |

### Field rules

- Money is always `{ minor, currency }` in minor units: `540000` SEK = 5 400 kr. The app formats it; the API never sends formatted strings.
- `spend.used` is the sum of this billing period's transactions (reversed excluded). `spend.remaining = limit − used`, computed on the server.
- `transactions.latest` holds the 3 newest of all transactions, any status. It is **not** "lines on the invoice": transactions are attached to an invoice only when the billing month closes.
- `invoiceDue`, `card` and `spend` are `null` when there is nothing to show.
- `actions.activateCard.enabled` drives the button. The app does not derive it from the card status.
- Transaction `amount.minor > 0` is spend; `< 0` is a refund.
- Activation is idempotent: activating an active card returns `200` with the same card.

### Errors

One shape everywhere: `{ "error": { "code": "...", "message": "..." } }`

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Bad `limit` or `cursor` |
| 401 | `UNAUTHENTICATED` | Missing or invalid token |
| 403 | `COMPANY_FORBIDDEN` | Not a member of the company |
| 404 | `CARD_NOT_FOUND`, `INVOICE_NOT_FOUND`, `ROUTE_NOT_FOUND` | Not found in this company |
| 409 | `CARD_NOT_ACTIVATABLE` | Card is blocked |

### Mock states

`openapi.json` ships named dashboard examples for Prism (`Prefer: example=<name>`):
`pendingCard` (the wireframe), `activeCardNothingDue`, `empty`.

### Decisions

- "5 400 / 10 000 kr" means 5 400 **used** of the limit (settled in discovery).
- The card artwork and the support link belong to the app; the API sends neither.
- One aggregate endpoint for the screen (fewer round-trips, consistent numbers); resource endpoints for the detail screens.

## Sign-off (owner: FE)

- [ ] Contract reviewed and approved by FE
