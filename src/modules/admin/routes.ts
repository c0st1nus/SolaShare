import { Elysia } from "elysia";
import {
  adminAssetActionParamsSchema,
  adminAssetActionResponseSchema,
  adminVerifyBodySchema,
  auditLogsQuerySchema,
  auditLogsResponseSchema,
} from "./contracts";
import { adminService } from "./service";

export const adminRoutes = new Elysia({ prefix: "/admin", tags: ["Admin"] })
  .post("/assets/:id/verify", ({ params, body }) => adminService.verifyAsset(params.id, body), {
    params: adminAssetActionParamsSchema,
    body: adminVerifyBodySchema,
    detail: {
      summary: "Verify or reject an asset",
    },
    response: {
      200: adminAssetActionResponseSchema,
    },
  })
  .post("/assets/:id/freeze", ({ params }) => adminService.freezeAsset(params.id), {
    params: adminAssetActionParamsSchema,
    detail: {
      summary: "Freeze an asset",
    },
    response: {
      200: adminAssetActionResponseSchema,
    },
  })
  .post("/assets/:id/close", ({ params }) => adminService.closeAsset(params.id), {
    params: adminAssetActionParamsSchema,
    detail: {
      summary: "Close an asset lifecycle",
    },
    response: {
      200: adminAssetActionResponseSchema,
    },
  })
  .get("/audit-logs", ({ query }) => adminService.listAuditLogs(query), {
    query: auditLogsQuerySchema,
    detail: {
      summary: "List audit log events",
    },
    response: {
      200: auditLogsResponseSchema,
    },
  });
