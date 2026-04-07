import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  type Asset,
  assetSaleTerms,
  assetStatusHistory,
  assets,
  auditLogs,
  claims,
  holdingsSnapshots,
  investments,
  jobExecutionLogs,
  revenueEpochs,
  users,
  walletBindings,
} from "../../db/schema";
import { ApiError } from "../../lib/api-error";
import { logger } from "../../lib/logger";
import {
  isValidSignature,
  type VerificationResult,
  verifyClaimTransaction,
  verifyInvestmentTransaction,
  verifyRevenuePostTransaction,
} from "../../lib/solana";
import { NotificationService } from "../notifications/service";
import { toNumber, toShareAmountString } from "../shared/utils";

type Actor = {
  id: string;
};

type DbExecutor = Pick<typeof db, "insert" | "select" | "update">;

const notificationsService = new NotificationService();

const createAuditLog = async (
  tx: DbExecutor,
  actorUserId: string | null,
  entityType: string,
  entityId: string,
  action: string,
  payloadJson?: Record<string, unknown>,
) => {
  await tx.insert(auditLogs).values({
    actorUserId,
    entityType,
    entityId,
    action,
    payloadJson,
  });
};

const appendStatusHistory = async (
  tx: DbExecutor,
  assetId: string,
  oldStatus: Asset["status"],
  newStatus: Asset["status"],
  changedByUserId: string | null,
  reason: string,
  transactionSignature?: string,
) => {
  if (oldStatus === newStatus) {
    return;
  }

  await tx.insert(assetStatusHistory).values({
    assetId,
    oldStatus,
    newStatus,
    changedByUserId,
    reason,
    transactionSignature: transactionSignature ?? null,
  });
};

const recalculateHoldingsSnapshot = async (
  tx: DbExecutor,
  userId: string,
  assetId: string,
  totalShares: number,
) => {
  const [confirmedInvestmentAggregate, existingSnapshot] = await Promise.all([
    tx
      .select({
        shares: sql<string>`coalesce(sum(${investments.sharesReceived}), 0)`,
      })
      .from(investments)
      .where(
        and(
          eq(investments.userId, userId),
          eq(investments.assetId, assetId),
          eq(investments.status, "confirmed"),
        ),
      ),
    tx
      .select()
      .from(holdingsSnapshots)
      .where(and(eq(holdingsSnapshots.userId, userId), eq(holdingsSnapshots.assetId, assetId)))
      .limit(1),
  ]);

  const sharesAmount = toNumber(confirmedInvestmentAggregate[0]?.shares);
  const sharesPercentage = totalShares > 0 ? sharesAmount / totalShares : 0;

  if (existingSnapshot[0]) {
    await tx
      .update(holdingsSnapshots)
      .set({
        sharesAmount: toShareAmountString(sharesAmount),
        sharesPercentage: sharesPercentage.toFixed(6),
        updatedAt: new Date(),
      })
      .where(eq(holdingsSnapshots.id, existingSnapshot[0].id));

    return;
  }

  await tx.insert(holdingsSnapshots).values({
    userId,
    assetId,
    sharesAmount: toShareAmountString(sharesAmount),
    sharesPercentage: sharesPercentage.toFixed(6),
  });
};

const maybeMarkAssetFunded = async (
  tx: DbExecutor,
  assetId: string,
  actorUserId: string | null,
  transactionSignature: string,
) => {
  const [asset, saleTerms, confirmedAmountAggregate] = await Promise.all([
    tx.select().from(assets).where(eq(assets.id, assetId)).limit(1),
    tx.select().from(assetSaleTerms).where(eq(assetSaleTerms.assetId, assetId)).limit(1),
    tx
      .select({
        total: sql<string>`coalesce(sum(${investments.amountUsdc}), 0)`,
      })
      .from(investments)
      .where(and(eq(investments.assetId, assetId), eq(investments.status, "confirmed"))),
  ]);

  const currentAsset = asset[0];
  const currentSaleTerms = saleTerms[0];

  if (!currentAsset || !currentSaleTerms || currentAsset.status !== "active_sale") {
    return;
  }

  const totalConfirmedAmount = toNumber(confirmedAmountAggregate[0]?.total);
  const targetRaise = toNumber(currentSaleTerms.targetRaiseUsdc);

  if (totalConfirmedAmount + Number.EPSILON < targetRaise) {
    return;
  }

  await tx
    .update(assets)
    .set({
      status: "funded",
      updatedAt: new Date(),
    })
    .where(eq(assets.id, assetId));

  await tx
    .update(assetSaleTerms)
    .set({
      saleStatus: "completed",
      updatedAt: new Date(),
    })
    .where(eq(assetSaleTerms.assetId, assetId));

  await appendStatusHistory(
    tx,
    assetId,
    currentAsset.status,
    "funded",
    actorUserId,
    "Funding target reached",
    transactionSignature,
  );

  await createAuditLog(tx, actorUserId, "asset", assetId, "asset.funded", {
    transaction_signature: transactionSignature,
    target_raise_usdc: targetRaise,
    total_confirmed_amount_usdc: totalConfirmedAmount,
  });

  await notificationsService.createForAssetUsers(tx, assetId, {
    type: "sale_completed",
    title: "Funding target reached",
    body: `${currentAsset.title} has completed its sale and moved to funded status.`,
    metadata: {
      asset_id: assetId,
      transaction_signature: transactionSignature,
    },
  });
};

