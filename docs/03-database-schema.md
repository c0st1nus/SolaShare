# Database Schema

## Overview

SolaShare uses PostgreSQL as the main off-chain application database.

The database does not replace blockchain truth. It acts as:
- product read model
- metadata store
- operational state store
- synchronization target
- analytics and UX layer

The implemented schema also includes operational support tables required by the backend service:
- wallet bindings
- verification workflow records
- share mint tracking
- revenue deposit tracking
- webhook ingestion state
- background job execution logs
- idempotency key storage

---

## Table: users

Stores platform users.

### Columns
- `id UUID PRIMARY KEY`
- `wallet_address TEXT UNIQUE NULL`
- `telegram_user_id TEXT UNIQUE NULL`
- `telegram_username TEXT NULL`
- `display_name TEXT NULL`
- `role TEXT NOT NULL`
- `status TEXT NOT NULL`
- `created_at TIMESTAMP NOT NULL`
- `updated_at TIMESTAMP NOT NULL`

### Allowed role values
- `investor`
- `issuer`
- `admin`

### Allowed status values
- `active`
- `blocked`

---

## Table: user_sessions

Stores active sessions.

### Columns
- `id UUID PRIMARY KEY`
- `user_id UUID NOT NULL REFERENCES users(id)`
- `session_token_hash TEXT NOT NULL`
- `expires_at TIMESTAMP NOT NULL`
- `ip TEXT NULL`
- `user_agent TEXT NULL`
- `created_at TIMESTAMP NOT NULL`

---

## Table: assets

Stores the main asset card and operational metadata.

### Columns
- `id UUID PRIMARY KEY`
- `slug TEXT UNIQUE NOT NULL`
- `title TEXT NOT NULL`
- `short_description TEXT NOT NULL`
- `full_description TEXT NOT NULL`
- `energy_type TEXT NOT NULL`
- `issuer_user_id UUID NOT NULL REFERENCES users(id)`
- `location_country TEXT NOT NULL`
- `location_region TEXT NULL`
- `location_city TEXT NULL`
- `latitude NUMERIC NULL`
- `longitude NUMERIC NULL`
- `capacity_kw NUMERIC NOT NULL`
- `commissioning_date DATE NULL`
- `expected_annual_yield_percent NUMERIC NULL`
- `currency TEXT NOT NULL DEFAULT 'USDC'`
- `status TEXT NOT NULL`
- `cover_image_url TEXT NULL`
- `asset_metadata_uri TEXT NULL`
- `onchain_asset_pubkey TEXT UNIQUE NULL`
- `share_mint_pubkey TEXT UNIQUE NULL`
- `vault_pubkey TEXT UNIQUE NULL`
- `created_at TIMESTAMP NOT NULL`
- `updated_at TIMESTAMP NOT NULL`

### Allowed energy_type values
- `solar`
- `wind`
- `hydro`
- `ev_charging`
- `other`

### Allowed status values
- `draft`
- `pending_review`
- `verified`
- `active_sale`
- `funded`
- `frozen`
- `closed`

---

## Table: asset_documents

Stores files and proof references associated with assets.

### Columns
- `id UUID PRIMARY KEY`
- `asset_id UUID NOT NULL REFERENCES assets(id)`
- `type TEXT NOT NULL`
- `title TEXT NOT NULL`
- `storage_provider TEXT NOT NULL`
- `storage_uri TEXT NOT NULL`
- `content_hash TEXT NOT NULL`
- `mime_type TEXT NULL`
- `uploaded_by_user_id UUID NOT NULL REFERENCES users(id)`
- `is_public BOOLEAN NOT NULL DEFAULT false`
- `created_at TIMESTAMP NOT NULL`

### Allowed type values
- `ownership_doc`
- `right_to_income_doc`
- `technical_passport`
- `photo`
- `meter_info`
- `financial_model`
- `revenue_report`
- `other`

### Allowed storage_provider values
- `arweave`
- `ipfs`
- `s3`

---

## Table: asset_sale_terms

Stores offering configuration for an asset.

