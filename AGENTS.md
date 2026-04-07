# Repository Guidelines

## Project Purpose
`solashare` is a Solana-based RWA platform repository centered around a Bun + Elysia backend.

The repository currently contains:

- the main backend service under `src/`
- the Anchor on-chain workspace under `solashare_program/`
- the standalone Next.js frontend under `solashare-frontend/`
- technical and product documentation under `docs/`
- research artifacts under `research/`

Default working assumption: most tasks in this repository target the backend unless the user
explicitly asks to work on the frontend or on-chain workspace.

## Core Stack
Backend source of truth for dependencies and commands is
[`package.json`](/home/const/solashare/package.json).

Current backend stack:

- Bun
- TypeScript
- ElysiaJS
- Drizzle ORM
- PostgreSQL
- Redis
- BullMQ
- Zod
- Pino
- `@solana/web3.js`
- `@solana/spl-token`
- Biome

Adjacent stacks:

- [`solashare_program/package.json`](/home/const/solashare/solashare_program/package.json) and
  [`solashare_program/programs/solashare_program/Cargo.toml`](/home/const/solashare/solashare_program/programs/solashare_program/Cargo.toml)
  for the Anchor/Rust workspace
- [`solashare-frontend/package.json`](/home/const/solashare/solashare-frontend/package.json) for
  the Next.js frontend

## Documentation
Project documentation lives in [`docs/`](/home/const/solashare/docs). Treat it as required context
when working on architecture, domain behavior, API contracts, database design, indexing, on-chain
flows, storage, security, and deployment decisions.

Start with:

- [`docs/README.md`](/home/const/solashare/docs/README.md)
- [`docs/11-repository-map.md`](/home/const/solashare/docs/11-repository-map.md)
- [`docs/12-modules-reference.md`](/home/const/solashare/docs/12-modules-reference.md)
- [`docs/13-dependencies-and-runtime.md`](/home/const/solashare/docs/13-dependencies-and-runtime.md)

Then open the task-specific docs:

- architecture: [`docs/01-architecture-overview.md`](/home/const/solashare/docs/01-architecture-overview.md)
- domain model: [`docs/02-domain-model.md`](/home/const/solashare/docs/02-domain-model.md)
- database: [`docs/03-database-schema.md`](/home/const/solashare/docs/03-database-schema.md)
- API: [`docs/04-api-spec.md`](/home/const/solashare/docs/04-api-spec.md)
- Solana design: [`docs/05-onchain-design.md`](/home/const/solashare/docs/05-onchain-design.md)
- sync/indexer: [`docs/06-sync-indexer.md`](/home/const/solashare/docs/06-sync-indexer.md)
- on-chain workspace reality:
  [`docs/14-onchain-workspace.md`](/home/const/solashare/docs/14-onchain-workspace.md)

If implementation and docs diverge, update the docs or explicitly call out the mismatch.

## Preferred Structure
Keep code organized by responsibility.

Main backend layout:

- `src/index.ts`: process entrypoint
- `src/app.ts`: Elysia app wiring
- `src/config/`: env parsing and runtime config
- `src/lib/`: shared adapters such as logger, db, redis, queue, websocket, Solana clients
- `src/modules/`: domain modules such as `auth`, `assets`, `issuer`, `investments`, `claims`,
  `transactions`, `uploads`, `notifications`, `webhook`, `indexer`, `admin`
- `src/db/`: Drizzle schema and database access
- `src/plugins/`: Elysia plugins
- `src/tests/`: unit and integration tests
- `scripts/`: local dev, bootstrap, localnet, and helper scripts

Repository-level sibling areas:

- `solashare_program/`: Anchor/Rust on-chain workspace
- `solashare-frontend/`: Next.js frontend
- `docs/`: documentation
- `research/`: research artifacts

Keep HTTP handlers thin. Business logic belongs in services. Database access must stay isolated
from transport code.

## Domain Model
Design around these core entities and workflow concepts:

