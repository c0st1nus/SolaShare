# Dependencies And Runtime

This document describes the runtime stack, dependency inventory, environment variables, local
infrastructure, and quick operational commands for SolaShare.

## Backend Runtime Stack

The backend service is defined by [package.json](/home/const/solashare/package.json).

### Runtime dependencies

- `elysia`
  HTTP framework used to assemble the API.

- `@elysiajs/cors`
  CORS configuration for browser and local app access.

- `@elysiajs/jwt`
  JWT signing and verification for API auth.

- `@elysiajs/openapi`
  OpenAPI generation and Scalar UI integration.

- `zod`
  Environment validation and external payload validation.

- `drizzle-orm`
  Typed database access and schema mapping.

- `postgres`
  PostgreSQL driver used by Drizzle.

- `ioredis`
  Redis client for cache, ephemeral state, and queue coordination.

- `bullmq`
  Background job queueing.

- `pino`
  Structured application logging.

- `date-fns`
  Date/time utilities used in domain logic.

- `dotenv`
  Environment loading support where needed.

- `tweetnacl`
  Signature-related cryptographic helpers.

- `@solana/web3.js`
  Solana RPC and transaction SDK.

- `@solana/spl-token`
  SPL token-program helpers.

### Dev dependencies

- `@biomejs/biome`
  Linting and formatting.

- `drizzle-kit`
  Migration generation, push, studio, and schema workflows.

- `bun-types`
  Bun-specific TypeScript types.

## Other Subproject Dependencies

### On-chain workspace

The on-chain workspace is defined by
[solashare_program/package.json](/home/const/solashare/solashare_program/package.json).

Primary dependencies:

- `@coral-xyz/anchor`
- `typescript`
- `mocha`
- `chai`
- `ts-mocha`
- `prettier`

Rust program dependencies from
[solashare_program/programs/solashare_program/Cargo.toml](/home/const/solashare/solashare_program/programs/solashare_program/Cargo.toml):

- `anchor-lang`
- `anchor-spl`
- `sha2`

Use [14-onchain-workspace.md](/home/const/solashare/docs/14-onchain-workspace.md) for the
instruction-level and account-level on-chain reference.

### Frontend

The frontend is defined by
[solashare-frontend/package.json](/home/const/solashare/solashare-frontend/package.json).

Primary dependencies:

- `next`
- `react`
- `react-dom`
- `@solana/web3.js`
- `next-themes`
- `recharts`
- `lucide-react`
- `clsx`
- `tailwindcss`
- `postcss`
- `typescript`
- `@biomejs/biome`

## Runtime Services

Local development expects these core services:

- PostgreSQL
- Redis
- S3-compatible object storage
- Solana RPC

The checked-in
[docker-compose.yml](/home/const/solashare/docker-compose.yml) provides local containers for:

- PostgreSQL 16 on `localhost:5432`
- Redis 7 on `localhost:6379`
- MinIO object storage on `localhost:9000`
- MinIO console on `localhost:9001`

## Development Modes

This repository has two practical setup modes.

### Backend-only mode

Use this mode when you work only on the Bun API and supporting infrastructure.

Required tooling:

- Bun
- Docker with `docker compose`
- access to a Solana RPC endpoint

This mode is sufficient for:

- API development
- database and queue work
- upload flows
- most off-chain integration tests
- OpenAPI and backend contract work

Rust is not required for backend-only boot.

### Full-stack/on-chain mode

Use this mode when your task touches
[solashare_program](/home/const/solashare/solashare_program).

Additional required tooling:

- Rust toolchain
- Solana CLI
- Anchor CLI
- local validator or target cluster access

This mode is required for:

- building the Anchor program
- testing the Anchor program
- deploying the Anchor program
- validating program-level account and instruction behavior

## Environment Variables

The backend validates environment variables in
[src/config/env.ts](/home/const/solashare/src/config/env.ts). The local template lives in
[.env.example](/home/const/solashare/.env.example).

### Required for normal backend boot

- `DATABASE_URL`
  Main PostgreSQL connection string.

- `REDIS_URL`
  Redis connection string.

- `JWT_SECRET`
  Secret used for JWT signing and verification.

- `SOLANA_RPC_URL`
  Target Solana RPC endpoint.

- `SOLANA_COMMITMENT`
  One of `processed`, `confirmed`, or `finalized`.

- `CHALLENGE_SECRET`
  Secret used by wallet challenge or anti-replay logic. Must be at least 32 characters.

- `S3_ENDPOINT`
  S3-compatible endpoint URL.

