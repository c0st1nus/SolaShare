# Security and Operational Risks

## Overview

SolaShare handles a hybrid trust model:
- real-world asset metadata
- blockchain ownership logic
- off-chain product services
- financial state synchronization

Because of this, security must be considered across all layers.

---

## Main Risk Categories

## 1. On-Chain Logic Risk

### Examples
- incorrect claim calculation
- double claim vulnerability
- broken ownership accounting
- invalid status transition
- vault misuse

### Mitigations
- keep on-chain logic minimal
- use claim-based model
- validate account constraints
- test for duplicate claim scenarios
- define strict status gates

---

## 2. Sync Risk

### Examples
- indexer misses events
- portfolio view drifts from chain
- duplicate event processing
- stale revenue state

### Mitigations
- idempotent event handling
- replayable processing
- reconciliation jobs
- transaction signature uniqueness
- operational observability

---

## 3. API Risk

### Examples
- unauthorized asset edits
- privilege escalation
- repeated POST execution
- stolen refresh token reuse
- forged Google authorization code exchange
- forged wallet links

### Mitigations
- role-based access control
- ownership checks
- session validation
- refresh session rotation and revocation
- OAuth code exchange on the backend only
- wallet signature verification
- idempotency keys

---

## 4. Storage Risk

### Examples
- tampered files
- missing proof references
- broken URIs
- accidental public exposure of sensitive files

### Mitigations
- file hashing
- visibility flags
- storage abstraction
- content validation
- durable storage provider selection

---

## 5. Operational Risk

### Examples
- wrong revenue report published
- admin accidentally freezes wrong asset
- failed deployment
- RPC instability

### Mitigations
- audit logs
- approval screens for critical actions
- feature flags
- backups
- retry logic
- fallback RPC providers

---

## Core Security Requirements

## Authentication
- password storage must use a dedicated password hashing algorithm
- Google authorization codes must be exchanged only on the backend
- Telegram Login Widget signatures must be validated correctly
- Telegram Mini App init data must be validated correctly
- refresh tokens must be stored server-side as hashes and rotated safely
- wallet linking must verify signed proof of ownership

## Authorization
- issuers can only modify their own assets
- investors can only access their own portfolio and claim flows
- admins can perform restricted lifecycle actions

## Auditing
All high-trust actions should be logged:
- asset changes
- revenue posts
- status changes
- claim orchestration
- permission-sensitive actions

## Integrity
- important files must have hashes
- important chain actions must have signatures persisted
- reconciliation should exist for data consistency

---

## MVP Security Priorities

The initial MVP should focus on:
1. correct access control
2. correct on-chain claim logic
3. correct sync handling
4. basic file integrity
5. full audit trail for critical flows

Anything beyond that can be improved after the first stable prototype.
