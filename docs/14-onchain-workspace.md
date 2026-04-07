# On-Chain Workspace

This document describes the `solashare_program/` workspace as it exists in the repository today.

## Purpose

The on-chain workspace contains the Solana program that holds the trust-critical asset, sale,
revenue, and claim state transitions for SolaShare.

Its role is narrower than the backend:

- the program owns immutable or financially sensitive state transitions
- the backend prepares transactions, stores read models, and reconciles off-chain workflows
- the frontend interacts with the backend and signs prepared transactions client-side

## Workspace Layout

Top-level files:

- [solashare_program/Cargo.toml](/home/const/solashare/solashare_program/Cargo.toml)
  Rust workspace configuration.

- [solashare_program/Anchor.toml](/home/const/solashare/solashare_program/Anchor.toml)
  Anchor workspace configuration, localnet program ID, provider cluster, and test command.

- [solashare_program/package.json](/home/const/solashare/solashare_program/package.json)
  JavaScript-side commands and dependencies used around the Anchor workspace.

- [solashare_program/migrations/deploy.ts](/home/const/solashare/solashare_program/migrations/deploy.ts)
  Deployment helper script.

- [solashare_program/tests/solashare_program.ts](/home/const/solashare/solashare_program/tests/solashare_program.ts)
  TypeScript test entrypoint for program validation.

Program source:

- [solashare_program/programs/solashare_program/src/lib.rs](/home/const/solashare/solashare_program/programs/solashare_program/src/lib.rs)

## Actual Dependencies

### Rust program dependencies

From
[solashare_program/programs/solashare_program/Cargo.toml](/home/const/solashare/solashare_program/programs/solashare_program/Cargo.toml):

- `anchor-lang = 0.32.1`
- `anchor-spl = 0.32.1` with `token` and `token_2022` features
- `sha2 = 0.10`

These are the core on-chain dependencies and should be treated as part of the repository's real
dependency graph, not as optional extras.

### JS-side workspace dependencies

From [solashare_program/package.json](/home/const/solashare/solashare_program/package.json):

- `@coral-xyz/anchor`
- `typescript`
- `mocha`
- `chai`
- `ts-mocha`
- `prettier`

## Program Configuration

Current Anchor configuration from
[solashare_program/Anchor.toml](/home/const/solashare/solashare_program/Anchor.toml):

- package manager: `yarn`
- provider cluster: `http://127.0.0.1:8899`
- provider wallet: `~/.config/solana/id.json`
- localnet program ID: `DtRpAZKe3D38mYFyLgGHsSs8gFDFtB4WKPsR1yz6gD5S`

The Rust source also declares a program ID directly in
[solashare_program/programs/solashare_program/src/lib.rs](/home/const/solashare/solashare_program/programs/solashare_program/src/lib.rs).
If these values diverge, that mismatch should be resolved explicitly during deployment or localnet
setup.

## Quickstart

This section is the practical setup path for working on the on-chain workspace.

### Prerequisites

Required:

- Rust toolchain
- Solana CLI
- Anchor CLI
- Yarn

Usually also needed:

- a local validator for development
- a funded wallet for deployment or transaction testing

### 1. Install JS-side workspace dependencies

```bash
cd solashare_program
yarn install
```

### 2. Verify local toolchain

Useful checks:

```bash
rustc --version
cargo --version
solana --version
anchor --version
yarn --version
```

If `anchor` is missing, you cannot use the standard Anchor build and test flow.

### 3. Start a local validator

From the repository root:

```bash
./scripts/start-localnet.sh
```

Useful variants:

```bash
./scripts/start-localnet.sh --reset
./scripts/start-localnet.sh --build
```

What the script does:

- starts `solana-test-validator`
- stores local validator state under `.solana/`
- optionally builds the program first
- preloads the program when compiled artifacts already exist

### 4. Point Solana CLI to localnet

```bash
solana config set --url http://127.0.0.1:8899
```

The helper script prints the exact RPC URL after startup.

### 5. Build the program

```bash
cd solashare_program
anchor build
```

Alternative path when Anchor build is unavailable but SBF tooling exists:

```bash
cargo-build-sbf --manifest-path programs/solashare_program/Cargo.toml --sbf-out-dir target/deploy
```

Expected output artifacts are typically placed under:

- `solashare_program/target/deploy/solashare_program.so`
- `solashare_program/target/deploy/solashare_program-keypair.json`

### 6. Check the local program ID

If the keypair artifact exists:

```bash
solana address -k solashare_program/target/deploy/solashare_program-keypair.json
```

Make sure the program ID used by the backend matches the deployed or preloaded program you are
actually testing against.

### 7. Update backend env for local on-chain work

In the repository root `.env`, set:

```dotenv
SOLANA_RPC_URL=http://127.0.0.1:8899
SOLANA_COMMITMENT=confirmed
SOLANA_PROGRAM_ID=<your local program id>
```

Then start the backend from the repository root:

```bash
bun run dev
```

### 8. Run Anchor tests

From `solashare_program/`:

```bash
anchor test
```

Or use the script defined in
[solashare_program/Anchor.toml](/home/const/solashare/solashare_program/Anchor.toml):

```bash
yarn run ts-mocha -p ./tsconfig.json -t 1000000 "tests/**/*.ts"
```

Current limitation:

- the checked-in TypeScript test file is a skipped placeholder
- the workspace does not yet contain a real automated end-to-end on-chain assertion suite

So today:

