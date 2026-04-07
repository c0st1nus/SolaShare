import { and, desc, eq, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "../../db";
import { claims, holdingsSnapshots, revenueEpochs, walletBindings } from "../../db/schema";
import { ApiError } from "../../lib/api-error";
import { prepareClaimTransaction } from "../../lib/solana";
import { toMoneyString, toNumber } from "../shared/utils";
import type { claimPrepareBodySchema, claimPrepareResponseSchema } from "./contracts";
import { calculateClaimableAmount, isRevenueClaimableStatus } from "./domain";

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
    const [holdingsRows, revenueEpochRows, confirmedClaimsAggregate, pendingClaimRows, walletRows] =
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
        db
          .select()
          .from(walletBindings)
          .where(
            and(eq(walletBindings.userId, currentUser.id), eq(walletBindings.status, "active")),
          )
          .limit(1),
      ]);
    const holding = holdingsRows[0];
    const revenueEpoch = revenueEpochRows[0];
    const existingPendingClaim = pendingClaimRows[0];
    const walletBinding = walletRows[0];

    if (!walletBinding) {
      throw new ApiError(
        409,
        "ACTIVE_WALLET_REQUIRED",
        "An active wallet binding is required to claim revenue",
      );
    }

    if (!holding) {
      throw new ApiError(409, "HOLDINGS_NOT_FOUND", "No holdings found for this asset");
    }

    if (!revenueEpoch || !isRevenueClaimableStatus(revenueEpoch.status)) {
      throw new ApiError(409, "REVENUE_NOT_CLAIMABLE", "Revenue epoch is not claimable");
    }

    const alreadyClaimed = toNumber(confirmedClaimsAggregate[0]?.total);
    const claimableAmount = calculateClaimableAmount(
      toNumber(revenueEpoch.distributableRevenueUsdc),
      toNumber(holding.sharesPercentage),
      alreadyClaimed,
    );

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

    // Build the Solana transaction for claimant signing
    const payload = await prepareClaimTransaction({
      operationId: claimRecord.id,
      assetId: input.asset_id,
      claimantWalletAddress: walletBinding.walletAddress,
      epochNumber: revenueEpoch.epochNumber,
      claimAmountUsdc: claimableAmount,
      revenueEpochId: input.revenue_epoch_id,
    });

    return payload as ClaimPrepareResponse;
  }
}

export const claimsService = new ClaimsService();
