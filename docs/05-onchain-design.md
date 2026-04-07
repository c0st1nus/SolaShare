# On-Chain Design

## Overview

The Solana program is responsible for trust-critical financial state transitions.

In the current repository, the on-chain implementation lives in
[programs/solashare-protocol/programs/solashare_protocol/src/lib.rs](/home/const/solashare/programs/solashare-protocol/programs/solashare_protocol/src/lib.rs).
This document describes the actual design currently encoded there and the intended architectural
boundaries around it.

The MVP keeps the on-chain footprint intentionally narrow:

- asset lifecycle anchoring
- share mint references
- sale activation
- primary purchase settlement
- revenue epoch posting
- claim accounting
- issuer fund withdrawal

Heavy metadata, workflow orchestration, moderation, KYC, uploads, and product read models remain
off-chain.

## On-Chain Principles

### 1. Keep trust-critical state on-chain

Anything that determines token ownership, payment flow, or claimability should be secured on
Solana.

### 2. Keep heavy metadata off-chain

Descriptions, images, large documents, public reports, and UX-oriented projections should remain
off-chain with stable references or hashes.

### 3. Use claim-based distribution

Instead of pushing payments to every holder, revenue is posted once and users claim individually.

This is preferable for the MVP because it is:

- cheaper
- easier to scale
- easier to reconcile off-chain
- more realistic for a Solana-based distribution model

## Current Program Scope

The current program implements these instructions:

- `create_asset`
- `activate_sale`
- `buy_shares`
- `post_revenue`
- `claim_yield`
- `withdraw_funds`

Not currently implemented in the checked-in Anchor program:

- `freeze_asset`
- `close_asset`
- secondary-market transfer logic
- on-chain verification workflows
- automated entitlement calculation from holder balances at claim time

Those may be future extensions, but they are not current runtime behavior.

## Core Accounts

The current program defines three Anchor accounts plus SPL token accounts and mints.

### `AssetAccount`

Represents the on-chain anchor for one listed asset.

Current fields:

- `issuer: Pubkey`
- `asset_id: String`
- `metadata_uri: String`
- `status: u8`
- `share_mint: Pubkey`
- `vault: Pubkey`
- `payment_mint: Pubkey`
- `total_shares: u64`
- `shares_sold: u64`
- `price_per_share: u64`
- `created_at: i64`
- `bump: u8`

Purpose:

- anchor the asset in protocol state
- connect sale, mint, and lifecycle status
- own the SPL share mint and payment vault configuration

### `RevenueEpochAccount`

Represents one posted distribution period.

Current fields:

- `asset: Pubkey`
- `epoch_number: u64`
- `amount: u64`
- `report_hash: [u8; 32]`
- `claimed_so_far: u64`
- `posted_at: i64`
- `status: u8`
- `bump: u8`

Purpose:

- register revenue distributions
- provide a claim base for token holders
- anchor proof-of-income references through `report_hash`

### `ClaimRecord`

Tracks what one user has claimed for one epoch.

Current fields:

- `user: Pubkey`
- `asset: Pubkey`
- `epoch: Pubkey`
- `amount_claimed: u64`
- `claimed_at: i64`
- `bump: u8`

Purpose:

- prevent double claims
- audit user payouts
- make claim processing deterministic

## Treasury / Vault Model

For the current MVP flow, each asset has one SPL token vault account for the configured payment
mint.

Current model:

- vault address is a PDA-derived token account based on `["vault", sha256(asset_id)]`
- vault token authority is the asset PDA
- investor payments flow into this vault during `buy_shares`
- claim payouts are funded from the same vault during `claim_yield`
- issuer withdrawals also draw from the same vault through `withdraw_funds`

This is intentionally simple for the MVP. It does not yet split sale proceeds and revenue reserves
into separate vaults.

## Token Model

The platform uses tokenized fractional ownership.

Current model:

- one asset corresponds to one SPL share mint
- balances represent ownership fractions
- the share mint is created during `create_asset`
- the share mint authority is the asset PDA

Current numeric conventions from the program:

- share token decimals: `6`
- `SHARE_SCALE = 1_000_000`
- `total_shares` and `shares_sold` are stored in atomic share units
- `price_per_share` is stored in atomic payment-token units per whole share

Purchase pricing uses scaled integer math and rounds with the helper used by the program.

## PDA Strategy

The current program uses hashed asset identifiers rather than raw strings as PDA seeds.

Seed strategy observed in the implementation:

- asset PDA: `["asset", sha256(asset_id)]`
- share mint PDA: `["share_mint", sha256(asset_id)]`
- vault PDA: `["vault", sha256(asset_id)]`
- revenue epoch PDA: `["revenue", sha256(asset_id), epoch_number_le_bytes]`
- claim record PDA: `["claim", sha256(asset_id), claimant_pubkey, epoch_number_le_bytes]`

