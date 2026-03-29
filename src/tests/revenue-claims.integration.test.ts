import { beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { claims, revenueEpochs } from "../db/schema";
import { ApiError } from "../lib/api-error";
import { claimsService } from "../modules/claims/service";
import { investmentsService } from "../modules/investments/service";
import { issuerService } from "../modules/issuer/service";
import { meService } from "../modules/me/service";
import { transactionsService } from "../modules/transactions/service";
import {
  createActiveSaleAsset,
  createActiveWalletBinding,
  createUser,
  resetTestState,
} from "./helpers";

describe("revenue and claims integration", () => {
  beforeEach(async () => {
    await resetTestState();
  });

  it("creates and confirms a revenue epoch", async () => {
    const issuer = await createUser({
      role: "issuer",
      telegramUserId: "issuer-revenue-1",
    });
    const admin = await createUser({
      role: "admin",
      telegramUserId: "admin-revenue-1",
    });
    const { asset } = await createActiveSaleAsset(issuer, admin);

    const epoch = await issuerService.createRevenueEpoch(issuer, asset.id, {
      epoch_number: 1,
      period_start: "2026-03-01",
      period_end: "2026-03-31",
      gross_revenue_usdc: 1000,
      net_revenue_usdc: 800,
      distributable_revenue_usdc: 700,
      report_uri: "https://example.com/revenue/1",
      report_hash: "sha256:epoch1",
      source_type: "operator_statement",
    });

    const prepared = await issuerService.prepareRevenuePosting(
      issuer,
      asset.id,
      epoch.revenue_epoch_id,
    );
    const result = await transactionsService.confirmTransaction(issuer, {
      kind: "revenue_post",
      operation_id: prepared.operation_id,
      transaction_signature: "revenue-signature",
    });

    expect(result.sync_status).toBe("confirmed");

    const [persistedEpoch] = await db
      .select()
      .from(revenueEpochs)
      .where(eq(revenueEpochs.id, epoch.revenue_epoch_id))
      .limit(1);
    expect(persistedEpoch?.status).toBe("posted");
  });

  it("rejects claims when the investor has no holdings or revenue is not claimable", async () => {
    const investor = await createUser({
      role: "investor",
      telegramUserId: "investor-no-holdings",
    });

    await expect(
      claimsService.prepareClaim(investor, {
        asset_id: crypto.randomUUID(),
        revenue_epoch_id: crypto.randomUUID(),
      }),
    ).rejects.toThrow(ApiError);
  });

  it("prepares and confirms a claim from posted revenue", async () => {
    const issuer = await createUser({
      role: "issuer",
      telegramUserId: "issuer-claim",
    });
    const admin = await createUser({
      role: "admin",
      telegramUserId: "admin-claim",
    });
    const investor = await createUser({
      role: "investor",
      telegramUserId: "investor-claim",
    });
    await createActiveWalletBinding(investor.id);
    const { asset } = await createActiveSaleAsset(issuer, admin, {
      saleTerms: {
        target_raise_usdc: 100,
      },
    });

    const preparedInvestment = await investmentsService.prepareInvestment(investor, {
      asset_id: asset.id,
      amount_usdc: 100,
    });
    await transactionsService.confirmTransaction(investor, {
      kind: "investment",
      operation_id: preparedInvestment.operation_id,
      transaction_signature: "investment-for-claim",
    });

    const epoch = await issuerService.createRevenueEpoch(issuer, asset.id, {
      epoch_number: 1,
      period_start: "2026-03-01",
      period_end: "2026-03-31",
      gross_revenue_usdc: 2500,
      net_revenue_usdc: 2100,
      distributable_revenue_usdc: 1800,
      report_uri: "https://example.com/revenue/claim",
      report_hash: "sha256:claim",
      source_type: "operator_statement",
    });
    const preparedRevenuePost = await issuerService.prepareRevenuePosting(
      issuer,
      asset.id,
      epoch.revenue_epoch_id,
    );
    await transactionsService.confirmTransaction(issuer, {
      kind: "revenue_post",
      operation_id: preparedRevenuePost.operation_id,
      transaction_signature: "revenue-post-for-claim",
    });

    const preparedClaim = await claimsService.prepareClaim(investor, {
      asset_id: asset.id,
      revenue_epoch_id: epoch.revenue_epoch_id,
    });
    const claimConfirmation = await transactionsService.confirmTransaction(investor, {
      kind: "claim",
      operation_id: preparedClaim.operation_id,
      transaction_signature: "claim-signature",
    });

    expect(claimConfirmation.sync_status).toBe("confirmed");

    const [claimRow, portfolio] = await Promise.all([
      db.select().from(claims).where(eq(claims.id, preparedClaim.operation_id)).limit(1),
      meService.getPortfolio(investor.id),
    ]);

    expect(claimRow[0]?.status).toBe("confirmed");
    expect(portfolio.total_claimed_usdc).toBe(1.8);
    expect(portfolio.positions[0]?.unclaimed_usdc).toBe(0);

    await expect(
      claimsService.prepareClaim(investor, {
        asset_id: asset.id,
        revenue_epoch_id: epoch.revenue_epoch_id,
      }),
    ).rejects.toThrow(ApiError);
  });
});
