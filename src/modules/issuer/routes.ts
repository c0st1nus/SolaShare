import { Elysia } from "elysia";
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
  .post("/assets", ({ body }) => issuerService.createAssetDraft(body), {
    body: issuerAssetBodySchema,
    detail: {
      summary: "Create an issuer asset draft",
    },
    response: {
      200: issuerAssetResponseSchema,
    },
  })
  .patch("/assets/:id", ({ params, body }) => issuerService.updateAssetDraft(params.id, body), {
    params: issuerActionParamsSchema,
    body: issuerAssetUpdateBodySchema,
    detail: {
      summary: "Update an issuer asset draft",
    },
    response: {
      200: issuerAssetResponseSchema,
    },
  })
  .post(
    "/assets/:id/documents",
    ({ params, body }) => issuerService.registerAssetDocument(params.id, body),
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
    ({ params, body }) => issuerService.saveSaleTerms(params.id, body),
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
  .post("/assets/:id/submit", ({ params }) => issuerService.submitAssetForWorkflow(params.id), {
    params: issuerActionParamsSchema,
    detail: {
      summary: "Submit an asset to the next lifecycle step",
    },
    response: {
      200: issuerSubmitResponseSchema,
    },
  })
  .post(
    "/assets/:id/revenue-epochs",
    ({ params, body }) => issuerService.createRevenueEpoch(params.id, body),
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
    ({ params }) => issuerService.prepareRevenuePosting(params.id, params.epochId),
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
