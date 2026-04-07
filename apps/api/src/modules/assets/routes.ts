import { Elysia } from "elysia";
import {
  assetDetailSchema,
  assetDocumentsResponseSchema,
  assetHoldersSummaryResponseSchema,
  assetIdParamSchema,
  assetRevenueResponseSchema,
  assetsListResponseSchema,
  assetsQuerySchema,
} from "./contracts";
import { assetsService } from "./service";

export const assetsRoutes = new Elysia({ prefix: "/assets", tags: ["Assets"] })
  .get("/", ({ query }) => assetsService.listAssets(query), {
    query: assetsQuerySchema,
    detail: {
      summary: "List public assets",
    },
    response: {
      200: assetsListResponseSchema,
    },
  })
  .get("/:id", ({ params }) => assetsService.getAsset(params.id), {
    params: assetIdParamSchema,
    detail: {
      summary: "Get public asset details",
    },
    response: {
      200: assetDetailSchema,
    },
  })
  .get("/:id/revenue", ({ params }) => assetsService.getAssetRevenue(params.id), {
    params: assetIdParamSchema,
    detail: {
      summary: "Get public revenue history for an asset",
    },
    response: {
      200: assetRevenueResponseSchema,
    },
  })
  .get("/:id/documents", ({ params }) => assetsService.getAssetDocuments(params.id), {
    params: assetIdParamSchema,
    detail: {
      summary: "Get public asset documents",
    },
    response: {
      200: assetDocumentsResponseSchema,
    },
  })
  .get("/:id/holders-summary", ({ params }) => assetsService.getAssetHoldersSummary(params.id), {
    params: assetIdParamSchema,
    detail: {
      summary: "Get public holders summary",
    },
    response: {
      200: assetHoldersSummaryResponseSchema,
    },
  });
