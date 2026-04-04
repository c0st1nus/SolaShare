# SolaShare Backend

Backend for a Solana-based RWA platform built with Bun, ElysiaJS, Drizzle ORM, PostgreSQL, Redis, BullMQ, Zod, and Pino.

## Prerequisites

- Bun
- Docker and Docker Compose

## Local Setup

1. Install dependencies:

```bash
bun install
```

2. Create local environment file:

```bash
cp .env.example .env
```

3. Start infrastructure:

```bash
docker compose up -d
```

4. Apply database migrations:

```bash
bun run db:migrate
```

5. Start the API:

```bash
bun run dev
```

## Local Endpoints

API base path: `http://localhost:3000/api/v1`

Scalar OpenAPI docs: `http://localhost:3000/openapi`

Raw OpenAPI spec: `http://localhost:3000/openapi/json`

Health check: `http://localhost:3000/api/v1/health`

Readiness check: `http://localhost:3000/api/v1/ready`

## Project Status

Current state:

- asset catalog, issuer workflow, admin review, portfolio projections, investment preparation,
  revenue draft flow, claim preparation, webhook ingestion, queue-backed investment confirmation,
  and transaction confirmation are implemented against PostgreSQL
- OpenAPI and Scalar documentation are enabled
- integration tests cover the main off-chain workflow and webhook ingestion
- Solana transaction assembly is implemented for investments, revenue posting, and claims
- wallet signature verification uses Ed25519 with anti-replay protection

## Commands

```bash
bun run check
bun run lint
bun run format
bun run test
bun run db:generate
bun run db:migrate
bun run db:push
bun run db:studio
```
