import { client } from "../db";
import { redis } from "../lib/redis";

export const resetTestState = async () => {
  await client.unsafe(`
    TRUNCATE TABLE
      webhook_events,
      wallet_bindings,
      verification_decisions,
      verification_requests,
      user_sessions,
      transfers_index,
      share_mints,
      revenue_deposits,
      revenue_epochs,
      notifications,
      job_execution_logs,
      investments,
      idempotency_keys,
      holdings_snapshots,
      claims,
      audit_logs,
      asset_status_history,
      asset_sale_terms,
      asset_documents,
      assets,
      users
    RESTART IDENTITY CASCADE
  `);

  await redis.flushdb();
};
