import { and, desc, eq, ne, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "../../db";
import { assetSaleTerms, assets, investments, users, walletBindings } from "../../db/schema";
import { ApiError } from "../../lib/api-error";
import { toMoneyString, toNumber, toShareAmountString } from "../shared/utils";
import type {
  investmentPrepareResponseSchema,
  investmentQuoteBodySchema,
  investmentQuoteResponseSchema,
} from "./contracts";
import { calculateRemainingShares, calculateSharesToReceive } from "./domain";

type InvestmentQuoteBody = z.infer<typeof investmentQuoteBodySchema>;
type InvestmentQuoteResponse = z.infer<typeof investmentQuoteResponseSchema>;
type InvestmentPrepareResponse = z.infer<typeof investmentPrepareResponseSchema>;

type InvestorActor = {
  id: string;
};

const getInvestableAsset = async (assetId: string) => {
  const [row] = await db
    .select({
      asset: assets,
      saleTerms: assetSaleTerms,
    })
    .from(assets)
    .innerJoin(assetSaleTerms, eq(assetSaleTerms.assetId, assets.id))
    .where(eq(assets.id, assetId))
    .limit(1);

  if (!row) {
    throw new ApiError(404, "ASSET_NOT_FOUND", "Asset not found");
  }

  if (row.asset.status !== "active_sale") {
    throw new ApiError(409, "ASSET_NOT_INVESTABLE", "Asset is not open for investment");
  }

  if (row.saleTerms.saleStatus !== "live") {
    throw new ApiError(409, "SALE_NOT_LIVE", "Sale is not live");
  }

  return row;
};

export class InvestmentsService {
  private async assertInvestorCanInvest(currentUser: InvestorActor) {
    const [user] = await db.select().from(users).where(eq(users.id, currentUser.id)).limit(1);

    if (!user) {
      throw new ApiError(404, "USER_NOT_FOUND", "User not found");
    }

    if (user.kycStatus !== "approved") {
      throw new ApiError(
        403,
        "KYC_APPROVAL_REQUIRED",
        "KYC approval is required before preparing an investment",
      );
    }

    return user;
  }

  async getQuote(
    _currentUser: InvestorActor,
    input: InvestmentQuoteBody,
  ): Promise<InvestmentQuoteResponse> {
    const { saleTerms } = await getInvestableAsset(input.asset_id);

    if (input.amount_usdc < toNumber(saleTerms.minimumBuyAmountUsdc)) {
      throw new ApiError(
        409,
        "MINIMUM_BUY_NOT_REACHED",
        "Investment amount is below the minimum buy amount",
      );
    }

    const sharesToReceive = calculateSharesToReceive(
      input.amount_usdc,
      toNumber(saleTerms.pricePerShareUsdc),
    );
    const [reservedSharesAggregate] = await db
      .select({
        total: sql<string>`coalesce(sum(${investments.sharesReceived}), 0)`,
      })
      .from(investments)
      .where(and(eq(investments.assetId, input.asset_id), ne(investments.status, "failed")));

    const remainingShares = calculateRemainingShares(
      saleTerms.totalShares,
      toNumber(reservedSharesAggregate?.total),
    );

    if (sharesToReceive > remainingShares + Number.EPSILON) {
      throw new ApiError(409, "SALE_CAP_EXCEEDED", "Not enough shares remain in this sale");
    }

    return {
      shares_to_receive: sharesToReceive,
      price_per_share_usdc: toNumber(saleTerms.pricePerShareUsdc),
      fees_usdc: 0,
    };
  }

  async prepareInvestment(
    currentUser: InvestorActor,
    input: InvestmentQuoteBody,
  ): Promise<InvestmentPrepareResponse> {
    await this.assertInvestorCanInvest(currentUser);
    const quote = await this.getQuote(currentUser, input);
    const [walletBinding] = await db
      .select()
      .from(walletBindings)
      .where(and(eq(walletBindings.userId, currentUser.id), eq(walletBindings.status, "active")))
      .limit(1);

    if (!walletBinding) {
      throw new ApiError(
        409,
        "ACTIVE_WALLET_REQUIRED",
        "An active wallet binding is required before preparing an investment",
      );
    }

    const investment = await db.transaction(async (tx) => {
      const [lockedInvestableAsset] = await tx
        .select({
          asset: assets,
          saleTerms: assetSaleTerms,
        })
        .from(assets)
        .innerJoin(assetSaleTerms, eq(assetSaleTerms.assetId, assets.id))
        .where(eq(assets.id, input.asset_id))
        .limit(1)
        .for("update");

      if (!lockedInvestableAsset) {
        throw new ApiError(404, "ASSET_NOT_FOUND", "Asset not found");
      }

      if (lockedInvestableAsset.asset.status !== "active_sale") {
        throw new ApiError(409, "ASSET_NOT_INVESTABLE", "Asset is not open for investment");
      }

      if (lockedInvestableAsset.saleTerms.saleStatus !== "live") {
        throw new ApiError(409, "SALE_NOT_LIVE", "Sale is not live");
      }

      const [existingPendingInvestment] = await tx
        .select()
        .from(investments)
        .where(
          and(
            eq(investments.userId, currentUser.id),
            eq(investments.assetId, input.asset_id),
            eq(investments.amountUsdc, toMoneyString(input.amount_usdc)),
            eq(investments.status, "pending"),
          ),
        )
        .orderBy(desc(investments.createdAt))
        .limit(1);

      if (existingPendingInvestment) {
        return existingPendingInvestment;
      }

      const [reservedSharesAggregate] = await Promise.all([
        tx
          .select({
            total: sql<string>`coalesce(sum(${investments.sharesReceived}), 0)`,
          })
          .from(investments)
          .where(and(eq(investments.assetId, input.asset_id), ne(investments.status, "failed")))
          .then((rows) => rows[0]),
      ]);

      const remainingShares = calculateRemainingShares(
        lockedInvestableAsset.saleTerms.totalShares,
        toNumber(reservedSharesAggregate?.total),
      );

      if (quote.shares_to_receive > remainingShares + Number.EPSILON) {
        throw new ApiError(409, "SALE_CAP_EXCEEDED", "Not enough shares remain in this sale");
      }

      const [inserted] = await tx
        .insert(investments)
        .values({
          userId: currentUser.id,
          assetId: input.asset_id,
          amountUsdc: toMoneyString(input.amount_usdc),
          sharesReceived: toShareAmountString(quote.shares_to_receive),
          status: "pending",
        })
        .returning();

      return inserted;
    });

    // TODO @waveofem: Replace this placeholder signing payload with a real Solana
    // investment transaction builder. Expected behavior:
    // 1. derive the correct asset/vault/mint accounts,
    // 2. construct the buy instruction with validated sale terms,
    // 3. return a transaction or message that the client signs,
    // 4. preserve the operation_id so off-chain confirmation can reconcile the result.
    return {
      success: true,
      operation_id: investment.id,
      signing_payload: {
        kind: "investment",
        asset_id: input.asset_id,
        amount_usdc: input.amount_usdc,
      },
      message: "Investment operation prepared and waiting for transaction confirmation",
    };
  }
}

export const investmentsService = new InvestmentsService();
