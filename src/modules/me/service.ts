import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "../../db";
import { assets, claims, holdingsSnapshots, investments, revenueEpochs } from "../../db/schema";
import type { meClaimsResponseSchema, mePortfolioResponseSchema } from "./contracts";
import { roundMoney } from "../shared/utils";

type MePortfolioResponse = z.infer<typeof mePortfolioResponseSchema>;
type MeClaimsResponse = z.infer<typeof meClaimsResponseSchema>;

const toNumber = (value: string | number | null | undefined) => Number(value ?? 0);

export class MeService {
  async getPortfolio(userId: string): Promise<MePortfolioResponse> {
    const positions = await db
      .select({
        assetId: holdingsSnapshots.assetId,
        title: assets.title,
        sharesAmount: holdingsSnapshots.sharesAmount,
        sharesPercentage: holdingsSnapshots.sharesPercentage,
      })
      .from(holdingsSnapshots)
      .innerJoin(assets, eq(assets.id, holdingsSnapshots.assetId))
      .where(eq(holdingsSnapshots.userId, userId))
      .orderBy(assets.title);

    const userAssetIds = positions.map((p) => p.assetId);

    const [investedAggregate, claimedAggregate, revenueRows, claimedByAssetRows] =
      await Promise.all([
        db
          .select({
            total: sql<string>`coalesce(sum(${investments.amountUsdc}), 0)`,
          })
          .from(investments)
          .where(and(eq(investments.userId, userId), eq(investments.status, "confirmed"))),
        db
          .select({
            total: sql<string>`coalesce(sum(${claims.claimAmountUsdc}), 0)`,
          })
          .from(claims)
          .where(and(eq(claims.userId, userId), eq(claims.status, "confirmed"))),
        userAssetIds.length > 0
          ? db
              .select({
                assetId: revenueEpochs.assetId,
                distributableRevenueUsdc: revenueEpochs.distributableRevenueUsdc,
              })
              .from(revenueEpochs)
              .where(
                and(
                  inArray(revenueEpochs.assetId, userAssetIds),
                  or(eq(revenueEpochs.status, "posted"), eq(revenueEpochs.status, "settled")),
                ),
              )
          : Promise.resolve([]),
        db
          .select({
            assetId: claims.assetId,
            claimAmountUsdc: claims.claimAmountUsdc,
          })
          .from(claims)
          .where(and(eq(claims.userId, userId), eq(claims.status, "confirmed"))),
      ]);

    const revenueByAsset = new Map<string, number>();
    const claimedByAsset = new Map<string, number>();

    for (const revenueRow of revenueRows) {
      revenueByAsset.set(
        revenueRow.assetId,
        (revenueByAsset.get(revenueRow.assetId) ?? 0) +
          toNumber(revenueRow.distributableRevenueUsdc),
      );
    }

    for (const claimedRow of claimedByAssetRows) {
      claimedByAsset.set(
        claimedRow.assetId,
        (claimedByAsset.get(claimedRow.assetId) ?? 0) + toNumber(claimedRow.claimAmountUsdc),
      );
    }

    const mappedPositions = positions.map((position) => {
      const sharesPercentage = toNumber(position.sharesPercentage);
      const grossEntitlement = roundMoney(
        (revenueByAsset.get(position.assetId) ?? 0) * sharesPercentage,
      );
      const confirmedClaims = roundMoney(claimedByAsset.get(position.assetId) ?? 0);
      const unclaimedUsdc = roundMoney(Math.max(grossEntitlement - confirmedClaims, 0));

      return {
        asset_id: position.assetId,
        title: position.title,
        shares_amount: toNumber(position.sharesAmount),
        shares_percentage: sharesPercentage,
        unclaimed_usdc: unclaimedUsdc,
      };
    });

    return {
      total_invested_usdc: toNumber(investedAggregate[0]?.total),
      total_claimed_usdc: toNumber(claimedAggregate[0]?.total),
      total_unclaimed_usdc: roundMoney(
        mappedPositions.reduce((sum, position) => sum + position.unclaimed_usdc, 0),
      ),
      positions: mappedPositions,
    };
  }

  async getClaims(userId: string): Promise<MeClaimsResponse> {
    const rows = await db
      .select({
        claimId: claims.id,
        assetId: claims.assetId,
        revenueEpochId: claims.revenueEpochId,
        claimAmountUsdc: claims.claimAmountUsdc,
        status: claims.status,
        transactionSignature: claims.transactionSignature,
      })
      .from(claims)
      .where(eq(claims.userId, userId))
      .orderBy(desc(claims.createdAt));

    return {
      items: rows.map((row) => ({
        claim_id: row.claimId,
        asset_id: row.assetId,
        revenue_epoch_id: row.revenueEpochId,
        claim_amount_usdc: toNumber(row.claimAmountUsdc),
        status: row.status,
        transaction_signature: row.transactionSignature,
      })),
    };
  }
}

export const meService = new MeService();
