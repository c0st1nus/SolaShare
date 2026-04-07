# Modules Reference

This document describes the backend submodules and the adjacent repository subprojects that matter
when developing SolaShare.

## Backend Route Modules

The backend mounts the following route groups in
[apps/api/src/app.ts](/home/const/solashare/apps/api/src/app.ts).

### `system`

Files:

- [apps/api/src/modules/system/routes.ts](/home/const/solashare/apps/api/src/modules/system/routes.ts)

Responsibilities:

- process liveness checks
- readiness checks for PostgreSQL, Redis, and Solana RPC
- infrastructure-facing health endpoints for local dev and orchestration

Main endpoints:

- `GET /api/v1/health`
- `GET /api/v1/ready`

### `auth`

Files:

- [apps/api/src/modules/auth/routes.ts](/home/const/solashare/apps/api/src/modules/auth/routes.ts)
- [apps/api/src/modules/auth/service.ts](/home/const/solashare/apps/api/src/modules/auth/service.ts)
- [apps/api/src/modules/auth/contracts.ts](/home/const/solashare/apps/api/src/modules/auth/contracts.ts)
- [apps/api/src/modules/auth/bootstrap.ts](/home/const/solashare/apps/api/src/modules/auth/bootstrap.ts)
- [apps/api/src/modules/auth/utils.ts](/home/const/solashare/apps/api/src/modules/auth/utils.ts)

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

- [apps/api/src/modules/assets/routes.ts](/home/const/solashare/apps/api/src/modules/assets/routes.ts)
- [apps/api/src/modules/assets/service.ts](/home/const/solashare/apps/api/src/modules/assets/service.ts)
- [apps/api/src/modules/assets/contracts.ts](/home/const/solashare/apps/api/src/modules/assets/contracts.ts)
- [apps/api/src/modules/assets/domain.ts](/home/const/solashare/apps/api/src/modules/assets/domain.ts)

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

- [apps/api/src/modules/issuer/routes.ts](/home/const/solashare/apps/api/src/modules/issuer/routes.ts)
- [apps/api/src/modules/issuer/service.ts](/home/const/solashare/apps/api/src/modules/issuer/service.ts)
- [apps/api/src/modules/issuer/contracts.ts](/home/const/solashare/apps/api/src/modules/issuer/contracts.ts)

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

- [apps/api/src/modules/me/routes.ts](/home/const/solashare/apps/api/src/modules/me/routes.ts)
- [apps/api/src/modules/me/service.ts](/home/const/solashare/apps/api/src/modules/me/service.ts)
- [apps/api/src/modules/me/contracts.ts](/home/const/solashare/apps/api/src/modules/me/contracts.ts)

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

- [apps/api/src/modules/investments/routes.ts](/home/const/solashare/apps/api/src/modules/investments/routes.ts)
- [apps/api/src/modules/investments/service.ts](/home/const/solashare/apps/api/src/modules/investments/service.ts)
- [apps/api/src/modules/investments/contracts.ts](/home/const/solashare/apps/api/src/modules/investments/contracts.ts)
- [apps/api/src/modules/investments/domain.ts](/home/const/solashare/apps/api/src/modules/investments/domain.ts)

Responsibilities:

- quote calculation for investments
- investment transaction preparation
- investment workflow orchestration before on-chain signing

Main endpoints:

- `POST /api/v1/investments/quote`
- `POST /api/v1/investments/prepare`

### `claims`

Files:

- [apps/api/src/modules/claims/routes.ts](/home/const/solashare/apps/api/src/modules/claims/routes.ts)
- [apps/api/src/modules/claims/service.ts](/home/const/solashare/apps/api/src/modules/claims/service.ts)
- [apps/api/src/modules/claims/contracts.ts](/home/const/solashare/apps/api/src/modules/claims/contracts.ts)
- [apps/api/src/modules/claims/domain.ts](/home/const/solashare/apps/api/src/modules/claims/domain.ts)

Responsibilities:

