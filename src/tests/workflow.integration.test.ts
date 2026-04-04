import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { assetSaleTerms, assets, claims, revenueEpochs, users, walletBindings } from "../db/schema";
import { adminService } from "../modules/admin/service";
import { assetsService } from "../modules/assets/service";
import { claimsService } from "../modules/claims/service";
import { investmentsService } from "../modules/investments/service";
import { issuerService } from "../modules/issuer/service";
import { meService } from "../modules/me/service";
import { transactionsService } from "../modules/transactions/service";
import { approveUserKyc, resetTestState } from "./helpers";

describe("workflow integration", () => {
  beforeEach(async () => {
    await resetTestState();
  });

  afterAll(async () => {
    await resetTestState();
  });

  it("runs issuer review, investment, revenue posting and claim flow", async () => {
    const [issuer, admin, investor] = await db
      .insert(users)
      .values([
        {
          telegramUserId: "issuer-1",
          displayName: "Issuer",
          role: "issuer",
        },
        {
          telegramUserId: "admin-1",
          displayName: "Admin",
          role: "admin",
        },
        {
          telegramUserId: "investor-1",
          displayName: "Investor",
          role: "investor",
        },
      ])
      .returning();

    await db.insert(walletBindings).values({
      userId: investor.id,
      walletAddress: "InvestorWallet1111111111111111111111111111",
      status: "active",
      verificationMessage: "signed",
      verifiedAt: new Date(),
    });
    await approveUserKyc(investor.id, admin.id);

    const createdAsset = await issuerService.createAssetDraft(issuer, {
      title: "Solar Rooftop A1",
      short_description: "Tokenized rooftop solar asset for integration testing",
      full_description:
        "Detailed rooftop solar asset used to verify the end-to-end integration workflow.",
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

    const reviewSubmission = await issuerService.submitAssetForWorkflow(
      issuer,
      createdAsset.asset_id,
    );
    expect(reviewSubmission.next_status).toBe("pending_review");

    const verified = await adminService.verifyAsset(admin, createdAsset.asset_id, {
      outcome: "approved",
      reason: "Integration review passed",
      issues: [],
    });
    expect(verified.resulting_status).toBe("verified");

    const saleActivation = await issuerService.submitAssetForWorkflow(
      issuer,
      createdAsset.asset_id,
    );
    expect(saleActivation.next_status).toBe("active_sale");

    const quote = await investmentsService.getQuote(investor, {
      asset_id: createdAsset.asset_id,
      amount_usdc: 100,
    });
    expect(quote.shares_to_receive).toBe(10);

    const preparedInvestment = await investmentsService.prepareInvestment(investor, {
      asset_id: createdAsset.asset_id,
      amount_usdc: 100,
    });

    const investmentConfirmation = await transactionsService.confirmTransaction(investor, {
      kind: "investment",
      operation_id: preparedInvestment.operation_id,
      transaction_signature: "sig-investment-1",
    });
    expect(investmentConfirmation.sync_status).toBe("confirmed");

    const publicAssets = await assetsService.listAssets({
      page: 1,
      limit: 20,
      sort: "newest",
    });
    expect(publicAssets.items).toHaveLength(1);

    const [fundedAsset, liveSaleTerms] = await Promise.all([
      db.select().from(assets).where(eq(assets.id, createdAsset.asset_id)).limit(1),
      db
        .select()
        .from(assetSaleTerms)
        .where(eq(assetSaleTerms.assetId, createdAsset.asset_id))
        .limit(1),
    ]);
    expect(fundedAsset[0]?.status).toBe("funded");
    expect(liveSaleTerms[0]?.saleStatus).toBe("completed");

    const createdRevenueEpoch = await issuerService.createRevenueEpoch(
      issuer,
      createdAsset.asset_id,
      {
        epoch_number: 1,
        period_start: "2026-03-01",
        period_end: "2026-03-31",
        gross_revenue_usdc: 2500,
        net_revenue_usdc: 2100,
        distributable_revenue_usdc: 1800,
        report_uri: "https://example.com/reports/epoch-1",
        report_hash: "sha256:epoch-1",
        source_type: "operator_statement",
      },
    );

    const preparedRevenuePost = await issuerService.prepareRevenuePosting(
      issuer,
      createdAsset.asset_id,
      createdRevenueEpoch.revenue_epoch_id,
    );

    const revenueConfirmation = await transactionsService.confirmTransaction(issuer, {
      kind: "revenue_post",
      operation_id: preparedRevenuePost.operation_id,
      transaction_signature: "sig-revenue-1",
    });
    expect(revenueConfirmation.sync_status).toBe("confirmed");

    const preparedClaim = await claimsService.prepareClaim(investor, {
      asset_id: createdAsset.asset_id,
      revenue_epoch_id: createdRevenueEpoch.revenue_epoch_id,
    });

    const claimConfirmation = await transactionsService.confirmTransaction(investor, {
      kind: "claim",
      operation_id: preparedClaim.operation_id,
      transaction_signature: "sig-claim-1",
    });
    expect(claimConfirmation.sync_status).toBe("confirmed");

    const portfolio = await meService.getPortfolio(investor.id);
    expect(portfolio.total_invested_usdc).toBe(100);
    expect(portfolio.total_claimed_usdc).toBe(1.8);
    expect(portfolio.positions[0]?.unclaimed_usdc).toBe(0);

    const claimHistory = await meService.getClaims(investor.id);
    expect(claimHistory.items).toHaveLength(1);
    expect(claimHistory.items[0]?.status).toBe("confirmed");

    const [postedRevenueEpoch, persistedClaim] = await Promise.all([
      db
        .select()
        .from(revenueEpochs)
        .where(eq(revenueEpochs.id, createdRevenueEpoch.revenue_epoch_id))
        .limit(1),
      db.select().from(claims).where(eq(claims.id, preparedClaim.operation_id)).limit(1),
    ]);
    expect(postedRevenueEpoch[0]?.status).toBe("posted");
    expect(persistedClaim[0]?.transactionSignature).toBe("sig-claim-1");
  });
});
