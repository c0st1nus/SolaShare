import { Elysia } from "elysia";
import type { z } from "zod";
import { authPlugin, requireUserRole } from "../../plugins/auth";
import {
  assetOnchainConfirmResponseSchema,
  assetOnchainSetupBodySchema,
  assetOnchainSetupConfirmBodySchema,
  assetOnchainSetupResponseSchema,
  issuerActionParamsSchema,
  issuerAssetBodySchema,
  issuerAssetDeleteResponseSchema,
  issuerAssetDetailSchema,
  issuerAssetDocumentBodySchema,
  issuerAssetDocumentParamsSchema,
  issuerAssetDocumentResponseSchema,
  issuerAssetDocumentUpdateBodySchema,
  issuerAssetListQuerySchema,
  issuerAssetListResponseSchema,
  issuerAssetResponseSchema,
  issuerAssetUpdateBodySchema,
  issuerAssetVisibilityBodySchema,
  issuerAssetVisibilityResponseSchema,
  issuerRevenuePostParamsSchema,
  issuerSubmitResponseSchema,
  revenueEpochBodySchema,
  revenueEpochResponseSchema,
  revenuePostResponseSchema,
  saleTermsBodySchema,
  saleTermsResponseSchema,
  withdrawFundsBodySchema,
  withdrawFundsResponseSchema,
} from "./contracts";
import { issuerService } from "./service";

