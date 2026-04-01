import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "../../db";
import {
  assets,
  auditLogs,
  authIdentities,
  claims,
  holdingsSnapshots,
  investments,
  revenueEpochs,
  users,
  verificationRequests,
} from "../../db/schema";
import { ApiError } from "../../lib/api-error";
import { roundMoney } from "../shared/utils";
import type {
  meClaimsResponseSchema,
  meKycSubmitBodySchema,
  meKycSubmitResponseSchema,
  mePortfolioResponseSchema,
  meProfileResponseSchema,
  meProfileUpdateBodySchema,
} from "./contracts";

type MePortfolioResponse = z.infer<typeof mePortfolioResponseSchema>;
type MeClaimsResponse = z.infer<typeof meClaimsResponseSchema>;
type MeProfileResponse = z.infer<typeof meProfileResponseSchema>;
type MeProfileUpdateBody = z.infer<typeof meProfileUpdateBodySchema>;
type MeKycSubmitBody = z.infer<typeof meKycSubmitBodySchema>;
type MeKycSubmitResponse = z.infer<typeof meKycSubmitResponseSchema>;

const toNumber = (value: string | number | null | undefined) => Number(value ?? 0);

export class MeService {
  private async loadProfile(userId: string): Promise<MeProfileResponse["user"]> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      throw new ApiError(404, "USER_NOT_FOUND", "User not found");
    }

    const providerRows = await db
      .select({
        provider: authIdentities.provider,
        email: authIdentities.email,
      })
      .from(authIdentities)
      .where(eq(authIdentities.userId, userId));

    const email = providerRows.find((row) => row.email)?.email ?? null;

    return {
      id: user.id,
      email,
      display_name: user.displayName ?? email ?? "SolaShare User",
      bio: user.bio ?? null,
      avatar_url: user.avatarUrl ?? null,
      role: user.role,
      kyc_status: user.kycStatus,
      auth_providers: [...new Set(providerRows.map((row) => row.provider))].sort() as Array<
        "password" | "google" | "telegram"
      >,
    };
  }

  async getProfile(userId: string): Promise<MeProfileResponse> {
    return {
      user: await this.loadProfile(userId),
    };
  }

  async updateProfile(userId: string, input: MeProfileUpdateBody): Promise<MeProfileResponse> {
    const [existingUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!existingUser) {
      throw new ApiError(404, "USER_NOT_FOUND", "User not found");
    }

    await db
      .update(users)
      .set({
        displayName: input.display_name ?? existingUser.displayName,
        bio: input.bio === undefined ? existingUser.bio : input.bio === null ? null : input.bio,
        avatarUrl:
          input.avatar_url === undefined
            ? existingUser.avatarUrl
            : input.avatar_url === null
              ? null
              : input.avatar_url,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await db.insert(auditLogs).values({
      actorUserId: userId,
      entityType: "user",
      entityId: userId,
      action: "user.profile.updated",
      payloadJson: {
        display_name: input.display_name ?? undefined,
        bio_updated: input.bio !== undefined,
        avatar_url_updated: input.avatar_url !== undefined,
      },
    });

    return this.getProfile(userId);
  }

  async submitKyc(userId: string, input: MeKycSubmitBody): Promise<MeKycSubmitResponse> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      throw new ApiError(404, "USER_NOT_FOUND", "User not found");
    }

    if (user.kycStatus === "approved") {
      throw new ApiError(409, "KYC_ALREADY_APPROVED", "KYC is already approved");
    }

    if (user.kycStatus === "pending") {
      throw new ApiError(409, "KYC_ALREADY_PENDING", "KYC review is already pending");
    }

    const verificationRequest = await db.transaction(async (tx) => {
      const [insertedRequest] = await tx
        .insert(verificationRequests)
        .values({
          requestedByUserId: userId,
          requestType: "kyc_review",
          status: "pending",
          payloadJson: {
            document_uri: input.document_uri,
            document_hash: input.document_hash,
            notes: input.notes ?? null,
          },
        })
        .returning();

      await tx
        .update(users)
        .set({
          kycStatus: "pending",
          kycSubmittedAt: new Date(),
          kycReviewedAt: null,
          kycDecisionNotes: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      await tx.insert(auditLogs).values({
        actorUserId: userId,
        entityType: "user",
        entityId: userId,
        action: "user.kyc.submitted",
        payloadJson: {
          verification_request_id: insertedRequest.id,
          document_uri: input.document_uri,
        },
      });

      return insertedRequest;
    });

    return {
      success: true,
      kyc_status: "pending",
      verification_request_id: verificationRequest.id,
    };
  }

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
