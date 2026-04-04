import { z } from "zod";
import { idParamSchema, uuidSchema } from "../shared/contracts";
import {
  kycStatusSchema,
  userRoleSchema,
  verificationDecisionOutcomeSchema,
  verificationRequestStatusSchema,
} from "../shared/domain";
import { kycDocumentTypeSchema } from "../me/contracts";

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

export const adminUserActionParamsSchema = idParamSchema;

export const adminUsersQuerySchema = z.object({
  role: userRoleSchema.optional(),
  status: z.enum(["active", "blocked"]).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const adminUsersResponseSchema = z.object({
  items: z.array(
    z.object({
      id: uuidSchema,
      display_name: z.string(),
      email: z.string().nullable(),
      role: userRoleSchema,
      status: z.enum(["active", "blocked"]),
      kyc_status: kycStatusSchema,
      auth_providers: z.array(z.enum(["password", "google", "telegram"])),
      created_at: z.string().datetime({ offset: true }),
    }),
  ),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
  }),
});

export const adminCreateUserBodySchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8).max(128),
  display_name: z.string().trim().min(1).max(120),
  role: userRoleSchema.default("investor"),
});

export const adminCreateUserResponseSchema = z.object({
  success: z.literal(true),
  user_id: uuidSchema,
  role: userRoleSchema,
});

export const adminUserRoleUpdateBodySchema = z.object({
  role: userRoleSchema,
  reason: z.string().trim().min(1).max(2000),
});

export const adminUserRoleUpdateResponseSchema = z.object({
  success: z.literal(true),
  user_id: uuidSchema,
  role: userRoleSchema,
});

export const adminDeleteUserResponseSchema = z.object({
  success: z.literal(true),
  user_id: uuidSchema,
});

export const adminKycReviewBodySchema = z.object({
  outcome: z.enum(["approved", "rejected", "needs_changes"]),
  reason: z.string().trim().min(1).max(2000).optional(),
});

export const adminKycReviewResponseSchema = z.object({
  success: z.literal(true),
  user_id: uuidSchema,
  verification_request_id: uuidSchema,
  kyc_status: kycStatusSchema,
});

export const adminKycRequestsQuerySchema = z.object({
  status: verificationRequestStatusSchema.default("pending"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const adminKycRequestsResponseSchema = z.object({
  items: z.array(
    z.object({
      verification_request_id: uuidSchema,
      user_id: uuidSchema,
      display_name: z.string(),
      email: z.string().nullable(),
      kyc_status: kycStatusSchema,
      document_type: kycDocumentTypeSchema,
      document_name: z.string(),
      mime_type: z.string(),
      document_uri: z.string().url(),
      document_hash: z.string(),
      notes: z.string().nullable(),
      created_at: z.string().datetime({ offset: true }),
    }),
  ),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
  }),
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
