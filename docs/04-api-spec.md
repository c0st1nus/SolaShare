# API Specification

## Overview

The MVP uses a REST API.

Base prefix:

`/api/v1`

Interactive documentation:

- Scalar UI: `/openapi`
- OpenAPI JSON: `/openapi/json`

Primary responsibilities:
- authentication
- asset browsing
- issuer management
- investment flow support
- revenue posting orchestration
- claim flow preparation
- portfolio delivery
- admin controls

The backend persists real workflow state in PostgreSQL. Prepare endpoints return base64-encoded
Solana VersionedTransactions for client-side wallet signing. Wallet binding uses Ed25519 signature
verification with anti-replay protection.

Frontend integration note:

- this document is the human-readable API contract
- `/openapi` is the interactive source for current route shapes
- `/openapi/json` is the machine-readable contract for tooling or codegen
- frontend should integrate against the contract shape

---

## Current API Status

Current backend status:

- route structure is implemented
- request and response contracts are stabilized with Zod/OpenAPI
- issuer, admin, investment, revenue, claim and portfolio flows persist workflow state in PostgreSQL
- `operation_id` is returned from preparation endpoints and must be sent back to `POST /transactions/confirm`
- auth and role checks below are enforced by the backend
- prepare endpoints return `serialized_tx` (base64 VersionedTransaction), `metadata`, `expires_at`, and `network`

---

## Common Conventions

### Base URL

- local development: `http://localhost:3000`
- API base prefix: `/api/v1`

### Content Type

All write requests must use:

`Content-Type: application/json`

### Authentication Header

Authenticated requests must send:

`Authorization: Bearer <access_token>`

### Idempotency Header

All write endpoints that may create or mutate state should support:

`Idempotency-Key: <unique-client-key>`

Recommended frontend behavior:

- generate a unique key per user action submission
- reuse the same key when retrying the exact same request
- do not reuse one key for different payloads

### Standard Success Patterns

Responses generally follow one of these shapes:

- resource payload
- collection payload with `items` and optional `pagination`
- operation payload with `success: true`

### Standard Error Pattern

```json
{
  "error": {
    "code": "ASSET_NOT_FOUND",
    "message": "Asset not found"
  }
}
```

### Expected Status Codes

- `200 OK` successful read or operation
- `400 Bad Request` malformed request
- `401 Unauthorized` missing or invalid auth
- `403 Forbidden` authenticated but not allowed
- `404 Not Found` entity not found
- `409 Conflict` state transition or idempotency conflict
- `422 Unprocessable Entity` validation error
- `500 Internal Server Error` unexpected backend error

---

## Access Matrix

| Endpoint Group | Access | Notes |
| --- | --- | --- |
| `GET /assets*` | Public | public catalog and investor-facing asset data |
| `POST /auth/register` | Public | password-based signup |
| `POST /auth/login` | Public | password-based login |
| `POST /auth/refresh` | Public | refresh-token rotation |
| `POST /auth/logout` | Public | refresh-session revocation |
| `GET /auth/google/url` | Public | build Google OAuth URL |
| `POST /auth/google` | Public | exchange Google code |
| `POST /auth/telegram` | Public | Telegram Mini App login entrypoint |
| `POST /auth/telegram/login` | Public | Telegram Login Widget entrypoint |
| `GET /auth/me` | Authenticated user | current auth profile |
| `POST /auth/wallet/link` | Authenticated user | links wallet to current user |
| `POST /issuer/*` | Authenticated user | current user must own target asset |
| `GET /me/*` | Authenticated user | current user read models |
| `POST /investments/*` | Authenticated investor | active sale only |
| `POST /claims/prepare` | Authenticated investor | only for claimable revenue |
| `POST /transactions/confirm` | Authenticated user or internal flow | post-signature sync |
| `POST /admin/*` | Authenticated admin | strongly protected |
| `GET /admin/audit-logs` | Authenticated admin | operational visibility |

---

## Enums And Shared Values

### User Roles

- `investor`
- `issuer`
- `admin`

### Asset Status

- `draft`
- `pending_review`
- `verified`
- `active_sale`
- `funded`
- `frozen`
- `closed`

### Energy Type

- `solar`
- `wind`
- `hydro`
- `ev_charging`
- `other`

### Asset Document Type

- `ownership_doc`
- `right_to_income_doc`
- `technical_passport`
- `photo`
- `meter_info`
- `financial_model`
- `revenue_report`
- `other`

### Storage Provider

- `arweave`
- `ipfs`
- `s3`

### Revenue Source Type

- `manual_report`
- `meter_export`
- `operator_statement`

### Revenue Status

