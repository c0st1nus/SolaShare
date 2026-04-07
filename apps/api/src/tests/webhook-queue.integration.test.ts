import { beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { investments, jobExecutionLogs } from "../db/schema";
import { startRelayWorkers } from "../lib/queue";
import { settlementService } from "../modules/transactions/settlement-service";
import { WebhookService } from "../modules/webhook/service";
import {
  createActiveSaleAsset,
  createActiveWalletBinding,
  createUser,
  resetTestState,
} from "./helpers";

describe("webhook and queue integration", () => {
  beforeAll(async () => {
    await startRelayWorkers();
  });

  beforeEach(async () => {
    await resetTestState();
  });

  it("marks duplicate webhook events as handled false", async () => {
    const service = new WebhookService();
    const memo = crypto.randomUUID();
    const payload = {
      signature: "duplicate-signature",
      timestamp: Date.now(),
      events: { transfer: [{ from: "a", to: "b", amount: 1, mint: "sol" }] },
      memo,
    };

    const first = await service.handleHeliusWebhook(payload);
    const second = await service.handleHeliusWebhook(payload);

    expect(first.handled).toBe(true);
    expect(second).toEqual({ handled: false, reason: "duplicate_event" });
  });

  it("returns handled false when webhook contains no transfers", async () => {
    const service = new WebhookService();

    const result = await service.handleHeliusWebhook({
      signature: "no-transfer-signature",
      timestamp: Date.now(),
      events: {},
      memo: "unknown",
    });

    expect(result).toEqual({ handled: false, reason: "no_transfers" });
  });

  it("processes queued investment confirmations from webhook payloads", async () => {
    const issuer = await createUser({
      role: "issuer",
      telegramUserId: "issuer-webhook-queue",
    });
    const admin = await createUser({
      role: "admin",
      telegramUserId: "admin-webhook-queue",
    });
    const investor = await createUser({
      role: "investor",
      telegramUserId: "investor-webhook-queue",
    });
    await createActiveWalletBinding(investor.id);
    const { asset } = await createActiveSaleAsset(issuer, admin, {
      title: "Webhook Queue Asset",
      saleTerms: {
        valuation_usdc: 50000,
        total_shares: 1000,
        price_per_share_usdc: 10,
        minimum_buy_amount_usdc: 50,
        target_raise_usdc: 1000,
      },
    });

    const [pendingInvestment] = await db
      .insert(investments)
      .values({
        userId: investor.id,
        assetId: asset.id,
        amountUsdc: "100.000000",
        sharesReceived: "10.000000000000",
        status: "pending",
      })
      .returning();

    const service = new WebhookService();
    const result = await service.handleHeliusWebhook({
      signature: "queue-signature",
      timestamp: Date.now(),
      events: { transfer: [{ from: "a", to: "b", amount: 100, mint: "sol" }] },
      memo: pendingInvestment.id,
    });

    expect(result.handled).toBe(true);

    await Bun.sleep(200);

    const [investment] = await db
      .select()
      .from(investments)
      .where(eq(investments.id, pendingInvestment.id))
      .limit(1);
    expect(investment?.status).toBe("confirmed");
  });

  it("writes failed job execution logs for invalid queued confirmations", async () => {
    await expect(
      settlementService.runQueuedInvestmentConfirmation(
        crypto.randomUUID(),
        "missing-investment-signature",
      ),
    ).rejects.toThrow();

    const rows = await db
      .select()
      .from(jobExecutionLogs)
      .where(eq(jobExecutionLogs.jobName, "confirm-investment"));

    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("failed");
  });
});
