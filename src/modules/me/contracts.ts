import { z } from "zod";
import { authProviderSchema } from "../auth/contracts";
import { uuidSchema } from "../shared/contracts";
import { kycStatusSchema, userRoleSchema } from "../shared/domain";

export const meProfileSchema = z.object({
  id: uuidSchema,
  email: z.string().nullable(),
  display_name: z.string(),
  bio: z.string().nullable(),
  avatar_url: z.string().nullable(),
  role: userRoleSchema,
  kyc_status: kycStatusSchema,
  auth_providers: z.array(authProviderSchema),
});

export const meProfileResponseSchema = z.object({
  user: meProfileSchema,
});

export const meProfileUpdateBodySchema = z.object({
  display_name: z.string().trim().min(1).max(120).optional(),
  bio: z.string().trim().max(1000).nullable().optional(),
  avatar_url: z.string().url().max(2048).nullable().optional(),
});

export const meKycSubmitBodySchema = z.object({
  document_uri: z.string().url().max(2048),
  document_hash: z.string().trim().min(3).max(512),
  notes: z.string().trim().max(2000).optional(),
});

export const meKycSubmitResponseSchema = z.object({
  success: z.literal(true),
  kyc_status: z.literal("pending"),
  verification_request_id: uuidSchema,
});

export const mePortfolioResponseSchema = z.object({
  total_invested_usdc: z.number().nonnegative(),
  total_claimed_usdc: z.number().nonnegative(),
  total_unclaimed_usdc: z.number().nonnegative(),
  positions: z.array(
    z.object({
      asset_id: uuidSchema,
      title: z.string(),
      shares_amount: z.number().nonnegative(),
      shares_percentage: z.number().nonnegative(),
      unclaimed_usdc: z.number().nonnegative(),
    }),
  ),
});

export const meClaimsResponseSchema = z.object({
  items: z.array(
    z.object({
      claim_id: uuidSchema,
      asset_id: uuidSchema,
      revenue_epoch_id: uuidSchema,
      claim_amount_usdc: z.number().nonnegative(),
      status: z.enum(["pending", "confirmed", "failed"]),
      transaction_signature: z.string().nullable(),
    }),
  ),
});
