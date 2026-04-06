import { and, count, countDistinct, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "../../db";
import {
  assetDocuments,
  assetSaleTerms,
  assetStatusHistory,
  assets,
  auditLogs,
  authIdentities,
  claims,
  investments,
  passwordCredentials,
  revenueDeposits,
  revenueEpochs,
  users,
  verificationDecisions,
  verificationRequests,
} from "../../db/schema";
import { ApiError } from "../../lib/api-error";
import { NotificationService } from "../notifications/service";
import type {
  adminAssetActionResponseSchema,
  adminAssetDetailSchema,
  adminAssetsQuerySchema,
  adminAssetsResponseSchema,
  adminCreateUserBodySchema,
  adminCreateUserResponseSchema,
  adminDeleteUserResponseSchema,
  adminKycRequestsQuerySchema,
  adminKycRequestsResponseSchema,
  adminKycReviewBodySchema,
  adminKycReviewResponseSchema,
  adminUserRoleUpdateBodySchema,
  adminUserRoleUpdateResponseSchema,
  adminUsersQuerySchema,
  adminUsersResponseSchema,
  adminVerifyBodySchema,
  auditLogsQuerySchema,
  auditLogsResponseSchema,
} from "./contracts";

type AdminActor = {
  id: string;
};

type AdminVerifyBody = z.infer<typeof adminVerifyBodySchema>;
type AdminAssetActionResponse = z.infer<typeof adminAssetActionResponseSchema>;
type AdminAssetDetailResponse = z.infer<typeof adminAssetDetailSchema>;
type AdminAssetsQuery = z.infer<typeof adminAssetsQuerySchema>;
type AdminAssetsResponse = z.infer<typeof adminAssetsResponseSchema>;
type AdminKycRequestsQuery = z.infer<typeof adminKycRequestsQuerySchema>;
type AdminKycRequestsResponse = z.infer<typeof adminKycRequestsResponseSchema>;
type AdminKycReviewBody = z.infer<typeof adminKycReviewBodySchema>;
type AdminKycReviewResponse = z.infer<typeof adminKycReviewResponseSchema>;
type AdminCreateUserBody = z.infer<typeof adminCreateUserBodySchema>;
type AdminCreateUserResponse = z.infer<typeof adminCreateUserResponseSchema>;
type AdminDeleteUserResponse = z.infer<typeof adminDeleteUserResponseSchema>;
type AdminUserRoleUpdateBody = z.infer<typeof adminUserRoleUpdateBodySchema>;
type AdminUserRoleUpdateResponse = z.infer<typeof adminUserRoleUpdateResponseSchema>;
type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;
type AdminUsersResponse = z.infer<typeof adminUsersResponseSchema>;
type AuditLogsQuery = z.infer<typeof auditLogsQuerySchema>;
type AuditLogsResponse = z.infer<typeof auditLogsResponseSchema>;

const notificationsService = new NotificationService();

const loadAssetOrThrow = async (assetId: string) => {
  const [asset] = await db.select().from(assets).where(eq(assets.id, assetId)).limit(1);

  if (!asset) {
    throw new ApiError(404, "ASSET_NOT_FOUND", "Asset not found");
  }

  return asset;
};

export class AdminService {
  async getAssetDetails(
    _currentUser: AdminActor,
    assetId: string,
  ): Promise<AdminAssetDetailResponse> {
    const [row, documents] = await Promise.all([
      db
        .select({
          asset: assets,
          issuer: users,
          saleTerms: assetSaleTerms,
        })
        .from(assets)
        .innerJoin(users, eq(users.id, assets.issuerUserId))
        .leftJoin(assetSaleTerms, eq(assetSaleTerms.assetId, assets.id))
        .where(eq(assets.id, assetId))
        .limit(1),
      db
        .select()
        .from(assetDocuments)
        .where(eq(assetDocuments.assetId, assetId))
        .orderBy(desc(assetDocuments.createdAt)),
    ]);

    const resolved = row[0];

    if (!resolved) {
      throw new ApiError(404, "ASSET_NOT_FOUND", "Asset not found");
    }

    const [reviewFeedback, revenueStats] = await Promise.all([
      (async () => {
        const [decision] = await db
          .select({
            outcome: verificationDecisions.outcome,
            reason: verificationDecisions.reason,
            metadataJson: verificationDecisions.metadataJson,
            createdAt: verificationDecisions.createdAt,
          })
          .from(verificationDecisions)
          .innerJoin(
            verificationRequests,
            eq(verificationRequests.id, verificationDecisions.verificationRequestId),
          )
          .where(eq(verificationRequests.assetId, assetId))
          .orderBy(desc(verificationDecisions.createdAt))
          .limit(1);

        if (!decision || decision.outcome === "approved") {
          return null;
        }

        return {
          outcome: decision.outcome,
          reason: decision.reason ?? null,
          created_at: decision.createdAt.toISOString(),
          issues:
            (
              (decision.metadataJson ?? {}) as {
                issues?: AdminAssetDetailResponse["review_feedback"] extends infer T
                  ? T extends { issues: infer U }
                    ? U
                    : never
                  : never;
              }
            ).issues ?? [],
        };
      })(),
      db
        .select({
          totalEpochs: count(revenueEpochs.id),
          lastPostedEpoch: sql<number | null>`max(${revenueEpochs.epochNumber})`,
        })
        .from(revenueEpochs)
        .where(eq(revenueEpochs.assetId, assetId)),
    ]);

    return {
      id: resolved.asset.id,
      slug: resolved.asset.slug,
      title: resolved.asset.title,
      short_description: resolved.asset.shortDescription,
      full_description: resolved.asset.fullDescription,
      energy_type: resolved.asset.energyType,
      status: resolved.asset.status,
      location: {
        country: resolved.asset.locationCountry,
        region: resolved.asset.locationRegion,
        city: resolved.asset.locationCity,
      },
      capacity_kw: Number(resolved.asset.capacityKw),
      currency: resolved.asset.currency,
      expected_annual_yield_percent:
        resolved.asset.expectedAnnualYieldPercent === null
          ? null
          : Number(resolved.asset.expectedAnnualYieldPercent),
      cover_image_url: resolved.asset.coverImageUrl,
      issuer: {
        id: resolved.issuer.id,
        display_name: resolved.issuer.displayName ?? "Issuer",
      },
      revenue_summary: {
        total_epochs: revenueStats[0]?.totalEpochs ?? 0,
        last_posted_epoch: revenueStats[0]?.lastPostedEpoch ?? null,
      },
      onchain_refs: {
        onchain_asset_pubkey: resolved.asset.onchainAssetPubkey,
        share_mint_pubkey: resolved.asset.shareMintPubkey,
        vault_pubkey: resolved.asset.vaultPubkey,
      },
      sale_terms: resolved.saleTerms
        ? {
            valuation_usdc: resolved.saleTerms.valuationUsdc,
            total_shares: resolved.saleTerms.totalShares,
            price_per_share_usdc: resolved.saleTerms.pricePerShareUsdc,
            minimum_buy_amount_usdc: resolved.saleTerms.minimumBuyAmountUsdc,
            target_raise_usdc: resolved.saleTerms.targetRaiseUsdc,
            sale_status: resolved.saleTerms.saleStatus,
          }
        : null,
      documents: documents.map((document) => ({
        id: document.id,
        type: document.type,
        title: document.title,
        storage_provider: document.storageProvider,
        storage_uri: document.storageUri,
        content_hash: document.contentHash,
        mime_type: document.mimeType,
        is_public: document.isPublic,
        created_at: document.createdAt.toISOString(),
      })),
      review_feedback: reviewFeedback,
    };
  }

  async listAssets(
    _currentUser: AdminActor,
    query: AdminAssetsQuery,
  ): Promise<AdminAssetsResponse> {
    const whereClause = query.status ? eq(assets.status, query.status) : undefined;

    const [rows, totals] = await Promise.all([
      db
        .select({
          asset: assets,
          issuerDisplayName: users.displayName,
        })
        .from(assets)
        .innerJoin(users, eq(users.id, assets.issuerUserId))
        .where(whereClause)
        .orderBy(desc(assets.updatedAt))
        .limit(query.limit)
        .offset((query.page - 1) * query.limit),
      db
        .select({ total: count(assets.id) })
        .from(assets)
        .where(whereClause),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.asset.id,
        title: row.asset.title,
        slug: row.asset.slug,
        energy_type: row.asset.energyType,
        capacity_kw: Number(row.asset.capacityKw),
        status: row.asset.status,
        issuer_display_name: row.issuerDisplayName ?? "Issuer",
        location_country: row.asset.locationCountry,
        location_city: row.asset.locationCity,
        created_at: row.asset.createdAt.toISOString(),
        updated_at: row.asset.updatedAt.toISOString(),
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total: totals[0]?.total ?? 0,
      },
    };
  }

  async listUsers(_currentUser: AdminActor, query: AdminUsersQuery): Promise<AdminUsersResponse> {
    const whereClause = and(
      query.role ? eq(users.role, query.role) : undefined,
      query.status ? eq(users.status, query.status) : undefined,
      query.search
        ? or(
            ilike(users.displayName, `%${query.search}%`),
            ilike(authIdentities.email, `%${query.search}%`),
          )
        : undefined,
    );

    const [rows, totals] = await Promise.all([
      db
        .select({
          id: users.id,
          displayName: users.displayName,
          role: users.role,
          status: users.status,
          kycStatus: users.kycStatus,
          createdAt: users.createdAt,
          provider: authIdentities.provider,
          email: authIdentities.email,
        })
        .from(users)
        .leftJoin(authIdentities, eq(authIdentities.userId, users.id))
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(query.limit)
        .offset((query.page - 1) * query.limit),
      db
        .select({ total: countDistinct(users.id) })
        .from(users)
        .leftJoin(authIdentities, eq(authIdentities.userId, users.id))
        .where(whereClause),
    ]);

    const userMap = new Map<
      string,
      {
        id: string;
        display_name: string;
        email: string | null;
        role: "investor" | "issuer" | "admin";
        status: "active" | "blocked";
        kyc_status: "not_started" | "pending" | "approved" | "rejected" | "needs_changes";
        auth_providers: Array<"password" | "google" | "telegram">;
        created_at: string;
      }
    >();

    for (const row of rows) {
      const existing = userMap.get(row.id);

      if (existing) {
        if (row.provider && !existing.auth_providers.includes(row.provider)) {
          existing.auth_providers.push(row.provider);
        }

        if (!existing.email && row.email) {
          existing.email = row.email;
        }

        continue;
      }

      userMap.set(row.id, {
        id: row.id,
        display_name: row.displayName ?? "SolaShare User",
        email: row.email ?? null,
        role: row.role,
        status: row.status,
        kyc_status: row.kycStatus,
        auth_providers: row.provider ? [row.provider] : [],
        created_at: row.createdAt.toISOString(),
      });
    }

    return {
      items: [...userMap.values()],
      pagination: {
        page: query.page,
        limit: query.limit,
        total: totals[0]?.total ?? 0,
      },
    };
  }

  async createUser(
    currentUser: AdminActor,
    input: AdminCreateUserBody,
  ): Promise<AdminCreateUserResponse> {
    const [existingIdentity] = await db
      .select()
      .from(authIdentities)
      .where(eq(authIdentities.email, input.email))
      .limit(1);

    if (existingIdentity) {
      throw new ApiError(409, "EMAIL_ALREADY_REGISTERED", "Email address is already registered");
    }

    const passwordHash = await Bun.password.hash(input.password, {
      algorithm: "argon2id",
    });

    const user = await db.transaction(async (tx) => {
      const [createdUser] = await tx
        .insert(users)
        .values({
          displayName: input.display_name,
          role: input.role,
        })
        .returning();

      await tx.insert(authIdentities).values({
        userId: createdUser.id,
        provider: "password",
        providerUserId: input.email,
        email: input.email,
        profileJson: {
          email: input.email,
        },
      });

      await tx.insert(passwordCredentials).values({
        userId: createdUser.id,
        passwordHash,
      });

      await tx.insert(auditLogs).values({
        actorUserId: currentUser.id,
        entityType: "user",
        entityId: createdUser.id,
        action: "user.created",
        payloadJson: {
          email: input.email,
          role: input.role,
        },
      });

      return createdUser;
    });

    return {
      success: true,
      user_id: user.id,
      role: user.role,
    };
  }

  async updateUserRole(
    currentUser: AdminActor,
    userId: string,
    input: AdminUserRoleUpdateBody,
  ): Promise<AdminUserRoleUpdateResponse> {
    const [targetUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!targetUser) {
      throw new ApiError(404, "USER_NOT_FOUND", "User not found");
    }

    if (currentUser.id === userId && targetUser.role !== input.role) {
      throw new ApiError(
        409,
        "ROLE_SELF_UPDATE_NOT_ALLOWED",
        "Admins cannot change their own role",
      );
    }

    if (targetUser.role === input.role) {
      return {
        success: true,
        user_id: userId,
        role: targetUser.role,
      };
    }

    if (targetUser.role === "admin" && input.role !== "admin") {
      const [{ total }] = await db
        .select({ total: count(users.id) })
        .from(users)
        .where(eq(users.role, "admin"));

      if (total <= 1) {
        throw new ApiError(
          409,
          "LAST_ADMIN_ROLE_CHANGE_FORBIDDEN",
          "Cannot remove the last admin from the platform",
        );
      }
    }

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          role: input.role,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      await tx.insert(auditLogs).values({
        actorUserId: currentUser.id,
        entityType: "user",
        entityId: userId,
        action: "user.role.updated",
        payloadJson: {
          previous_role: targetUser.role,
          role: input.role,
          reason: input.reason,
        },
      });
    });

    return {
      success: true,
      user_id: userId,
      role: input.role,
    };
  }

  async deleteUser(currentUser: AdminActor, userId: string): Promise<AdminDeleteUserResponse> {
    const [targetUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!targetUser) {
      throw new ApiError(404, "USER_NOT_FOUND", "User not found");
    }

    if (currentUser.id === userId) {
      throw new ApiError(409, "SELF_DELETE_FORBIDDEN", "Admins cannot delete their own account");
    }

    if (targetUser.role === "admin") {
      const [{ total }] = await db
        .select({ total: count(users.id) })
        .from(users)
        .where(eq(users.role, "admin"));

      if (total <= 1) {
        throw new ApiError(
          409,
          "LAST_ADMIN_DELETE_FORBIDDEN",
          "Cannot delete the last admin from the platform",
        );
      }
    }

    const dependencyChecks = await Promise.all([
      db.select({ id: assets.id }).from(assets).where(eq(assets.issuerUserId, userId)).limit(1),
      db
        .select({ id: assetDocuments.id })
        .from(assetDocuments)
        .where(eq(assetDocuments.uploadedByUserId, userId))
        .limit(1),
      db
        .select({ id: verificationRequests.id })
        .from(verificationRequests)
        .where(eq(verificationRequests.requestedByUserId, userId))
        .limit(1),
      db
        .select({ id: verificationDecisions.id })
        .from(verificationDecisions)
        .where(eq(verificationDecisions.decidedByUserId, userId))
        .limit(1),
      db
        .select({ id: investments.id })
        .from(investments)
        .where(eq(investments.userId, userId))
        .limit(1),
      db
        .select({ id: revenueEpochs.id })
        .from(revenueEpochs)
        .where(eq(revenueEpochs.postedByUserId, userId))
        .limit(1),
      db
        .select({ id: revenueDeposits.id })
        .from(revenueDeposits)
        .where(eq(revenueDeposits.depositedByUserId, userId))
        .limit(1),
      db.select({ id: claims.id }).from(claims).where(eq(claims.userId, userId)).limit(1),
    ]);

    if (dependencyChecks.some((rows) => rows.length > 0)) {
      throw new ApiError(
        409,
        "USER_DELETE_BLOCKED",
        "User cannot be deleted because historical or financial records depend on it",
      );
    }

    await db.transaction(async (tx) => {
      await tx.insert(auditLogs).values({
        actorUserId: currentUser.id,
        entityType: "user",
        entityId: userId,
        action: "user.deleted",
        payloadJson: {
          deleted_role: targetUser.role,
        },
      });

      await tx.delete(users).where(eq(users.id, userId));
    });

    return {
      success: true,
      user_id: userId,
    };
  }

  async listKycRequests(
    _currentUser: AdminActor,
    query: AdminKycRequestsQuery,
  ): Promise<AdminKycRequestsResponse> {
    const whereClause = and(
      eq(verificationRequests.requestType, "kyc_review"),
      eq(verificationRequests.status, query.status),
    );

    const [rows, totals] = await Promise.all([
      db
        .select({
          verificationRequestId: verificationRequests.id,
          userId: users.id,
          displayName: users.displayName,
          kycStatus: users.kycStatus,
          payloadJson: verificationRequests.payloadJson,
          createdAt: verificationRequests.createdAt,
        })
        .from(verificationRequests)
        .innerJoin(users, eq(users.id, verificationRequests.requestedByUserId))
        .where(whereClause)
        .orderBy(desc(verificationRequests.createdAt))
        .limit(query.limit)
        .offset((query.page - 1) * query.limit),
      db
        .select({
          total: count(verificationRequests.id),
        })
        .from(verificationRequests)
        .where(whereClause),
    ]);

    const userIds = [...new Set(rows.map((row) => row.userId))];
    const identityRows =
      userIds.length === 0
        ? []
        : await db
            .select({
              userId: authIdentities.userId,
              email: authIdentities.email,
            })
            .from(authIdentities)
            .where(inArray(authIdentities.userId, userIds));

    const emailByUserId = new Map<string, string | null>();
    for (const identityRow of identityRows) {
      if (identityRow.email && !emailByUserId.has(identityRow.userId)) {
        emailByUserId.set(identityRow.userId, identityRow.email);
      }
    }

    return {
      items: rows.map((row) => {
        const payload = (row.payloadJson ?? {}) as {
          document_type?: "passport" | "national_id";
          document_name?: string;
          mime_type?: string;
          document_uri?: string;
          document_hash?: string;
          notes?: string | null;
        };

        return {
          verification_request_id: row.verificationRequestId,
          user_id: row.userId,
          display_name: row.displayName ?? "SolaShare User",
          email: emailByUserId.get(row.userId) ?? null,
          kyc_status: row.kycStatus,
          document_type: payload.document_type ?? "passport",
          document_name: payload.document_name ?? "KYC document",
          mime_type: payload.mime_type ?? "application/octet-stream",
          document_uri: payload.document_uri ?? "",
          document_hash: payload.document_hash ?? "",
          notes: payload.notes ?? null,
          created_at: row.createdAt.toISOString(),
        };
      }),
      pagination: {
        page: query.page,
        limit: query.limit,
        total: totals[0]?.total ?? 0,
      },
    };
  }

  async reviewUserKyc(
    currentUser: AdminActor,
    userId: string,
    input: AdminKycReviewBody,
  ): Promise<AdminKycReviewResponse> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      throw new ApiError(404, "USER_NOT_FOUND", "User not found");
    }

    const [verificationRequest] = await db
      .select()
      .from(verificationRequests)
      .where(
        and(
          eq(verificationRequests.requestedByUserId, userId),
          eq(verificationRequests.requestType, "kyc_review"),
          eq(verificationRequests.status, "pending"),
        ),
      )
      .orderBy(desc(verificationRequests.createdAt))
      .limit(1);

    if (!verificationRequest) {
      throw new ApiError(
        409,
        "KYC_REQUEST_NOT_FOUND",
        "No pending KYC verification request was found for this user",
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          kycStatus: input.outcome,
          kycReviewedAt: new Date(),
          kycDecisionNotes: input.reason ?? null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      await tx
        .update(verificationRequests)
        .set({
          status: input.outcome === "needs_changes" ? "rejected" : input.outcome,
          resolvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(verificationRequests.id, verificationRequest.id));

      await tx.insert(verificationDecisions).values({
        verificationRequestId: verificationRequest.id,
        decidedByUserId: currentUser.id,
        outcome: input.outcome,
        reason: input.reason ?? null,
      });

      await tx.insert(auditLogs).values({
        actorUserId: currentUser.id,
        entityType: "user",
        entityId: userId,
        action: `user.kyc.${input.outcome}`,
        payloadJson: {
          verification_request_id: verificationRequest.id,
          reason: input.reason ?? null,
        },
      });
    });

    return {
      success: true,
      user_id: userId,
      verification_request_id: verificationRequest.id,
      kyc_status: input.outcome,
    };
  }

  async verifyAsset(
    currentUser: AdminActor,
    assetId: string,
    input: AdminVerifyBody,
  ): Promise<AdminAssetActionResponse> {
    const asset = await loadAssetOrThrow(assetId);
    const [verificationRequest] = await db
      .select()
      .from(verificationRequests)
      .where(
        and(eq(verificationRequests.assetId, assetId), eq(verificationRequests.status, "pending")),
      )
      .orderBy(desc(verificationRequests.createdAt))
      .limit(1);

    if (!verificationRequest) {
      throw new ApiError(
        409,
        "VERIFICATION_REQUEST_NOT_FOUND",
        "No pending verification request was found for this asset",
      );
    }

    const resultingStatus = input.outcome === "approved" ? "verified" : "draft";
    const verificationRequestStatus = input.outcome === "approved" ? "approved" : "rejected";
    const normalizedReason = input.reason?.trim() || null;
    const issues = input.issues ?? [];

    await db.transaction(async (tx) => {
      await tx
        .update(assets)
        .set({
          status: resultingStatus,
          updatedAt: new Date(),
        })
        .where(eq(assets.id, assetId));

      await tx.insert(assetStatusHistory).values({
        assetId,
        oldStatus: asset.status,
        newStatus: resultingStatus,
        changedByUserId: currentUser.id,
        reason: normalizedReason ?? `Admin verification outcome: ${input.outcome}`,
      });

      await tx
        .update(verificationRequests)
        .set({
          status: verificationRequestStatus,
          resolvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(verificationRequests.id, verificationRequest.id));

      await tx.insert(verificationDecisions).values({
        verificationRequestId: verificationRequest.id,
        decidedByUserId: currentUser.id,
        outcome: input.outcome,
        reason: normalizedReason,
        metadataJson: {
          issues,
        },
      });

      await tx.insert(auditLogs).values({
        actorUserId: currentUser.id,
        entityType: "asset",
        entityId: assetId,
        action: `asset.${input.outcome}`,
        payloadJson: {
          previous_status: asset.status,
          resulting_status: resultingStatus,
          reason: normalizedReason,
          issues,
        },
      });

      if (resultingStatus === "verified") {
        await notificationsService.createForAssetUsers(tx, assetId, {
          type: "system",
          title: "Asset verified",
          body: `${asset.title} completed review and is ready for sale activation.`,
          metadata: {
            asset_id: assetId,
          },
        });
      }
    });

    return {
      success: true,
      asset_id: assetId,
      resulting_status: resultingStatus,
    };
  }

  async freezeAsset(currentUser: AdminActor, assetId: string): Promise<AdminAssetActionResponse> {
    const asset = await loadAssetOrThrow(assetId);

    await db.transaction(async (tx) => {
      await tx
        .update(assets)
        .set({
          status: "frozen",
          updatedAt: new Date(),
        })
        .where(eq(assets.id, assetId));

      await tx
        .update(assetSaleTerms)
        .set({
          saleStatus: "cancelled",
          updatedAt: new Date(),
        })
        .where(eq(assetSaleTerms.assetId, assetId));

      await tx.insert(assetStatusHistory).values({
        assetId,
        oldStatus: asset.status,
        newStatus: "frozen",
        changedByUserId: currentUser.id,
        reason: "Asset frozen by admin",
      });

      await tx.insert(auditLogs).values({
        actorUserId: currentUser.id,
        entityType: "asset",
        entityId: assetId,
        action: "asset.frozen",
      });

      await notificationsService.createForAssetUsers(tx, assetId, {
        type: "asset_frozen",
        title: "Asset frozen",
        body: `${asset.title} has been frozen by an administrator.`,
        metadata: {
          asset_id: assetId,
        },
      });
    });

    return {
      success: true,
      asset_id: assetId,
      resulting_status: "frozen",
    };
  }

  async closeAsset(currentUser: AdminActor, assetId: string): Promise<AdminAssetActionResponse> {
    const asset = await loadAssetOrThrow(assetId);

    await db.transaction(async (tx) => {
      await tx
        .update(assets)
        .set({
          status: "closed",
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

      await tx.insert(assetStatusHistory).values({
        assetId,
        oldStatus: asset.status,
        newStatus: "closed",
        changedByUserId: currentUser.id,
        reason: "Asset closed by admin",
      });

      await tx.insert(auditLogs).values({
        actorUserId: currentUser.id,
        entityType: "asset",
        entityId: assetId,
        action: "asset.closed",
      });
    });

    return {
      success: true,
      asset_id: assetId,
      resulting_status: "closed",
    };
  }

  async listAuditLogs(_currentUser: AdminActor, query: AuditLogsQuery): Promise<AuditLogsResponse> {
    const filters = [];

    if (query.entity_type) {
      filters.push(eq(auditLogs.entityType, query.entity_type));
    }

    if (query.entity_id) {
      filters.push(eq(auditLogs.entityId, query.entity_id));
    }

    const whereClause =
      filters.length === 0 ? undefined : filters.length === 1 ? filters[0] : and(...filters);

    const [rows, totals] = await Promise.all([
      db
        .select({
          id: auditLogs.id,
          actorUserId: auditLogs.actorUserId,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          action: auditLogs.action,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt))
        .limit(query.limit)
        .offset((query.page - 1) * query.limit),
      db
        .select({
          total: count(auditLogs.id),
        })
        .from(auditLogs)
        .where(whereClause),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        actor_user_id: row.actorUserId,
        entity_type: row.entityType,
        entity_id: row.entityId,
        action: row.action,
        created_at: row.createdAt.toISOString(),
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total: totals[0]?.total ?? 0,
      },
    };
  }
}

export const adminService = new AdminService();