- claimability checks
- claim transaction preparation
- claim metadata assembly for wallet-side execution

Main endpoints:

- `POST /api/v1/claims/prepare`

### `transactions`

Files:

- [apps/api/src/modules/transactions/routes.ts](/home/const/solashare/apps/api/src/modules/transactions/routes.ts)
- [apps/api/src/modules/transactions/service.ts](/home/const/solashare/apps/api/src/modules/transactions/service.ts)
- [apps/api/src/modules/transactions/contracts.ts](/home/const/solashare/apps/api/src/modules/transactions/contracts.ts)
- [apps/api/src/modules/transactions/settlement-service.ts](/home/const/solashare/apps/api/src/modules/transactions/settlement-service.ts)

Responsibilities:

- post-signature transaction confirmation
- settlement metadata persistence
- sync trigger points for workflows tied to signed Solana transactions

Main endpoints:

- `POST /api/v1/transactions/confirm`

### `uploads`

Files:

- [apps/api/src/modules/uploads/routes.ts](/home/const/solashare/apps/api/src/modules/uploads/routes.ts)
- [apps/api/src/modules/uploads/service.ts](/home/const/solashare/apps/api/src/modules/uploads/service.ts)
- [apps/api/src/modules/uploads/contracts.ts](/home/const/solashare/apps/api/src/modules/uploads/contracts.ts)

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

- [apps/api/src/modules/notifications/routes.ts](/home/const/solashare/apps/api/src/modules/notifications/routes.ts)
- [apps/api/src/modules/notifications/service.ts](/home/const/solashare/apps/api/src/modules/notifications/service.ts)
- [apps/api/src/modules/notifications/contracts.ts](/home/const/solashare/apps/api/src/modules/notifications/contracts.ts)
- [apps/api/src/modules/notifications/index.ts](/home/const/solashare/apps/api/src/modules/notifications/index.ts)

Responsibilities:

- authenticated WebSocket notification sessions
- connection tracking and user-to-socket mapping
- delivery plumbing for in-app notifications

Main endpoint:

- `WS /api/v1/notifications/ws`

### `webhook`

Files:

- [apps/api/src/modules/webhook/routes.ts](/home/const/solashare/apps/api/src/modules/webhook/routes.ts)
- [apps/api/src/modules/webhook/service.ts](/home/const/solashare/apps/api/src/modules/webhook/service.ts)
- [apps/api/src/modules/webhook/contracts.ts](/home/const/solashare/apps/api/src/modules/webhook/contracts.ts)
- [apps/api/src/modules/webhook/index.ts](/home/const/solashare/apps/api/src/modules/webhook/index.ts)
- [apps/api/src/modules/webhook/test/webhook.test.ts](/home/const/solashare/apps/api/src/modules/webhook/test/webhook.test.ts)

Responsibilities:

- Helius webhook payload validation
- webhook authentication using shared secret
- event ingestion into off-chain transaction processing
- retry-safe operational entrypoint for external event delivery

Main endpoints:

- `POST /api/v1/webhooks/helius`

### `indexer`

Files:

- [apps/api/src/modules/indexer/routes.ts](/home/const/solashare/apps/api/src/modules/indexer/routes.ts)
- [apps/api/src/modules/indexer/index.ts](/home/const/solashare/apps/api/src/modules/indexer/index.ts)

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

- [apps/api/src/modules/admin/routes.ts](/home/const/solashare/apps/api/src/modules/admin/routes.ts)
- [apps/api/src/modules/admin/service.ts](/home/const/solashare/apps/api/src/modules/admin/service.ts)
- [apps/api/src/modules/admin/contracts.ts](/home/const/solashare/apps/api/src/modules/admin/contracts.ts)

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

### `apps/api/src/modules/shared`

Files:

- [apps/api/src/modules/shared/contracts.ts](/home/const/solashare/apps/api/src/modules/shared/contracts.ts)
- [apps/api/src/modules/shared/domain.ts](/home/const/solashare/apps/api/src/modules/shared/domain.ts)
- [apps/api/src/modules/shared/utils.ts](/home/const/solashare/apps/api/src/modules/shared/utils.ts)

