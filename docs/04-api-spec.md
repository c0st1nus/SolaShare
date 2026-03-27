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

During the scaffold phase, handlers may return stub responses while contracts and module boundaries are stabilized.

---

## Authentication

## POST /auth/telegram

Authenticates a user through Telegram WebApp init data.

### Request
```json
{
  "telegram_init_data": "..."
}
````

### Response

```json
{
  "access_token": "token",
  "user": {
    "id": "uuid",
    "display_name": "Konstantin",
    "role": "investor"
  }
}
```

---

## POST /auth/wallet/link

Links a wallet to an authenticated user.

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

---

## Assets - Public

## GET /assets

Returns paginated asset list.

### Query params

* `status`
* `energy_type`
* `page`
* `limit`
* `sort`

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

---

## GET /assets/:id

Returns a detailed asset card.

### Includes

* asset metadata
* issuer summary
* sale terms
* public documents
* revenue summary
* on-chain references
* status
* investor-facing proof links

---

## GET /assets/:id/revenue

Returns revenue history for an asset.

### Response fields

* epoch number
* period
* gross revenue
* net revenue
* distributable revenue
* report URI
* posting status

---

## GET /assets/:id/documents

Returns public proof and document list.

---

## GET /assets/:id/holders-summary

Returns aggregate investor-facing metrics.

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

---

## PATCH /issuer/assets/:id

Updates an asset draft or editable asset fields.

---

## POST /issuer/assets/:id/documents

Uploads or registers a document reference for the asset.

### Request

```json
{
  "type": "technical_passport",
  "title": "Technical passport",
  "storage_provider": "arweave",
  "storage_uri": "https://...",
  "content_hash": "hash"
}
```

---

## POST /issuer/assets/:id/sale-terms

Creates or updates asset sale terms.

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

---

## POST /issuer/assets/:id/submit

Submits the asset for the next lifecycle step.

### Typical action

* `draft -> pending_review`
* or `verified -> active_sale`

---

## POST /issuer/assets/:id/revenue-epochs

Creates a revenue epoch draft.

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

---

## POST /issuer/assets/:id/revenue-epochs/:epochId/post

Initiates on-chain revenue posting flow.

### Response

May return:

* transaction payload
* message for signing
* orchestration metadata

---

## Investor Endpoints

## GET /me/portfolio

Returns the investor portfolio.

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

---

## GET /me/claims

Returns claim history for the authenticated user.

---

## POST /investments/quote

Returns quote for a buy action.

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

---

## POST /investments/prepare

Prepares a transaction or signing payload for investment.

### Request

```json
{
  "asset_id": "asset-1",
  "amount_usdc": 100
}
```

---

## POST /claims/prepare

Prepares a claim transaction.

### Request

```json
{
  "asset_id": "asset-1",
  "revenue_epoch_id": "epoch-uuid"
}
```

---

## POST /transactions/confirm

Used by frontend or internal backend flow to confirm transaction metadata for sync purposes.

### Request

```json
{
  "transaction_signature": "signature",
  "kind": "investment"
}
```

---

## Admin Endpoints

## POST /admin/assets/:id/verify

Marks asset as verified or triggers associated verified flow.

---

## POST /admin/assets/:id/freeze

Freezes the asset for operational reasons.

---

## POST /admin/assets/:id/close

Closes the asset lifecycle.

---

## GET /admin/audit-logs

Returns audit events with filters.

---

## Error Model

Suggested standard error shape:

```json
{
  "error": {
    "code": "ASSET_NOT_FOUND",
    "message": "Asset not found"
  }
}
```

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
