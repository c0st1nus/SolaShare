# Monorepo Operations

This document explains the repository conventions introduced by the monorepo restructure.

## Naming Rules

- `apps/api`
  Means the backend application package.
- `apps/web`
  Means the frontend application package.
- `programs/solashare-protocol`
  Means the Anchor workspace.

Do not introduce new top-level feature folders when the code clearly belongs to one of these three
areas.

## Root Script Policy

Use root scripts for cross-package workflows and operator tasks.

Main root scripts:

- `bun run dev:api`
- `bun run dev:web`
- `bun run dev:stack`
- `bun run start:api`
- `bun run build:web`
- `bun run start:web`
- `bun run check`
- `bun run lint`
- `bun run test`
- `bun run onchain:lint`
- `bun run onchain:test`

## PM2

PM2 config lives in [ecosystem.cjs](/home/const/solashare/ecosystem.cjs).

Included processes:

- `solashare-api`
- `solashare-web`

Default assumptions:

- API listens on `3000`
- frontend listens on `3001`
- frontend points to `http://127.0.0.1:3000`

Recommended flow:

```bash
bun run build:web
bun run pm2:start
```

## Local Development

To run backend and frontend together:

```bash
bun run dev:stack
```

That delegates to
[scripts/dev-workspace.sh](/home/const/solashare/scripts/dev-workspace.sh), which starts both
processes and tears them down together on exit.

## Path Convention

Prefer these path prefixes in docs, scripts, and tooling:

- backend code: `apps/api/src/...`
- frontend code: `apps/web/src/...`
- on-chain code: `programs/solashare-protocol/...`

Avoid reviving old ambiguous paths such as bare `src/`, `solashare-frontend`, or
`solashare_program` at repository root.
