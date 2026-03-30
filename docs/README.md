# SolaShare Technical Documentation

This directory contains the technical documentation for the SolaShare MVP.

## Contents

- `01-architecture-overview.md` — high-level system architecture
- `02-domain-model.md` — core business entities and relationships
- `03-database-schema.md` — PostgreSQL schema design
- `04-api-spec.md` — REST API contract for MVP
- `05-onchain-design.md` — Solana program accounts and instructions
- `06-sync-indexer.md` — blockchain sync and indexing strategy
- `07-core-flows.md` — end-to-end product flows
- `08-storage-and-documents.md` — storage architecture for metadata and proof files
- `09-security-and-operational-risks.md` — key technical and operational risks
- `10-deployment-and-roadmap.md` — deployment plan and phased roadmap
- `TODO.md` — active implementation backlog and pending product tasks

## MVP Goal

SolaShare is an MVP for tokenizing yield-generating green energy assets on Solana.

The first vertical is solar energy infrastructure, but the architecture is designed to be extensible to other eco-assets such as wind, small hydro, EV charging, and other yield-bearing green infrastructure.

## Architecture Principle

The system is split into three trust layers:

1. **On-chain layer**
   - ownership
   - share minting
   - revenue posting
   - claim accounting
   - immutable state transitions

2. **Off-chain application layer**
   - user profiles
   - asset metadata
   - documents
   - portfolio views
   - notifications
   - business logic orchestration

3. **Storage layer**
   - public documents
   - proof bundles
   - technical passports
   - reports
   - media assets

## Source of Truth

- **On-chain** is the source of truth for ownership, distribution state, and claims.
- **PostgreSQL** is the source of truth for product read models, metadata, and application UX.
- **Object storage / Arweave / IPFS** is the source of truth for files and proofs.

## MVP Scope

The MVP should fully support:

- create asset
- define sale terms
- mint fractional shares
- invest in an asset
- post revenue for a period
- claim yield
- display investor portfolio
- display proof links and transaction history

## Out of Scope for Initial MVP

- full secondary market order book
- advanced governance
- automated AI verification
- deep compliance stack
- multi-currency settlement
- advanced financial waterfalls
