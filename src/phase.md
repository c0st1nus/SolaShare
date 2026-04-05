You are a Staff-level Senior Solana + TypeScript Engineer.

Phase 3 (on-chain verification) has been implemented, but we need to validate and harden it before moving to the indexer.

Current status:
- surfpool is running (local validator alternative)
- Backend is running on port 3000
- Verification logic added in src/lib/solana/verification.ts and settlement-service.ts

### Task: Comprehensive Local Testing & Fixes for Phase 3

First, do the following checks and fixes:

1. **Solana Environment Validation**
   - Confirm surfpool is running and accessible at http://127.0.0.1:18488
   - Check current .env values for SOLANA_RPC_URL and SOLANA_PROGRAM_ID
   - If SOLANA_PROGRAM_ID is missing or wrong, ask me for the correct value or set a placeholder for testing
   - Test RPC connection from the backend (you can use code execution or suggest curl to /health)

2. **End-to-End Verification Testing Strategy**
   Create a test script `scripts/test-verification.ts` that does the following flow:
   - Request wallet challenge
   - Sign it (using local keypair or mock)
   - Prepare an investment/claim/revenue transaction (mock or real prepare call)
   - Manually create and send a dummy transaction to surfpool (or use real flow if possible)
   - Call confirm endpoint with the real signature
   - Verify that:
     - Invalid signatures are rejected with clear error
     - Idempotency works (second call with same signature returns "already_confirmed")
     - Successful verification updates DB status
     - Failed verification does NOT update DB

3. **Improvements Needed**
   - Make sure verification.ts handles surfpool/local environment correctly (different blockhash behavior, etc.)
   - Add better error messages and logging
   - Handle cases when transaction is not yet finalized (add retry logic with timeout)
   - Ensure PDA validation uses the exact same derivation logic as in transactions.ts

4. **Final Output Requirements**
   - First, show results of environment checks (RPC, surfpool, Program ID)
   - Then show the content of the new test script
   - Provide step-by-step manual testing commands using curl + solana CLI
   - Suggest how to deploy a real program to surfpool for full testing (if Anchor project exists)
   - List any remaining security gaps

Start now.
Begin by checking surfpool status, .env configuration, and RPC connectivity. Report clearly what works and what needs fixing before writing the test script.