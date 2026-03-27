# Architecture Overview

## Overview

SolaShare is a hybrid blockchain application that combines:

- Solana smart contracts for ownership and yield distribution
- an off-chain backend for product logic and UX orchestration
- a PostgreSQL database for read models and app state
- document storage for proofs and asset metadata
- Telegram WebApp as the main consumer frontend

## High-Level Components

### 1. Frontend
Frontend is responsible for:
- asset discovery
- portfolio display
- buy flow
- claim flow
- displaying proof-of-asset and proof-of-income
- issuer dashboard
- basic admin actions

Suggested stack:
- Next.js
- TypeScript
- Telegram Mini App integration
- Solana wallet adapter where needed

### 2. Backend API
Backend is responsible for:
- Telegram authentication
- wallet binding
- asset CRUD
- sale term management
- revenue epoch preparation
- transaction preparation
- indexing support
- notification orchestration
- portfolio read models

Suggested stack:
- Node.js
- TypeScript
- NestJS or Fastify
- PostgreSQL
- Redis for queueing/caching

### 3. Solana Program
Solana program is responsible for:
- asset registry references
- share mint references
- vault references
- revenue epoch registration
- claimable yield accounting
- immutable asset state transitions

Suggested stack:
- Anchor
- Solana Web3.js
- SPL Token / Token-2022 where applicable

### 4. Storage Layer
Storage is responsible for:
- asset documents
- technical passports
- financial reports
- media files
- public proof bundles

Possible providers:
- Arweave
- IPFS
- S3-compatible object storage

### 5. Indexer / Sync Layer
Indexer is responsible for:
- watching chain events
- syncing asset state
- syncing investments
- syncing revenue posts
- syncing claims
- syncing transfers
- updating read models

Possible implementation:
- internal indexer service
- webhook-based event ingestion
- RPC polling with idempotent sync logic

---

## Trust Split

### On-chain
Store only what must be trusted:
- asset references
- share mint references
- vault references
- revenue amounts
- claim state
- state machine status

### Off-chain
Store what improves product UX:
- human-readable metadata
- descriptions
- geodata
- proof links
- portfolio caches
- analytics
- notification settings

---

## Core Design Principles

### 1. Minimize on-chain complexity
The MVP should keep business-critical settlement logic on-chain, but avoid overloading the program with non-essential metadata and UI concerns.

### 2. Keep chain as the financial source of truth
Ownership and payouts should never rely on backend-only accounting.

### 3. Use off-chain read models for speed
Portfolio and asset listing screens must be fast and should rely on synced projections in PostgreSQL.

### 4. Files should be hash-addressed
Every uploaded proof or report should have:
- URI
- content hash
- type
- uploader
- visibility metadata

### 5. All state changes must be auditable
Important actions should have:
- actor
- timestamp
- transaction signature if on-chain
- reason if applicable

---

## MVP Services

### Auth Service
Handles:
- Telegram login
- session issuing
- wallet linking

### Asset Service
Handles:
- asset drafts
- metadata updates
- publication state
- asset card rendering

### Sale Service
Handles:
- valuation
- total shares
- share price
- primary sale configuration

### Investment Service
Handles:
- quote calculations
- transaction preparation
- investment tracking

### Revenue Service
Handles:
- revenue epoch creation
- report upload
- revenue posting flow

### Claim Service
Handles:
- claim availability projection
- claim transaction preparation
- claim history

### Indexer Service
Handles:
- chain sync
- snapshot updates
- materialized position updates

### Notification Service
Handles:
- in-app notifications
- Telegram delivery hooks
- important lifecycle alerts
