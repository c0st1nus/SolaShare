import { z } from "zod";
import { isoDateTimeSchema, successResponseSchema } from "../shared/contracts";

export const uploadPurposeSchema = z.enum(["kyc_document", "avatar_image", "asset_document"]);

export const uploadMaxSizeBytes = {
  kyc_document: 10 * 1024 * 1024,
  avatar_image: 10 * 1024 * 1024,
  asset_document: 50 * 1024 * 1024,
} as const;

export const presignUploadBodySchema = z
  .object({
    purpose: uploadPurposeSchema,
    file_name: z.string().trim().min(1).max(255),
    content_type: z.string().trim().min(1).max(255),
    size_bytes: z.coerce.number().int().positive(),
  })
  .superRefine((value, ctx) => {
    const maxSizeBytes = uploadMaxSizeBytes[value.purpose];

    if (value.size_bytes > maxSizeBytes) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_big,
        path: ["size_bytes"],
        maximum: maxSizeBytes,
        inclusive: true,
        origin: "number",
        message: `Too big: expected number to be <=${maxSizeBytes}`,
      });
    }
  });

export const presignUploadResponseSchema = z.object({
  upload_url: z.string().url(),
  file_url: z.string().url(),
  upload_method: z.literal("PUT"),
  expires_at: isoDateTimeSchema,
});

export const directUploadQuerySchema = z.object({
  token: z.string().min(1),
});

export const directUploadResponseSchema = successResponseSchema.extend({
  file_url: z.string().url(),
  content_hash: z.string(),
});

export const uploadedFileParamsSchema = z.object({
  purpose: uploadPurposeSchema,
  name: z.string().min(1),
});