Responsibilities:

- shared types and enums used across route modules
- domain helpers reused by multiple modules
- common contract fragments

## Shared Libraries

### `apps/api/src/lib`

Key shared library files:

- [apps/api/src/lib/api-error.ts](/home/const/solashare/apps/api/src/lib/api-error.ts)
  Structured application error primitive for predictable API failures.

- [apps/api/src/lib/db.ts](/home/const/solashare/apps/api/src/lib/db.ts)
  PostgreSQL connection and shared DB access setup.

- [apps/api/src/lib/logger.ts](/home/const/solashare/apps/api/src/lib/logger.ts)
  Pino logger configuration and logging entrypoint.

- [apps/api/src/lib/queue.ts](/home/const/solashare/apps/api/src/lib/queue.ts)
  BullMQ queue wiring and worker bootstrap used before serving requests.

- [apps/api/src/lib/redis.ts](/home/const/solashare/apps/api/src/lib/redis.ts)
  Shared Redis client configuration.

- [apps/api/src/lib/websocket.ts](/home/const/solashare/apps/api/src/lib/websocket.ts)
  WebSocket support utilities for notification flows.

### `apps/api/src/lib/solana`

Files:

- [apps/api/src/lib/solana/config.ts](/home/const/solashare/apps/api/src/lib/solana/config.ts)
- [apps/api/src/lib/solana/faucet.ts](/home/const/solashare/apps/api/src/lib/solana/faucet.ts)
- [apps/api/src/lib/solana/index.ts](/home/const/solashare/apps/api/src/lib/solana/index.ts)
- [apps/api/src/lib/solana/indexer.ts](/home/const/solashare/apps/api/src/lib/solana/indexer.ts)
- [apps/api/src/lib/solana/pda.ts](/home/const/solashare/apps/api/src/lib/solana/pda.ts)
- [apps/api/src/lib/solana/token-program.ts](/home/const/solashare/apps/api/src/lib/solana/token-program.ts)
- [apps/api/src/lib/solana/transactions.ts](/home/const/solashare/apps/api/src/lib/solana/transactions.ts)
- [apps/api/src/lib/solana/types.ts](/home/const/solashare/apps/api/src/lib/solana/types.ts)
- [apps/api/src/lib/solana/utils.ts](/home/const/solashare/apps/api/src/lib/solana/utils.ts)
- [apps/api/src/lib/solana/verification.ts](/home/const/solashare/apps/api/src/lib/solana/verification.ts)
- [apps/api/src/lib/solana/wallet-challenge.ts](/home/const/solashare/apps/api/src/lib/solana/wallet-challenge.ts)

Responsibilities:

- RPC and program configuration
- PDA derivation
- transaction assembly
- token-program helpers
- wallet challenge and signature verification logic
- indexer helpers and Solana-side event processing

## Plugins

- [apps/api/src/plugins/auth.ts](/home/const/solashare/apps/api/src/plugins/auth.ts)
  Parses and verifies auth state, and exposes role-check helpers for routes.

- [apps/api/src/plugins/openapi.ts](/home/const/solashare/apps/api/src/plugins/openapi.ts)
  Generates and serves OpenAPI/Scalar documentation.

## Tests

The backend test suite currently includes:

