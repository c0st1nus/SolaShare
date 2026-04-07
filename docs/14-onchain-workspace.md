# On-Chain Workspace

This document describes the Anchor workspace under
`programs/solashare-protocol`.

## Workspace Layout

- [Cargo.toml](/home/const/solashare/programs/solashare-protocol/Cargo.toml)
  Rust workspace definition.
- [Anchor.toml](/home/const/solashare/programs/solashare-protocol/Anchor.toml)
  Anchor provider config, localnet program ID, and test command.
- [package.json](/home/const/solashare/programs/solashare-protocol/package.json)
  JS-side workspace commands and dependencies.
- [migrations/deploy.ts](/home/const/solashare/programs/solashare-protocol/migrations/deploy.ts)
  Deployment helper.
- [programs/solashare_protocol/src/lib.rs](/home/const/solashare/programs/solashare-protocol/programs/solashare_protocol/src/lib.rs)
  Main Solana program entrypoint.
- [tests/solashare_protocol.ts](/home/const/solashare/programs/solashare-protocol/tests/solashare_protocol.ts)
  TypeScript test harness.

## Program Identity

Current Anchor localnet alias:

- `solashare_protocol`

Current localnet program ID in
[Anchor.toml](/home/const/solashare/programs/solashare-protocol/Anchor.toml):

- `DtRpAZKe3D38mYFyLgGHsSs8gFDFtB4WKPsR1yz6gD5S`

Current Rust crate and library names:

- crate: `solashare_protocol`
- lib: `solashare_protocol`

## Implemented Instructions

The program currently implements:

- `create_asset`
- `activate_sale`
- `buy_shares`
- `post_revenue`
- `claim_yield`
- `withdraw_funds`

## Accounts And State

The program defines these main account types:

- `AssetAccount`
- `RevenueEpochAccount`
- `ClaimRecord`

It also defines status enums for:

- `AssetStatus`
- `RevenueStatus`

PDA strategy is based on deterministic seeds derived from:

- `asset`
- `share_mint`
- `vault`
- `revenue`
- `claim`

with hashed `asset_id` and epoch-specific data where needed.

## Dependencies

From
[programs/solashare_protocol/Cargo.toml](/home/const/solashare/programs/solashare-protocol/programs/solashare_protocol/Cargo.toml):

- `anchor-lang`
- `anchor-spl`
- `sha2`

From
[package.json](/home/const/solashare/programs/solashare-protocol/package.json):

- `@coral-xyz/anchor`
- `typescript`
- `mocha`
- `chai`
- `ts-mocha`
- `prettier`

## Local Workflow

Install workspace dependencies:

```bash
cd programs/solashare-protocol
yarn install
```

Build with Anchor:

```bash
anchor build
```

Or from the repository root:

```bash
./scripts/start-localnet.sh --build
```

That helper:

- starts `solana-test-validator`
- optionally builds the program
- preloads `target/deploy/solashare_protocol.so` when artifacts exist

To stop localnet:

```bash
./scripts/stop-localnet.sh
```

## Backend Integration

The backend does not import the Rust crate directly, but it depends on this workspace through:

- transaction preparation in
  [apps/api/src/lib/solana](/home/const/solashare/apps/api/src/lib/solana)
- post-confirmation reconciliation
- indexer and webhook processing
- `SOLANA_PROGRAM_ID` matching the deployed program

When changing PDA strategy, account layout, or instruction semantics, update backend docs and code
in the same change.
