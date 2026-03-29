import { eq } from "drizzle-orm";
import { db } from "../../db";
import { investments, webhookEvents } from "../../db/schema";
import { logger } from "../../lib/logger";
import { relayQueue } from "../../lib/queue";
import type { HeliusWebhookPayload } from "./contracts";

export class WebhookService {
  async handleHeliusWebhook(payload: HeliusWebhookPayload) {
    const [webhookRecord] = await db
      .insert(webhookEvents)
      .values({
        source: "helius",
        eventType: payload.source ?? "transfer",
        externalEventId: payload.signature,
        payloadJson: payload,
        status: "pending",
      })
      .onConflictDoNothing({
        target: [webhookEvents.source, webhookEvents.externalEventId],
      })
      .returning();

    if (!webhookRecord) {
      return { handled: false, reason: "duplicate_event" };
    }

    try {
      const transfers = payload.events?.transfer;
      if (!transfers?.length) {
        await db
          .update(webhookEvents)
          .set({ status: "processed", processedAt: new Date() })
          .where(eq(webhookEvents.id, webhookRecord.id));
        return { handled: false, reason: "no_transfers" };
      }

      for (const transfer of transfers) {
        const memo = payload.memo || payload.signature;
        const [investment] = await db
          .select()
          .from(investments)
          .where(eq(investments.id, memo))
          .limit(1);

        if (investment && investment.status === "pending") {
          await relayQueue.add("confirm-investment", {
            investmentId: investment.id,
            txSignature: payload.signature,
            transfer,
          });
          logger.info(
            {
              investmentId: investment.id,
              txSignature: payload.signature,
              memo,
            },
            "Queued investment confirmation",
          );
        } else {
          logger.debug(
            { memo, status: investment?.status, signature: payload.signature },
            "No pending investment found for webhook memo",
          );
        }
      }

      await db
        .update(webhookEvents)
        .set({ status: "processed", processedAt: new Date() })
        .where(eq(webhookEvents.id, webhookRecord.id));

      return { handled: true, processed: transfers.length };
    } catch (error) {
      logger.error({ error, webhookId: webhookRecord.id }, "Webhook processing failed");
      await db
        .update(webhookEvents)
        .set({ status: "failed", errorMessage: String(error) })
        .where(eq(webhookEvents.id, webhookRecord.id));
      throw error;
    }
  }
}
