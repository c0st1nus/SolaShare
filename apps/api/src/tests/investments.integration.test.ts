import { beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { investments } from "../db/schema";
import type { ApiError } from "../lib/api-error";
import { investmentsService } from "../modules/investments/service";
import {
  approveUserKyc,
  createActiveSaleAsset,
  createActiveWalletBinding,
  createUser,
  initializeAssetOnchainFixture,
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
    await initializeAssetOnchainFixture(asset.id);

    await expect(
      investmentsService.prepareInvestment(investor, {
        asset_id: asset.id,
        amount_usdc: 100,
      }),
    ).rejects.toMatchObject({
      code: "ACTIVE_WALLET_REQUIRED",
      status: 409,
    } satisfies Partial<ApiError>);
  });

  it("rejects preparing an investment when asset is not initialized on-chain", async () => {
    const issuer = await createUser({
      role: "issuer",
      telegramUserId: "issuer-onchain-required",
    });
    const admin = await createUser({
      role: "admin",
      telegramUserId: "admin-onchain-required",
    });
    const investor = await createUser({
      role: "investor",
      telegramUserId: "investor-onchain-required",
    });
    await approveUserKyc(investor.id, admin.id);
    await createActiveWalletBinding(investor.id);
    const { asset } = await createActiveSaleAsset(issuer, admin);

    await expect(
      investmentsService.prepareInvestment(investor, {
        asset_id: asset.id,
        amount_usdc: 100,
      }),
    ).rejects.toMatchObject({
      code: "ASSET_ONCHAIN_SETUP_REQUIRED",
      status: 409,
    } satisfies Partial<ApiError>);
  });

  it("creates a pending investment during prepare for an initialized asset", async () => {
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
    await initializeAssetOnchainFixture(asset.id);

    const preparedInvestment = await investmentsService.prepareInvestment(investor, {
      asset_id: asset.id,
      amount_usdc: 100,
    });

    const rows = await db
      .select()
      .from(investments)
      .where(eq(investments.id, preparedInvestment.operation_id));

    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("pending");
    expect(rows[0]?.amountUsdc).toBe("100.000000");
    expect(preparedInvestment.metadata.kind).toBe("investment");
    expect(preparedInvestment.metadata.asset_id).toBe(asset.id);
    expect(preparedInvestment.metadata.amount_usdc).toBe(100);
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