export const issuerRoutes = new Elysia({ prefix: "/issuer", tags: ["Issuer"] })
  .use(authPlugin)
  .get(
    "/assets",
    ({ auth, query }) =>
      issuerService.listOwnedAssets(requireUserRole(auth, ["investor", "issuer", "admin"]), query),
    {
      query: issuerAssetListQuerySchema,
      detail: {
        summary: "List assets owned by the current issuer",
      },
      response: {
        200: issuerAssetListResponseSchema,
      },
    },
  )
  .post(
    "/assets",
    ({ auth, body }) =>
      issuerService.createAssetDraft(requireUserRole(auth, ["investor", "issuer", "admin"]), body),
    {
      body: issuerAssetBodySchema,
      detail: {
        summary: "Create an issuer asset draft",
      },
      response: {
        200: issuerAssetResponseSchema,
      },
    },
  )
  .get(
    "/assets/:id",
    ({ auth, params }) =>
      issuerService.getOwnedAssetDetails(
        requireUserRole(auth, ["investor", "issuer", "admin"]),
        params.id,
      ),
    {
      params: issuerActionParamsSchema,
      detail: {
        summary: "Get full details for an issuer-owned asset",
      },
      response: {
        200: issuerAssetDetailSchema,
      },
    },
  )
  .patch(
    "/assets/:id",
    ({ auth, params, body }) =>
      issuerService.updateAssetDraft(
        requireUserRole(auth, ["investor", "issuer", "admin"]),
        params.id,
        body,
      ),
    {
      params: issuerActionParamsSchema,
      body: issuerAssetUpdateBodySchema,
      detail: {
        summary: "Update an issuer asset draft",
      },
      response: {
        200: issuerAssetResponseSchema,
      },
    },
  )
  .post(
    "/assets/:id/visibility",
    ({ auth, params, body }) =>
      issuerService.updateAssetVisibility(
        requireUserRole(auth, ["investor", "issuer", "admin"]),
        params.id,
        body,
      ),
    {
      params: issuerActionParamsSchema,
      body: issuerAssetVisibilityBodySchema,
      detail: {
        summary: "Update public visibility for an issuer-owned asset",
      },
      response: {
        200: issuerAssetVisibilityResponseSchema,
      },
    },
  )
  .delete(
    "/assets/:id",
    ({ auth, params }) =>
      issuerService.deleteAsset(requireUserRole(auth, ["investor", "issuer", "admin"]), params.id),
    {
      params: issuerActionParamsSchema,
      detail: {
        summary: "Delete an issuer-owned asset when it has no blocking activity",
      },
      response: {
        200: issuerAssetDeleteResponseSchema,
      },
    },
  )
  .post(
    "/assets/:id/documents",
    ({ auth, params, body }) =>
      issuerService.registerAssetDocument(
        requireUserRole(auth, ["investor", "issuer", "admin"]),
        params.id,
        body,
      ),
    {
      params: issuerActionParamsSchema,
      body: issuerAssetDocumentBodySchema,
      detail: {
        summary: "Register a document reference for an asset",
      },
      response: {
        200: issuerAssetDocumentResponseSchema,
      },
    },
  )
  .patch(
    "/assets/:id/documents/:documentId",
    ({ auth, params, body }) =>
      issuerService.updateAssetDocument(
        requireUserRole(auth, ["investor", "issuer", "admin"]),
        params.id,
        params.documentId,
        body,
      ),
    {
      params: issuerAssetDocumentParamsSchema,
      body: issuerAssetDocumentUpdateBodySchema,
      detail: {
        summary: "Update an asset document owned by the issuer",
      },
      response: {
        200: issuerAssetDocumentResponseSchema,
      },
    },
  )
  .delete(
    "/assets/:id/documents/:documentId",
    ({ auth, params }) =>
      issuerService.deleteAssetDocument(
        requireUserRole(auth, ["investor", "issuer", "admin"]),
        params.id,
        params.documentId,
      ),
    {
      params: issuerAssetDocumentParamsSchema,
      detail: {
        summary: "Delete an asset document owned by the issuer",
      },
      response: {
        200: issuerAssetDocumentResponseSchema,
      },
    },
  )
  .post(
    "/assets/:id/sale-terms",
    ({ auth, params, body }) =>
      issuerService.saveSaleTerms(
        requireUserRole(auth, ["investor", "issuer", "admin"]),
        params.id,
        body,
      ),
    {
      params: issuerActionParamsSchema,
      body: saleTermsBodySchema,
      detail: {
        summary: "Create or update sale terms for an asset",
      },
      response: {
        200: saleTermsResponseSchema,
      },
    },
  )
  .post(
    "/assets/:id/submit",
    ({ auth, params }) =>
      issuerService.submitAssetForWorkflow(
        requireUserRole(auth, ["investor", "issuer", "admin"]),
        params.id,
      ),
    {
      params: issuerActionParamsSchema,
      detail: {
        summary: "Submit an asset to the next lifecycle step",
      },
      response: {
        200: issuerSubmitResponseSchema,
      },
    },
  )
  .post(
    "/assets/:id/onchain/setup",
    ({ auth, params, body }) =>
      issuerService.prepareOnchainSetup(
        requireUserRole(auth, ["issuer", "admin"]),
        params.id,
        body,
      ),
    {
      params: issuerActionParamsSchema,
      body: assetOnchainSetupBodySchema,
      detail: {
        summary: "Prepare on-chain asset initialization for issuer signing",
      },
      response: {
        200: assetOnchainSetupResponseSchema,
      },
    },
  )
  .post(
    "/assets/:id/onchain/confirm",
    ({ auth, params, body }) =>
      issuerService.confirmOnchainSetup(
        requireUserRole(auth, ["issuer", "admin"]),
        params.id,
        body,
      ),
    {
      params: issuerActionParamsSchema,
      body: assetOnchainSetupConfirmBodySchema,
      detail: {
        summary: "Confirm on-chain asset initialization and persist derived pubkeys",
      },
      response: {
        200: assetOnchainConfirmResponseSchema,
      },
    },
  )
  .post(
    "/assets/:id/revenue-epochs",
    ({ auth, params, body }) => {
      return issuerService.createRevenueEpoch(
        requireUserRole(auth, ["investor", "issuer", "admin"]),
        params.id,
        body,
      );
    },
    {
      params: issuerActionParamsSchema,
      body: revenueEpochBodySchema,
      detail: {
        summary: "Create a revenue epoch draft for an asset",
      },
      response: {
        200: revenueEpochResponseSchema,
      },
    },
  )
  .post(
    "/assets/:id/revenue-epochs/:epochId/post",
    ({ auth, params }) => {
      return issuerService.prepareRevenuePosting(
        requireUserRole(auth, ["investor", "issuer", "admin"]),
        params.id,
        params.epochId,
      );
    },
    {
      params: issuerRevenuePostParamsSchema,
      detail: {
        summary: "Prepare revenue posting flow",
      },
      response: {
        200: revenuePostResponseSchema,
      },
    },
  )
  .post(
    "/assets/:id/withdraw",
    async ({ auth, params, body }) => {
      const payload = await issuerService.prepareWithdrawal(
        requireUserRole(auth, ["issuer", "admin"]),
        params.id,
        body,
      );
      return payload as unknown as z.infer<typeof withdrawFundsResponseSchema>;
    },
    {
      params: issuerActionParamsSchema,
      body: withdrawFundsBodySchema,
      detail: {
        summary: "Prepare withdrawal of raised funds",
      },
      response: {
        200: withdrawFundsResponseSchema,
      },
    },
  );
