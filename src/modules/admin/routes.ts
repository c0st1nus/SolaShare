import { Elysia } from "elysia";
import { authPlugin, requireUserRole } from "../../plugins/auth";
import {
  adminAssetActionParamsSchema,
  adminAssetActionResponseSchema,
  adminKycRequestsQuerySchema,
  adminKycRequestsResponseSchema,
  adminKycReviewBodySchema,
  adminKycReviewResponseSchema,
  adminUserActionParamsSchema,
  adminVerifyBodySchema,
  auditLogsQuerySchema,
  auditLogsResponseSchema,
} from "./contracts";
import { adminService } from "./service";

export const adminRoutes = new Elysia({ prefix: "/admin", tags: ["Admin"] })
  .use(authPlugin)
  .get(
    "/kyc-requests",
    ({ auth, query }) =>
      adminService.listKycRequests(requireUserRole(auth, ["admin"]), query),
    {
      query: adminKycRequestsQuerySchema,
      detail: {
        summary: "List KYC verification requests",
      },
      response: {
        200: adminKycRequestsResponseSchema,
      },
    },
  )
  .post(
    "/users/:id/kyc-review",
    ({ auth, params, body }) =>
      adminService.reviewUserKyc(
        requireUserRole(auth, ["admin"]),
        params.id,
        body,
      ),
    {
      params: adminUserActionParamsSchema,
      body: adminKycReviewBodySchema,
      detail: {
        summary: "Approve or reject an investor KYC request",
      },
      response: {
        200: adminKycReviewResponseSchema,
      },
    },
  )
  .post(
    "/assets/:id/verify",
    ({ auth, params, body }) =>
      adminService.verifyAsset(
        requireUserRole(auth, ["admin"]),
        params.id,
        body,
      ),
    {
      params: adminAssetActionParamsSchema,
      body: adminVerifyBodySchema,
      detail: {
        summary: "Verify or reject an asset",
      },
      response: {
        200: adminAssetActionResponseSchema,
      },
    },
  )
  .post(
    "/assets/:id/freeze",
    ({ auth, params }) =>
      adminService.freezeAsset(requireUserRole(auth, ["admin"]), params.id),
    {
      params: adminAssetActionParamsSchema,
      detail: {
        summary: "Freeze an asset",
      },
      response: {
        200: adminAssetActionResponseSchema,
      },
    },
  )
  .post(
    "/assets/:id/close",
    ({ auth, params }) =>
      adminService.closeAsset(requireUserRole(auth, ["admin"]), params.id),
    {
      params: adminAssetActionParamsSchema,
      detail: {
        summary: "Close an asset lifecycle",
      },
      response: {
        200: adminAssetActionResponseSchema,
      },
    },
  )
  .get(
    "/audit-logs",
    ({ auth, query }) =>
      adminService.listAuditLogs(requireUserRole(auth, ["admin"]), query),
    {
      query: auditLogsQuerySchema,
      detail: {
        summary: "List audit log events",
      },
      response: {
        200: auditLogsResponseSchema,
      },
    },
  );