### Columns
- `id UUID PRIMARY KEY`
- `asset_id UUID UNIQUE NOT NULL REFERENCES assets(id)`
- `valuation_usdc NUMERIC NOT NULL`
- `total_shares BIGINT NOT NULL`
- `price_per_share_usdc NUMERIC NOT NULL`
- `minimum_buy_amount_usdc NUMERIC NOT NULL`
- `target_raise_usdc NUMERIC NOT NULL`
- `sale_start_at TIMESTAMP NULL`
- `sale_end_at TIMESTAMP NULL`
- `sale_status TEXT NOT NULL`
- `created_at TIMESTAMP NOT NULL`
- `updated_at TIMESTAMP NOT NULL`

### Allowed sale_status values
- `draft`
- `scheduled`
- `live`
- `completed`
- `cancelled`

---

## Table: verification_requests

Stores verification workflow requests for assets, issuers, documents, and revenue reports.

### Columns
- `id UUID PRIMARY KEY`
- `asset_id UUID NULL REFERENCES assets(id)`
- `requested_by_user_id UUID NOT NULL REFERENCES users(id)`
- `request_type TEXT NOT NULL`
- `status TEXT NOT NULL`
- `payload_json JSONB NULL`
- `submitted_at TIMESTAMP NOT NULL`
- `resolved_at TIMESTAMP NULL`
- `created_at TIMESTAMP NOT NULL`
- `updated_at TIMESTAMP NOT NULL`

### Allowed request_type values
- `asset_review`
- `document_review`
- `issuer_review`
- `revenue_review`

### Allowed status values
- `pending`
- `in_review`
- `approved`
- `rejected`
- `cancelled`

---

## Table: verification_decisions

Stores the final moderation decision for a verification request.

### Columns
- `id UUID PRIMARY KEY`
- `verification_request_id UUID UNIQUE NOT NULL REFERENCES verification_requests(id)`
- `decided_by_user_id UUID NOT NULL REFERENCES users(id)`
- `outcome TEXT NOT NULL`
- `reason TEXT NULL`
- `metadata_json JSONB NULL`
- `created_at TIMESTAMP NOT NULL`

### Allowed outcome values
- `approved`
- `rejected`
- `needs_changes`

---

## Table: wallet_bindings

Stores wallet ownership bindings and their verification state.

### Columns
- `id UUID PRIMARY KEY`
- `user_id UUID NOT NULL REFERENCES users(id)`
- `wallet_address TEXT UNIQUE NOT NULL`
- `chain TEXT NOT NULL DEFAULT 'solana'`
- `label TEXT NULL`
- `status TEXT NOT NULL`
- `verification_message TEXT NULL`
- `verified_at TIMESTAMP NULL`
- `created_at TIMESTAMP NOT NULL`
- `updated_at TIMESTAMP NOT NULL`

### Allowed status values
- `pending`
- `active`
- `revoked`

---

## Table: share_mints

Stores share mint preparation and on-chain mint references.

### Columns
- `id UUID PRIMARY KEY`
- `asset_id UUID UNIQUE NOT NULL REFERENCES assets(id)`
- `mint_address TEXT UNIQUE NOT NULL`
- `decimals INTEGER NOT NULL`
- `token_program TEXT NOT NULL`
- `vault_address TEXT UNIQUE NULL`
- `transaction_signature TEXT NULL`
- `status TEXT NOT NULL`
- `created_at TIMESTAMP NOT NULL`
- `updated_at TIMESTAMP NOT NULL`

### Allowed status values
- `draft`
- `prepared`
- `minted`
- `failed`

---

## Table: investments

Stores primary market buy events.

### Columns
- `id UUID PRIMARY KEY`
- `user_id UUID NOT NULL REFERENCES users(id)`
- `asset_id UUID NOT NULL REFERENCES assets(id)`
- `amount_usdc NUMERIC NOT NULL`
- `shares_received NUMERIC NOT NULL`
- `transaction_signature TEXT NULL`
- `status TEXT NOT NULL`
- `created_at TIMESTAMP NOT NULL`

### Allowed status values
- `pending`
- `confirmed`
- `failed`

---

## Table: holdings_snapshots

Stores cached ownership views for dashboard rendering.

