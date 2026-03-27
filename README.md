# SolaShare Backend

Backend scaffold for a Solana-based RWA platform built with Bun, ElysiaJS, Drizzle ORM, PostgreSQL, Redis, BullMQ, Zod, and Pino.

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

4. Initialize database schema:

```bash
bun run db:push
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

- backend module structure is scaffolded
- OpenAPI and Scalar documentation are enabled
- route contracts are defined with Zod
- many business handlers still return stub responses while services are implemented

## Commands

```bash
bun run check
bun run lint
bun run format
bun run db:generate
bun run db:migrate
bun run db:push
bun run db:studio
```
