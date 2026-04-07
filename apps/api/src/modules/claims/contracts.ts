import { z } from "zod";
import { transactionPayloadSchema, uuidSchema } from "../shared/contracts";

export const claimPrepareBodySchema = z.object({
  asset_id: uuidSchema,
  revenue_epoch_id: uuidSchema,
});

export const claimMetadataSchema = z.object({
  kind: z.literal("claim"),
  asset_id: uuidSchema,
  revenue_epoch_id: uuidSchema,
  epoch_number: z.number().int().positive(),
  claim_amount_usdc: z.number().positive(),
});

export const claimPrepareResponseSchema = transactionPayloadSchema.extend({
  metadata: claimMetadataSchema,
});
