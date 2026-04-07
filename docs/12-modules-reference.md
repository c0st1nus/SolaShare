# Modules Reference

This document describes the backend submodules and the adjacent repository subprojects that matter
when developing SolaShare.

## Backend Route Modules

The backend mounts the following route groups in
[src/app.ts](/home/const/solashare/src/app.ts).

### `system`

Files:

- [src/modules/system/routes.ts](/home/const/solashare/src/modules/system/routes.ts)

Responsibilities:

- process liveness checks
- readiness checks for PostgreSQL, Redis, and Solana RPC
- infrastructure-facing health endpoints for local dev and orchestration

Main endpoints:

- `GET /api/v1/health`
- `GET /api/v1/ready`

### `auth`

Files:

- [src/modules/auth/routes.ts](/home/const/solashare/src/modules/auth/routes.ts)
- [src/modules/auth/service.ts](/home/const/solashare/src/modules/auth/service.ts)
- [src/modules/auth/contracts.ts](/home/const/solashare/src/modules/auth/contracts.ts)
- [src/modules/auth/bootstrap.ts](/home/const/solashare/src/modules/auth/bootstrap.ts)
- [src/modules/auth/utils.ts](/home/const/solashare/src/modules/auth/utils.ts)

Responsibilities:

- password registration and login
- refresh-token rotation and logout
- Google OAuth entry and code exchange
- Telegram Login Widget and Mini App auth flows
- wallet challenge issuance and wallet linking
- current session and identity reads

