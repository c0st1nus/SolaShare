import { z } from "zod";
import {
  idParamSchema,
  messageResponseSchema,
  successResponseSchema,
  uuidSchema,
} from "../shared/contracts";
import {
  assetDocumentTypeSchema,
  energyTypeSchema,
  revenueSourceTypeSchema,
  storageProviderSchema,
} from "../shared/domain";

export const issuerAssetBodySchema = z.object({
  title: z.string().min(3),
  short_description: z.string().min(10),
  full_description: z.string().min(20),
  energy_type: energyTypeSchema,
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

export const issuerAssetDocumentBodySchema = z.object({
  type: assetDocumentTypeSchema,
  title: z.string().min(3),
  storage_provider: storageProviderSchema,
  storage_uri: z.string().url(),
  content_hash: z.string().min(3),
});

export const issuerAssetDocumentResponseSchema = z.object({
  document_id: uuidSchema,
  success: z.literal(true),
});

export const saleTermsBodySchema = z.object({
  valuation_usdc: z.number().positive(),
  total_shares: z.number().int().positive(),
  price_per_share_usdc: z.number().positive(),
  minimum_buy_amount_usdc: z.number().positive(),
  target_raise_usdc: z.number().positive(),
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

export const issuerRevenuePostParamsSchema = z.object({
  id: uuidSchema,
  epochId: uuidSchema,
});

export const revenuePostResponseSchema = z.object({
  success: z.literal(true),
  transaction_payload: z.object({
    kind: z.literal("revenue_post"),
    asset_id: uuidSchema,
    revenue_epoch_id: uuidSchema,
  }),
  message: z.string(),
});
