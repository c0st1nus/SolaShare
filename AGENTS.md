# Repository Guidelines

## Project Purpose
`solashare` is a backend for a Solana-based RWA platform. The service handles asset creation, document binding, verification workflow, token issuance preparation, on-chain event synchronization, revenue period accounting, claim flows, administrative actions, and auditability. Treat it as a clean backend service, not a fullstack app.

## Core Stack
Source of truth for dependencies and commands is [`package.json`](/home/const/solashare/package.json). Current stack: Bun, TypeScript, ElysiaJS, Drizzle ORM, PostgreSQL, Redis, BullMQ, Zod, Pino, `@solana/web3.js`, and Biome.

## Documentation
Project documentation lives in [`docs/`](/home/const/solashare/docs). Treat it as required context when working on architecture, domain behavior, API contracts, database design, indexing, on-chain flows, storage, security, and deployment decisions. Start with [`docs/README.md`](/home/const/solashare/docs/README.md), then open the relevant topic files such as `01-architecture-overview.md`, `03-database-schema.md`, `04-api-spec.md`, or `05-onchain-design.md`. If implementation and docs diverge, update the docs or explicitly call out the mismatch.

## Preferred Structure
Organize code by responsibility:

- `src/index.ts`: process entrypoint
- `src/app.ts`: Elysia app wiring
- `src/config/`: env parsing, config, constants
- `src/lib/`: shared adapters such as logger, db, redis, Solana clients
- `src/modules/`: domain modules like `assets`, `verifications`, `shares`, `revenue`, `claims`, `webhooks`, `jobs`
- `src/db/`: Drizzle schema, migrations, seeds
- `src/queues/`: BullMQ queues and workers
- `src/plugins/`: Elysia plugins
- `src/types/`: shared types
- `src/tests/`: tests when introduced

Keep HTTP handlers thin. Business logic belongs in services. Database access must stay isolated from transport code.

## Domain Model
Design for these core entities: `Asset`, `AssetDocument`, `VerificationRequest`, `VerificationDecision`, `ShareMint`, `ShareHoldingSnapshot`, `RevenuePeriod`, `RevenueDeposit`, `Claim`, `WalletBinding`, `AuditLog`, `WebhookEvent`, `JobExecutionLog`.

## Commands
Use existing scripts; do not replace them without reason:

- `bun run dev`
- `bun run lint`
- `bun run format`
- `bun run check`
- `bun run db:generate`
- `bun run db:migrate`
- `bun run db:push`
- `bun run db:studio`

## Coding Rules
Write strict TypeScript. Avoid `any` unless unavoidable. Use Zod for external payload validation. Prefer small functions, explicit types, and domain-oriented names. Use Biome for formatting and linting. Log important failures and lifecycle events through Pino. Do not mix Solana, DB, or queue logic into route handlers.

## Data, Queue, and Solana Rules
Use Drizzle schema-first/code-first migrations only. Avoid raw SQL unless justified and documented. Keep PostgreSQL schema normalized and auditable for financial/status data.

Use Redis for cache, deduplication, temporary state, and BullMQ. Long-running work must leave the HTTP lifecycle. Webhooks and event consumers must be idempotent and retry-safe.

Encapsulate Solana integration in a dedicated layer, ideally `src/lib/solana` or module-local adapters. Separate on-chain reads, transaction preparation, and event processing. All RPC URLs, program IDs, and keys must come from config/env.

## Env and Security
Validate env on startup and fail fast with clear errors. At minimum support: `PORT`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `SOLANA_RPC_URL`, `SOLANA_COMMITMENT`, and `HELIUS_API_KEY` when indexing/webhooks are enabled. Never hardcode secrets or log them.

## API and Observability
Keep the API REST-like and predictable. Return structured errors and appropriate HTTP status codes. Expose a simple health endpoint; add readiness/liveness endpoints when useful. Log app startup, config failures, DB failures, webhook failures, job execution, and important asset status transitions.

## Dev Infrastructure and Change Workflow
Local dev infrastructure should be simple. Prefer `docker compose` for `postgres` and `redis`, with explicit ports and persistent volumes. Add `app` or `worker` services only if they materially improve development.

After every substantive change:

1. Run `bun run check`
2. Run `bun run lint`
3. Run tests if a real test runner exists
4. Fix issues instead of silencing them

Before any commit:

1. Run `bun run check`
2. Ensure the TypeScript compiler is clean with no `tsc --noEmit` errors
3. Run `bun run lint`
4. Fix all reported issues before creating the commit

Do not add unnecessary frameworks, swap runtimes, replace Elysia or Drizzle, or over-engineer the dev infrastructure.
