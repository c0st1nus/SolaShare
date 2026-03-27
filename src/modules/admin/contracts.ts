import { z } from "zod";
import { idParamSchema, uuidSchema } from "../shared/contracts";
import { verificationDecisionOutcomeSchema } from "../shared/domain";

export const adminAssetActionParamsSchema = idParamSchema;

export const adminVerifyBodySchema = z.object({
  outcome: verificationDecisionOutcomeSchema,
  reason: z.string().optional(),
});

export const adminAssetActionResponseSchema = z.object({
  success: z.literal(true),
  asset_id: uuidSchema,
  resulting_status: z.string(),
});

export const auditLogsQuerySchema = z.object({
  entity_type: z.string().optional(),
  entity_id: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const auditLogsResponseSchema = z.object({
  items: z.array(
    z.object({
      id: uuidSchema,
      actor_user_id: uuidSchema.nullable(),
      entity_type: z.string(),
      entity_id: z.string(),
      action: z.string(),
      created_at: z.string().datetime({ offset: true }),
    }),
  ),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
  }),
});