### Columns
- `id UUID PRIMARY KEY`
- `user_id UUID NOT NULL REFERENCES users(id)`
- `asset_id UUID NOT NULL REFERENCES assets(id)`
- `shares_amount NUMERIC NOT NULL`
- `shares_percentage NUMERIC NOT NULL`
- `last_synced_slot BIGINT NULL`
- `updated_at TIMESTAMP NOT NULL`

### Constraints
- unique `(user_id, asset_id)`

---

## Table: revenue_epochs

Stores distribution periods.

### Columns
- `id UUID PRIMARY KEY`
- `asset_id UUID NOT NULL REFERENCES assets(id)`
- `epoch_number INTEGER NOT NULL`
- `period_start DATE NOT NULL`
- `period_end DATE NOT NULL`
- `gross_revenue_usdc NUMERIC NOT NULL`
- `net_revenue_usdc NUMERIC NOT NULL`
- `distributable_revenue_usdc NUMERIC NOT NULL`
- `report_uri TEXT NULL`
- `report_hash TEXT NULL`
- `source_type TEXT NOT NULL`
- `posted_by_user_id UUID NOT NULL REFERENCES users(id)`
- `onchain_revenue_pubkey TEXT UNIQUE NULL`
- `transaction_signature TEXT NULL`
- `status TEXT NOT NULL`
- `created_at TIMESTAMP NOT NULL`
- `updated_at TIMESTAMP NOT NULL`

### Allowed source_type values
- `manual_report`
- `meter_export`
- `operator_statement`

### Allowed status values
- `draft`
- `posted`
- `settled`
- `flagged`

### Constraints
- unique `(asset_id, epoch_number)`

---

## Table: revenue_deposits

Stores operational funding deposits related to a revenue epoch before or during settlement.

### Columns
- `id UUID PRIMARY KEY`
- `revenue_epoch_id UUID NOT NULL REFERENCES revenue_epochs(id)`
- `deposited_by_user_id UUID NOT NULL REFERENCES users(id)`
- `amount_usdc NUMERIC NOT NULL`
- `source_reference TEXT NULL`
- `transaction_signature TEXT NULL`
- `status TEXT NOT NULL`
- `created_at TIMESTAMP NOT NULL`
- `updated_at TIMESTAMP NOT NULL`

### Allowed status values
- `pending`
- `confirmed`
- `failed`

---

## Table: claims

Stores claim history.

### Columns
- `id UUID PRIMARY KEY`
- `user_id UUID NOT NULL REFERENCES users(id)`
- `asset_id UUID NOT NULL REFERENCES assets(id)`
- `revenue_epoch_id UUID NOT NULL REFERENCES revenue_epochs(id)`
- `claim_amount_usdc NUMERIC NOT NULL`
- `transaction_signature TEXT NULL`
- `status TEXT NOT NULL`
- `created_at TIMESTAMP NOT NULL`

### Allowed status values
- `pending`
- `confirmed`
- `failed`

---

## Table: transfers_index

Stores indexed transfer activity for asset share tokens.

### Columns
- `id UUID PRIMARY KEY`
- `asset_id UUID NOT NULL REFERENCES assets(id)`
- `from_wallet TEXT NOT NULL`
- `to_wallet TEXT NOT NULL`
- `shares_amount NUMERIC NOT NULL`
- `transaction_signature TEXT NOT NULL`
- `block_time TIMESTAMP NOT NULL`
- `created_at TIMESTAMP NOT NULL`

---

## Table: asset_status_history

Stores all asset status transitions.

### Columns
- `id UUID PRIMARY KEY`
- `asset_id UUID NOT NULL REFERENCES assets(id)`
- `old_status TEXT NULL`
- `new_status TEXT NOT NULL`
- `changed_by_user_id UUID NULL REFERENCES users(id)`
- `reason TEXT NULL`
- `transaction_signature TEXT NULL`
- `created_at TIMESTAMP NOT NULL`

---

## Table: notifications

Stores in-app notifications.