- `S3_BUCKET`
  Bucket name for uploaded files.

- `S3_ACCESS_KEY`
  Object storage access key.

- `S3_SECRET_KEY`
  Object storage secret.

### Core runtime options

- `NODE_ENV`
- `PORT`
- `ACCESS_TOKEN_TTL_SECONDS`
- `REFRESH_TOKEN_TTL_DAYS`
- `CHALLENGE_EXPIRY_SECONDS`
- `S3_REGION`
- `STORAGE_PROVIDER`
- `CORS_ORIGINS`

### Optional auth and messaging integrations

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`
- `ADMIN_TELEGRAM_IDS`
- `ISSUER_TELEGRAM_IDS`

Google OAuth note:

- if any Google OAuth variable is set, the full Google OAuth set must be valid

### Optional Solana and indexing settings

- `SOLANA_PAYER_KEY`
- `SOLANA_PROGRAM_ID`
- `SOLANA_USDC_MINT_ADDRESS`
- `HELIUS_API_KEY`
- `HELIUS_WEBHOOK_SECRET`

### Test configuration

- `TEST_DATABASE_URL`

## Quickstart Operations

This section is intentionally split by workflow so local setup is unambiguous.

### Backend-only quickstart

Use this when you work only on the Bun API and supporting services.

#### Install backend dependencies

```bash
bun install
```

#### Create local environment file

```bash
cp .env.example .env
```

#### Start local infrastructure

```bash
docker compose up -d
```

#### Apply migrations

```bash
bun run db:migrate
```

#### Bootstrap first admin

```bash
bun run bootstrap:admin --email admin@example.com --password 'StrongPassword123!' --display-name 'Platform Admin'
```

#### Start backend

```bash
bun run dev
```

This quickstart covers backend-only development.

#### Verify boot

Check:

- `http://localhost:3000/`
- `http://localhost:3000/api/v1/health`
- `http://localhost:3000/api/v1/ready`
- `http://localhost:3000/openapi`

### Frontend against local backend

Use this when you want the Next.js app running against the local API.

#### Install frontend dependencies

```bash
cd solashare-frontend
bun install
```

#### Start frontend

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000 bun run dev
```

By default the frontend client also falls back to `http://localhost:3000` if
`NEXT_PUBLIC_API_URL` is not set.

### Full-stack/on-chain quickstart

Use this when you need to build, test, or deploy the Anchor program.

#### Install on-chain JS dependencies

```bash
cd solashare_program
yarn install
```

#### Start a local validator

From the repository root:

```bash
./scripts/start-localnet.sh
```

Optional variants:

```bash
./scripts/start-localnet.sh --reset
./scripts/start-localnet.sh --build
```

#### Build the Anchor program

```bash
cd solashare_program
anchor build
```

#### Point backend config to localnet

Update `.env` with:

- `SOLANA_RPC_URL=http://127.0.0.1:8899`
- `SOLANA_COMMITMENT=confirmed`
- `SOLANA_PROGRAM_ID=<local program id>`

#### Start backend against localnet

```bash
bun run dev
```

#### Stop the validator

```bash
./scripts/stop-localnet.sh
```

If you need to work on the on-chain program, also use the workspace under
[solashare_program](/home/const/solashare/solashare_program) and the reference in
[14-onchain-workspace.md](/home/const/solashare/docs/14-onchain-workspace.md).

## Commands

Backend commands from [package.json](/home/const/solashare/package.json):

```bash
bun run dev
bun run lint
bun run format
bun run typecheck
bun run check
bun run test
bun run bootstrap:admin --email admin@example.com --password 'StrongPassword123!'
bun run db:generate
bun run db:migrate
bun run db:push
bun run db:studio
```

On-chain workspace commands are defined separately in
[solashare_program/package.json](/home/const/solashare/solashare_program/package.json).

Frontend commands are defined separately in
[solashare-frontend/package.json](/home/const/solashare/solashare-frontend/package.json).

## Operational Endpoints

Useful local endpoints after boot:

- root: `http://localhost:3000/`
- API base: `http://localhost:3000/api/v1`
- health: `http://localhost:3000/api/v1/health`
- readiness: `http://localhost:3000/api/v1/ready`
- Scalar UI: `http://localhost:3000/openapi`
- OpenAPI JSON: `http://localhost:3000/openapi/json`

## Notes And Current Mismatches

Current repository shape includes both `solashare_program/` and `solashare-frontend/` as sibling
subprojects rather than a single unified Bun workspace. Treat each `package.json` as the source of
truth for its local commands and dependency graph.
