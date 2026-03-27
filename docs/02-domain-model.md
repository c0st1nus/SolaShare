# Domain Model

## Overview

SolaShare tokenizes yield-bearing green energy assets into fractional ownership units represented through Solana token primitives.

The core business model is not just tokenization of physical equipment, but tokenization of the economic rights connected to a real-world income-generating asset.

---

## Core Entities

## User
Represents an actor interacting with the platform.

### Roles
- `investor`
- `issuer`
- `admin`

### Responsibilities
- investor buys shares and claims yield
- issuer creates and manages asset offerings
- admin manages moderation and critical operational controls

---

## Asset
Represents a real-world energy asset listed on the platform.

### Examples
- rooftop solar installation
- solar mini-farm
- EV charging station
- wind micro-installation
- small hydro unit

### Key properties
- title
- description
- energy type
- location
- capacity
- issuer
- metadata URI
- lifecycle status
- on-chain references

### Asset Lifecycle
- `draft`
- `pending_review`
- `verified`
- `active_sale`
- `funded`
- `frozen`
- `closed`

---

## Asset Document
Represents any file or proof related to the asset.

### Examples
- ownership document
- right-to-income document
- technical passport
- meter data export
- photo
- revenue report
- financial model

### Properties
- type
- storage URI
- content hash
- visibility
- uploader

---

## Sale Terms
Defines how the fractional offering is structured.

### Properties
- valuation
- total shares
- price per share
- minimum buy amount
- funding target
- sale window
- sale status

---

## Investment
Represents a primary market participation event.

### Properties
- investor
- asset
- amount in USDC
- shares received
- on-chain transaction signature
- status

---

## Holding Snapshot
Represents an off-chain cached position view of ownership.

### Purpose
This exists for fast UX and dashboard rendering.

### Important note
The blockchain remains the source of truth for actual ownership.

---

## Revenue Epoch
Represents a revenue distribution period for an asset.

### Properties
- asset
- epoch number
- reporting period
- gross revenue
- net revenue
- distributable revenue
- report URI
- report hash
- on-chain reference
- posting status

### Purpose
This is the key business unit for yield distribution.

---

## Claim
Represents a user's successful or pending withdrawal of their yield share.

### Properties
- user
- asset
- revenue epoch
- claimed amount
- transaction signature
- status

---

## Asset Status History
Represents all major lifecycle transitions of the asset.

### Purpose
- auditability
- moderation traceability
- debugging
- investor trust

---

## Notification
Represents user-facing alerts.

### Examples
- investment confirmed
- revenue posted
- yield available to claim
- sale opened
- sale completed
- asset frozen

---

## Audit Log
Represents a system-level event log for high-trust actions.

### Examples
- asset updated
- sale terms changed
- revenue report submitted
- status changed
- admin intervention
- user blocked

---

## Relationship Summary

### One-to-many
- one issuer can create many assets
- one asset can have many documents
- one asset can have many revenue epochs
- one user can have many investments
- one user can have many claims

### Many-to-many
- many investors can hold shares in one asset
- one investor can hold positions across many assets

This many-to-many relationship is materialized through:
- investments
- holdings snapshots
- blockchain token balances

---

## Business Invariants

### Asset invariants
- an asset must have an issuer
- an asset cannot enter sale without sale terms
- a closed asset cannot accept new investments
- a frozen asset cannot accept new revenue posts or claims unless explicitly allowed

### Sale invariants
- total shares must be greater than zero
- price per share must be greater than zero
- funding parameters must be internally consistent

### Revenue invariants
- epoch numbers must be unique per asset
- distributable revenue cannot exceed net revenue
- posted revenue must be backed by a proof reference

### Claim invariants
- a claim cannot exceed the user's claimable amount
- a claim must be linked to a valid revenue epoch
- duplicate claims for the same entitlement must be impossible

---

## Future Domain Extensions

The domain model is intentionally extensible for:
- secondary market listings
- governance proposals
- KYC/compliance states
- dispute resolution
- operator roles
- attestation modules
- broader eco-asset classes