- `anchor build` is meaningful
- local validator boot is meaningful
- manual transaction validation is meaningful
- automated program test coverage is still minimal

### 9. Deploy flow note

For local validator work, the helper script can preload the built program if artifacts exist.

For explicit deployment workflows, use Anchor or Solana CLI depending on your environment. Typical
commands are:

```bash
cd solashare_program
anchor deploy
```

or:

```bash
solana program deploy target/deploy/solashare_program.so
```

After deployment:

- record the resulting program ID
- update backend `SOLANA_PROGRAM_ID`
- confirm it matches the program targeted by transaction preparation logic

### 10. Shut down localnet

From the repository root:

```bash
./scripts/stop-localnet.sh
```

## Implemented Instructions

The current program implements these instruction handlers:

- `create_asset`
- `activate_sale`
- `buy_shares`
- `post_revenue`
- `claim_yield`
- `withdraw_funds`

### `create_asset`

Purpose:

- creates the asset PDA
- creates the share mint PDA
- creates the payment vault PDA
- stores issuer, metadata URI, payment mint, total shares, and share price

### `activate_sale`

Purpose:

- transitions an asset from `Draft` to `ActiveSale`

### `buy_shares`

Purpose:

- validates sale state and account configuration
- transfers payment tokens from investor to the asset vault
- mints share tokens to the investor token account
- increments `shares_sold`
- marks the asset as `Funded` when fully sold

### `post_revenue`

Purpose:

- creates a revenue epoch PDA for an asset
- stores epoch number, amount, report hash, and posting timestamp
- marks the epoch as posted and claimable

### `claim_yield`

Purpose:

- transfers payout tokens from the asset vault to the claimant
- creates a claim record PDA
- increments claimed amount on the revenue epoch
- marks the epoch as settled when fully claimed

### `withdraw_funds`

Purpose:

- allows the issuer to withdraw payment tokens from the vault
- enforces a minimum withdrawal amount

## On-Chain Accounts

The program currently defines three Anchor accounts.

### `AssetAccount`

Stores:

- issuer pubkey
- `asset_id`
- `metadata_uri`
- asset status
- share mint pubkey
- payment vault pubkey
- payment mint pubkey
- `total_shares`
- `shares_sold`
- `price_per_share`
- creation timestamp
- bump

### `RevenueEpochAccount`

Stores:

- asset pubkey
- epoch number
- posted amount
- report hash
- amount already claimed
- posting timestamp
- revenue status
- bump

### `ClaimRecord`

Stores:

- claimant pubkey
- asset pubkey
- revenue epoch pubkey
- claimed amount
- claim timestamp
- bump

## Status Enums

### `AssetStatus`

- `Draft`
- `Verified`
- `ActiveSale`
- `Funded`
- `Frozen`
- `Closed`

### `RevenueStatus`

- `Posted`
- `Settled`
- `Flagged`

## PDA Strategy

The program derives PDAs using hashed asset identifiers and deterministic seeds.

Observed seed patterns in the current implementation:

- asset PDA: `["asset", sha256(asset_id)]`
- share mint PDA: `["share_mint", sha256(asset_id)]`
- vault PDA: `["vault", sha256(asset_id)]`
- revenue epoch PDA: `["revenue", sha256(asset_id), epoch_number_le_bytes]`
- claim record PDA: `["claim", sha256(asset_id), claimant_pubkey, epoch_number_le_bytes]`

The helper trait for converting `asset_id` into a PDA seed is implemented directly in the Rust
program using SHA-256.

## Token Model

The current program uses:

- an asset-specific share mint
- a payment mint stored on the asset record
- a vault token account controlled by the asset PDA

Constants defined in the program:

- `SHARE_SCALE = 1_000_000`
- `SHARE_TOKEN_DECIMALS = 6`

Share purchase pricing is computed using the scaled share representation and rounded with the
program helper `div_ceil_share_scale`.

## Error Model

The program currently exposes custom Anchor errors for:

- invalid asset state
- sale not active
- insufficient shares
- insufficient payment
- unauthorized access
- asset not funded
- non-claimable epoch
- duplicate claim
- insufficient remaining revenue
- invalid mint or token-account wiring
- invalid issuer or investor token accounts
- too-small withdrawal amount
- arithmetic overflow

## Test State

The current TypeScript test file
[solashare_program/tests/solashare_program.ts](/home/const/solashare/solashare_program/tests/solashare_program.ts)
contains a skipped placeholder test rather than a real automated end-to-end suite.

That means:

- the repository contains the program source and workspace
- the JS test harness exists
- real on-chain verification is still largely manual or localnet-driven at the moment

## Relationship To The Backend

The backend depends on this workspace conceptually and operationally even when it does not import
the Rust crate directly.

Key integration boundaries:

- the backend prepares transactions that target the Solana program
- the backend reconciles transaction results into PostgreSQL read models
- indexer and webhook flows map program activity back into off-chain workflow state
- `SOLANA_PROGRAM_ID` in backend config must match the deployed program used by the product

Relevant backend references:

- [docs/05-onchain-design.md](/home/const/solashare/docs/05-onchain-design.md)
- [docs/06-sync-indexer.md](/home/const/solashare/docs/06-sync-indexer.md)
- [src/lib/solana](/home/const/solashare/src/lib/solana)

## Current Documentation Gap That Was Fixed

Earlier repository docs mentioned `solashare_program/` only as a sibling project. This document
promotes it to a first-class documented subsystem, which is the correct treatment for this codebase.