- [apps/api/src/tests/api.integration.test.ts](/home/const/solashare/apps/api/src/tests/api.integration.test.ts)
- [apps/api/src/tests/assets.integration.test.ts](/home/const/solashare/apps/api/src/tests/assets.integration.test.ts)
- [apps/api/src/tests/auth.integration.test.ts](/home/const/solashare/apps/api/src/tests/auth.integration.test.ts)
- [apps/api/src/tests/auth.unit.test.ts](/home/const/solashare/apps/api/src/tests/auth.unit.test.ts)
- [apps/api/src/tests/domain.unit.test.ts](/home/const/solashare/apps/api/src/tests/domain.unit.test.ts)
- [apps/api/src/tests/investments.integration.test.ts](/home/const/solashare/apps/api/src/tests/investments.integration.test.ts)
- [apps/api/src/tests/issuer-admin.integration.test.ts](/home/const/solashare/apps/api/src/tests/issuer-admin.integration.test.ts)
- [apps/api/src/tests/revenue-claims.integration.test.ts](/home/const/solashare/apps/api/src/tests/revenue-claims.integration.test.ts)
- [apps/api/src/tests/shared-utils.unit.test.ts](/home/const/solashare/apps/api/src/tests/shared-utils.unit.test.ts)
- [apps/api/src/tests/system.integration.test.ts](/home/const/solashare/apps/api/src/tests/system.integration.test.ts)
- [apps/api/src/tests/webhook-queue.integration.test.ts](/home/const/solashare/apps/api/src/tests/webhook-queue.integration.test.ts)
- [apps/api/src/tests/workflow.integration.test.ts](/home/const/solashare/apps/api/src/tests/workflow.integration.test.ts)

These cover the main off-chain behavior and should be consulted when changing endpoint contracts or
workflow state transitions.

## Scripts And Helpers

Repository scripts outside the backend runtime:

- [scripts/bootstrap-admin.ts](/home/const/solashare/scripts/bootstrap-admin.ts)
  Initial admin bootstrap helper.

- [scripts/dev-workspace.sh](/home/const/solashare/scripts/dev-workspace.sh)
  Starts the backend and frontend together from the repository root.

- [scripts/start-localnet.sh](/home/const/solashare/scripts/start-localnet.sh)
  Solana localnet startup helper.

- [scripts/stop-localnet.sh](/home/const/solashare/scripts/stop-localnet.sh)
  Solana localnet shutdown helper.

- [scripts/setup-mock-usdc.ts](/home/const/solashare/scripts/setup-mock-usdc.ts)
  Local token setup helper for development flows.

- [scripts/test-verification.ts](/home/const/solashare/scripts/test-verification.ts)
  Verification-related helper script.

## Adjacent Subprojects

### `programs/solashare-protocol`

Files and roles:

- [programs/solashare-protocol/Anchor.toml](/home/const/solashare/programs/solashare-protocol/Anchor.toml)
  Anchor workspace configuration.

- [programs/solashare-protocol/programs/solashare_protocol/src/lib.rs](/home/const/solashare/programs/solashare-protocol/programs/solashare_protocol/src/lib.rs)
  On-chain program source.

- [programs/solashare-protocol/tests/solashare_protocol.ts](/home/const/solashare/programs/solashare-protocol/tests/solashare_protocol.ts)
  Program tests.

- [programs/solashare-protocol/migrations/deploy.ts](/home/const/solashare/programs/solashare-protocol/migrations/deploy.ts)
  Deployment script.

Purpose:

- encode the trusted on-chain state and instruction flow for ownership and settlement

Detailed reference:

- [14-onchain-workspace.md](/home/const/solashare/docs/14-onchain-workspace.md)

### `apps/web`

Important areas:

- [apps/web/src/app/layout.tsx](/home/const/solashare/apps/web/src/app/layout.tsx)
- [apps/web/src/app/page.tsx](/home/const/solashare/apps/web/src/app/page.tsx)
- [apps/web/src/lib/api.ts](/home/const/solashare/apps/web/src/lib/api.ts)
- [apps/web/src/lib/auth.tsx](/home/const/solashare/apps/web/src/lib/auth.tsx)
- [apps/web/src/lib/solana.ts](/home/const/solashare/apps/web/src/lib/solana.ts)

Purpose:

- provide the browser UI for the product flows backed by the API

### `research`

Files:

- [research/research.pdf](/home/const/solashare/research/research.pdf)
- [research/research.typ](/home/const/solashare/research/research.typ)

Purpose:

- preserve the market or product research context that informs roadmap and positioning decisions
