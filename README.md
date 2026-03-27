# SolaShare Backend

Backend scaffold for a Solana-based RWA platform built with Bun, ElysiaJS, Drizzle ORM, PostgreSQL, Redis, BullMQ, Zod, and Pino.

## Development

```bash
bun run dev
```

API base path: `http://localhost:3000/api/v1`

Scalar OpenAPI docs: `http://localhost:3000/openapi`

Raw OpenAPI spec: `http://localhost:3000/openapi/json`

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