This is the expected on-chain seed model unless deliberately changed.

## Implemented Instructions

### `create_asset`

Creates a new `AssetAccount` and the related mint and vault setup.

Inputs:

- `asset_id`
- `metadata_uri`
- `total_shares`
- `price_per_share`

Effects:

- creates the `AssetAccount` PDA
- creates the `share_mint` PDA as an SPL mint
- creates the asset `vault` PDA as an SPL token account
- stores the configured payment mint in `AssetAccount.payment_mint`
- records issuer and lifecycle metadata

### `activate_sale`

Moves the asset from `Draft` to `ActiveSale`.

Current guard:

- only valid when the current asset status is `Draft`

### `buy_shares`

Processes a primary purchase into an asset offering.

Effects:

- validates sale state and account wiring
- transfers payment tokens from the investor token account into the asset vault
- mints share tokens to the investor share token account
- updates `shares_sold`
- marks the asset as `Funded` when the full supply is sold

Current accounts:

- `investor`
- `asset`
- `vault`
- `share_mint`
- `investor_share_account`
- `investor_usdc_account`
- `payment_mint`
- `token_program`

Backend integration notes:

- backend prepends idempotent creation of the investor share ATA
- backend derives payment token accounts using the configured payment mint
- backend should not prepare purchases unless the on-chain asset, share mint, and vault pubkeys are
  already persisted off-chain

### On-Chain Initialization Flow

The repository treats issuer setup as distinct from investor purchase flow.

Current flow:

1. Asset is created and reviewed off-chain.
2. Sale terms determine:
   - `asset_id`
   - `metadata_uri`
   - `total_shares`
   - `price_per_share`
3. Issuer requests on-chain setup through the backend.
4. Backend prepares a transaction containing `create_asset` and optionally `activate_sale`.
5. After confirmation, backend persists the resulting on-chain addresses into PostgreSQL.

Dev and local note:

- `SOLANA_PAYER_KEY` may partially sign prepared transactions as fee payer
- investor and issuer signatures still come from the user wallet for their own actions

### `post_revenue`

Registers a new revenue epoch.

Inputs:

- asset
- epoch number
- amount
- report hash

Effects:

- creates `RevenueEpochAccount`
- stores distribution metadata
- marks the epoch as `Posted`

### `claim_yield`

Allows a token holder to claim a prepared revenue amount.

Current behavior:

- checks that the epoch is claimable
- enforces one claim record per claimant per epoch
- transfers payment tokens from vault to claimant token account
- writes a `ClaimRecord`
- increments `claimed_so_far`
- marks the epoch `Settled` once fully consumed

Important implementation note:

- the current program does not calculate entitlement from token balances on-chain
- it accepts `claim_amount` directly
- entitlement calculation and workflow safety therefore rely heavily on backend preparation and
  product constraints

### `withdraw_funds`

Allows the issuer to withdraw payment tokens from the asset vault.

Current behavior:

- requires issuer authority over the asset
- validates vault and payment mint wiring
- transfers payment tokens from the vault to the issuer token account
- enforces a minimum withdrawal amount

## Status Model

### `AssetStatus`

Current enum in the program:

- `Draft`
- `Verified`
- `ActiveSale`
- `Funded`
- `Frozen`
- `Closed`

Currently used directly by implemented instructions:

- `Draft`
- `ActiveSale`
- `Funded`

The other statuses exist in the enum but are not yet transitioned by dedicated instructions in the
checked-in program.

### `RevenueStatus`

Current enum in the program:

- `Posted`
- `Settled`
- `Flagged`

Currently used directly by implemented instructions:

- `Posted`
- `Settled`

## Claim Model Notes

A claim-based model remains the preferred MVP approach because:

- it avoids high fan-out transfers
- it reduces operational complexity
- it matches blockchain execution constraints better than push distributions
- it is easier to reconcile off-chain

Current caveat:

- because claim entitlement is not calculated from holder balances on-chain yet, backend and
  workflow controls are part of the trust envelope for the current MVP

## What Stays Off-Chain

The following should not be fully stored on-chain:

- full technical passports
- images
- detailed financial reports
- user profiles
- geolocation metadata
- long descriptions
- KYC workflow state
- moderation notes
- audit dashboards and UX projections

Instead, store references such as:

- URI
- content hash
- public key references
- lightweight lifecycle metadata

## Relationship To Other Repository Parts

This document should be read together with:

- [docs/06-sync-indexer.md](/home/const/solashare/docs/06-sync-indexer.md)
- [docs/14-onchain-workspace.md](/home/const/solashare/docs/14-onchain-workspace.md)
- [apps/api/src/lib/solana](/home/const/solashare/apps/api/src/lib/solana)

`docs/14-onchain-workspace.md` is the more implementation-centric reference for the current Anchor
workspace, while this document focuses on the architectural design and trust model.