export class SettlementService {
  /**
   * Helper to throw verification error as ApiError
   */
  private throwVerificationError(result: VerificationResult): never {
    if (result.valid) {
      throw new Error("Called throwVerificationError with valid result");
    }
    const { error } = result;
    throw new ApiError(400, `VERIFICATION_${error.code}`, error.message);
  }

  async confirmInvestment(actor: Actor | null, investmentId: string, transactionSignature: string) {
    const log = logger.child({ method: "confirmInvestment", investmentId, transactionSignature });

    // Validate signature format early
    if (!isValidSignature(transactionSignature)) {
      throw new ApiError(400, "INVALID_SIGNATURE", "Transaction signature format is invalid");
    }

    // Idempotency check: has this signature already been used?
    const [existingBySignature] = await db
      .select({ id: investments.id })
      .from(investments)
      .where(eq(investments.transactionSignature, transactionSignature))
      .limit(1);

    if (existingBySignature) {
      log.info({ existingId: existingBySignature.id }, "Transaction signature already used");
      return {
        success: true as const,
        sync_status: "already_confirmed" as const,
      };
    }

    // Fetch the investment
    const [currentInvestment] = await db
      .select()
      .from(investments)
      .where(eq(investments.id, investmentId))
      .limit(1);

    if (!currentInvestment) {
      throw new ApiError(404, "INVESTMENT_NOT_FOUND", "Investment not found");
    }

    if (actor && actor.id !== currentInvestment.userId) {
      const [currentActor] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, actor.id))
        .limit(1);

