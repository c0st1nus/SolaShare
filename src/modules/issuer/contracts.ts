import { z } from "zod";
import {
  idParamSchema,
  isoDateTimeSchema,
  messageResponseSchema,
  numericStringSchema,
  paginationMetaSchema,
  paginationQuerySchema,
  successResponseSchema,
  transactionPayloadSchema,
  uuidSchema,
} from "../shared/contracts";
import {
  assetDocumentTypeSchema,
  assetStatusSchema,
  energyTypeSchema,
  revenueSourceTypeSchema,
  storageProviderSchema,
} from "../shared/domain";

export const issuerAssetBodySchema = z.object({
  title: z.string().min(3),
  short_description: z.string().min(10),
  full_description: z.string().min(20),
  energy_type: energyTypeSchema,
  cover_image_url: z.string().url().optional(),
  location_country: z.string().min(2),
  location_region: z.string().optional(),
  location_city: z.string().optional(),
  capacity_kw: z.number().positive(),
});

export const issuerAssetResponseSchema = z.object({
  asset_id: uuidSchema,
  status: z.literal("draft"),
});

export const issuerAssetUpdateBodySchema = issuerAssetBodySchema.partial();

export const issuerAssetListQuerySchema = paginationQuerySchema.extend({
  status: assetStatusSchema.optional(),
});

export const issuerAssetDocumentBodySchema = z.object({
  type: assetDocumentTypeSchema,
  title: z.string().min(3),
  storage_provider: storageProviderSchema,
  storage_uri: z.string().url(),
  content_hash: z.string().min(3),
  mime_type: z.string().trim().min(1).max(255).optional(),
  is_public: z.boolean().default(false),
});

export const issuerAssetDocumentResponseSchema = z.object({
  document_id: uuidSchema,
  success: z.literal(true),
});

export const saleTermsBodySchema = z.object({
  valuation_usdc: z.number().positive(),
  total_shares: z.number().int().positive().optional(),
  price_per_share_usdc: z.number().positive().optional(),
  minimum_buy_amount_usdc: z.number().positive(),
  target_raise_usdc: z.number().positive().optional(),
});

export const saleTermsResponseSchema = successResponseSchema.extend({
  asset_id: uuidSchema,
});

export const issuerSubmitResponseSchema = messageResponseSchema.extend({
  next_status: z.string(),
});

export const revenueEpochBodySchema = z.object({
  epoch_number: z.number().int().positive(),
  period_start: z.string().date(),
  period_end: z.string().date(),
  gross_revenue_usdc: z.number().nonnegative(),
  net_revenue_usdc: z.number().nonnegative(),
  distributable_revenue_usdc: z.number().nonnegative(),
  report_uri: z.string().url(),
  report_hash: z.string().min(3),
  source_type: revenueSourceTypeSchema,
});

export const revenueEpochResponseSchema = successResponseSchema.extend({
  revenue_epoch_id: uuidSchema,
});

export const issuerActionParamsSchema = idParamSchema;

export const issuerAssetListItemSchema = z.object({
  id: uuidSchema,
  slug: z.string(),
  title: z.string(),
  energy_type: energyTypeSchema,
  capacity_kw: z.number(),
  status: assetStatusSchema,
  location_city: z.string().nullable(),
  location_country: z.string(),
  price_per_share_usdc: z.number().nullable(),
  valuation_usdc: z.number().nullable(),
  total_shares: z.number().int().positive().nullable(),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
});

export const issuerAssetListResponseSchema = z.object({
  items: z.array(issuerAssetListItemSchema),
  pagination: paginationMetaSchema,
});

export const issuerAssetReviewIssueSchema = z.object({
  field: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(160).optional(),
  note: z.string().trim().min(1).max(2000),
  expected_value: z.string().trim().min(1).max(500).optional(),
  actual_value: z.string().trim().min(1).max(500).optional(),
  document_type: assetDocumentTypeSchema.optional(),
});

export const issuerAssetReviewFeedbackSchema = z.object({
  outcome: z.enum(["rejected", "needs_changes"]),
  reason: z.string().nullable(),
  created_at: isoDateTimeSchema,
  issues: z.array(issuerAssetReviewIssueSchema),
});

export const issuerAssetDetailSchema = z.object({
  id: uuidSchema,
  slug: z.string(),
  title: z.string(),
  short_description: z.string(),
  full_description: z.string(),
  energy_type: energyTypeSchema,
  status: assetStatusSchema,
  location: z.object({
    country: z.string(),
    region: z.string().nullable(),
    city: z.string().nullable(),
  }),
  capacity_kw: z.number(),
  currency: z.string(),
  expected_annual_yield_percent: z.number().nullable(),
  cover_image_url: z.string().url().nullable(),
  issuer: z.object({
    id: uuidSchema,
    display_name: z.string(),
  }),
  revenue_summary: z.object({
    total_epochs: z.number().int().nonnegative(),
    last_posted_epoch: z.number().int().nonnegative().nullable(),
  }),
  onchain_refs: z.object({
    onchain_asset_pubkey: z.string().nullable(),
    share_mint_pubkey: z.string().nullable(),
    vault_pubkey: z.string().nullable(),
  }),
  sale_terms: z
    .object({
      valuation_usdc: numericStringSchema,
      total_shares: z.number().int().positive(),
      price_per_share_usdc: numericStringSchema,
      minimum_buy_amount_usdc: numericStringSchema,
      target_raise_usdc: numericStringSchema,
      sale_status: z.enum(["draft", "scheduled", "live", "completed", "cancelled"]),
    })
    .nullable(),
  documents: z.array(
    z.object({
      id: uuidSchema,
      type: assetDocumentTypeSchema,
      title: z.string(),
      storage_provider: storageProviderSchema,
      storage_uri: z.string().url(),
      content_hash: z.string(),
      mime_type: z.string().nullable(),
      is_public: z.boolean(),
      created_at: isoDateTimeSchema,
    }),
  ),
  review_feedback: issuerAssetReviewFeedbackSchema.nullable(),
});

export const issuerRevenuePostParamsSchema = z.object({
  id: uuidSchema,
  epochId: uuidSchema,
});

export const revenuePostMetadataSchema = z.object({
  kind: z.literal("revenue_post"),
  asset_id: uuidSchema,
  revenue_epoch_id: uuidSchema,
  epoch_number: z.number().int().positive(),
  amount_usdc: z.number().nonnegative(),
});

export const revenuePostResponseSchema = transactionPayloadSchema.extend({
  metadata: revenuePostMetadataSchema,
});
