import { timingSafeEqual } from "node:crypto";
import { Elysia } from "elysia";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import { heliusWebhookSchema } from "./contracts";
import { WebhookService } from "./service";

const verifyWebhookSecret = (authHeader: string | null): boolean => {
  if (!env.HELIUS_WEBHOOK_SECRET) {
    logger.warn("HELIUS_WEBHOOK_SECRET is not configured; skipping webhook authentication");
    return true;
  }

  if (!authHeader) {
    return false;
  }

  try {
    const expected = Buffer.from(env.HELIUS_WEBHOOK_SECRET, "utf8");
    const received = Buffer.from(authHeader, "utf8");
    if (expected.length !== received.length) {
      return false;
    }
    return timingSafeEqual(expected, received);
  } catch {
    return false;
  }
};

export const webhookRoutes = new Elysia({ prefix: "/webhooks" }).post(
  "/helius",
  async ({ body, request, set }) => {
    const authHeader = request.headers.get("authorization");

    if (!verifyWebhookSecret(authHeader)) {
      set.status = 401;
      return { success: false, error: "Invalid webhook credentials" };
    }

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
