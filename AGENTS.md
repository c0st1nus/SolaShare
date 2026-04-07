# Repository Guidelines

## Project Purpose

`solashare` is a monorepo for a Solana-based RWA platform.

Main areas:

- `apps/api`: Bun + Elysia backend
- `apps/web`: Next.js frontend
- `programs/solashare-protocol`: Anchor workspace
- `docs`: technical documentation
- `research`: product and market research artifacts

Default assumption: most tasks target `apps/api` unless the user explicitly asks for frontend or
on-chain work.

## Core Stack

Root command surface and backend dependencies are defined in
[`package.json`](/home/const/solashare/package.json).

Backend runtime stack:

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

Adjacent package manifests:

- [`apps/web/package.json`](/home/const/solashare/apps/web/package.json)
- [`programs/solashare-protocol/package.json`](/home/const/solashare/programs/solashare-protocol/package.json)
- [`programs/solashare-protocol/programs/solashare_protocol/Cargo.toml`](/home/const/solashare/programs/solashare-protocol/programs/solashare_protocol/Cargo.toml)

## Documentation

Project documentation lives in [`docs`](/home/const/solashare/docs).

Start with:

- [`docs/README.md`](/home/const/solashare/docs/README.md)
- [`docs/11-repository-map.md`](/home/const/solashare/docs/11-repository-map.md)
- [`docs/12-modules-reference.md`](/home/const/solashare/docs/12-modules-reference.md)
- [`docs/13-dependencies-and-runtime.md`](/home/const/solashare/docs/13-dependencies-and-runtime.md)
- [`docs/14-onchain-workspace.md`](/home/const/solashare/docs/14-onchain-workspace.md)
- [`docs/15-monorepo-operations.md`](/home/const/solashare/docs/15-monorepo-operations.md)

If implementation and docs diverge, update the docs or explicitly call out the mismatch.

## Preferred Structure

Backend layout:

- `apps/api/src/index.ts`: process entrypoint
- `apps/api/src/app.ts`: Elysia app wiring
- `apps/api/src/config`: env parsing and runtime config
- `apps/api/src/db`: Drizzle schema and DB access
- `apps/api/src/lib`: shared adapters
- `apps/api/src/modules`: domain modules
- `apps/api/src/plugins`: Elysia plugins
- `apps/api/src/tests`: backend tests

Repository-level areas:

- `apps/web`: frontend app
- `programs/solashare-protocol`: on-chain workspace
- `scripts`: root helper scripts
- `docs`: documentation
- `drizzle`: migrations

Keep handlers thin. Put business logic in services. Keep DB access out of transport code.

## Commands

Common root commands:

- `bun run dev:api`
- `bun run dev:web`
- `bun run dev:stack`
- `bun run check`
- `bun run lint`
- `bun run test`
- `bun run build:web`
- `bun run pm2:start`
- `bun run db:migrate`
- `bun run bootstrap:admin --email admin@example.com --password 'StrongPassword123!'`

Useful helpers:

- `./scripts/start-localnet.sh`
- `./scripts/stop-localnet.sh`
- `./scripts/dev-workspace.sh`

## Coding Rules

Write strict TypeScript. Avoid `any` unless there is no clean alternative. Use Zod for external
payload validation. Prefer small functions, explicit types, and domain-oriented names. Use Biome
for formatting and linting. Log important failures and lifecycle events through Pino.

For on-chain code:

- keep Rust/Anchor changes scoped and explicit
- do not change PDA strategy, account layout, or instruction semantics casually
- document any change that affects backend transaction preparation or sync logic

## Data, Queue, And Solana Rules

Use Drizzle schema-first/code-first migrations only. Avoid raw SQL unless justified and documented.

Use Redis for cache, deduplication, temporary state, WebSocket coordination, and BullMQ.
Long-running work must leave the HTTP lifecycle.

Encapsulate Solana integration in `apps/api/src/lib/solana` or module-local adapters. Separate:

- on-chain reads
- transaction preparation
- event processing
- backend reconciliation

All RPC URLs, program IDs, secrets, and keys must come from config or env.

## Dev Workflow

Checked-in local infrastructure is based on
[`docker-compose.yml`](/home/const/solashare/docker-compose.yml).

After substantive changes:

1. Run `bun run check`
2. Run `bun run lint`
3. Run tests for the touched area
4. Fix issues instead of silencing them

Before commit:

1. Run `bun run check`
2. Ensure TypeScript is clean
3. Run `bun run lint`
4. Run `bun run test` when backend behavior changed
5. Fix all reported issues
