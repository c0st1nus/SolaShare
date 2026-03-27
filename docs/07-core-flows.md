# Core Flows

## Overview

The MVP should be optimized around three end-to-end flows:

1. asset creation
2. investment
3. revenue posting and claim

These flows are enough to prove:
- tokenization
- ownership
- distribution
- interaction with real-world asset economics

---

## Flow 1: Create Asset

### Goal
An issuer creates a new green energy asset and prepares it for tokenized offering.

### Steps
1. issuer logs in through Telegram WebApp
2. issuer creates asset draft
3. issuer fills metadata:
   - title
   - description
   - energy type
   - capacity
   - location
4. issuer uploads supporting documents
5. issuer configures sale terms
6. system generates asset metadata URI / proof bundle reference
7. issuer submits asset to next lifecycle step
8. if protocol design requires, on-chain asset account is created

### Output
- asset exists in DB
- asset has lifecycle status
- sale terms are attached
- proof references are available
- on-chain anchor may be created

---

## Flow 2: Invest in Asset

### Goal
An investor buys fractional exposure to the asset.

### Steps
1. investor browses asset listing
2. investor opens asset page
3. investor enters investment amount
4. frontend requests quote
5. backend returns:
   - shares to receive
   - price
   - fees
6. frontend requests investment transaction preparation
7. investor signs transaction
8. transaction is sent to Solana
9. indexer confirms transaction
10. holdings snapshot is updated
11. investment appears in portfolio

### Output
- investor owns asset shares
- transaction history is visible
- portfolio reflects updated position

---

## Flow 3: Post Revenue

### Goal
Issuer posts a revenue distribution period.

### Steps
1. issuer opens issuer dashboard
2. issuer creates revenue epoch draft
3. issuer enters:
   - period dates
   - gross revenue
   - net revenue
   - distributable revenue
4. issuer attaches report URI and hash
5. backend validates draft
6. backend prepares posting flow
7. posting transaction is submitted on-chain
8. indexer confirms revenue epoch creation
9. asset page shows new revenue epoch
10. claimable balances become visible

### Output
- revenue epoch exists on-chain
- report reference is visible
- users can claim yield

---

## Flow 4: Claim Yield

### Goal
Investor claims their share of the posted revenue.

### Steps
1. investor opens portfolio
2. frontend shows unclaimed amount
3. investor selects claim
4. backend prepares claim transaction
5. investor signs transaction
6. claim executes on-chain
7. indexer confirms claim
8. portfolio is updated
9. claim history is updated

### Output
- investor receives yield
- claim is recorded
- epoch claim accounting is updated

---

## Flow 5: Freeze Asset

### Goal
Operational control flow for exceptional cases.

### Steps
1. admin or protocol authority triggers freeze
2. asset status changes to `frozen`
3. frontend shows warning state
4. new investments are blocked
5. revenue posting or claiming may be restricted depending on policy

### Output
- asset state is visibly restricted
- operational control is auditable

---

## Flow Design Notes

### Why these flows matter
These flows prove the complete product logic:
- issuance
- ownership
- revenue linkage
- payout interaction

### Why claim-based flow is important
It demonstrates a mature distribution model suited for blockchain constraints.

### What should be demoed live
The strongest live demo is:
1. asset exists
2. investor buys a share
3. issuer posts revenue
4. investor claims yield
