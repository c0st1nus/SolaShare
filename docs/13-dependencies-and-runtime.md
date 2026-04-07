# Dependencies And Runtime

This document describes the current dependency layout, runtime services, env surface, and daily
commands.

## Applications

### `apps/api`

Backend runtime is managed from the repository root [package.json](/home/const/solashare/package.json)
and implemented in [apps/api](/home/const/solashare/apps/api).

Primary runtime dependencies:

- `elysia`
- `@elysiajs/cors`
- `@elysiajs/jwt`
- `@elysiajs/openapi`
- `zod`
- `drizzle-orm`
- `postgres`
- `ioredis`
- `bullmq`
- `pino`
- `@solana/web3.js`
- `@solana/spl-token`

Primary tooling:

- `bun`
- `typescript`
- `@biomejs/biome`
- `drizzle-kit`
- `bun test`

### `apps/web`

Frontend package:

- [apps/web/package.json](/home/const/solashare/apps/web/package.json)

Primary dependencies:

- `next`
- `react`
- `react-dom`
- `@solana/web3.js`
- wallet adapter packages
- `next-themes`
- `recharts`
- `lucide-react`
- `clsx`
- `tailwindcss`

### `programs/solashare-protocol`

On-chain workspace packages:

- [programs/solashare-protocol/package.json](/home/const/solashare/programs/solashare-protocol/package.json)
- [programs/solashare-protocol/programs/solashare_protocol/Cargo.toml](/home/const/solashare/programs/solashare-protocol/programs/solashare_protocol/Cargo.toml)

Primary JS-side dependencies:

- `@coral-xyz/anchor`
- `typescript`
- `mocha`
- `chai`
- `ts-mocha`
- `prettier`

Primary Rust dependencies:

- `anchor-lang`
- `anchor-spl`
- `sha2`

## Runtime Services

Local development expects:

- PostgreSQL
- Redis
- S3-compatible storage
- Solana RPC

[docker-compose.yml](/home/const/solashare/docker-compose.yml) provides local containers for:

- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- MinIO API on `localhost:9000`
- MinIO console on `localhost:9001`

## Environment Variables

Backend env is validated in
[apps/api/src/config/env.ts](/home/const/solashare/apps/api/src/config/env.ts).

Required core env:

- `PORT`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `SOLANA_RPC_URL`
- `SOLANA_COMMITMENT`
- `CHALLENGE_SECRET`
- storage env required by the active upload flow

Optional but operationally important:

- `HELIUS_API_KEY`
- `HELIUS_WEBHOOK_SECRET`
- `SOLANA_PAYER_KEY`
- `SOLANA_PROGRAM_ID`
- `SOLANA_USDC_MINT_ADDRESS`
- `CORS_ORIGINS`
- Telegram and Google auth variables

## Root Commands

From the repository root:

```bash
bun run dev:api
bun run dev:web
bun run dev:stack
bun run start:api
bun run build:web
bun run start:web
bun run check
bun run lint
bun run test
bun run check:web
bun run onchain:lint
bun run onchain:test
```

## Quickstart

### Backend only

```bash
bun install
cp .env.example .env
docker compose up -d
bun run db:migrate
bun run dev:api
```

### Backend + frontend

```bash
bun run dev:stack
```

### On-chain workspace

```bash
cd programs/solashare-protocol
yarn install
anchor build
```

To boot local validator and preload the program when artifacts exist:

```bash
./scripts/start-localnet.sh --build
```

## PM2

PM2 configuration lives in [ecosystem.cjs](/home/const/solashare/ecosystem.cjs).

Expected production-oriented flow:

```bash
bun run build:web
bun run pm2:start
```

Review default env values in `ecosystem.cjs` before deploying.

## Testing

Backend tests must use a dedicated test database.

Required test env:

```bash
NODE_ENV=test
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/solashare_test
```

Rules:

- never point tests at the normal development database
- `DATABASE_URL` stays for normal runtime usage
- `TEST_DATABASE_URL` is read only in test mode
- [apps/api/src/tests/helpers.ts](/home/const/solashare/apps/api/src/tests/helpers.ts) hard-fails when the configured test DB name does not look like a test database

## Verification And Indexer Status

The backend includes on-chain transaction verification and a transaction indexer.

Implemented verification capabilities:

- signature format validation
- transaction existence and confirmation checks
- signer verification
- program invocation verification
- PDA account validation
- idempotency keyed by transaction signature

Implemented indexer capabilities:

- polling mode via Solana RPC
- webhook-driven ingestion
- sync for `buy_shares`, `post_revenue`, and `claim_yield`
- admin endpoints for status, start, stop, and manual sync

Useful endpoints:

- `GET /api/v1/indexer/status`
- `POST /api/v1/indexer/start`
- `POST /api/v1/indexer/stop`
- `POST /api/v1/indexer/sync`
- `POST /api/v1/indexer/webhook`

Relevant code:

- [apps/api/src/lib/solana/verification.ts](/home/const/solashare/apps/api/src/lib/solana/verification.ts)
- [apps/api/src/lib/solana/indexer.ts](/home/const/solashare/apps/api/src/lib/solana/indexer.ts)
- [apps/api/src/modules/indexer/routes.ts](/home/const/solashare/apps/api/src/modules/indexer/routes.ts)
