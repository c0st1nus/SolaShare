import { Elysia } from "elysia";
import { authPlugin, requireUserRole } from "../../plugins/auth";
import {
  issuerActionParamsSchema,
  issuerAssetBodySchema,
  issuerAssetDocumentBodySchema,
  issuerAssetDocumentResponseSchema,
  issuerAssetResponseSchema,
  issuerAssetUpdateBodySchema,
  issuerRevenuePostParamsSchema,
  issuerSubmitResponseSchema,
  revenueEpochBodySchema,
  revenueEpochResponseSchema,
  revenuePostResponseSchema,
  saleTermsBodySchema,
  saleTermsResponseSchema,
} from "./contracts";
import { issuerService } from "./service";

export const issuerRoutes = new Elysia({ prefix: "/issuer", tags: ["Issuer"] })
  .use(authPlugin)
  .post(
    "/assets",
    ({ auth, body }) =>
      issuerService.createAssetDraft(requireUserRole(auth, ["issuer", "admin"]), body),
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
  .patch(
    "/assets/:id",
    ({ auth, params, body }) =>
      issuerService.updateAssetDraft(requireUserRole(auth, ["issuer", "admin"]), params.id, body),
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
    "/assets/:id/documents",
    ({ auth, params, body }) =>
      issuerService.registerAssetDocument(
        requireUserRole(auth, ["issuer", "admin"]),
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
  .post(
    "/assets/:id/sale-terms",
    ({ auth, params, body }) =>
      issuerService.saveSaleTerms(requireUserRole(auth, ["issuer", "admin"]), params.id, body),
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
      issuerService.submitAssetForWorkflow(requireUserRole(auth, ["issuer", "admin"]), params.id),
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
    "/assets/:id/revenue-epochs",
    ({ auth, params, body }) => {
      requireUserRole(auth, ["issuer", "admin"]);

      return issuerService.createRevenueEpoch(params.id, body);
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
      requireUserRole(auth, ["issuer", "admin"]);

      return issuerService.prepareRevenuePosting(params.id, params.epochId);
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
  );
