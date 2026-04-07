# SolaShare

<p align="center">
  <img src="./assets/solashare.jpg" alt="SolaShare hero" width="100%" />
</p>

<p align="center">
  <a href="https://solashare.org">Website</a> •
  <a href="https://youtu.be/TwOow0vHzBY">Video Presentation</a>
</p>

SolaShare is a Solana-based RWA platform repository centered around a Bun + Elysia backend for
asset issuance, investor onboarding, investment preparation, revenue distribution, claims, and
operational auditability.

This repository currently contains four major parts:

- `src/` and `docs/`: the backend service and its technical documentation
- `solashare_program/`: the Solana on-chain program workspace
- `solashare-frontend/`: the separate Next.js frontend application
- `research/`: product and market research artifacts referenced by the team

## What This Repository Covers

At the platform level, SolaShare is designed to handle:

- issuer asset creation and moderation workflows
- investor authentication, profile management, and KYC submission
- document uploads and private file serving
- investment quote and transaction preparation
- transaction confirmation and off-chain settlement tracking
- revenue period posting and investor claim preparation
- webhook ingestion, notification delivery, and indexer operations

The backend is the main operational service in this repository. It exposes a REST API with
OpenAPI/Scalar docs, persists workflow state in PostgreSQL, uses Redis and BullMQ for async work,
and prepares Solana transactions for wallet-side signing.

## Documentation Map

Start here if you want architecture and implementation context:

- [docs/README.md](/home/const/solashare/docs/README.md): documentation index
- [docs/01-architecture-overview.md](/home/const/solashare/docs/01-architecture-overview.md):
  system architecture and trust split
- [docs/04-api-spec.md](/home/const/solashare/docs/04-api-spec.md): REST contract and endpoint
  behavior
- [docs/11-repository-map.md](/home/const/solashare/docs/11-repository-map.md): repository layout
  and where each concern lives
- [docs/12-modules-reference.md](/home/const/solashare/docs/12-modules-reference.md): all backend
  modules, shared libraries, plugins, scripts, and related subprojects
- [docs/13-dependencies-and-runtime.md](/home/const/solashare/docs/13-dependencies-and-runtime.md):
  runtime stack, dependency groups, infrastructure, env, and local operations
- [docs/14-onchain-workspace.md](/home/const/solashare/docs/14-onchain-workspace.md): dedicated
  reference for the Anchor workspace, on-chain accounts, instructions, PDAs, and dependencies

Related repository materials:

- [TESTING_GUIDE.md](/home/const/solashare/TESTING_GUIDE.md): testing notes and local test flows
- [DEPLOYMENT_COMPLETE.md](/home/const/solashare/DEPLOYMENT_COMPLETE.md): deployment notes
- [research/research.pdf](/home/const/solashare/research/research.pdf): research snapshot
- [research/research.typ](/home/const/solashare/research/research.typ): research source

## Quickstart

Choose the path that matches your task:

- backend-only: API, DB, Redis, uploads, OpenAPI, tests
- backend + frontend: local product UI against the local API
- full-stack/on-chain: Anchor workspace, local validator, program build/deploy work

### Backend-Only Quickstart

Use this if you only need the API and supporting infrastructure.

#### Prerequisites

- Bun
- Docker with `docker compose`
- a reachable Solana RPC URL

#### 1. Install backend dependencies

```bash
bun install
```

#### 2. Create the local env file

```bash
cp .env.example .env
```

Review these values before first boot:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `CHALLENGE_SECRET`
- `SOLANA_RPC_URL`
- `SOLANA_COMMITMENT`
- `S3_ENDPOINT`
- `S3_BUCKET`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`

For local development, the checked-in `.env.example` already matches the default Docker services
for PostgreSQL, Redis, and MinIO.

#### 3. Start local infrastructure

```bash
docker compose up -d
```

This starts:

- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- MinIO API on `localhost:9000`
- MinIO console on `localhost:9001`

#### 4. Apply database migrations

```bash
bun run db:migrate
```

#### 5. Bootstrap the first admin user

```bash
bun run bootstrap:admin --email admin@example.com --password 'StrongPassword123!' --display-name 'Platform Admin'
```

#### 6. Start the backend

```bash
bun run dev
```

#### 7. Verify the backend is healthy

Open these URLs:

- `http://localhost:3000/`
- `http://localhost:3000/api/v1/health`
- `http://localhost:3000/api/v1/ready`
- `http://localhost:3000/openapi`
- `http://localhost:3000/openapi/json`

Expected result:

- `/health` returns `status: ok`
- `/ready` returns `status: ready` when DB, Redis, and Solana RPC are reachable
- `/openapi` serves the Scalar docs UI

### Frontend Against Local Backend

Use this if you want the browser app running against your local API.

#### Prerequisites

- the backend quickstart above is already running
- Bun installed

#### 1. Install frontend dependencies

```bash
cd solashare-frontend
bun install
```

#### 2. Start the frontend

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000 bun run dev
```

#### 3. Open the frontend

- app: `http://localhost:3001` if Next selects port `3001`
- otherwise use the port printed by Next at startup

The frontend defaults to `http://localhost:3000` as the API base when
`NEXT_PUBLIC_API_URL` is not set, but setting it explicitly is better.

### Full-Stack / On-Chain Quickstart

Use this path if you need to build, test, or deploy
[solashare_program](/home/const/solashare/solashare_program).

#### Additional prerequisites

- Rust toolchain
- Solana CLI
- Anchor CLI
- a funded local wallet or target-cluster wallet

Important:

- Rust is not required to boot the backend API by itself
- Rust is required to build, test, or deploy
  [solashare_program](/home/const/solashare/solashare_program)

