import { Elysia, t } from "elysia";
import { authPlugin, requireUserRole } from "../../plugins/auth";
import {
  startPollingIndexer,
  stopPollingIndexer,
  getIndexerStatus,
  syncTransaction,
  handleWebhookTransaction,
} from "../../lib/solana/indexer";
import { logger } from "../../lib/logger";

const log = logger.child({ module: "indexer-routes" });

export const indexerRoutes = new Elysia({
  prefix: "/indexer",
  tags: ["Indexer"],
})
  .use(authPlugin)

  // Get indexer status
  .get(
    "/status",
    () => {
      return getIndexerStatus();
    },
    {
      detail: {
        summary: "Get indexer status",
        description: "Returns the current status of the Solana transaction indexer",
      },
    },
  )

  // Start polling indexer (admin only)
  .post(
    "/start",
    async ({ auth, body }) => {
      requireUserRole(auth, ["admin"]);
      const intervalMs = body?.interval_ms ?? 5000;
      await startPollingIndexer(intervalMs);
      return { success: true, message: "Indexer started", interval_ms: intervalMs };
    },
    {
      body: t.Optional(
        t.Object({
          interval_ms: t.Optional(t.Number({ minimum: 1000, maximum: 60000 })),
        }),
      ),
      detail: {
        summary: "Start polling indexer",
        description: "Start the Solana transaction polling indexer (admin only)",
      },
    },
  )

  // Stop polling indexer (admin only)
  .post(
    "/stop",
    ({ auth }) => {
      requireUserRole(auth, ["admin"]);
      stopPollingIndexer();
      return { success: true, message: "Indexer stopped" };
    },
    {
      detail: {
        summary: "Stop polling indexer",
        description: "Stop the Solana transaction polling indexer (admin only)",
      },
    },
  )

  // Manually sync a transaction
  .post(
    "/sync",
    async ({ auth, body }) => {
      requireUserRole(auth, ["admin"]);
      const result = await syncTransaction(body.signature);
      return result;
    },
    {
      body: t.Object({
        signature: t.String({ minLength: 1 }),
      }),
      detail: {
        summary: "Manually sync a transaction",
        description: "Fetch and process a specific transaction by signature (admin only)",
      },
    },
  )

  // Webhook endpoint for external notification services (Helius, etc.)
  .post(
    "/webhook",
    async ({ body, headers }) => {
      // Validate webhook secret if configured
      const webhookSecret = process.env.INDEXER_WEBHOOK_SECRET;
      if (webhookSecret) {
        const providedSecret = headers["x-webhook-secret"];
        if (providedSecret !== webhookSecret) {
          log.warn("Invalid webhook secret");
          return { processed: false, reason: "unauthorized" };
        }
      }

      // Handle array of transactions or single transaction
      const transactions = Array.isArray(body) ? body : [body];
      const results = [];

      for (const tx of transactions) {
        if (tx.signature) {
          const result = await handleWebhookTransaction({
            signature: tx.signature,
            slot: tx.slot,
            blockTime: tx.blockTime,
            accounts: tx.accounts,
            logs: tx.logs,
            programId: tx.programId,
          });
          results.push({ signature: tx.signature, ...result });
        }
      }

      return { processed: results.filter((r) => r.processed).length, results };
    },
    {
      body: t.Any(), // Flexible for different webhook formats
      detail: {
        summary: "Webhook endpoint",
        description: "Receive transaction notifications from external services like Helius",
      },
    },
  );
