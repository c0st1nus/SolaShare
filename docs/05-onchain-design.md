# On-Chain Design

## Overview

The Solana program is responsible for all trust-critical financial logic.

The MVP should keep the on-chain footprint minimal but sufficient to support:
- asset lifecycle anchoring
- share issuance references
- revenue posting
- claim accounting
- immutable financial state transitions

---

## On-Chain Principles

### 1. Keep trust-critical state on-chain
Anything that determines ownership or payout rights should be secured on Solana.

### 2. Keep heavy metadata off-chain
Descriptions, images, large documents, and public reports should remain off-chain with reference hashes.

### 3. Use claim-based distribution
Instead of pushing payments to all holders, revenue should be posted once and users claim individually.

This is:
- cheaper
- easier to scale
- more realistic for MVP

---

## Core Accounts

## AssetAccount

Represents an on-chain anchor for the listed asset.

### Suggested fields
- `issuer Pubkey`
- `asset_id String or fixed bytes`
- `metadata_uri String`
- `status u8`
- `share_mint Pubkey`
- `vault Pubkey`
- `payment_mint Pubkey`
- `total_shares u64`
- `shares_sold u64`
- `created_at i64`

### Purpose
- anchor the asset in protocol state
- connect sale, mint, and lifecycle status
- provide immutable reference layer

PDA note:
- when deriving Solana PDAs from `asset_id`, use `sha256(asset_id)` as the 32-byte seed input rather than the raw UUID string

---

## RevenueEpochAccount

Represents a posted distribution period.

### Suggested fields
- `asset Pubkey`
- `epoch_number u64`
- `amount u64`
- `report_hash [u8; 32] or String`
- `claimed_so_far u64`
- `posted_at i64`
- `status u8`

### Purpose
- register revenue distributions
- provide claim base for token holders
- anchor proof-of-income reference

---

## ClaimRecord

Tracks what a user has claimed.

### Suggested fields
- `user Pubkey`
- `asset Pubkey`
- `epoch Pubkey`
- `amount_claimed u64`
- `claimed_at i64`

### Purpose
- prevent double claims
- audit user payouts
- make claim math deterministic

---

## Treasury / Vault

For the implemented MVP flow, each asset has one SPL token vault account for the configured USDC mint.

Current model:
- vault address is a PDA derived from `["vault", sha256(asset_id)]`
- vault is a real SPL token account, not just a PDA placeholder
- vault token authority is the asset PDA
- investor payments go to this vault during `buy_shares`
- the same vault can later fund revenue claims unless the protocol is split into separate sale and distribution vaults

---

## Token Model

The platform uses tokenized fractional ownership.

### Choice
Use SPL token model for fractional share representation.

### Notes
- one asset corresponds to one share mint
- balances represent ownership fractions
- transferability can be enabled or partially constrained depending on the design

---

## Suggested Instructions

## create_asset
Creates a new `AssetAccount`.

### Inputs
- issuer
- metadata URI
- total share config
- price per share

### Effects in current implementation
- creates the `AssetAccount` PDA
- creates the `share_mint` PDA as an SPL mint
- creates the asset USDC `vault` PDA as an SPL token account
- stores the configured payment mint in `AssetAccount.payment_mint`

Current numeric conventions:
- share token decimals: `6`
- `total_shares` and `shares_sold` are stored in atomic share units
- `price_per_share` is stored in atomic USDC units per whole share

---

## activate_sale
Moves an asset into sale-ready state if required by program design.

---

## buy_shares
Processes investment into an asset offering.

### Effects
- receives payment
- transfers USDC from the investor ATA into the asset vault
- mints share tokens from the asset share mint into the investor share ATA
- updates `shares_sold`

Current accounts:
- `investor`
- `asset`
- `vault`
- `share_mint`
- `investor_share_account`
- `investor_usdc_account`
- `payment_mint`
- `token_program`

Backend assembly notes:
- backend always prepends idempotent creation of the investor share ATA
- backend derives `investor_usdc_account` from configured `SOLANA_USDC_MINT_ADDRESS`
- backend must not prepare investments unless `assets.onchain_asset_pubkey`, `assets.share_mint_pubkey`, and `assets.vault_pubkey` are already persisted

## On-Chain Initialization Flow

The repository now treats asset initialization as a distinct flow from investor purchase flow.

Issuer setup flow:
1. Asset is created and reviewed off-chain.
2. Sale terms provide:
   - `asset_id` from `assets.id`
   - `metadata_uri` from `assets.asset_metadata_uri` or explicit setup input
   - `total_shares` from `asset_sale_terms.total_shares`
   - `price_per_share` from `asset_sale_terms.price_per_share_usdc`
3. Issuer calls backend `prepare` for on-chain setup.
4. Backend returns a transaction that runs `create_asset` and, when the DB asset is already `active_sale`, `activate_sale` in the same wallet-signed transaction.
5. After the transaction is finalized, backend confirmation persists:
   - `assets.onchain_asset_pubkey`
   - `assets.share_mint_pubkey`
   - `assets.vault_pubkey`
   - `share_mints` row for the asset

Dev/local note:
- `SOLANA_PAYER_KEY` may partially sign prepared setup and investment transactions as fee payer
- this is fee sponsorship and tooling only
- investor and issuer signatures still come from the wallet for their respective user actions

---

## post_revenue
Registers a new revenue epoch.

### Inputs
- asset
- epoch number
- amount
- report hash

### Effects
- creates `RevenueEpochAccount`
- makes claimable yield available

---

## claim_yield
Allows a token holder to claim revenue corresponding to their position.

### Effects
- validates entitlement
- transfers claim amount
- records claim

---

## freeze_asset
Moves asset into frozen state.

---

## close_asset
Moves asset into closed state.

---

## Suggested Statuses

## Asset status
- `draft`
- `verified`
- `active_sale`
- `funded`
- `frozen`
- `closed`

## Revenue epoch status
- `posted`
- `settled`
- `flagged`

---

## Claim Model Notes

A claim-based model is preferred over direct distribution because:
- it avoids high fan-out transfers
- it reduces operational complexity
- it matches real blockchain constraints
- it is easier to demo and reason about

---

## What Should Stay Off-Chain

The following should not be fully stored on-chain:
- full technical passports
- images
- detailed financial reports
- user profiles
- geolocation metadata
- long descriptions

Instead, store:
- URI
- hash
- status
- references

---

## Security Considerations

### Prevent double claims
Claims must be uniquely tied to:
- user
- epoch
- asset

### Validate ownership correctly
Claim logic must reflect token ownership rules and payout entitlement model.

### Avoid mutable payout ambiguity
Revenue amounts should be final once posted unless there is explicit protocol support for revision.

### Ensure status-based restrictions
A frozen asset should not continue normal user flows without explicit rules.

---

## MVP Guidance

The initial on-chain design should support exactly these flows:
- create asset
- configure offering
- buy shares
- post revenue
- claim revenue

Anything beyond that is optional for the first iteration.
