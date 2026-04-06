import { z } from "zod";
import { issuerAssetDetailSchema } from "../issuer/contracts";
import { kycDocumentTypeSchema } from "../me/contracts";
import {
  idParamSchema,
  isoDateTimeSchema,
  paginationMetaSchema,
  paginationQuerySchema,
  uuidSchema,
} from "../shared/contracts";
import {
  assetStatusSchema,
  energyTypeSchema,
  kycStatusSchema,
  userRoleSchema,
  verificationDecisionOutcomeSchema,
  verificationRequestStatusSchema,
} from "../shared/domain";

export const adminAssetActionParamsSchema = idParamSchema;

export const adminAssetIssueSchema = z.object({
  field: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(160).optional(),
  note: z.string().trim().min(1).max(2000),
  expected_value: z.string().trim().min(1).max(500).optional(),
  actual_value: z.string().trim().min(1).max(500).optional(),
  document_type: z
    .enum([
      "ownership_doc",
      "right_to_income_doc",
      "technical_passport",
      "photo",
      "meter_info",
      "financial_model",
      "revenue_report",
      "other",
    ])
    .optional(),
});

export const adminVerifyBodySchema = z
  .object({
    outcome: verificationDecisionOutcomeSchema,
    reason: z.string().trim().max(2000).optional(),
    issues: z.array(adminAssetIssueSchema).max(20).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.outcome !== "approved" && !value.reason?.trim() && value.issues.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: "Reason or issues are required when review is not approved",
      });
    }
  });

export const adminAssetActionResponseSchema = z.object({
  success: z.literal(true),
  asset_id: uuidSchema,
  resulting_status: z.string(),
});

export const adminAssetsQuerySchema = paginationQuerySchema.extend({
  status: assetStatusSchema.optional(),
});

export const adminAssetsResponseSchema = z.object({
  items: z.array(
    z.object({
      id: uuidSchema,
      title: z.string(),
      slug: z.string(),
      energy_type: energyTypeSchema,
      capacity_kw: z.number(),
      status: assetStatusSchema,
      issuer_display_name: z.string(),
      location_country: z.string(),
      location_city: z.string().nullable(),
      created_at: isoDateTimeSchema,
      updated_at: isoDateTimeSchema,
    }),
  ),
  pagination: paginationMetaSchema,
});

export const adminAssetDetailSchema = issuerAssetDetailSchema;

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
