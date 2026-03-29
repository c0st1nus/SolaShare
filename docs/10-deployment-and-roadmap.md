# Deployment and Roadmap

## Deployment Overview

The MVP should prioritize:
- fast iteration
- stable demoability
- simple deployment model
- low operational complexity

---

## Suggested Environments

## Local Development
Used for:
- backend development
- frontend development
- Solana local validator testing
- schema iteration

## Test Environment / Devnet
Used for:
- integration testing
- demo preparation
- frontend-wallet-backend-chain integration
- issuer and investor test flows

## Demo / Staging
Used for:
- final hackathon presentation
- public or semi-public testing
- stable scenario execution

---

## Suggested Infrastructure

### Frontend
- Vercel
- Netlify
- self-hosted container

### Backend
- Railway
- Render
- Fly.io
- VPS with Docker

### Database
- managed PostgreSQL
- Neon
- Supabase Postgres
- Railway Postgres

### Cache / Queue
- Redis
- Upstash Redis
- managed Redis provider

### Storage
- S3-compatible storage
- Arweave / IPFS for public proofs

### Blockchain
- Solana Devnet
- reliable RPC provider
- webhook/indexing provider if needed

---

## Deployment Strategy

### Frontend
- automatic deploy on main branch or staging branch
- environment variables for API and chain configuration

### Backend
- containerized deployment
- environment-specific secrets
- migrations on deploy or controlled release step

### Database
- migration-driven schema management
- regular backups
- seed scripts for demo data

### Solana Program
- deploy to Devnet first
- keep program upgrade process clear
- track program IDs per environment

---

## Environment Variables

Likely required:
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `ADMIN_TELEGRAM_IDS`
- `ISSUER_TELEGRAM_IDS`
- `SOLANA_RPC_URL`
- `SOLANA_PROGRAM_ID`
- `STORAGE_PROVIDER`
- `ARWEAVE_GATEWAY_URL`
- `S3_BUCKET`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`

---

## MVP Roadmap

## Phase 1 — Domain and Data
- finalize domain model
- finalize DB schema
- create migrations
- define asset lifecycle states
- define API contract

## Phase 2 — On-Chain Core
- implement asset account
- implement revenue epoch logic
- implement claim logic
- define share token model
- test basic settlement flows

## Phase 3 — Backend Core
- auth and sessions
- asset CRUD
- sale terms
- transaction preparation
- revenue orchestration
- portfolio projections

Current status:
- most off-chain backend flows are implemented
- Docker-based Postgres/Redis local setup is in use
- integration tests cover issuer review, investment confirmation, revenue posting confirmation,
  claim confirmation, and webhook ingestion
- remaining backend integration work is concentrated in real on-chain transaction assembly and
  wallet signature verification


## Phase 4 — Indexer and Sync
- event ingestion
- holdings snapshots
- investments sync
- claims sync
- notifications

## Phase 5 — Frontend MVP
- asset list
- asset detail page
- issuer dashboard
- portfolio page
- claim UX
- proof links

## Phase 6 — Demo Hardening
- seed demo assets
- stable end-to-end flow
- error handling
- observability
- polished presentation

---

## Post-MVP Extensions

Potential future extensions:
- governance
- compliance and KYC
- secondary market listing module
- AI-assisted verification
- dispute resolution
- broader eco-asset support beyond solar-first MVP

---

## Definition of MVP Completion

The MVP can be considered complete when the following can be demonstrated live:

1. an issuer creates a tokenized asset
2. the asset has public proof links
3. an investor buys fractional exposure
4. a revenue epoch is posted
5. the investor claims yield
6. the portfolio and audit trail reflect the full lifecycle

That is the minimum complete proof of concept for SolaShare.