- `draft`
- `posted`
- `settled`
- `flagged`

### Verification Outcome

- `approved`
- `rejected`
- `needs_changes`

### Transaction Kind

- `investment`
- `claim`
- `revenue_post`
- `wallet_link`

---

## Pagination, Filtering, Sorting

### Pagination

Collection endpoints use:

- `page` starting from `1`
- `limit` default `20`

Response pagination shape:

```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

### Public Asset List Filters

`GET /assets` supports:

- `status`
- `energy_type`
- `page`
- `limit`
- `sort`

Supported `sort` values:

- `newest`
- `yield_desc`
- `price_asc`

---

## Authentication

## Auth Session Shape

Successful authentication endpoints return:

```json
{
  "access_token": "token",
  "refresh_token": "refresh-token",
  "token_type": "Bearer",
  "expires_in": 900,
  "user": {
    "id": "uuid",
    "email": "ops@solashare.dev",
    "display_name": "Konstantin",
    "role": "investor",
    "auth_providers": ["password", "google"]
  }
}
```

Notes:

- `access_token` is sent as `Authorization: Bearer <access_token>`
- `refresh_token` is sent back to `POST /auth/refresh` and `POST /auth/logout`
- `auth_providers` reflects linked local identities known by the backend

---

## POST /auth/register

Creates a normal browser account with email and password.

Access:

- public

### Request

```json
{
  "email": "ops@solashare.dev",
  "password": "Password123!",
  "display_name": "Konstantin"
}
```

### Notes

- the backend stores only a password hash
- self-serve registration currently creates an `investor` account

---

## POST /auth/login

Authenticates a password user.

Access:

- public

### Request

```json
{
  "email": "ops@solashare.dev",
  "password": "Password123!"
}
```

### Notes

- returns the standard auth session shape
- invalid credentials return `401 Unauthorized`

---

## POST /auth/refresh

Rotates a refresh token and returns a new session pair.

Access:

- public

### Request

```json
{
  "refresh_token": "refresh-token"
}
```

### Notes

- refresh tokens are persisted server-side as hashes in `user_sessions`
- refresh rotation revokes the previous refresh session

---

## POST /auth/logout

Revokes a refresh session.

Access:

- public

### Request

```json
{
  "refresh_token": "refresh-token"
}
```

### Response

```json
{
  "success": true
}
```

---

## GET /auth/me

Returns the current authenticated auth profile.

Access:

- authenticated user

### Response

```json
{
  "user": {
    "id": "uuid",
    "email": "ops@solashare.dev",
    "display_name": "Konstantin",
    "role": "investor",
    "auth_providers": ["password", "google"]
  }
}
```

---

## GET /auth/google/url

Builds the Google OAuth authorization URL.

Access:

- public

### Query params

- `redirect_uri` optional override
- `state` optional frontend correlation value

### Response

```json
{
  "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=..."
}
```

---

## POST /auth/google

Exchanges a Google authorization code for a local session.

Access:

- public

### Request

```json
{
  "code": "4/0AdQt8qh...",
  "redirect_uri": "https://web.solashare.test/auth/oauth/google/callback"
}
```

### Notes

- Google is used only to prove identity; SolaShare still issues its own local session
- when the Google email matches an existing local identity email, the provider is linked to that user

---

## POST /auth/telegram/login

Authenticates a browser user through the Telegram Login Widget payload.

Access:

- public

### Request

```json
{
  "id": "777000",
  "first_name": "Konstantin",
  "username": "waveofem",
  "auth_date": "1710000000",
  "hash": "telegram-widget-signature"
}
```

### Notes

- the backend validates the Telegram signature before issuing a local session
- this route is intended for normal browser sign-in, not Mini App launch auth

---

## POST /auth/telegram

Authenticates a user through Telegram Mini App init data.

Access:

- public

### Request

```json
{
  "telegram_init_data": "query_id=AAE...&user=%7B...%7D&auth_date=1710000000&hash=..."
}
```

### Notes

- this is the preferred auth path when the site is opened inside Telegram Mini App
- `POST /auth/telegram/miniapp` is an alias of the same flow in the backend

---

## POST /auth/wallet/link

Links a wallet to an authenticated user.

Access:

- authenticated user

### Request

```json
{
  "wallet_address": "wallet_pubkey",
  "signed_message": "signature_payload"
}
```

### Response

```json
{
  "success": true
}
```

### Frontend notes

- wallet signing UX happens client-side before this call
- this endpoint stores or refreshes a pending wallet binding request
- finalize the binding with `POST /transactions/confirm` using `kind: "wallet_link"`
- wallet linking is post-login account binding, not an authentication method
- cryptographic wallet signature verification is implemented via `/wallet/challenge` and `/wallet/verify`

---

## Assets - Public

## GET /assets

Returns paginated asset list.

Access:

- public

### Query params

- `status`
- `energy_type`
- `page`
- `limit`
- `sort`

### Response

```json
{
  "items": [
    {
      "id": "asset-1",
      "title": "Solar Farm A",
      "energy_type": "solar",
      "capacity_kw": 150,
      "status": "active_sale",
      "price_per_share_usdc": 10,
      "expected_annual_yield_percent": 12.5
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

### Frontend notes

- this is the primary catalog endpoint
- cards should be renderable from this payload alone
- values should be treated as summary-level display data

---

## GET /assets/:id

Returns a detailed asset card.

Access:

- public

### Includes

- asset metadata
- issuer summary
- sale terms
- public documents
- revenue summary
- on-chain references
- status
- investor-facing proof links

### Example response

```json
{
  "id": "asset-1",
  "slug": "solar-farm-a",
  "title": "Solar Farm A",
  "short_description": "Yield-bearing solar farm asset",
  "full_description": "Detailed asset description",
  "energy_type": "solar",
  "status": "active_sale",
  "location": {
    "country": "Kazakhstan",
    "region": "Almaty Region",
    "city": "Almaty"
  },
  "capacity_kw": 150,
  "currency": "USDC",
  "expected_annual_yield_percent": 12.5,
  "issuer": {
    "id": "issuer-uuid",
    "display_name": "SolaShare Issuer"
  },
  "sale_terms": {
    "valuation_usdc": "100000.000000",
    "total_shares": 10000,
    "price_per_share_usdc": "10.000000",
    "minimum_buy_amount_usdc": "50.000000",
    "target_raise_usdc": "50000.000000",
    "sale_status": "live"
  },
  "public_documents": [
    {
      "id": "doc-1",
      "type": "technical_passport",
      "title": "Technical passport",
      "storage_provider": "arweave",
      "storage_uri": "https://example.com/documents/technical-passport",
      "content_hash": "sha256:abc",
      "is_public": true
    }
  ],
  "revenue_summary": {
    "total_epochs": 1,
    "last_posted_epoch": 1
  },
  "onchain_refs": {
    "onchain_asset_pubkey": null,
    "share_mint_pubkey": null,
    "vault_pubkey": null
  }
}
```

---

## GET /assets/:id/revenue

Returns revenue history for an asset.

Access:

- public

### Response fields

- epoch number
- period
- gross revenue
- net revenue
- distributable revenue
- report URI
- posting status

### Example response

```json
{
  "items": [
    {
      "id": "epoch-uuid",
      "epoch_number": 1,
      "period_start": "2026-03-01",
      "period_end": "2026-03-31",
      "gross_revenue_usdc": 2500,
      "net_revenue_usdc": 2100,
      "distributable_revenue_usdc": 1800,
      "report_uri": "https://example.com/reports/epoch-1",
      "posting_status": "posted"
    }
  ]
}
```

---

## GET /assets/:id/documents

Returns public proof and document list.

Access:

- public

### Example response

```json
{
  "items": [
    {
      "id": "doc-1",
      "type": "technical_passport",
      "title": "Technical passport",
      "storage_provider": "arweave",
      "storage_uri": "https://example.com/documents/technical-passport",
      "content_hash": "sha256:abc",
      "is_public": true
    }
  ]
}
```

---

## GET /assets/:id/holders-summary

Returns aggregate investor-facing metrics.

Access:

- public

### Example response

```json
{
  "total_investors": 93,
  "funded_percent": 71.5,
  "total_distributed_usdc": 14320,
  "total_claimed_usdc": 12904
}
```

---

## Issuer Endpoints

## POST /issuer/assets

Creates an asset draft.

Access:

- authenticated issuer

### Request

```json
{
  "title": "Solar Rooftop A1",
  "short_description": "Yield-bearing rooftop solar asset",
  "full_description": "Detailed issuer-facing description",
  "energy_type": "solar",
  "location_country": "Kazakhstan",
  "location_city": "Almaty",
  "capacity_kw": 120
}
```

### Response

```json
{
  "asset_id": "asset-uuid",
  "status": "draft"
}
```

---

## PATCH /issuer/assets/:id

Updates an asset draft or editable asset fields.

Access:

- authenticated issuer

### Request

Any subset of editable draft fields may be sent.

### Response

```json
{
  "asset_id": "asset-uuid",
  "status": "draft"
}
```

---

## POST /issuer/assets/:id/documents

Uploads or registers a document reference for the asset.

Access:

- authenticated issuer

### Request

```json
{
  "type": "technical_passport",
  "title": "Technical passport",
  "storage_provider": "arweave",
  "storage_uri": "https://...",
  "content_hash": "hash",
  "is_public": true
}
```

### Response

```json
{
  "document_id": "document-uuid",
  "success": true
}
```

---

## POST /issuer/assets/:id/sale-terms

Creates or updates asset sale terms.

Access:

- authenticated issuer

### Request

```json
{
  "valuation_usdc": 100000,
  "total_shares": 10000,
  "price_per_share_usdc": 10,
  "minimum_buy_amount_usdc": 50,
  "target_raise_usdc": 50000
}
```

### Response

```json
{
  "success": true,
  "asset_id": "asset-uuid"
}
```

---

## POST /issuer/assets/:id/submit

Submits the asset for the next lifecycle step.

Access:

- authenticated issuer

### Typical action

- `draft -> pending_review`
- `verified -> active_sale`

### Response

```json
{
  "success": true,
  "message": "Asset submission accepted for the next workflow step",
  "next_status": "pending_review"
}
```

---

## POST /issuer/assets/:id/revenue-epochs

Creates a revenue epoch draft.

Access:

- authenticated issuer

### Request

```json
{
  "epoch_number": 1,
  "period_start": "2026-03-01",
  "period_end": "2026-03-31",
  "gross_revenue_usdc": 2500,
  "net_revenue_usdc": 2100,
  "distributable_revenue_usdc": 1800,
  "report_uri": "https://...",
  "report_hash": "hash",
  "source_type": "operator_statement"
}
```

### Response

```json
{
  "success": true,
  "revenue_epoch_id": "epoch-uuid"
}
```

---

## POST /issuer/assets/:id/revenue-epochs/:epochId/post

Initiates on-chain revenue posting flow.

Access:

- authenticated issuer

### Response

May return:

- transaction payload
- message for signing
- orchestration metadata

### Example response

```json
{
  "success": true,
  "operation_id": "revenue-epoch-uuid",
  "transaction_payload": {
    "kind": "revenue_post",
    "asset_id": "asset-uuid",
    "revenue_epoch_id": "epoch-uuid"
  },
  "message": "Revenue posting operation prepared and waiting for transaction confirmation"
}
```

---

## Investor Endpoints

## GET /me/portfolio

Returns the investor portfolio.

Access:

- authenticated user

### Response

```json
{
  "total_invested_usdc": 1200,
  "total_claimed_usdc": 84,
  "total_unclaimed_usdc": 19,
  "positions": [
    {
      "asset_id": "asset-1",
      "title": "Solar Farm A",
      "shares_amount": 120,
      "shares_percentage": 0.24,
      "unclaimed_usdc": 6.1
    }
  ]
}
```

### Frontend notes

- this is a read model for portfolio screens
- blockchain remains settlement truth, but frontend should render this payload directly

---

## GET /me/claims

Returns claim history for the authenticated user.

Access:

- authenticated user

### Example response

```json
{
  "items": [
    {
      "claim_id": "claim-uuid",
      "asset_id": "asset-uuid",
      "revenue_epoch_id": "epoch-uuid",
      "claim_amount_usdc": 84,
      "status": "confirmed",
      "transaction_signature": "signature"
    }
  ]
}
```

---

## POST /investments/quote

Returns quote for a buy action.

Access:

- authenticated investor

### Request

```json
{
  "asset_id": "asset-1",
  "amount_usdc": 100
}
```

### Response

```json
{
  "shares_to_receive": 10,
  "price_per_share_usdc": 10,
  "fees_usdc": 0
}
```

### Frontend notes

- use before investment confirmation UI
- this is a quote, not final settlement truth

---

## POST /investments/prepare

Prepares a transaction or signing payload for investment.

Access:

- authenticated investor

### Request

```json
{
  "asset_id": "asset-1",
  "amount_usdc": 100
}
```

### Example response

```json
{
  "success": true,
  "operation_id": "investment-operation-uuid",
  "signing_payload": {
    "kind": "investment",
    "asset_id": "asset-1",
    "amount_usdc": 100
  },
  "message": "Stub investment payload prepared"
}
```

---

## POST /claims/prepare

Prepares a claim transaction.

Access:

- authenticated investor

### Request

```json
{
  "asset_id": "asset-1",
  "revenue_epoch_id": "epoch-uuid"
}
```

### Example response

```json
{
  "success": true,
  "operation_id": "claim-operation-uuid",
  "signing_payload": {
    "kind": "claim",
    "asset_id": "asset-1",
    "revenue_epoch_id": "epoch-uuid"
  },
  "message": "Stub claim payload prepared"
}
```

---

## POST /transactions/confirm

Used by frontend or internal backend flow to confirm transaction metadata for sync purposes.

Access:

- authenticated user or internal flow

### Request

```json
{
  "transaction_signature": "signature",
  "kind": "investment",
  "operation_id": "investment-operation-uuid"
}
```

### Example response

```json
{
  "success": true,
  "sync_status": "confirmed"
}
```

### Transaction confirmation notes

- `operation_id` is required for `investment`, `claim`, and `revenue_post`
- `wallet_link` confirms the latest pending wallet binding for the authenticated user
- confirmation updates PostgreSQL projections immediately; on-chain settlement confirmation can be layered on top later

---

## Admin Endpoints

## POST /admin/assets/:id/verify

Marks asset as verified or triggers associated verified flow.

Access:

- authenticated admin

### Request

```json
{
  "outcome": "approved",
  "reason": "All documents verified"
}
```

### Response

```json
{
  "success": true,
  "asset_id": "asset-uuid",
  "resulting_status": "verified"
}
```

---

## POST /admin/assets/:id/freeze

Freezes the asset for operational reasons.

Access:

- authenticated admin

### Response

```json
{
  "success": true,
  "asset_id": "asset-uuid",
  "resulting_status": "frozen"
}
```

---

## POST /admin/assets/:id/close

Closes the asset lifecycle.

Access:

- authenticated admin

### Response

```json
{
  "success": true,
  "asset_id": "asset-uuid",
  "resulting_status": "closed"
}
```

---

## GET /admin/audit-logs

Returns audit events with filters.

Access:

- authenticated admin

### Query params

- `entity_type`
- `entity_id`
- `page`
- `limit`

### Example response

```json
{
  "items": [
    {
      "id": "audit-uuid",
      "actor_user_id": "admin-uuid",
      "entity_type": "asset",
      "entity_id": "asset-uuid",
      "action": "asset.verified",
      "created_at": "2026-03-28T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

---

## Suggested Frontend Flows

### Authentication Flow

1. frontend detects whether Telegram Mini App init data is present
2. if Mini App context exists, frontend prefers `POST /auth/telegram`
3. otherwise frontend shows:
   - `POST /auth/register`
   - `POST /auth/login`
   - Google OAuth via `GET /auth/google/url` then `POST /auth/google`
   - Telegram Login Widget via `POST /auth/telegram/login`
4. frontend stores `access_token` and `refresh_token`
5. frontend rotates refresh state with `POST /auth/refresh`
6. frontend branches UI using `user.role`
7. optional wallet flow calls `POST /auth/wallet/link`
8. frontend finalizes wallet binding with `POST /transactions/confirm` and `kind: "wallet_link"`

### Public Asset Discovery Flow

1. frontend calls `GET /assets`
2. user opens asset card
3. frontend calls `GET /assets/:id`
4. optional tabs call `GET /assets/:id/documents` and `GET /assets/:id/revenue`

### Investment Flow

1. frontend calls `POST /investments/quote`
2. frontend shows quote confirmation
3. frontend calls `POST /investments/prepare`
4. frontend stores returned `operation_id`
5. wallet signing happens client-side
6. frontend calls `POST /transactions/confirm`
7. frontend refreshes `GET /me/portfolio`

### Claim Flow

1. frontend loads `GET /me/portfolio` and `GET /me/claims`
2. user selects a claimable revenue epoch
3. frontend calls `POST /claims/prepare`
4. frontend stores returned `operation_id`
5. wallet signing happens client-side
6. frontend calls `POST /transactions/confirm`
7. frontend refreshes portfolio and claim history

### Issuer Asset Draft Flow

1. issuer creates draft with `POST /issuer/assets`
2. issuer updates draft with `PATCH /issuer/assets/:id`
3. issuer registers documents with `POST /issuer/assets/:id/documents`
4. issuer saves sale terms with `POST /issuer/assets/:id/sale-terms`
5. issuer submits workflow step with `POST /issuer/assets/:id/submit`

---

## API Design Notes

### 1. REST is enough for MVP

There is no need for GraphQL in the first version.

### 2. Idempotency is important

Write endpoints should support `Idempotency-Key`.

### 3. Blockchain is still the settlement layer

The API may prepare transactions, but it should not become the financial source of truth.

### 4. Permissions

Issuer endpoints must enforce ownership over the asset.
Admin endpoints must be strongly protected.

### 5. Versioning

Use `/api/v1` from day one to avoid breaking clients later.
