# Repository Map

This document explains the monorepo structure and where each concern lives.

## Top Level

- `apps/api`
  Backend application package.
- `apps/web`
  Frontend application package.
- `programs/solashare-protocol`
  Anchor workspace for the Solana program.
- `docs`
  Technical and operational documentation.
- `scripts`
  Root helper scripts.
- `drizzle`
  SQL migrations and Drizzle metadata.
- `assets`
  Repository-level media assets.
- `research`
  Product and market research artifacts.

## Backend

Backend source code lives under `apps/api/src`.

Main areas:

- [apps/api/src/index.ts](/home/const/solashare/apps/api/src/index.ts)
  Process entrypoint and server boot.
- [apps/api/src/app.ts](/home/const/solashare/apps/api/src/app.ts)
  Elysia app assembly and route registration.
- [apps/api/src/config](/home/const/solashare/apps/api/src/config)
  Env parsing and runtime config.
- [apps/api/src/db](/home/const/solashare/apps/api/src/db)
  Drizzle schema and DB access.
- [apps/api/src/lib](/home/const/solashare/apps/api/src/lib)
  Shared infrastructure adapters.
- [apps/api/src/modules](/home/const/solashare/apps/api/src/modules)
  Domain modules and services.
- [apps/api/src/plugins](/home/const/solashare/apps/api/src/plugins)
  Elysia plugins.
- [apps/api/src/tests](/home/const/solashare/apps/api/src/tests)
  Unit and integration tests.

## Frontend

Frontend code lives under `apps/web`.

Important areas:

- [apps/web/src/app](/home/const/solashare/apps/web/src/app)
- [apps/web/src/components](/home/const/solashare/apps/web/src/components)
- [apps/web/src/lib](/home/const/solashare/apps/web/src/lib)
- [apps/web/public](/home/const/solashare/apps/web/public)

## On-Chain Workspace

The Anchor workspace lives under `programs/solashare-protocol`.

Important areas:

- [Anchor.toml](/home/const/solashare/programs/solashare-protocol/Anchor.toml)
- [package.json](/home/const/solashare/programs/solashare-protocol/package.json)
- [migrations/deploy.ts](/home/const/solashare/programs/solashare-protocol/migrations/deploy.ts)
- [programs/solashare_protocol/src/lib.rs](/home/const/solashare/programs/solashare-protocol/programs/solashare_protocol/src/lib.rs)
- [tests/solashare_protocol.ts](/home/const/solashare/programs/solashare-protocol/tests/solashare_protocol.ts)

## Root Scripts

- [scripts/bootstrap-admin.ts](/home/const/solashare/scripts/bootstrap-admin.ts)
- [scripts/dev-workspace.sh](/home/const/solashare/scripts/dev-workspace.sh)
- [scripts/start-localnet.sh](/home/const/solashare/scripts/start-localnet.sh)
- [scripts/stop-localnet.sh](/home/const/solashare/scripts/stop-localnet.sh)
- [scripts/setup-mock-usdc.ts](/home/const/solashare/scripts/setup-mock-usdc.ts)
- [scripts/test-verification.ts](/home/const/solashare/scripts/test-verification.ts)

## Operational Reading Guide

- API and module behavior:
  [12-modules-reference.md](/home/const/solashare/docs/12-modules-reference.md)
- Runtime and env:
  [13-dependencies-and-runtime.md](/home/const/solashare/docs/13-dependencies-and-runtime.md)
- On-chain workspace:
  [14-onchain-workspace.md](/home/const/solashare/docs/14-onchain-workspace.md)
- Monorepo workflows:
  [15-monorepo-operations.md](/home/const/solashare/docs/15-monorepo-operations.md)