#### 1. Install JS-side workspace dependencies

```bash
cd solashare_program
yarn install
```

#### 2. Start a local validator

From the repository root:

```bash
./scripts/start-localnet.sh
```

Useful variants:

```bash
./scripts/start-localnet.sh --reset
./scripts/start-localnet.sh --build
```

This script:

- starts `solana-test-validator`
- stores local state under `.solana/`
- optionally builds and preloads the program if artifacts exist

#### 3. Build the Anchor program

```bash
cd solashare_program
anchor build
```

If `anchor` is unavailable but Solana SBF tooling is present, the helper script can also build via
`cargo-build-sbf`.

#### 4. Point the backend to the local validator and program

Update `.env` for local on-chain work:

- set `SOLANA_RPC_URL=http://127.0.0.1:8899`
- set `SOLANA_COMMITMENT=confirmed`
- set `SOLANA_PROGRAM_ID` to the deployed or preloaded local program ID

Anchor localnet config currently lives in
[solashare_program/Anchor.toml](/home/const/solashare/solashare_program/Anchor.toml).

#### 5. Start the backend against localnet

Back in the repository root:

```bash
bun run dev
```

#### 6. Stop the local validator when finished

```bash
./scripts/stop-localnet.sh
```

See [docs/14-onchain-workspace.md](/home/const/solashare/docs/14-onchain-workspace.md) for the
current on-chain instructions, accounts, PDA model, dependencies, and integration boundaries.

## On-Chain Setup Note

If your task touches the Anchor program in
[solashare_program](/home/const/solashare/solashare_program), the backend quickstart above is not
enough.

For on-chain work you need:

- Rust
- Solana CLI
- Anchor CLI
- the `solashare_program/` workspace dependencies

Use [docs/14-onchain-workspace.md](/home/const/solashare/docs/14-onchain-workspace.md) as the
reference for the current on-chain workspace and dependency surface.

## Repository Layout

Core areas:

- `src/index.ts`: process entrypoint, worker startup, HTTP boot
- `src/app.ts`: Elysia app assembly, route registration, top-level error handling
- `src/config/`: environment parsing and config validation
- `src/db/`: Drizzle database access and schema
- `src/lib/`: shared adapters for DB, Redis, queueing, logging, WebSocket, and Solana
- `src/modules/`: route groups and domain services
- `src/plugins/`: Elysia auth and OpenAPI plugins
- `src/tests/`: unit and integration coverage
- `scripts/`: bootstrap, localnet, and helper scripts
- `docs/`: architecture, schema, API, flows, storage, security, roadmap, and repo references
- `solashare_program/`: Anchor-based on-chain workspace
- `solashare-frontend/`: standalone frontend app
- `research/`: product and market research artifacts

For the full breakdown, use
[docs/11-repository-map.md](/home/const/solashare/docs/11-repository-map.md) and
[docs/12-modules-reference.md](/home/const/solashare/docs/12-modules-reference.md).

## Backend Modules

The API currently mounts these major route groups in
[src/app.ts](/home/const/solashare/src/app.ts):

- `system`: health and readiness
- `auth`: password, Google, Telegram, refresh sessions, wallet binding
- `assets`: public asset catalog and investor-facing asset reads
- `issuer`: issuer-owned asset management, sale terms, revenue posting, on-chain setup
- `me`: current-user profile, KYC, portfolio, claim history
- `investments`: quote calculation and investment transaction preparation
- `claims`: claim transaction preparation
- `transactions`: post-signature confirmation and sync metadata
- `uploads`: presign, direct upload, and file resolution
- `notifications`: authenticated WebSocket notifications
- `webhook`: Helius webhook ingestion
- `indexer`: Solana sync controls and manual reconciliation
- `admin`: moderation, user management, KYC review, audit visibility

Detailed module-by-module descriptions live in
[docs/12-modules-reference.md](/home/const/solashare/docs/12-modules-reference.md).

## Dependency Summary

Backend runtime:

- Bun
- TypeScript
- Elysia
- Zod
- Drizzle ORM
- PostgreSQL via `postgres`
- Redis via `ioredis`
- BullMQ
- Pino
- `@solana/web3.js`
- `@solana/spl-token`

Backend tooling:

- Biome
- Drizzle Kit
- Bun test runner

Other repository parts:

- `solashare_program/`: Anchor, Anchor SPL, SHA-256, Mocha, Chai, TypeScript
- `solashare-frontend/`: Next.js, React, Tailwind, Recharts

The exact dependency inventory is documented in
[docs/13-dependencies-and-runtime.md](/home/const/solashare/docs/13-dependencies-and-runtime.md).
The on-chain workspace is documented separately in
[docs/14-onchain-workspace.md](/home/const/solashare/docs/14-onchain-workspace.md).

## Commands

Backend commands:

```bash
bun run dev
bun run check
bun run lint
bun run format
bun run test
bun run bootstrap:admin --email admin@example.com --password 'StrongPassword123!'
bun run db:generate
bun run db:migrate
bun run db:push
bun run db:studio
```

The frontend and on-chain workspaces have their own commands in their local `package.json` files.
See [docs/12-modules-reference.md](/home/const/solashare/docs/12-modules-reference.md) for the
subproject breakdown.

## Current State

Implemented backend capabilities include:

- role-aware auth and session flows
- public asset catalog and issuer asset management
- admin moderation and KYC review
- document upload and private file retrieval
- investment preparation and transaction confirmation
- claim preparation and portfolio read models
- webhook-backed transaction processing and notification flows
- OpenAPI generation and Scalar UI
- integration and unit tests for key workflows

The repository also contains active in-progress work. If code and docs diverge, treat the code as
the execution reality and update the docs accordingly.
