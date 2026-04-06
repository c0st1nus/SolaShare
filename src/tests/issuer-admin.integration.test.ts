import { beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../db";
import {
  assetSaleTerms,
  assetStatusHistory,
  assets,
  auditLogs,
  verificationDecisions,
  verificationRequests,
} from "../db/schema";
import { ApiError } from "../lib/api-error";
import { adminService } from "../modules/admin/service";
import { issuerService } from "../modules/issuer/service";
import {
  createActiveWalletBinding,
  createAssetDraftFixture,
  createUser,
  resetTestState,
} from "./helpers";

describe("issuer and admin integration", () => {
  beforeEach(async () => {
    await resetTestState();
  });

  it("rejects submitting an asset without sale terms", async () => {
    const issuer = await createUser({
      role: "issuer",
      telegramUserId: "issuer-no-sale",
    });
    const createdAsset = await issuerService.createAssetDraft(issuer, {
      title: "Draft without sale terms",
      short_description: "Short description for draft without sale terms",
      full_description: "Full description for draft without sale terms used in tests.",
      energy_type: "solar",
      location_country: "Kazakhstan",
      location_city: "Almaty",
      capacity_kw: 50,
    });

    await issuerService.registerAssetDocument(issuer, createdAsset.asset_id, {
      type: "technical_passport",
      title: "Passport",
      storage_provider: "arweave",
      storage_uri: "https://example.com/passport",
      content_hash: "sha256:no-sale",
      is_public: true,
    });

    await expect(
      issuerService.submitAssetForWorkflow(issuer, createdAsset.asset_id),
    ).rejects.toThrow(ApiError);
  });

  it("rejects submitting an asset without documents", async () => {
    const issuer = await createUser({
      role: "issuer",
      telegramUserId: "issuer-no-docs",
    });
    const createdAsset = await issuerService.createAssetDraft(issuer, {
      title: "Draft without docs",
      short_description: "Short description for draft without docs",
      full_description: "Full description for draft without docs used in tests.",
      energy_type: "solar",
      location_country: "Kazakhstan",
      location_city: "Almaty",
      capacity_kw: 50,
    });

    await issuerService.saveSaleTerms(issuer, createdAsset.asset_id, {
      valuation_usdc: 100000,
      total_shares: 10000,
      price_per_share_usdc: 10,
      minimum_buy_amount_usdc: 50,
      target_raise_usdc: 1000,
    });

    await expect(
      issuerService.submitAssetForWorkflow(issuer, createdAsset.asset_id),
    ).rejects.toThrow(ApiError);
  });

  it("moves asset through review and sale activation", async () => {
    const issuer = await createUser({
      role: "issuer",
      telegramUserId: "issuer-review",
    });
    const admin = await createUser({
      role: "admin",
      telegramUserId: "admin-review",
    });
    const createdAsset = await createAssetDraftFixture(issuer);

    const reviewResult = await issuerService.submitAssetForWorkflow(issuer, createdAsset.asset_id);
    expect(reviewResult.next_status).toBe("pending_review");

    const verifyResult = await adminService.verifyAsset(admin, createdAsset.asset_id, {
      outcome: "approved",
      reason: "Looks good",
      issues: [],
    });
    expect(verifyResult.resulting_status).toBe("verified");

    const saleActivation = await issuerService.submitAssetForWorkflow(
      issuer,
      createdAsset.asset_id,
    );
    expect(saleActivation.next_status).toBe("active_sale");

    const [asset, verificationRequest, verificationDecision] = await Promise.all([
      db.select().from(assets).where(eq(assets.id, createdAsset.asset_id)).limit(1),
      db
        .select()
        .from(verificationRequests)
        .where(eq(verificationRequests.assetId, createdAsset.asset_id))
        .limit(1),
      db.select().from(verificationDecisions),
    ]);

    expect(asset[0]?.status).toBe("active_sale");
    expect(verificationRequest[0]?.status).toBe("approved");
    expect(verificationDecision).toHaveLength(1);
  });

  it("derives pricing fields from asset capacity when simplified sale terms are used", async () => {
    const issuer = await createUser({
      role: "issuer",
      telegramUserId: "issuer-derived-sale-terms",
    });
    const createdAsset = await issuerService.createAssetDraft(issuer, {
      title: "Derived pricing asset",
      short_description: "Short description for derived pricing asset",
      full_description: "Full description for derived pricing asset used in tests.",
      energy_type: "solar",
      location_country: "Kazakhstan",
      location_city: "Almaty",
      capacity_kw: 150,
    });

    await issuerService.saveSaleTerms(issuer, createdAsset.asset_id, {
      valuation_usdc: 90000,
      minimum_buy_amount_usdc: 75,
    });

    const [saleTerms] = await db
      .select()
      .from(assetSaleTerms)
      .where(eq(assetSaleTerms.assetId, createdAsset.asset_id))
      .limit(1);

    expect(saleTerms?.totalShares).toBe(15000);
    expect(saleTerms?.pricePerShareUsdc).toBe("6.000000");
    expect(saleTerms?.targetRaiseUsdc).toBe("90000.000000");
  });

  it("returns structured review issues for issuer-managed assets", async () => {
    const issuer = await createUser({
      role: "issuer",
      telegramUserId: "issuer-review-feedback",
    });
    const admin = await createUser({
      role: "admin",
      telegramUserId: "admin-review-feedback",
    });
    const createdAsset = await createAssetDraftFixture(issuer);

    await issuerService.submitAssetForWorkflow(issuer, createdAsset.asset_id);
    await adminService.verifyAsset(admin, createdAsset.asset_id, {
      outcome: "needs_changes",
      reason: "Financial data does not match the project passport",
      issues: [
        {
          field: "valuation_usdc",
          label: "Asset valuation",
          note: "Price in the technical passport differs from the submitted valuation.",
          actual_value: "100000 USDC",
          expected_value: "95000 USDC",
          document_type: "technical_passport",
        },
      ],
    });

    const details = await issuerService.getOwnedAssetDetails(issuer, createdAsset.asset_id);

    expect(details.status).toBe("draft");
    expect(details.review_feedback?.outcome).toBe("needs_changes");
    expect(details.review_feedback?.issues[0]?.field).toBe("valuation_usdc");
    expect(details.review_feedback?.issues[0]?.document_type).toBe("technical_passport");
  });

  it("freezes and closes an asset with audit history", async () => {
    const issuer = await createUser({
      role: "issuer",
      telegramUserId: "issuer-freeze",
    });
    const admin = await createUser({
      role: "admin",
      telegramUserId: "admin-freeze",
    });
    const createdAsset = await createAssetDraftFixture(issuer);
    await issuerService.submitAssetForWorkflow(issuer, createdAsset.asset_id);
    await adminService.verifyAsset(admin, createdAsset.asset_id, {
      outcome: "approved",
      reason: "Approved",
      issues: [],
    });
    await issuerService.submitAssetForWorkflow(issuer, createdAsset.asset_id);

    const freezeResult = await adminService.freezeAsset(admin, createdAsset.asset_id);
    expect(freezeResult.resulting_status).toBe("frozen");

    const closeResult = await adminService.closeAsset(admin, createdAsset.asset_id);
    expect(closeResult.resulting_status).toBe("closed");

    const [statusRows, auditRows] = await Promise.all([
      db
        .select()
        .from(assetStatusHistory)
        .where(eq(assetStatusHistory.assetId, createdAsset.asset_id)),
      db.select().from(auditLogs).where(eq(auditLogs.entityId, createdAsset.asset_id)),
    ]);

    expect(statusRows.some((row) => row.newStatus === "frozen")).toBe(true);
    expect(statusRows.some((row) => row.newStatus === "closed")).toBe(true);
    expect(auditRows.some((row) => row.action === "asset.frozen")).toBe(true);
    expect(auditRows.some((row) => row.action === "asset.closed")).toBe(true);
  });

  it("prepares on-chain asset setup for a verified asset with issuer wallet binding", async () => {
    const issuer = await createUser({
      role: "issuer",
      telegramUserId: "issuer-onchain-prepare",
    });
    const admin = await createUser({
      role: "admin",
      telegramUserId: "admin-onchain-prepare",
    });
    await createActiveWalletBinding(issuer.id);

    const createdAsset = await createAssetDraftFixture(issuer);
    await issuerService.submitAssetForWorkflow(issuer, createdAsset.asset_id);
    await adminService.verifyAsset(admin, createdAsset.asset_id, {
      outcome: "approved",
      reason: "Approved",
      issues: [],
    });

    const payload = await issuerService.prepareOnchainSetup(issuer, createdAsset.asset_id, {
      metadata_uri: "https://example.com/metadata/asset.json",
    });

    expect(payload.metadata.kind).toBe("asset_setup");
    expect(payload.metadata.asset_id).toBe(createdAsset.asset_id);
    expect(payload.metadata.activate_sale).toBe(false);
  });
});
