# Contract changelog

Every change to `src/modules/*/*.schema.ts` or `docs/openapi.json` gets an entry here, in the same PR.
Additive, optional changes bump the minor version. Removing, renaming or retyping a field is breaking: it needs a new major version (`/api/v2`) or a deprecation window agreed with FE.

## 1.1.0 (2026-09-27)

- `POST .../cards/{cardId}/activate` is admin-only. Members get `403` with the new error code `ROLE_FORBIDDEN`.
- `actions.activateCard.enabled` is `false` for members.

## 1.0.0 (2026-09-27)

Initial contract for the card home screen.

- `GET /api/v1/companies`
- `GET /api/v1/companies/{companyId}/dashboard`, with mock examples `pendingCard`, `activeCardNothingDue` and `empty`
- `GET /api/v1/companies/{companyId}/cards/{cardId}`
- `POST /api/v1/companies/{companyId}/cards/{cardId}/activate`
- `GET /api/v1/companies/{companyId}/invoices/{invoiceId}`
- `GET /api/v1/companies/{companyId}/transactions`
- Shared `Money` and `ErrorResponse` schemas
