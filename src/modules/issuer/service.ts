import type { z } from "zod";
import type {
  issuerAssetBodySchema,
  issuerAssetDocumentBodySchema,
  issuerAssetDocumentResponseSchema,
  issuerAssetResponseSchema,
  issuerAssetUpdateBodySchema,
  issuerSubmitResponseSchema,
  revenueEpochBodySchema,
  revenueEpochResponseSchema,
  revenuePostResponseSchema,
  saleTermsBodySchema,
  saleTermsResponseSchema,
} from "./contracts";

type IssuerAssetBody = z.infer<typeof issuerAssetBodySchema>;
type IssuerAssetResponse = z.infer<typeof issuerAssetResponseSchema>;
type IssuerAssetUpdateBody = z.infer<typeof issuerAssetUpdateBodySchema>;
type IssuerAssetDocumentBody = z.infer<typeof issuerAssetDocumentBodySchema>;
type IssuerAssetDocumentResponse = z.infer<typeof issuerAssetDocumentResponseSchema>;
type SaleTermsBody = z.infer<typeof saleTermsBodySchema>;
type SaleTermsResponse = z.infer<typeof saleTermsResponseSchema>;
type IssuerSubmitResponse = z.infer<typeof issuerSubmitResponseSchema>;
type RevenueEpochBody = z.infer<typeof revenueEpochBodySchema>;
type RevenueEpochResponse = z.infer<typeof revenueEpochResponseSchema>;
type RevenuePostResponse = z.infer<typeof revenuePostResponseSchema>;

export class IssuerService {
  createAssetDraft(_input: IssuerAssetBody): IssuerAssetResponse {
    return {
      asset_id: "66666666-6666-4666-8666-666666666666",
      status: "draft",
    };
  }

  updateAssetDraft(_assetId: string, _input: IssuerAssetUpdateBody): IssuerAssetResponse {
    return {
      asset_id: "66666666-6666-4666-8666-666666666666",
      status: "draft",
    };
  }

  registerAssetDocument(
    _assetId: string,
    _input: IssuerAssetDocumentBody,
  ): IssuerAssetDocumentResponse {
    return {
      document_id: "77777777-7777-4777-8777-777777777777",
      success: true,
    };
  }

  saveSaleTerms(assetId: string, _input: SaleTermsBody): SaleTermsResponse {
    return {
      success: true,
      asset_id: assetId,
    };
  }

  submitAssetForWorkflow(_assetId: string): IssuerSubmitResponse {
    return {
      success: true,
      message: "Asset submission accepted for the next workflow step",
      next_status: "pending_review",
    };
  }

  createRevenueEpoch(_assetId: string, _input: RevenueEpochBody): RevenueEpochResponse {
    return {
      success: true,
      revenue_epoch_id: "88888888-8888-4888-8888-888888888888",
    };
  }

  prepareRevenuePosting(assetId: string, epochId: string): RevenuePostResponse {
    return {
      success: true,
      transaction_payload: {
        kind: "revenue_post",
        asset_id: assetId,
        revenue_epoch_id: epochId,
      },
      message: "Stub revenue posting payload prepared",
    };
  }
}

export const issuerService = new IssuerService();
