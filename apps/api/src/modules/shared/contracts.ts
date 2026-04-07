import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const isoDateSchema = z.string().date();
export const isoDateTimeSchema = z.string().datetime({ offset: true });
export const numericStringSchema = z.string().min(1);

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const paginationMetaSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});

export const successResponseSchema = z.object({
  success: z.literal(true),
});

export const messageResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export const idParamSchema = z.object({
  id: uuidSchema,
});

export const networkSchema = z.enum(["devnet", "mainnet", "localnet"]);

export const transactionMetadataBaseSchema = z.object({
  kind: z.string(),
  asset_id: uuidSchema,
});

export const transactionPayloadSchema = z.object({
  success: z.literal(true),
  operation_id: uuidSchema,
  serialized_tx: z.string().min(1),
  metadata: transactionMetadataBaseSchema.passthrough(),
  expires_at: z.number().int().positive(),
  network: networkSchema,
});
