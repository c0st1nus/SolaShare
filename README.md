# SolaShare

<p align="center">
  <img src="./assets/solashare.jpg" alt="SolaShare hero" width="100%" />
</p>

<p align="center">
  <a href="https://solashare.org">Website</a> •
  <a href="https://youtu.be/TwOow0vHzBY">Video Presentation</a>
</p>

SolaShare is a monorepo for the platform backend, web client, and Solana on-chain workspace.

## Repository Layout

- `apps/api`
  Bun + Elysia API service. Main source code lives in `apps/api/src`.
- `apps/web`
  Next.js frontend application.
- `programs/solashare-protocol`
  Anchor workspace for the Solana program.
- `docs`
  Architecture, runtime, API, schema, and operational documentation.
- `scripts`
  Root-level helper scripts for local development and maintenance.
- `drizzle`
  SQL migrations and Drizzle metadata.
- `research`
  Product and market research artifacts.

## Main Commands

From the repository root:

```bash
bun run dev:api
bun run dev:web
bun run dev:stack
bun run check
bun run lint
bun run test
bun run build:web
bun run start:api
bun run start:web
bun run pm2:start
```

Database and admin helpers:

```bash
bun run db:generate
bun run db:migrate
bun run db:push
bun run db:studio
bun run bootstrap:admin --email admin@example.com --password 'StrongPassword123!'
```

On-chain helpers:

```bash
./scripts/start-localnet.sh
./scripts/stop-localnet.sh
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

Useful endpoints:

- `http://localhost:3000/`
- `http://localhost:3000/api/v1/health`
- `http://localhost:3000/api/v1/ready`
- `http://localhost:3000/openapi`

### Backend + frontend

```bash
bun run dev:stack
```

Or run them separately:

```bash
bun run dev:api
bun run dev:web
```

Frontend defaults to port `3001`. Set `NEXT_PUBLIC_API_URL` when you need a non-default API base.

### On-chain workspace

```bash
cd programs/solashare-protocol
yarn install
anchor build
```

For local validator work:

```bash
./scripts/start-localnet.sh --build
```

## PM2

Production process definitions live in [`ecosystem.cjs`](/home/const/solashare/ecosystem.cjs).

Default apps:

- `solashare-api`
- `solashare-web`

Typical flow:

```bash
bun run build:web
bun run pm2:start
```

Adjust env values in `ecosystem.cjs` before using it outside local defaults.

## Testing

Backend tests must never run against the normal development database.

Required test env:

```bash
NODE_ENV=test
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/solashare_test
```

Notes:

- `DATABASE_URL` is used for normal development.
- `TEST_DATABASE_URL` is used only for the test environment.
- [apps/api/src/tests/helpers.ts](/home/const/solashare/apps/api/src/tests/helpers.ts) refuses to truncate databases unless the DB name clearly looks like a test database.

## Documentation

Start with:

- [docs/README.md](/home/const/solashare/docs/README.md)
- [docs/11-repository-map.md](/home/const/solashare/docs/11-repository-map.md)
- [docs/13-dependencies-and-runtime.md](/home/const/solashare/docs/13-dependencies-and-runtime.md)
- [docs/14-onchain-workspace.md](/home/const/solashare/docs/14-onchain-workspace.md)
- [docs/15-monorepo-operations.md](/home/const/solashare/docs/15-monorepo-operations.md)

If docs and code diverge, treat the code as runtime truth and update docs in the same change.
