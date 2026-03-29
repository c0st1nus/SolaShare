import { z } from "zod";
import { uuidSchema } from "../shared/contracts";

export const transactionConfirmBodySchema = z.object({
  transaction_signature: z.string().min(1),
  kind: z.enum(["investment", "claim", "revenue_post", "wallet_link"]),
  operation_id: uuidSchema.optional(),
});

export const transactionConfirmResponseSchema = z.object({
  success: z.literal(true),
  sync_status: z.enum(["queued", "confirmed"]),
});
