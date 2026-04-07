import { beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../db";
import {
  assetDocuments,
  assets,
  claims,
  holdingsSnapshots,
  investments,
  revenueEpochs,
} from "../db/schema";
import { ApiError } from "../lib/api-error";
import { assetsService } from "../modules/assets/service";
import { issuerService } from "../modules/issuer/service";
import { createActiveSaleAsset, createUser, resetTestState } from "./helpers";

describe("assets integration", () => {
  beforeEach(async () => {
    await resetTestState();
  });

  it("lists public assets with filters and sorting", async () => {
    const issuer = await createUser({
      role: "issuer",
      telegramUserId: "issuer-assets-list",
    });
    const admin = await createUser({
      role: "admin",
      telegramUserId: "admin-assets-list",
    });
    const first = await createActiveSaleAsset(issuer, admin, {
      title: "Alpha Asset",
    });
    const second = await createActiveSaleAsset(issuer, admin, {
      title: "Beta Asset",
      energyType: "wind",
      saleTerms: {
        price_per_share_usdc: 20,
      },
    });

    await db
      .update(assets)
      .set({
        expectedAnnualYieldPercent: "8.5000",
      })
      .where(eq(assets.id, first.asset.id));
    await db
      .update(assets)
      .set({
        expectedAnnualYieldPercent: "12.5000",
      })
      .where(eq(assets.id, second.asset.id));

    const byYield = await assetsService.listAssets({
      page: 1,
      limit: 20,
      sort: "yield_desc",
    });
    const byPrice = await assetsService.listAssets({
      page: 1,
      limit: 20,
      sort: "price_asc",
    });
    const byEnergyType = await assetsService.listAssets({
      page: 1,
      limit: 20,
      energy_type: "wind",
      sort: "newest",
    });
    const byStatus = await assetsService.listAssets({
      page: 1,
      limit: 20,
      status: "active_sale",
      sort: "newest",
    });

    expect(byYield.items[0]?.id).toBe(second.asset.id);
    expect(byPrice.items[0]?.id).toBe(first.asset.id);
    expect(byEnergyType.items.map((item) => item.id)).toEqual([second.asset.id]);
    expect(byStatus.items).toHaveLength(2);
  });

  it("hides non-public assets from the public read model", async () => {
    const issuer = await createUser({
      role: "issuer",
      telegramUserId: "issuer-assets-hidden",
    });
    const draft = await db
      .insert(assets)
      .values({
        slug: "draft-asset",
        title: "Draft Asset",
        shortDescription: "Draft asset",
        fullDescription: "Draft asset that should not appear in public reads.",
        energyType: "solar",
        issuerUserId: issuer.id,
        locationCountry: "Kazakhstan",
        capacityKw: "10.000",
        status: "draft",
      })
      .returning();

    const draftAsset = draft[0];

    if (!draftAsset) {
      throw new Error("Expected draft asset fixture to be created");
    }

    await expect(assetsService.getAsset(draftAsset.id)).rejects.toThrow(ApiError);
  });

  it("returns only public documents and aggregate holders summary", async () => {
    const issuer = await createUser({
      role: "issuer",
      telegramUserId: "issuer-assets-docs",
    });
    const admin = await createUser({
      role: "admin",
      telegramUserId: "admin-assets-docs",
    });
    const investor = await createUser({
      role: "investor",
      telegramUserId: "investor-assets-docs",
    });
    const { asset, saleTerms } = await createActiveSaleAsset(issuer, admin);

    await db.insert(assetDocuments).values({
      assetId: asset.id,
      type: "other",
      title: "Private internal note",
      storageProvider: "s3",
      storageUri: "https://example.com/private-note",
      contentHash: "sha256:private",
      uploadedByUserId: issuer.id,
      isPublic: false,
    });

    await db.insert(holdingsSnapshots).values({
      userId: investor.id,
      assetId: asset.id,
      sharesAmount: "10.000000000000",
      sharesPercentage: "0.001000",
    });
    await db.insert(investments).values({
      userId: investor.id,
      assetId: asset.id,
      amountUsdc: "100.000000",
      sharesReceived: "10.000000000000",
      status: "confirmed",
    });
    const [epoch] = await db
      .insert(revenueEpochs)
      .values({
        assetId: asset.id,
        epochNumber: 1,
        periodStart: "2026-03-01",
        periodEnd: "2026-03-31",
        grossRevenueUsdc: "1000.000000",
        netRevenueUsdc: "800.000000",
        distributableRevenueUsdc: "500.000000",
        reportUri: "https://example.com/reports/1",
        reportHash: "sha256:report",
        sourceType: "operator_statement",
        postedByUserId: issuer.id,
        status: "posted",
      })
      .returning();
    await db.insert(claims).values({
      userId: investor.id,
      assetId: asset.id,
      revenueEpochId: epoch.id,
      claimAmountUsdc: "12.000000",
      status: "confirmed",
    });

    const documents = await assetsService.getAssetDocuments(asset.id);
    const holdersSummary = await assetsService.getAssetHoldersSummary(asset.id);

    expect(documents.items.every((item) => item.is_public)).toBe(true);
    expect(holdersSummary.total_investors).toBe(1);
    expect(holdersSummary.total_claimed_usdc).toBe(12);
    expect(holdersSummary.funded_percent).toBe(2);
    expect(saleTerms.totalShares).toBe(10000);
  });

  it("hides an active sale asset when the issuer disables marketplace visibility", async () => {
    const issuer = await createUser({
      role: "issuer",
      telegramUserId: "issuer-assets-visibility-toggle",
    });
    const admin = await createUser({
      role: "admin",
      telegramUserId: "admin-assets-visibility-toggle",
    });
    const { asset } = await createActiveSaleAsset(issuer, admin);

    const beforeHide = await assetsService.listAssets({
      page: 1,
      limit: 20,
      sort: "newest",
    });
    expect(beforeHide.items.some((item) => item.id === asset.id)).toBe(true);

    await issuerService.updateAssetVisibility(issuer, asset.id, {
      is_publicly_visible: false,
    });

    const afterHide = await assetsService.listAssets({
      page: 1,
      limit: 20,
      sort: "newest",
    });

    expect(afterHide.items.some((item) => item.id === asset.id)).toBe(false);
    await expect(assetsService.getAsset(asset.id)).rejects.toThrow(ApiError);
  });
});
