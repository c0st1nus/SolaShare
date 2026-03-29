import { and, count, desc, eq } from "drizzle-orm";
import type { z } from "zod";
import { db } from "../../db";
import {
  assetSaleTerms,
  assetStatusHistory,
  assets,
  auditLogs,
  verificationDecisions,
  verificationRequests,
} from "../../db/schema";
import { ApiError } from "../../lib/api-error";
import { NotificationService } from "../notifications/service";
import type {
  adminAssetActionResponseSchema,
  adminVerifyBodySchema,
  auditLogsQuerySchema,
  auditLogsResponseSchema,
} from "./contracts";

type AdminActor = {
  id: string;
};

type AdminVerifyBody = z.infer<typeof adminVerifyBodySchema>;
type AdminAssetActionResponse = z.infer<typeof adminAssetActionResponseSchema>;
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
        reason: input.reason ?? `Admin verification outcome: ${input.outcome}`,
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
        reason: input.reason ?? null,
      });

      await tx.insert(auditLogs).values({
        actorUserId: currentUser.id,
        entityType: "asset",
        entityId: assetId,
        action: `asset.${input.outcome}`,
        payloadJson: {
          previous_status: asset.status,
          resulting_status: resultingStatus,
          reason: input.reason ?? null,
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
