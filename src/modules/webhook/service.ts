import { eq } from "drizzle-orm";
import { db } from "../../db";
import { investments, webhookEvents } from "../../db/schema";
import { logger } from "../../lib/logger";
import { relayQueue } from "../../lib/queue";
import type { HeliusWebhookPayload } from "./contracts";

export class WebhookService {
  async handleHeliusWebhook(payload: HeliusWebhookPayload) {
    // Сохраняем webhook в таблицу
    const [webhookRecord] = await db
      .insert(webhookEvents)
      .values({
        source: "helius",
        eventType: "transfer",
        externalEventId: payload.signature,
        payloadJson: payload,
        status: "pending",
      })
      .returning();

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
        // Используем memo для поиска (в HeliusWebhookPayload есть поле memo)
        // Если memo нет, пробуем использовать signature
        const memo = payload.memo || payload.signature;

        // Ищем инвестицию по transactionSignature
        const investmentsList = await db
          .select()
          .from(investments)
          .where(eq(investments.transactionSignature, memo))
          .limit(1);

        const investment = investmentsList[0];

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
            { memo, status: investment?.status },
            "No pending investment found for memo",
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
