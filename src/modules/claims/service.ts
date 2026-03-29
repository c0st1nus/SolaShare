import { and, desc, eq, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "../../db";
import { claims, holdingsSnapshots, revenueEpochs } from "../../db/schema";
import { ApiError } from "../../lib/api-error";
import { roundMoney, toMoneyString, toNumber } from "../shared/utils";
import type { claimPrepareBodySchema, claimPrepareResponseSchema } from "./contracts";

type ClaimPrepareBody = z.infer<typeof claimPrepareBodySchema>;
type ClaimPrepareResponse = z.infer<typeof claimPrepareResponseSchema>;

type InvestorActor = {
  id: string;
};

export class ClaimsService {
  async prepareClaim(
    currentUser: InvestorActor,
    input: ClaimPrepareBody,
  ): Promise<ClaimPrepareResponse> {
    const [holdingsRows, revenueEpochRows, confirmedClaimsAggregate, pendingClaimRows] =
      await Promise.all([
        db
          .select()
          .from(holdingsSnapshots)
          .where(
            and(
              eq(holdingsSnapshots.userId, currentUser.id),
              eq(holdingsSnapshots.assetId, input.asset_id),
            ),
          )
          .limit(1),
        db
          .select()
          .from(revenueEpochs)
          .where(
            and(
              eq(revenueEpochs.id, input.revenue_epoch_id),
              eq(revenueEpochs.assetId, input.asset_id),
            ),
          )
          .limit(1),
        db
          .select({
            total: sql<string>`coalesce(sum(${claims.claimAmountUsdc}), 0)`,
          })
          .from(claims)
          .where(
            and(
              eq(claims.userId, currentUser.id),
              eq(claims.assetId, input.asset_id),
              eq(claims.revenueEpochId, input.revenue_epoch_id),
              eq(claims.status, "confirmed"),
            ),
          ),
        db
          .select()
          .from(claims)
          .where(
            and(
              eq(claims.userId, currentUser.id),
              eq(claims.assetId, input.asset_id),
              eq(claims.revenueEpochId, input.revenue_epoch_id),
              eq(claims.status, "pending"),
            ),
          )
          .orderBy(desc(claims.createdAt))
          .limit(1),
      ]);
    const holding = holdingsRows[0];
    const revenueEpoch = revenueEpochRows[0];
    const existingPendingClaim = pendingClaimRows[0];

    if (!holding) {
      throw new ApiError(409, "HOLDINGS_NOT_FOUND", "No holdings found for this asset");
    }

    if (!revenueEpoch || (revenueEpoch.status !== "posted" && revenueEpoch.status !== "settled")) {
      throw new ApiError(409, "REVENUE_NOT_CLAIMABLE", "Revenue epoch is not claimable");
    }

    const entitlement = roundMoney(
      toNumber(revenueEpoch.distributableRevenueUsdc) * toNumber(holding.sharesPercentage),
    );
    const alreadyClaimed = toNumber(confirmedClaimsAggregate[0]?.total);
    const claimableAmount = roundMoney(entitlement - alreadyClaimed);

    if (claimableAmount <= 0) {
      throw new ApiError(409, "NOTHING_TO_CLAIM", "There is no remaining claimable balance");
    }

    const claimRecord =
      existingPendingClaim ??
      (
        await db
          .insert(claims)
          .values({
            userId: currentUser.id,
            assetId: input.asset_id,
            revenueEpochId: input.revenue_epoch_id,
            claimAmountUsdc: toMoneyString(claimableAmount),
            status: "pending",
          })
          .returning()
      )[0];

    // TODO @waveofem: Replace this placeholder signing payload with a real Solana
    // claim transaction flow. Expected behavior:
    // 1. validate entitlement against on-chain holder state,
    // 2. build the claim instruction for the selected revenue epoch,
    // 3. ensure double-claim protection at the program level,
    // 4. return a signable transaction/message tied to operation_id.
    return {
      success: true,
      operation_id: claimRecord.id,
      signing_payload: {
        kind: "claim",
        asset_id: input.asset_id,
        revenue_epoch_id: input.revenue_epoch_id,
      },
      message: "Claim operation prepared and waiting for transaction confirmation",
    };
  }
}

export const claimsService = new ClaimsService();