- `Asset`
- `AssetDocument`
- `VerificationRequest`
- `VerificationDecision`
- `ShareMint`
- `ShareHoldingSnapshot`
- `RevenuePeriod`
- `RevenueDeposit`
- `Claim`
- `WalletBinding`
- `AuditLog`
- `WebhookEvent`
- `JobExecutionLog`
- user profile and KYC state
- transaction preparation and confirmation state

## Commands
Use existing scripts; do not replace them without reason.

Backend commands:

- `bun run dev`
- `bun run lint`
- `bun run format`
- `bun run typecheck`
- `bun run check`
- `bun run test`
- `bun run bootstrap:admin --email admin@example.com --password 'StrongPassword123!'`
- `bun run db:generate`
- `bun run db:migrate`
- `bun run db:push`
- `bun run db:studio`

Frontend commands live in
[`solashare-frontend/package.json`](/home/const/solashare/solashare-frontend/package.json).

On-chain commands live in
[`solashare_program/package.json`](/home/const/solashare/solashare_program/package.json) and
[`solashare_program/Anchor.toml`](/home/const/solashare/solashare_program/Anchor.toml).

Useful local helper scripts:

- `./scripts/start-localnet.sh`
- `./scripts/stop-localnet.sh`
- `bun run scripts/bootstrap-admin.ts`

## Coding Rules
Write strict TypeScript in the backend and frontend. Avoid `any` unless unavoidable. Use Zod for
external payload validation. Prefer small functions, explicit types, and domain-oriented names. Use
Biome for formatting and linting. Log important failures and lifecycle events through Pino. Do not
mix Solana, DB, or queue logic into route handlers.

For on-chain code:

- keep Rust/Anchor changes scoped and explicit
- do not change PDA strategy, account layout, or instruction semantics casually
- document any change that affects backend transaction preparation or sync logic

## Data, Queue, and Solana Rules
Use Drizzle schema-first/code-first migrations only. Avoid raw SQL unless justified and documented.
Keep PostgreSQL schema normalized and auditable for financial and status data.

Use Redis for cache, deduplication, temporary state, WebSocket coordination, and BullMQ.
Long-running work must leave the HTTP lifecycle. Webhooks and event consumers must be idempotent
and retry-safe.

Encapsulate Solana integration in `src/lib/solana` or module-local adapters. Separate:

- on-chain reads
- transaction preparation
- event processing
- backend reconciliation

All RPC URLs, program IDs, secrets, and keys must come from config or env.

## Env and Security
Validate env on startup and fail fast with clear errors. At minimum the backend must support:

- `PORT`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `SOLANA_RPC_URL`
- `SOLANA_COMMITMENT`
- `CHALLENGE_SECRET`
- storage env required by the active upload flow
- `HELIUS_API_KEY` and `HELIUS_WEBHOOK_SECRET` when indexing or webhooks are enabled

Never hardcode secrets or log them.

## API and Observability
Keep the API REST-like and predictable. Return structured errors and appropriate HTTP status codes.
Expose health and readiness endpoints. Log app startup, config failures, DB failures, webhook
failures, job execution, and important asset status transitions.

OpenAPI/Scalar is part of the maintained developer surface, not an afterthought.

## Dev Infrastructure and Change Workflow
Local dev infrastructure should stay simple. The checked-in
[`docker-compose.yml`](/home/const/solashare/docker-compose.yml) is the default local setup for:

- PostgreSQL
- Redis
- MinIO

The repository has two practical setup modes:

- backend-only mode: Bun API + PostgreSQL + Redis + MinIO + external or local Solana RPC
- full-stack/on-chain mode: backend plus Rust, Solana CLI, Anchor CLI, and local validator flow

When changing docs or setup instructions, keep both modes accurate.

After every substantive change:

1. Run `bun run check`
2. Run `bun run lint`
3. Run tests if a real test runner exists for the touched area
4. Fix issues instead of silencing them

Before any commit:

1. Run `bun run check`
2. Ensure the TypeScript compiler is clean with no `tsc --noEmit` errors
3. Run `bun run lint`
4. Run `bun run test` when backend behavior changed
5. Fix all reported issues before creating the commit

Do not add unnecessary frameworks, swap runtimes, replace Elysia or Drizzle, or over-engineer the
dev infrastructure.
