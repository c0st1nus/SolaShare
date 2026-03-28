import { Elysia } from "elysia";
import { logger } from "../../lib/logger";
import { heliusWebhookSchema } from "./contracts";
import { WebhookService } from "./service";

export const webhookRoutes = new Elysia({ prefix: "/webhooks" }).post(
  "/helius",
  async ({ body, set }) => {
    const service = new WebhookService();
    try {
      const result = await service.handleHeliusWebhook(body);
      set.status = 200;
      return { success: true, ...result };
    } catch (error) {
      logger.error({ error }, "Webhook failed");
      set.status = 500;
      return { success: false, error: "Internal error" };
    }
  },
  {
    body: heliusWebhookSchema,
  },
);
