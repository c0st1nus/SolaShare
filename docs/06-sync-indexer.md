# Sync and Indexer Design

## Overview

SolaShare requires an off-chain sync layer to make the product usable.

Blockchain state alone is not enough for a fast and polished UX. The indexer is responsible for building read models from on-chain events.

---

## Why the Indexer Exists

The indexer provides:
- fast asset pages
- portfolio rendering
- claim history
- investment history
- transfer history
- operational observability

Without it, the frontend would need to reconstruct product state directly from chain every time, which is slow and fragile.

---

## Responsibilities

The indexer should detect and process:
- asset creation
- sale activation
- investment transactions
- revenue posting
- claim execution
- token transfers
- status changes

---

## Suggested Architecture

### Event Sources
Possible event sources:
- RPC polling
- WebSocket subscriptions
- Helius webhooks
- custom event decoder
- transaction signature confirmation callbacks

### Processing Pipeline
1. detect relevant transaction or account change
2. decode event
3. normalize into internal event model
4. persist raw event log if desired
5. update PostgreSQL projections
6. update audit logs
7. trigger notifications if needed

---

## Read Models Updated by Indexer

### holdings_snapshots
Updated when:
- investment confirmed
- transfer detected
- claim logic affects display projections if needed

### investments
Updated when:
- primary buy transaction is confirmed

### revenue_epochs
Updated when:
- on-chain revenue epoch is created or settled

### claims
Updated when:
- claim transaction is confirmed

### asset_status_history
Updated when:
- status transitions happen on-chain or through admin flow

---

## Idempotency

Indexer processing must be idempotent.

### Requirements
- do not duplicate revenue epochs
- do not duplicate claims
- do not overcount investments
- do not apply the same transfer twice

### Suggested mechanisms
- unique transaction signature constraints
- processed event table
- transactional upsert logic
- safe reprocessing design

---

## Reconciliation Strategy

The system should support reconciliation jobs.

### Purpose
- recover after downtime
- catch missed events
- verify data consistency
- resync a specific asset or time range

### Suggested jobs
- full asset resync
- wallet holdings resync
- revenue epoch resync
- daily consistency check

---

## Failure Handling

### Possible failures
- missed webhook
- partial DB write
- chain reorg edge cases
- RPC inconsistency
- event decode failure

### Mitigations
- replayable processing
- dead letter queue
- retry with exponential backoff
- periodic reconciliation
- raw event persistence for debugging

---

## Notification Triggers

The indexer may trigger notifications when:
- investment confirmed
- revenue posted
- claim confirmed
- asset entered sale
- asset frozen

---

## Suggested Internal Event Model

Each normalized event may include:
- `event_type`
- `entity_type`
- `entity_id`
- `transaction_signature`
- `slot`
- `block_time`
- `payload_json`

---

## Operational Note

The indexer is not just a technical convenience. It is one of the most important pieces for making the MVP feel production-grade.

A strong product demo depends heavily on:
- consistent portfolio updates
- visible transaction outcomes
- accurate distribution history
