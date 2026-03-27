import { z } from "zod";
import { uuidSchema } from "../shared/contracts";

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
