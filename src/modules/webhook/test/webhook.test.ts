import { beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { assets, investments, users, walletBindings } from "../../../db/schema";
import { resetTestState } from "../../../tests/helpers";
import { issuerService } from "../../issuer/service";
import { WebhookService } from "../service";

describe("WebhookService", () => {
  beforeEach(async () => {
    await resetTestState();
  });

  it("should handle valid webhook", async () => {
    const [issuer, investor] = await db
      .insert(users)
      .values([
        {
          telegramUserId: "issuer-webhook",
          displayName: "Issuer",
          role: "issuer",
        },
        {
          telegramUserId: "investor-webhook",
          displayName: "Investor",
          role: "investor",
        },
      ])
      .returning();

    await db.insert(walletBindings).values({
      userId: investor.id,
      walletAddress: "WebhookInvestorWallet1111111111111111111111",
      status: "active",
      verificationMessage: "signed",
      verifiedAt: new Date(),
    });

    const createdAsset = await issuerService.createAssetDraft(issuer, {
      title: "Webhook Solar Asset",
      short_description: "Webhook investment flow asset",
      full_description: "Asset used for webhook processing integration test.",
      energy_type: "solar",
      location_country: "Kazakhstan",
      location_city: "Almaty",
      capacity_kw: 80,
    });

    await issuerService.registerAssetDocument(issuer, createdAsset.asset_id, {
      type: "technical_passport",
      title: "Passport",
      storage_provider: "arweave",
      storage_uri: "https://example.com/passport",
      content_hash: "sha256:webhook",
      is_public: true,
    });

    await issuerService.saveSaleTerms(issuer, createdAsset.asset_id, {
      valuation_usdc: 50000,
      total_shares: 1000,
      price_per_share_usdc: 10,
      minimum_buy_amount_usdc: 50,
      target_raise_usdc: 1000,
    });

    await issuerService.submitAssetForWorkflow(issuer, createdAsset.asset_id);
    await db
      .update(assets)
      .set({ status: "active_sale" })
      .where(eq(assets.id, createdAsset.asset_id));

    const [pendingInvestment] = await db
      .insert(investments)
      .values({
        userId: investor.id,
        assetId: createdAsset.asset_id,
        amountUsdc: "100.000000",
        sharesReceived: "10.000000000000",
        status: "pending",
      })
      .returning();

    const service = new WebhookService();
    const result = await service.handleHeliusWebhook({
      signature: "test",
      timestamp: Date.now(),
      events: { transfer: [{ from: "a", to: "b", amount: 100, mint: "sol" }] },
      memo: pendingInvestment.id,
    });
    expect(result.handled).toBe(true);
  });
});
