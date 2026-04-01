import { beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { assets, holdingsSnapshots, investments } from "../db/schema";
import { ApiError } from "../lib/api-error";
import { investmentsService } from "../modules/investments/service";
import { meService } from "../modules/me/service";
import { transactionsService } from "../modules/transactions/service";
import {
  approveUserKyc,
  createActiveSaleAsset,
  createActiveWalletBinding,
  createUser,
  resetTestState,
} from "./helpers";

describe("investments integration", () => {
  beforeEach(async () => {
    await resetTestState();
  });

  it("calculates a quote from live sale terms", async () => {
    const issuer = await createUser({
      role: "issuer",
      telegramUserId: "issuer-invest-quote",
    });
    const admin = await createUser({
      role: "admin",
      telegramUserId: "admin-invest-quote",
    });
    const investor = await createUser({
      role: "investor",
      telegramUserId: "investor-invest-quote",
    });
    await approveUserKyc(investor.id, admin.id);
    await createActiveWalletBinding(investor.id);
    const { asset } = await createActiveSaleAsset(issuer, admin, {
      saleTerms: {
        price_per_share_usdc: 12.5,
      },
    });

    const quote = await investmentsService.getQuote(investor, {
      asset_id: asset.id,
      amount_usdc: 125,
    });

    expect(quote.shares_to_receive).toBe(10);
    expect(quote.price_per_share_usdc).toBe(12.5);
  });

  it("rejects preparing an investment without an active wallet", async () => {
    const issuer = await createUser({
      role: "issuer",
      telegramUserId: "issuer-no-wallet",
    });
    const admin = await createUser({
      role: "admin",
      telegramUserId: "admin-no-wallet",
    });
    const investor = await createUser({
      role: "investor",
      telegramUserId: "investor-no-wallet",
    });
    await approveUserKyc(investor.id, admin.id);
    const { asset } = await createActiveSaleAsset(issuer, admin);

    await expect(
      investmentsService.prepareInvestment(investor, {
        asset_id: asset.id,
        amount_usdc: 100,
      }),
    ).rejects.toThrow(ApiError);
  });

  it("creates a pending investment during prepare", async () => {
    const issuer = await createUser({
      role: "issuer",
      telegramUserId: "issuer-pending-invest",
    });
    const admin = await createUser({
      role: "admin",
      telegramUserId: "admin-pending-invest",
    });
    const investor = await createUser({
      role: "investor",
      telegramUserId: "investor-pending-invest",
    });
    await approveUserKyc(investor.id, admin.id);
    await createActiveWalletBinding(investor.id);
    const { asset } = await createActiveSaleAsset(issuer, admin);

    const preparedInvestment = await investmentsService.prepareInvestment(investor, {
      asset_id: asset.id,
      amount_usdc: 100,
    });

    const [investment] = await db
      .select()
      .from(investments)
      .where(eq(investments.id, preparedInvestment.operation_id))
      .limit(1);

    expect(investment?.status).toBe("pending");
    expect(investment?.amountUsdc).toBe("100.000000");
  });

  it("prepares and confirms an investment, updating holdings and portfolio", async () => {
    const issuer = await createUser({
      role: "issuer",
      telegramUserId: "issuer-confirm-invest",
    });
    const admin = await createUser({
      role: "admin",
      telegramUserId: "admin-confirm-invest",
    });
    const investor = await createUser({
      role: "investor",
      telegramUserId: "investor-confirm-invest",
    });
    await approveUserKyc(investor.id, admin.id);
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

    const confirmation = await transactionsService.confirmTransaction(investor, {
      kind: "investment",
      operation_id: preparedInvestment.operation_id,
      transaction_signature: "investment-signature",
    });

    expect(confirmation.sync_status).toBe("confirmed");

    const [investment, holding, refreshedAsset, portfolio] = await Promise.all([
      db
        .select()
        .from(investments)
        .where(eq(investments.id, preparedInvestment.operation_id))
        .limit(1),
      db.select().from(holdingsSnapshots).where(eq(holdingsSnapshots.assetId, asset.id)).limit(1),
      db.select().from(assets).where(eq(assets.id, asset.id)).limit(1),
      meService.getPortfolio(investor.id),
    ]);

    expect(investment[0]?.status).toBe("confirmed");
    expect(holding[0]?.sharesAmount).toBe("10.000000000000");
    expect(refreshedAsset[0]?.status).toBe("funded");
    expect(portfolio.total_invested_usdc).toBe(100);
  });

  it("treats repeated confirmation as idempotent", async () => {
    const issuer = await createUser({
      role: "issuer",
      telegramUserId: "issuer-idempotent-invest",
    });
    const admin = await createUser({
      role: "admin",
      telegramUserId: "admin-idempotent-invest",
    });
    const investor = await createUser({
      role: "investor",
      telegramUserId: "investor-idempotent-invest",
    });
    await approveUserKyc(investor.id, admin.id);
    await createActiveWalletBinding(investor.id);
    const { asset } = await createActiveSaleAsset(issuer, admin);

    const preparedInvestment = await investmentsService.prepareInvestment(investor, {
      asset_id: asset.id,
      amount_usdc: 100,
    });

    await transactionsService.confirmTransaction(investor, {
      kind: "investment",
      operation_id: preparedInvestment.operation_id,
      transaction_signature: "investment-signature",
    });
    const repeated = await transactionsService.confirmTransaction(investor, {
      kind: "investment",
      operation_id: preparedInvestment.operation_id,
      transaction_signature: "investment-signature",
    });

    expect(repeated.sync_status).toBe("confirmed");
    const rows = await db
      .select()
      .from(investments)
      .where(eq(investments.id, preparedInvestment.operation_id));
    expect(rows).toHaveLength(1);
  });

  it("rejects preparing an investment before KYC approval", async () => {
    const issuer = await createUser({
      role: "issuer",
      telegramUserId: "issuer-no-kyc",
    });
    const admin = await createUser({
      role: "admin",
      telegramUserId: "admin-no-kyc",
    });
    const investor = await createUser({
      role: "investor",
      telegramUserId: "investor-no-kyc",
    });
    await createActiveWalletBinding(investor.id);
    const { asset } = await createActiveSaleAsset(issuer, admin);

    await expect(
      investmentsService.prepareInvestment(investor, {
        asset_id: asset.id,
        amount_usdc: 100,
      }),
    ).rejects.toMatchObject({
      code: "KYC_APPROVAL_REQUIRED",
      status: 403,
    });
  });
});