Main endpoint families:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/google/url`
- `POST /api/v1/auth/google`
- Telegram auth routes
- wallet link and verification routes

### `assets`

Files:

- [src/modules/assets/routes.ts](/home/const/solashare/src/modules/assets/routes.ts)
- [src/modules/assets/service.ts](/home/const/solashare/src/modules/assets/service.ts)
- [src/modules/assets/contracts.ts](/home/const/solashare/src/modules/assets/contracts.ts)
- [src/modules/assets/domain.ts](/home/const/solashare/src/modules/assets/domain.ts)

Responsibilities:

- public asset catalog listing
- public asset detail reads
- revenue history exposure
- public document listing
- public holder summary exposure

Main endpoints:

- `GET /api/v1/assets`
- `GET /api/v1/assets/:id`
- `GET /api/v1/assets/:id/revenue`
- `GET /api/v1/assets/:id/documents`
- `GET /api/v1/assets/:id/holders-summary`

### `issuer`

Files:

- [src/modules/issuer/routes.ts](/home/const/solashare/src/modules/issuer/routes.ts)
- [src/modules/issuer/service.ts](/home/const/solashare/src/modules/issuer/service.ts)
- [src/modules/issuer/contracts.ts](/home/const/solashare/src/modules/issuer/contracts.ts)

Responsibilities:

- issuer-owned asset drafts and editing
- asset visibility changes
- sale terms management
- asset document management
- submission for review
- on-chain setup preparation and confirmation
- revenue epoch drafting and posting
- issuer-side operating actions such as fund withdrawal flows

Main endpoint families:

- `GET /api/v1/issuer/assets`
- `POST /api/v1/issuer/assets`
- `GET/PATCH/DELETE /api/v1/issuer/assets/:id`
- document and visibility endpoints under `/issuer/assets/:id/*`
- on-chain setup endpoints
- revenue posting endpoints

### `me`

Files:

- [src/modules/me/routes.ts](/home/const/solashare/src/modules/me/routes.ts)
- [src/modules/me/service.ts](/home/const/solashare/src/modules/me/service.ts)
- [src/modules/me/contracts.ts](/home/const/solashare/src/modules/me/contracts.ts)

Responsibilities:

- current user profile reads and updates
- investor KYC submission and cancellation
- portfolio read model delivery
- investor claim history exposure

Main endpoints:

- `GET /api/v1/me/profile`
- `PATCH /api/v1/me/profile`
- `GET /api/v1/me/kyc`
- `POST /api/v1/me/kyc/submit`
- `POST /api/v1/me/kyc/cancel`
- `GET /api/v1/me/portfolio`
- `GET /api/v1/me/claims`

### `investments`

Files:

- [src/modules/investments/routes.ts](/home/const/solashare/src/modules/investments/routes.ts)
- [src/modules/investments/service.ts](/home/const/solashare/src/modules/investments/service.ts)
- [src/modules/investments/contracts.ts](/home/const/solashare/src/modules/investments/contracts.ts)
- [src/modules/investments/domain.ts](/home/const/solashare/src/modules/investments/domain.ts)

Responsibilities:

- quote calculation for investments
- investment transaction preparation
- investment workflow orchestration before on-chain signing

Main endpoints:

- `POST /api/v1/investments/quote`
- `POST /api/v1/investments/prepare`

### `claims`

Files:

- [src/modules/claims/routes.ts](/home/const/solashare/src/modules/claims/routes.ts)
- [src/modules/claims/service.ts](/home/const/solashare/src/modules/claims/service.ts)
- [src/modules/claims/contracts.ts](/home/const/solashare/src/modules/claims/contracts.ts)
- [src/modules/claims/domain.ts](/home/const/solashare/src/modules/claims/domain.ts)

Responsibilities:

- claimability checks
- claim transaction preparation
- claim metadata assembly for wallet-side execution

Main endpoints:

- `POST /api/v1/claims/prepare`

### `transactions`

Files:

- [src/modules/transactions/routes.ts](/home/const/solashare/src/modules/transactions/routes.ts)
- [src/modules/transactions/service.ts](/home/const/solashare/src/modules/transactions/service.ts)
- [src/modules/transactions/contracts.ts](/home/const/solashare/src/modules/transactions/contracts.ts)
- [src/modules/transactions/settlement-service.ts](/home/const/solashare/src/modules/transactions/settlement-service.ts)

Responsibilities:

- post-signature transaction confirmation
- settlement metadata persistence
- sync trigger points for workflows tied to signed Solana transactions

Main endpoints:

- `POST /api/v1/transactions/confirm`

### `uploads`

Files:

- [src/modules/uploads/routes.ts](/home/const/solashare/src/modules/uploads/routes.ts)
- [src/modules/uploads/service.ts](/home/const/solashare/src/modules/uploads/service.ts)
- [src/modules/uploads/contracts.ts](/home/const/solashare/src/modules/uploads/contracts.ts)

Responsibilities:

- presigned upload token generation
- direct file upload handling
- private document resolution for stored uploads

Main endpoints:

- `POST /api/v1/uploads/presign`
- `PUT /api/v1/uploads/direct`
- `GET /api/v1/uploads/files/:purpose/:name`

### `notifications`

Files:

- [src/modules/notifications/routes.ts](/home/const/solashare/src/modules/notifications/routes.ts)
- [src/modules/notifications/service.ts](/home/const/solashare/src/modules/notifications/service.ts)
- [src/modules/notifications/contracts.ts](/home/const/solashare/src/modules/notifications/contracts.ts)
- [src/modules/notifications/index.ts](/home/const/solashare/src/modules/notifications/index.ts)

Responsibilities:

- authenticated WebSocket notification sessions
- connection tracking and user-to-socket mapping
- delivery plumbing for in-app notifications

Main endpoint:

- `WS /api/v1/notifications/ws`

### `webhook`

Files:

- [src/modules/webhook/routes.ts](/home/const/solashare/src/modules/webhook/routes.ts)
- [src/modules/webhook/service.ts](/home/const/solashare/src/modules/webhook/service.ts)
- [src/modules/webhook/contracts.ts](/home/const/solashare/src/modules/webhook/contracts.ts)
- [src/modules/webhook/index.ts](/home/const/solashare/src/modules/webhook/index.ts)
- [src/modules/webhook/test/webhook.test.ts](/home/const/solashare/src/modules/webhook/test/webhook.test.ts)

Responsibilities:

- Helius webhook payload validation
- webhook authentication using shared secret
- event ingestion into off-chain transaction processing
- retry-safe operational entrypoint for external event delivery

Main endpoints:

- `POST /api/v1/webhooks/helius`

### `indexer`

Files:

- [src/modules/indexer/routes.ts](/home/const/solashare/src/modules/indexer/routes.ts)
- [src/modules/indexer/index.ts](/home/const/solashare/src/modules/indexer/index.ts)

Responsibilities:

- indexer status inspection
- start and stop of polling sync
- manual transaction sync by signature
- webhook-oriented transaction ingestion path

Main endpoints:

- `GET /api/v1/indexer/status`
- `POST /api/v1/indexer/start`
- `POST /api/v1/indexer/stop`
- `POST /api/v1/indexer/sync`
- `POST /api/v1/indexer/webhook`

### `admin`

Files:

- [src/modules/admin/routes.ts](/home/const/solashare/src/modules/admin/routes.ts)
- [src/modules/admin/service.ts](/home/const/solashare/src/modules/admin/service.ts)
- [src/modules/admin/contracts.ts](/home/const/solashare/src/modules/admin/contracts.ts)

Responsibilities:

- admin asset review and moderation
- user creation, deletion, and role updates
- KYC request queue inspection and review actions
- audit log visibility and operational oversight

Main endpoint families:

- `GET /api/v1/admin/assets`
- `GET /api/v1/admin/assets/:id`
- `GET /api/v1/admin/users`
- `POST /api/v1/admin/users`
- `POST /api/v1/admin/users/:id/role`
- `DELETE /api/v1/admin/users/:id`
- KYC review and audit-log endpoints under `/api/v1/admin/*`

## Shared Backend Modules

### `src/modules/shared`

Files:

- [src/modules/shared/contracts.ts](/home/const/solashare/src/modules/shared/contracts.ts)
- [src/modules/shared/domain.ts](/home/const/solashare/src/modules/shared/domain.ts)
- [src/modules/shared/utils.ts](/home/const/solashare/src/modules/shared/utils.ts)

Responsibilities:

- shared types and enums used across route modules
- domain helpers reused by multiple modules
- common contract fragments

## Shared Libraries

### `src/lib`

Key shared library files:

- [src/lib/api-error.ts](/home/const/solashare/src/lib/api-error.ts)
  Structured application error primitive for predictable API failures.

- [src/lib/db.ts](/home/const/solashare/src/lib/db.ts)
  PostgreSQL connection and shared DB access setup.

- [src/lib/logger.ts](/home/const/solashare/src/lib/logger.ts)
  Pino logger configuration and logging entrypoint.

- [src/lib/queue.ts](/home/const/solashare/src/lib/queue.ts)
  BullMQ queue wiring and worker bootstrap used before serving requests.

- [src/lib/redis.ts](/home/const/solashare/src/lib/redis.ts)
  Shared Redis client configuration.

- [src/lib/websocket.ts](/home/const/solashare/src/lib/websocket.ts)
  WebSocket support utilities for notification flows.

### `src/lib/solana`

Files:

- [src/lib/solana/config.ts](/home/const/solashare/src/lib/solana/config.ts)
- [src/lib/solana/faucet.ts](/home/const/solashare/src/lib/solana/faucet.ts)
- [src/lib/solana/index.ts](/home/const/solashare/src/lib/solana/index.ts)
- [src/lib/solana/indexer.ts](/home/const/solashare/src/lib/solana/indexer.ts)
- [src/lib/solana/pda.ts](/home/const/solashare/src/lib/solana/pda.ts)
- [src/lib/solana/token-program.ts](/home/const/solashare/src/lib/solana/token-program.ts)
- [src/lib/solana/transactions.ts](/home/const/solashare/src/lib/solana/transactions.ts)
- [src/lib/solana/types.ts](/home/const/solashare/src/lib/solana/types.ts)
- [src/lib/solana/utils.ts](/home/const/solashare/src/lib/solana/utils.ts)
- [src/lib/solana/verification.ts](/home/const/solashare/src/lib/solana/verification.ts)
- [src/lib/solana/wallet-challenge.ts](/home/const/solashare/src/lib/solana/wallet-challenge.ts)

Responsibilities:

- RPC and program configuration
- PDA derivation
- transaction assembly
- token-program helpers
- wallet challenge and signature verification logic
- indexer helpers and Solana-side event processing

## Plugins

- [src/plugins/auth.ts](/home/const/solashare/src/plugins/auth.ts)
  Parses and verifies auth state, and exposes role-check helpers for routes.

- [src/plugins/openapi.ts](/home/const/solashare/src/plugins/openapi.ts)
  Generates and serves OpenAPI/Scalar documentation.

## Tests

The backend test suite currently includes:

- [src/tests/api.integration.test.ts](/home/const/solashare/src/tests/api.integration.test.ts)
- [src/tests/assets.integration.test.ts](/home/const/solashare/src/tests/assets.integration.test.ts)
- [src/tests/auth.integration.test.ts](/home/const/solashare/src/tests/auth.integration.test.ts)
- [src/tests/auth.unit.test.ts](/home/const/solashare/src/tests/auth.unit.test.ts)
- [src/tests/domain.unit.test.ts](/home/const/solashare/src/tests/domain.unit.test.ts)
- [src/tests/investments.integration.test.ts](/home/const/solashare/src/tests/investments.integration.test.ts)
- [src/tests/issuer-admin.integration.test.ts](/home/const/solashare/src/tests/issuer-admin.integration.test.ts)
- [src/tests/revenue-claims.integration.test.ts](/home/const/solashare/src/tests/revenue-claims.integration.test.ts)
- [src/tests/shared-utils.unit.test.ts](/home/const/solashare/src/tests/shared-utils.unit.test.ts)
- [src/tests/system.integration.test.ts](/home/const/solashare/src/tests/system.integration.test.ts)
- [src/tests/webhook-queue.integration.test.ts](/home/const/solashare/src/tests/webhook-queue.integration.test.ts)
- [src/tests/workflow.integration.test.ts](/home/const/solashare/src/tests/workflow.integration.test.ts)

These cover the main off-chain behavior and should be consulted when changing endpoint contracts or
workflow state transitions.

## Scripts And Helpers

Repository scripts outside the backend runtime:

- [scripts/bootstrap-admin.ts](/home/const/solashare/scripts/bootstrap-admin.ts)
  Initial admin bootstrap helper.

- [scripts/dev-all.sh](/home/const/solashare/scripts/dev-all.sh)
  Multi-service local development helper.

- [scripts/start-localnet.sh](/home/const/solashare/scripts/start-localnet.sh)
  Solana localnet startup helper.

- [scripts/stop-localnet.sh](/home/const/solashare/scripts/stop-localnet.sh)
  Solana localnet shutdown helper.

- [scripts/setup-mock-usdc.ts](/home/const/solashare/scripts/setup-mock-usdc.ts)
  Local token setup helper for development flows.

- [scripts/test-verification.ts](/home/const/solashare/scripts/test-verification.ts)
  Verification-related helper script.

## Adjacent Subprojects

### `solashare_program`

Files and roles:

- [solashare_program/Anchor.toml](/home/const/solashare/solashare_program/Anchor.toml)
  Anchor workspace configuration.

- [solashare_program/programs/solashare_program/src/lib.rs](/home/const/solashare/solashare_program/programs/solashare_program/src/lib.rs)
  On-chain program source.

- [solashare_program/tests/solashare_program.ts](/home/const/solashare/solashare_program/tests/solashare_program.ts)
  Program tests.

- [solashare_program/migrations/deploy.ts](/home/const/solashare/solashare_program/migrations/deploy.ts)
  Deployment script.

Purpose:

- encode the trusted on-chain state and instruction flow for ownership and settlement

Detailed reference:

- [14-onchain-workspace.md](/home/const/solashare/docs/14-onchain-workspace.md)

### `solashare-frontend`

Important areas:

- [solashare-frontend/src/app/layout.tsx](/home/const/solashare/solashare-frontend/src/app/layout.tsx)
- [solashare-frontend/src/app/page.tsx](/home/const/solashare/solashare-frontend/src/app/page.tsx)
- [solashare-frontend/src/lib/api.ts](/home/const/solashare/solashare-frontend/src/lib/api.ts)
- [solashare-frontend/src/lib/auth.tsx](/home/const/solashare/solashare-frontend/src/lib/auth.tsx)
- [solashare-frontend/src/lib/solana.ts](/home/const/solashare/solashare-frontend/src/lib/solana.ts)

Purpose:

- provide the browser UI for the product flows backed by the API

### `research`

Files:

- [research/research.pdf](/home/const/solashare/research/research.pdf)
- [research/research.typ](/home/const/solashare/research/research.typ)

Purpose:

- preserve the market or product research context that informs roadmap and positioning decisions
