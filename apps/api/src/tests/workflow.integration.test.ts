import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { assetSaleTerms, assets } from "../db/schema";
import { adminService } from "../modules/admin/service";
import { investmentsService } from "../modules/investments/service";
import { issuerService } from "../modules/issuer/service";
import {
  approveUserKyc,
  createActiveWalletBinding,
  createUser,
  initializeAssetOnchainFixture,
  resetTestState,
} from "./helpers";

describe("workflow integration", () => {
  beforeEach(async () => {
    await resetTestState();
  });

  afterAll(async () => {
    await resetTestState();
  });

  it("runs issuer review flow and prepares an initialized asset for wallet investment", async () => {
    const issuer = await createUser({
      role: "issuer",
      telegramUserId: "workflow-issuer",
    });
    const admin = await createUser({
      role: "admin",
      telegramUserId: "workflow-admin",
    });
    const investor = await createUser({
      role: "investor",
      telegramUserId: "workflow-investor",
    });

    await createActiveWalletBinding(issuer.id);
    await createActiveWalletBinding(investor.id);
    await approveUserKyc(investor.id, admin.id);

    const createdAsset = await issuerService.createAssetDraft(issuer, {
      title: "Solar Rooftop A1",
      short_description: "Tokenized rooftop solar asset for integration testing",
      full_description:
        "Detailed rooftop solar asset used to verify the issuer review and investment preparation workflow.",
      energy_type: "solar",
      location_country: "Kazakhstan",
      location_region: "Almaty Region",
      location_city: "Almaty",
      capacity_kw: 120,
    });

    await issuerService.registerAssetDocument(issuer, createdAsset.asset_id, {
      type: "technical_passport",
      title: "Technical passport",
      storage_provider: "arweave",
      storage_uri: "https://example.com/docs/technical-passport",
      content_hash: "sha256:test-passport",
      is_public: true,
    });

    await issuerService.saveSaleTerms(issuer, createdAsset.asset_id, {
      valuation_usdc: 100000,
      total_shares: 10000,
      price_per_share_usdc: 10,
      minimum_buy_amount_usdc: 50,
      target_raise_usdc: 100,
    });

    await issuerService.submitAssetForWorkflow(issuer, createdAsset.asset_id);
    await adminService.verifyAsset(admin, createdAsset.asset_id, {
      outcome: "approved",
      reason: "Integration review passed",
      issues: [],
    });
    await issuerService.submitAssetForWorkflow(issuer, createdAsset.asset_id);
    await initializeAssetOnchainFixture(createdAsset.asset_id);

    const preparedInvestment = await investmentsService.prepareInvestment(investor, {
      asset_id: createdAsset.asset_id,
      amount_usdc: 100,
    });

    const [asset, saleTerms] = await Promise.all([
      db.select().from(assets).where(eq(assets.id, createdAsset.asset_id)).limit(1),
      db
        .select()
        .from(assetSaleTerms)
        .where(eq(assetSaleTerms.assetId, createdAsset.asset_id))
        .limit(1),
    ]);

    expect(asset[0]?.status).toBe("active_sale");
    expect(asset[0]?.onchainAssetPubkey).not.toBeNull();
    expect(asset[0]?.shareMintPubkey).not.toBeNull();
    expect(asset[0]?.vaultPubkey).not.toBeNull();
    expect(saleTerms[0]?.saleStatus).toBe("live");
    expect(preparedInvestment.metadata.kind).toBe("investment");
    expect(preparedInvestment.metadata.shares_to_receive).toBe(10);
  });
});