### Columns
- `id UUID PRIMARY KEY`
- `user_id UUID NOT NULL REFERENCES users(id)`
- `type TEXT NOT NULL`
- `title TEXT NOT NULL`
- `body TEXT NOT NULL`
- `is_read BOOLEAN NOT NULL DEFAULT false`
- `metadata_json JSONB NULL`
- `created_at TIMESTAMP NOT NULL`

---

## Table: audit_logs

Stores audit-relevant application events.

### Columns
- `id UUID PRIMARY KEY`
- `actor_user_id UUID NULL REFERENCES users(id)`
- `entity_type TEXT NOT NULL`
- `entity_id TEXT NOT NULL`
- `action TEXT NOT NULL`
- `payload_json JSONB NULL`
- `created_at TIMESTAMP NOT NULL`

---

## Table: webhook_events

Stores webhook payloads and processing state for idempotent ingestion.

### Columns
- `id UUID PRIMARY KEY`
- `source TEXT NOT NULL`
- `event_type TEXT NOT NULL`
- `external_event_id TEXT NULL`
- `payload_json JSONB NOT NULL`
- `status TEXT NOT NULL`
- `received_at TIMESTAMP NOT NULL`
- `processed_at TIMESTAMP NULL`
- `error_message TEXT NULL`
- `created_at TIMESTAMP NOT NULL`
- `updated_at TIMESTAMP NOT NULL`

### Allowed status values
- `pending`
- `processing`
- `processed`
- `failed`
- `dead_letter`

---

## Table: job_execution_logs

Stores execution logs for queued and background jobs.

### Columns
- `id UUID PRIMARY KEY`
- `queue_name TEXT NOT NULL`
- `job_name TEXT NOT NULL`
- `job_id TEXT NULL`
- `status TEXT NOT NULL`
- `attempt INTEGER NOT NULL`
- `payload_json JSONB NULL`
- `result_json JSONB NULL`
- `error_message TEXT NULL`
- `started_at TIMESTAMP NOT NULL`
- `finished_at TIMESTAMP NULL`
- `created_at TIMESTAMP NOT NULL`
- `updated_at TIMESTAMP NOT NULL`

### Allowed status values
- `running`
- `succeeded`
- `failed`
- `cancelled`

---

## Table: idempotency_keys

Stores idempotency keys for write endpoints that must be retry-safe.

### Columns
- `scope TEXT NOT NULL`
- `key TEXT NOT NULL`
- `request_hash TEXT NOT NULL`
- `response_json JSONB NULL`
- `created_at TIMESTAMP NOT NULL`
- `expires_at TIMESTAMP NULL`

### Constraints
- primary key `(scope, key)`

---

## Suggested Indexes

### users
- index on `wallet_address`
- index on `telegram_user_id`

### assets
- index on `issuer_user_id`
- index on `status`
- index on `energy_type`
- index on `created_at`

### asset_documents
- index on `asset_id`
- index on `type`

### verification_requests
- index on `asset_id`
- index on `requested_by_user_id`
- index on `status`

### wallet_bindings
- index on `user_id`
- index on `status`

### share_mints
- index on `status`

### investments
- index on `user_id`
- index on `asset_id`
- index on `status`

### holdings_snapshots
- unique index on `(user_id, asset_id)`

### revenue_epochs
- unique index on `(asset_id, epoch_number)`
- index on `status`

### revenue_deposits
- index on `revenue_epoch_id`
- index on `deposited_by_user_id`
- index on `status`

### claims
- index on `user_id`
- index on `asset_id`
- index on `revenue_epoch_id`

### notifications
- index on `user_id`
- index on `is_read`

### audit_logs
- index on `entity_type, entity_id`
- index on `created_at`

### webhook_events
- unique index on `(source, external_event_id)`
- index on `status`
- index on `received_at`

### job_execution_logs
- index on `queue_name`
- index on `job_name`
- index on `status`

### idempotency_keys
- index on `expires_at`

---

## Notes

### Database as read model
The database is optimized for application queries, not for replacing blockchain state.

### Idempotency
All write endpoints that affect operational state should support idempotency keys.

### Auditability
All high-trust actions should create corresponding audit log entries.

### Future extensions
Future schema additions may include:
- KYC profiles
- governance proposals
- disputes
- operator roles
- watchlists
- compliance states
