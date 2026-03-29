import { z } from "zod";
import { uuidSchema } from "../shared/contracts";

export const investmentQuoteBodySchema = z.object({
  asset_id: uuidSchema,
  amount_usdc: z.number().positive(),
});

export const investmentQuoteResponseSchema = z.object({
  shares_to_receive: z.number().positive(),
  price_per_share_usdc: z.number().positive(),
  fees_usdc: z.number().nonnegative(),
});

export const investmentPrepareResponseSchema = z.object({
  success: z.literal(true),
  operation_id: uuidSchema,
  signing_payload: z.object({
    kind: z.literal("investment"),
    asset_id: uuidSchema,
    amount_usdc: z.number().positive(),
  }),
  message: z.string(),
});
