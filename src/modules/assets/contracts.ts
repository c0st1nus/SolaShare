import { z } from "zod";
import {
  idParamSchema,
  numericStringSchema,
  paginationMetaSchema,
  paginationQuerySchema,
  uuidSchema,
} from "../shared/contracts";
import {
  assetDocumentTypeSchema,
  assetStatusSchema,
  energyTypeSchema,
  revenueStatusSchema,
  saleStatusSchema,
  storageProviderSchema,
} from "../shared/domain";

export const assetsQuerySchema = paginationQuerySchema.extend({
  status: assetStatusSchema.optional(),
  energy_type: energyTypeSchema.optional(),
  sort: z.enum(["newest", "yield_desc", "price_asc"]).default("newest"),
});

export const assetCardSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  energy_type: energyTypeSchema,
  capacity_kw: z.number(),
  status: assetStatusSchema,
  price_per_share_usdc: z.number(),
  expected_annual_yield_percent: z.number(),
});

export const assetsListResponseSchema = z.object({
  items: z.array(assetCardSchema),
  pagination: paginationMetaSchema,
});

export const assetRevenueItemSchema = z.object({
  id: uuidSchema,
  epoch_number: z.number().int().positive(),
  period_start: z.string().date(),
  period_end: z.string().date(),
  gross_revenue_usdc: z.number(),
  net_revenue_usdc: z.number(),
  distributable_revenue_usdc: z.number(),
  report_uri: z.string().url(),
  posting_status: revenueStatusSchema,
});

export const assetDocumentSchema = z.object({
  id: uuidSchema,
  type: assetDocumentTypeSchema,
  title: z.string(),
  storage_provider: storageProviderSchema,
  storage_uri: z.string().url(),
  content_hash: z.string(),
  is_public: z.boolean(),
});

export const assetHoldersSummarySchema = z.object({
  total_investors: z.number().int().nonnegative(),
  funded_percent: z.number().nonnegative(),
  total_distributed_usdc: z.number().nonnegative(),
  total_claimed_usdc: z.number().nonnegative(),
});

export const assetDetailSchema = z.object({
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
  issuer: z.object({
    id: uuidSchema,
    display_name: z.string(),
  }),
  sale_terms: z.object({
    valuation_usdc: numericStringSchema,
    total_shares: z.number().int().positive(),
    price_per_share_usdc: numericStringSchema,
    minimum_buy_amount_usdc: numericStringSchema,
    target_raise_usdc: numericStringSchema,
    sale_status: saleStatusSchema,
  }),
  public_documents: z.array(assetDocumentSchema),
  revenue_summary: z.object({
    total_epochs: z.number().int().nonnegative(),
    last_posted_epoch: z.number().int().nonnegative().nullable(),
  }),
  onchain_refs: z.object({
    onchain_asset_pubkey: z.string().nullable(),
    share_mint_pubkey: z.string().nullable(),
    vault_pubkey: z.string().nullable(),
  }),
});

export const assetIdParamSchema = idParamSchema;
export const assetRevenueResponseSchema = z.object({
  items: z.array(assetRevenueItemSchema),
});

export const assetDocumentsResponseSchema = z.object({
  items: z.array(assetDocumentSchema),
});

export const assetHoldersSummaryResponseSchema = assetHoldersSummarySchema;
