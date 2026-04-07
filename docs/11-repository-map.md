# Repository Map

This document explains how the SolaShare repository is organized today and where to look for each
technical concern.

## Top-Level Layout

- `README.md`
  Main entrypoint for quickstart, repository scope, and documentation navigation.

- `docs/`
  Architecture, API, schema, security, deployment, and repository-reference documentation.

- `src/`
  Main Bun + Elysia backend source code.

- `drizzle/`
  Generated SQL migrations and Drizzle metadata snapshots.

- `scripts/`
  Local development and operator helper scripts.

- `solashare_program/`
  Solana on-chain workspace built around Anchor.

- `solashare-frontend/`
  Separate Next.js frontend application for the product experience.

- `research/`
  Research artifact source and rendered output.

- `docker-compose.yml`
  Local infrastructure for PostgreSQL, Redis, and MinIO.

- `.env.example`
  Baseline environment variable template for local boot.

## Backend Source Layout

The backend lives under `src/` and is intentionally split by responsibility.

### Runtime Entry

- [src/index.ts](/home/const/solashare/src/index.ts)
  Starts queue workers, boots the HTTP server, and logs service startup.

- [src/app.ts](/home/const/solashare/src/app.ts)
  Assembles the Elysia application, registers route groups, configures CORS, mounts OpenAPI, and
  centralizes top-level error handling.

### Configuration

- [src/config/env.ts](/home/const/solashare/src/config/env.ts)
  Validates all environment variables with Zod and fails fast on invalid configuration.

### Database

- [src/db/index.ts](/home/const/solashare/src/db/index.ts)
  Exposes the Drizzle database handle.

- [src/db/schema.ts](/home/const/solashare/src/db/schema.ts)
  Defines the application schema and shared enums for PostgreSQL.

### Shared Libraries

- `src/lib/`
  Shared infrastructure adapters and reusable service helpers.

Important areas:

- `src/lib/db.ts`: low-level database connection setup
- `src/lib/redis.ts`: Redis client setup
- `src/lib/queue.ts`: BullMQ queue and worker bootstrapping
- `src/lib/logger.ts`: Pino logger instance and logger conventions
- `src/lib/websocket.ts`: notification transport helpers
- `src/lib/api-error.ts`: structured application error type
- `src/lib/solana/`: Solana-specific integration layer for clients, PDAs, transactions, faucet,
  token helpers, indexer behavior, wallet challenge flow, and typed integration helpers

### Elysia Plugins

- `src/plugins/auth.ts`
  Auth plugin and role/auth enforcement helpers used by route groups.

- `src/plugins/openapi.ts`
  OpenAPI/Scalar registration and API documentation wiring.

### Domain Modules

- `src/modules/`
  Domain-oriented backend modules. Each module generally keeps route contracts, route handlers, and
  service logic together.

The currently mounted route groups are:

- `admin`
- `assets`
- `auth`
- `claims`
- `indexer`
- `investments`
- `issuer`
- `me`
- `notifications`
- `system`
- `transactions`
- `uploads`
- `webhook`

Detailed descriptions for each one live in
[12-modules-reference.md](/home/const/solashare/docs/12-modules-reference.md).

### Tests

- `src/tests/`
  Unit and integration coverage for auth, assets, issuer/admin workflows, investment flows,
  webhook-backed processing, and system behavior.

## Infrastructure And State

### Migrations

- `drizzle/*.sql`
  Generated SQL migration files tracked in version control.

- `drizzle/meta/*.json`
  Drizzle snapshots and migration journal metadata.

### Local Infrastructure

- [docker-compose.yml](/home/const/solashare/docker-compose.yml)
  Starts local PostgreSQL, Redis, MinIO, and a one-shot MinIO bucket initializer.

### Example Configuration

- [.env.example](/home/const/solashare/.env.example)
  Captures the expected local environment variable surface for booting the backend.

## Scripts

- `scripts/bootstrap-admin.ts`
  Creates the initial admin account for a fresh environment.

- `scripts/dev-all.sh`
  Helper for running multiple local services together.

- `scripts/start-localnet.sh`
  Starts a Solana localnet-oriented helper flow.

- `scripts/stop-localnet.sh`
  Stops the localnet helper flow.

- `scripts/setup-mock-usdc.ts`
  Prepares local mock USDC-related setup for development flows.

- `scripts/test-verification.ts`
  Verification-related local helper script.

## Frontend Subproject

- `solashare-frontend/`
  Standalone Next.js application. This is not the main backend service, but it is part of the
  repository's product surface.

Important frontend areas:

- `src/app/`: route segments and pages
- `src/components/`: UI components and shells
- `src/lib/`: frontend API, auth, Solana, upload, and session helpers
- `public/`: product assets

## On-Chain Subproject

- `solashare_program/`
  Anchor-based Solana program workspace with Rust program code, tests, and migration scripts.

Important areas:

- `programs/solashare_program/src/lib.rs`: Solana program entrypoint
- `tests/solashare_program.ts`: program tests
- `migrations/deploy.ts`: deployment helper
- `Anchor.toml`: Anchor workspace configuration

Use
[14-onchain-workspace.md](/home/const/solashare/docs/14-onchain-workspace.md) for the full
instruction, account, dependency, and PDA reference.

## Research Artifacts

- `research/research.pdf`
  Rendered research document for product or market context.

- `research/research.typ`
  Typst source used to generate the research document.

## Operational Reading Guide

Use this map to locate the right material quickly:

- API behavior: [04-api-spec.md](/home/const/solashare/docs/04-api-spec.md)
- domain concepts: [02-domain-model.md](/home/const/solashare/docs/02-domain-model.md)
- schema details: [03-database-schema.md](/home/const/solashare/docs/03-database-schema.md)
- Solana boundaries: [05-onchain-design.md](/home/const/solashare/docs/05-onchain-design.md)
- sync and reconciliation: [06-sync-indexer.md](/home/const/solashare/docs/06-sync-indexer.md)
- dependencies and env:
  [13-dependencies-and-runtime.md](/home/const/solashare/docs/13-dependencies-and-runtime.md)
