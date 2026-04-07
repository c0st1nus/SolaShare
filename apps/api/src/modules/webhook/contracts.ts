import { z } from "zod";

// Helius webhook payload
export const heliusWebhookSchema = z.object({
  signature: z.string(),
  timestamp: z.number(),
  events: z
    .object({
      transfer: z
        .array(
          z.object({
            from: z.string(),
            to: z.string(),
            amount: z.number(),
            mint: z.string(),
          }),
        )
        .optional(),
    })
    .optional(),
  // Helius может передавать memo в разных полях
  memo: z.string().optional(),
  description: z.string().optional(),
  source: z.string().optional(),
  // Native transfers могут иметь memo в instruction
  instructions: z.array(z.any()).optional(),
});

export type HeliusWebhookPayload = z.infer<typeof heliusWebhookSchema>;
