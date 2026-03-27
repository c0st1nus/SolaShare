import type { z } from "zod";
import type {
  adminAssetActionResponseSchema,
  adminVerifyBodySchema,
  auditLogsQuerySchema,
  auditLogsResponseSchema,
} from "./contracts";

type AdminVerifyBody = z.infer<typeof adminVerifyBodySchema>;
type AdminAssetActionResponse = z.infer<typeof adminAssetActionResponseSchema>;
type AuditLogsQuery = z.infer<typeof auditLogsQuerySchema>;
type AuditLogsResponse = z.infer<typeof auditLogsResponseSchema>;

export class AdminService {
  verifyAsset(assetId: string, input: AdminVerifyBody): AdminAssetActionResponse {
    return {
      success: true,
      asset_id: assetId,
      resulting_status: input.outcome === "approved" ? "verified" : "pending_review",
    };
  }

  freezeAsset(assetId: string): AdminAssetActionResponse {
    return {
      success: true,
      asset_id: assetId,
      resulting_status: "frozen",
    };
  }

  closeAsset(assetId: string): AdminAssetActionResponse {
    return {
      success: true,
      asset_id: assetId,
      resulting_status: "closed",
    };
  }

  listAuditLogs(query: AuditLogsQuery): AuditLogsResponse {
    return {
      items: [
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          actor_user_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          entity_type: query.entity_type ?? "asset",
          entity_id: query.entity_id ?? "22222222-2222-4222-8222-222222222222",
          action: "asset.verified",
          created_at: new Date().toISOString(),
        },
      ],
      pagination: {
        page: query.page,
        limit: query.limit,
        total: 1,
      },
    };
  }
}

export const adminService = new AdminService();