      if (currentActor?.role !== "admin") {
        throw new ApiError(403, "FORBIDDEN", "You cannot confirm this investment");
      }
    }

    if (currentInvestment.status === "confirmed") {
      return {
        success: true as const,
        sync_status: "confirmed" as const,
      };
    }

    if (currentInvestment.status !== "pending") {
      throw new ApiError(
        409,
        "INVALID_INVESTMENT_STATE",
        "Only pending investments can be confirmed",
      );
    }

    // Get user's wallet binding for verification
    const [walletBinding] = await db
      .select()
      .from(walletBindings)
      .where(
        and(
          eq(walletBindings.userId, currentInvestment.userId),
          eq(walletBindings.status, "active"),
        ),
      )
      .limit(1);

    if (!walletBinding) {
      throw new ApiError(400, "NO_WALLET_BINDING", "User has no active wallet binding");
    }

    // ON-CHAIN VERIFICATION
    log.info("Starting on-chain verification");
    const verificationResult = await verifyInvestmentTransaction(transactionSignature, {
      expectedSigner: walletBinding.walletAddress,
      assetId: currentInvestment.assetId,
      amountUsdc: toNumber(currentInvestment.amountUsdc),
      sharesToReceive: toNumber(currentInvestment.sharesReceived),
    });

    if (!verificationResult.valid) {
      log.warn({ error: verificationResult.error }, "On-chain verification failed");
      this.throwVerificationError(verificationResult);
    }

    log.info(
      { slot: verificationResult.slot, blockTime: verificationResult.blockTime },
      "On-chain verification passed",
    );

    // Fetch sale terms for shares calculation
    const [currentSaleTerms] = await db
      .select()
      .from(assetSaleTerms)
      .where(eq(assetSaleTerms.assetId, currentInvestment.assetId))
      .limit(1);

    if (!currentSaleTerms) {
      throw new ApiError(409, "SALE_TERMS_NOT_FOUND", "Asset sale terms are missing");
    }

    // Update database only after verification passes
    await db.transaction(async (tx) => {
      await tx
        .update(investments)
        .set({
          transactionSignature,
          status: "confirmed",
        })
        .where(and(eq(investments.id, currentInvestment.id), eq(investments.status, "pending")));

      await recalculateHoldingsSnapshot(
        tx,
        currentInvestment.userId,
        currentInvestment.assetId,
        currentSaleTerms.totalShares,
      );

      await createAuditLog(
        tx,
        actor?.id ?? currentInvestment.userId,
        "investment",
        currentInvestment.id,
        "investment.confirmed",
        {
          asset_id: currentInvestment.assetId,
          transaction_signature: transactionSignature,
          verification_slot: verificationResult.slot,
          verification_block_time: verificationResult.blockTime,
        },
      );

      await notificationsService.create(tx, currentInvestment.userId, {
        type: "investment_confirmed",
        title: "Investment confirmed",
        body: "Your investment has been confirmed and is reflected in your portfolio.",
        metadata: {
          asset_id: currentInvestment.assetId,
          investment_id: currentInvestment.id,
          transaction_signature: transactionSignature,
        },
      });

      await maybeMarkAssetFunded(
        tx,
        currentInvestment.assetId,
        actor?.id ?? currentInvestment.userId,
        transactionSignature,
      );
    });

    return {
      success: true as const,
      sync_status: "confirmed" as const,
    };
  }

  async confirmClaim(actor: Actor, claimId: string, transactionSignature: string) {
    const log = logger.child({ method: "confirmClaim", claimId, transactionSignature });

    // Validate signature format early
    if (!isValidSignature(transactionSignature)) {
      throw new ApiError(400, "INVALID_SIGNATURE", "Transaction signature format is invalid");
    }

    // Idempotency check: has this signature already been used?
    const [existingBySignature] = await db
      .select({ id: claims.id })
      .from(claims)
      .where(eq(claims.transactionSignature, transactionSignature))
      .limit(1);

    if (existingBySignature) {
      log.info({ existingId: existingBySignature.id }, "Transaction signature already used");
      return {
        success: true as const,
        sync_status: "already_confirmed" as const,
      };
    }

    const [claimRecord] = await db.select().from(claims).where(eq(claims.id, claimId)).limit(1);

    if (!claimRecord) {
      throw new ApiError(404, "CLAIM_NOT_FOUND", "Claim not found");
    }

    if (claimRecord.userId !== actor.id) {
      throw new ApiError(403, "FORBIDDEN", "You cannot confirm this claim");
    }

    if (claimRecord.status === "confirmed") {
      return {
        success: true as const,
        sync_status: "confirmed" as const,
      };
    }

    if (claimRecord.status !== "pending") {
      throw new ApiError(409, "INVALID_CLAIM_STATE", "Only pending claims can be confirmed");
    }

    // Get user's wallet binding for verification
    const [walletBinding] = await db
      .select()
      .from(walletBindings)
      .where(and(eq(walletBindings.userId, actor.id), eq(walletBindings.status, "active")))
      .limit(1);

    if (!walletBinding) {
      throw new ApiError(400, "NO_WALLET_BINDING", "User has no active wallet binding");
    }

    // Get revenue epoch for epoch number
    const [revenueEpoch] = await db
      .select()
      .from(revenueEpochs)
      .where(eq(revenueEpochs.id, claimRecord.revenueEpochId))
      .limit(1);

    if (!revenueEpoch) {
      throw new ApiError(404, "REVENUE_EPOCH_NOT_FOUND", "Revenue epoch not found");
    }

    // ON-CHAIN VERIFICATION
    log.info("Starting on-chain verification");
    const verificationResult = await verifyClaimTransaction(transactionSignature, {
      expectedSigner: walletBinding.walletAddress,
      assetId: claimRecord.assetId,
      epochNumber: revenueEpoch.epochNumber,
      claimAmountUsdc: toNumber(claimRecord.claimAmountUsdc),
    });

    if (!verificationResult.valid) {
      log.warn({ error: verificationResult.error }, "On-chain verification failed");
      this.throwVerificationError(verificationResult);
    }

    log.info(
      { slot: verificationResult.slot, blockTime: verificationResult.blockTime },
      "On-chain verification passed",
    );

    // Update database only after verification passes
    await db.transaction(async (tx) => {
      await tx
        .update(claims)
        .set({
          status: "confirmed",
          transactionSignature,
        })
        .where(and(eq(claims.id, claimId), eq(claims.status, "pending")));

      const [aggregateClaimed] = await tx
        .select({
          total: sql<string>`coalesce(sum(${claims.claimAmountUsdc}), 0)`,
        })
        .from(claims)
        .where(
          and(
            eq(claims.revenueEpochId, claimRecord.revenueEpochId),
            eq(claims.status, "confirmed"),
          ),
        );

      const totalClaimed = toNumber(aggregateClaimed?.total);
      const distributableRevenue = toNumber(revenueEpoch.distributableRevenueUsdc);

      if (
        totalClaimed + Number.EPSILON >= distributableRevenue &&
        revenueEpoch.status !== "settled"
      ) {
        await tx
          .update(revenueEpochs)
          .set({
            status: "settled",
            updatedAt: new Date(),
          })
          .where(eq(revenueEpochs.id, revenueEpoch.id));
      }

      await createAuditLog(tx, actor.id, "claim", claimRecord.id, "claim.confirmed", {
        asset_id: claimRecord.assetId,
        revenue_epoch_id: claimRecord.revenueEpochId,
        transaction_signature: transactionSignature,
        verification_slot: verificationResult.slot,
        verification_block_time: verificationResult.blockTime,
      });

      await notificationsService.create(tx, claimRecord.userId, {
        type: "system",
        title: "Claim confirmed",
        body: "Your yield claim has been confirmed.",
        metadata: {
          asset_id: claimRecord.assetId,
          claim_id: claimRecord.id,
          revenue_epoch_id: claimRecord.revenueEpochId,
          transaction_signature: transactionSignature,
        },
      });
    });

    return {
      success: true as const,
      sync_status: "confirmed" as const,
    };
  }

  async confirmRevenuePosting(actor: Actor, revenueEpochId: string, transactionSignature: string) {
    const log = logger.child({
      method: "confirmRevenuePosting",
      revenueEpochId,
      transactionSignature,
    });

    // Validate signature format early
    if (!isValidSignature(transactionSignature)) {
      throw new ApiError(400, "INVALID_SIGNATURE", "Transaction signature format is invalid");
    }

    // Idempotency check: has this signature already been used?
    const [existingBySignature] = await db
      .select({ id: revenueEpochs.id })
      .from(revenueEpochs)
      .where(eq(revenueEpochs.transactionSignature, transactionSignature))
      .limit(1);

    if (existingBySignature) {
      log.info({ existingId: existingBySignature.id }, "Transaction signature already used");
      return {
        success: true as const,
        sync_status: "already_confirmed" as const,
      };
    }

    const [revenueEpoch] = await db
      .select()
      .from(revenueEpochs)
      .where(eq(revenueEpochs.id, revenueEpochId))
      .limit(1);

    if (!revenueEpoch) {
      throw new ApiError(404, "REVENUE_EPOCH_NOT_FOUND", "Revenue epoch not found");
    }

    if (revenueEpoch.postedByUserId !== actor.id) {
      const [currentUser] = await db.select().from(users).where(eq(users.id, actor.id)).limit(1);
      if (currentUser?.role !== "admin") {
        throw new ApiError(403, "FORBIDDEN", "You cannot confirm this revenue posting");
      }
    }

    if (revenueEpoch.status === "posted" || revenueEpoch.status === "settled") {
      return {
        success: true as const,
        sync_status: "confirmed" as const,
      };
    }

    if (revenueEpoch.status !== "draft") {
      throw new ApiError(
        409,
        "INVALID_REVENUE_EPOCH_STATE",
        "Only draft revenue epochs can be confirmed for posting",
      );
    }

    // Get issuer's wallet binding for verification
    const [walletBinding] = await db
      .select()
      .from(walletBindings)
      .where(and(eq(walletBindings.userId, actor.id), eq(walletBindings.status, "active")))
      .limit(1);

    if (!walletBinding) {
      throw new ApiError(400, "NO_WALLET_BINDING", "User has no active wallet binding");
    }

    // ON-CHAIN VERIFICATION
    log.info("Starting on-chain verification");
    const verificationResult = await verifyRevenuePostTransaction(transactionSignature, {
      expectedSigner: walletBinding.walletAddress,
      assetId: revenueEpoch.assetId,
      epochNumber: revenueEpoch.epochNumber,
      amountUsdc: toNumber(revenueEpoch.grossRevenueUsdc),
    });

    if (!verificationResult.valid) {
      log.warn({ error: verificationResult.error }, "On-chain verification failed");
      this.throwVerificationError(verificationResult);
    }

    log.info(
      { slot: verificationResult.slot, blockTime: verificationResult.blockTime },
      "On-chain verification passed",
    );

    // Update database only after verification passes
    await db.transaction(async (tx) => {
      await tx
        .update(revenueEpochs)
        .set({
          status: "posted",
          transactionSignature,
          updatedAt: new Date(),
        })
        .where(eq(revenueEpochs.id, revenueEpochId));

      await createAuditLog(tx, actor.id, "revenue_epoch", revenueEpochId, "revenue_epoch.posted", {
        asset_id: revenueEpoch.assetId,
        transaction_signature: transactionSignature,
        verification_slot: verificationResult.slot,
        verification_block_time: verificationResult.blockTime,
      });

      await notificationsService.createForAssetUsers(tx, revenueEpoch.assetId, {
        type: "revenue_posted",
        title: "Revenue posted",
        body: "A new revenue epoch has been posted and may now be claimable.",
        metadata: {
          asset_id: revenueEpoch.assetId,
          revenue_epoch_id: revenueEpochId,
          transaction_signature: transactionSignature,
        },
      });
    });

    return {
      success: true as const,
      sync_status: "confirmed" as const,
    };
  }

  /**
   * Confirm a wallet binding (legacy flow).
   *
   * NOTE: The preferred flow is to use /api/v1/auth/wallet/challenge + /api/v1/auth/wallet/verify
   * which performs proper Ed25519 signature verification with anti-replay protection.
   * This method exists for backwards compatibility with transaction-based confirmation.
   */
  async confirmWalletBinding(actor: Actor, transactionSignature: string) {
    const [walletBinding] = await db
      .select()
      .from(walletBindings)
      .where(and(eq(walletBindings.userId, actor.id), eq(walletBindings.status, "pending")))
      .orderBy(desc(walletBindings.createdAt))
      .limit(1);

    if (!walletBinding) {
      throw new ApiError(404, "WALLET_BINDING_NOT_FOUND", "Pending wallet binding not found");
    }

    // Verify the stored verification message if present (basic check)
    if (!walletBinding.verificationMessage) {
      throw new ApiError(
        400,
        "MISSING_VERIFICATION_MESSAGE",
        "Wallet binding has no verification message. Use the /wallet/challenge flow instead.",
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .update(walletBindings)
        .set({
          status: "active",
          verifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(walletBindings.id, walletBinding.id));

      await tx
        .update(users)
        .set({
          walletAddress: walletBinding.walletAddress,
          updatedAt: new Date(),
        })
        .where(eq(users.id, actor.id));

      await createAuditLog(
        tx,
        actor.id,
        "wallet_binding",
        walletBinding.id,
        "wallet_binding.activated",
        {
          transaction_signature: transactionSignature,
          wallet_address: walletBinding.walletAddress,
          method: "legacy_transaction",
        },
      );
    });

    return {
      success: true as const,
      sync_status: "confirmed" as const,
    };
  }

  async runQueuedInvestmentConfirmation(investmentId: string, transactionSignature: string) {
    const jobName = "confirm-investment";
    const [jobLog] = await db
      .insert(jobExecutionLogs)
      .values({
        queueName: "relay",
        jobName,
        jobId: crypto.randomUUID(),
        payloadJson: {
          investment_id: investmentId,
          transaction_signature: transactionSignature,
        },
      })
      .returning({ id: jobExecutionLogs.id });

    try {
      const result = await this.confirmInvestment(null, investmentId, transactionSignature);

      await db
        .update(jobExecutionLogs)
        .set({
          status: "succeeded",
          resultJson: result,
          finishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(jobExecutionLogs.id, jobLog.id));

      return result;
    } catch (error) {
      logger.error(
        { error, investmentId, transactionSignature },
        "Queued investment confirmation failed",
      );

      await db
        .update(jobExecutionLogs)
        .set({
          status: "failed",
          errorMessage: error instanceof Error ? error.message : String(error),
          finishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(jobExecutionLogs.id, jobLog.id));

      throw error;
    }
  }
}

export const settlementService = new SettlementService();
