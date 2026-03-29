import { z } from "zod";
import { uuidSchema } from "../shared/contracts";

export const claimPrepareBodySchema = z.object({
  asset_id: uuidSchema,
  revenue_epoch_id: uuidSchema,
});

export const claimPrepareResponseSchema = z.object({
  success: z.literal(true),
  operation_id: uuidSchema,
  signing_payload: z.object({
    kind: z.literal("claim"),
    asset_id: uuidSchema,
    revenue_epoch_id: uuidSchema,
  }),
  message: z.string(),
});
