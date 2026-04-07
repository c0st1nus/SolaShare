# Sync and Indexer Design

## Overview

SolaShare requires an off-chain sync layer to make the product usable.

Blockchain state alone is not enough for a fast and coherent UX. The sync layer builds backend read
models and operational state from on-chain transactions.

In the current repository, the runtime implementation is centered around:

- [apps/api/src/lib/solana/indexer.ts](/home/const/solashare/apps/api/src/lib/solana/indexer.ts)
- [apps/api/src/modules/indexer/routes.ts](/home/const/solashare/apps/api/src/modules/indexer/routes.ts)
- [apps/api/src/modules/webhook/routes.ts](/home/const/solashare/apps/api/src/modules/webhook/routes.ts)
- [apps/api/src/modules/webhook/service.ts](/home/const/solashare/apps/api/src/modules/webhook/service.ts)

This document describes both:

- what the indexer is supposed to do architecturally
- what the current implementation actually does today

## Why The Indexer Exists

The sync layer provides:

- fast asset pages
- portfolio rendering
- claim history
- investment history
- revenue status updates
- operational observability

Without it, the product would need to reconstruct too much state directly from chain on every
request, which is slow, fragile, and difficult to operate.

## Current Implementation Scope

The checked-in implementation currently focuses on confirming already-prepared backend workflows
from on-chain signatures.

Current supported instruction types:

- `buy_shares`
- `post_revenue`
- `claim_yield`

Current supported sync modes:

- polling mode via `getSignaturesForAddress`
- webhook-driven processing of transaction signatures
- manual sync by signature

Current status endpoints and controls:

- `GET /api/v1/indexer/status`
- `POST /api/v1/indexer/start`
- `POST /api/v1/indexer/stop`
- `POST /api/v1/indexer/sync`
- `POST /api/v1/indexer/webhook`

## What The Current Indexer Actually Updates

The current implementation is narrower than a full event-sourced chain indexer.

It currently updates:

- `investments`
  pending investment rows are marked `confirmed` when a matching transaction signature is observed

- `revenueEpochs`
  draft revenue epochs are marked `posted` when a matching transaction signature is observed

- `claims`
  pending claims are marked `confirmed` when a matching transaction signature is observed

- `auditLogs`
  audit records are inserted for auto-confirmed investment, revenue, and claim actions

- `webhookEvents`
  used as the durable idempotency and processing log for webhook and polling ingestion

This means the current indexer primarily acts as a reconciliation layer for backend-generated
operations, not a full generalized chain-state projector.

## Responsibilities

Architecturally, the sync layer is responsible for:

- detecting relevant transactions
- classifying instruction types
- preventing duplicate processing
- reconciling confirmed on-chain activity into PostgreSQL workflow state
- maintaining an operational event trail

Longer-term responsibilities may also include:

- asset creation detection
- sale activation detection
- transfer tracking
- holder snapshot refresh
- broader status history synchronization

Those broader capabilities are not fully implemented in the current runtime code.

## Event Sources

The current design supports or anticipates these event sources:

- RPC polling
- external transaction webhooks
- manual sync by transaction signature

The current implementation uses:

- polling against the configured `SOLANA_PROGRAM_ID`
- webhook signature ingestion followed by transaction fetch and verification

It does not currently use a persistent WebSocket subscription pipeline as its main sync source.

## Current Processing Pipeline

The implemented processing path is:

1. detect a transaction signature through polling, webhook input, or manual sync
2. validate signature format
3. fetch and verify the full transaction
4. classify the instruction type
5. create a `webhookEvents` row for idempotency and processing state
6. reconcile the corresponding PostgreSQL workflow record
7. write an audit log for successful business reconciliation
8. mark the `webhookEvents` record as `processed` or `failed`

## Instruction Classification

The current implementation determines transaction type through:

- instruction discriminator checks
- inner instruction inspection
- fallback matching on program log lines

The checked-in classifier currently recognizes:

- `buy_shares`
- `post_revenue`
- `claim_yield`

Anything else is currently treated as `unknown` and ignored or rejected depending on the entry
path.

## Idempotency

Indexer processing must be idempotent, and the current implementation enforces that.

Current mechanism:

- `webhookEvents` rows keyed by `(source, externalEventId)`
- `onConflictDoNothing` behavior on event insert
- guarded reconciliation so repeated processing does not re-confirm already-confirmed rows

Current goals:

- do not duplicate revenue postings
- do not duplicate claims
- do not overcount investments
- do not reprocess the same signature indefinitely

## Polling Mode

Polling is implemented in
[apps/api/src/lib/solana/indexer.ts](/home/const/solashare/apps/api/src/lib/solana/indexer.ts).

Current behavior:

- requires configured `SOLANA_PROGRAM_ID`
- fetches recent signatures for the program address
- processes transactions oldest-first within each poll batch
- tracks in-memory status such as:
  - running state
  - last processed signature
  - last processed timestamp
  - processed count
  - error count

Current limitation:

- last processed state is in memory, not persisted across process restarts

So polling is restart-safe from an idempotency perspective, but not yet a full persistent cursor
implementation.

## Webhook Mode

Webhook-driven processing is supported through signature ingestion and subsequent transaction fetch.

Current behavior:

- validates signature format
- checks duplicate processing via `webhookEvents`
- fetches the transaction from RPC
- classifies instruction type
- reconciles the matching database workflow row

This means webhook mode still depends on RPC fetch for the authoritative transaction body.

## Manual Reconciliation

The current implementation supports manual sync by transaction signature.

Purpose:

- recover from missed events
- debug a specific failed reconciliation
- force processing for a known transaction

Current endpoint:

- `POST /api/v1/indexer/sync`

## Failure Handling

Current failure categories include:

- invalid signature format
- transaction fetch or verification failure
- unknown instruction type
- DB reconciliation failure
- duplicate event delivery

Current mitigations:

- durable `webhookEvents` rows for processing state
- `processed` vs `failed` event status
- retry-safe idempotent insert path
- manual resync support
- audit logs for successful reconciliations

What is not yet fully implemented:

- dead-letter queue
- persisted polling cursor
- broad replay jobs by asset or date range
- generalized chain reorg handling

## Notification And Side Effects

Architecturally, sync can be used to trigger notifications after reconciliation.

In the current codebase, the indexer's direct responsibility is primarily state confirmation and
audit logging. Notification flows are adjacent but not yet the dominant concern of the sync layer.

## Relationship To Backend Read Models

The current indexer is tightly coupled to backend-prepared workflow rows.

That means:

- investments are expected to exist off-chain before on-chain confirmation
- revenue epochs are expected to exist off-chain before post confirmation
- claims are expected to exist off-chain before claim confirmation

This is an important design reality of the current MVP. The system is not yet reconstructing the
entire business state from chain alone.

## Architectural Direction

The long-term sync direction can reasonably expand toward:

- asset creation detection
- sale activation detection
- transfer monitoring
- holdings snapshot refresh
- more complete status history projection
- periodic consistency and replay jobs

Those are valid roadmap directions, but they should not be documented as already implemented.

## Operational Note

The sync layer is one of the most important pieces for making the MVP feel production-grade.

Even in its current narrower form, it is essential for:

- consistent portfolio updates
- visible transaction outcomes
- accurate distribution status
- operational debugging and reconciliation
