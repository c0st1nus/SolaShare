import { z } from "zod";
import { isoDateTimeSchema, successResponseSchema } from "../shared/contracts";

export const uploadPurposeSchema = z.enum(["kyc_document", "avatar_image"]);

export const presignUploadBodySchema = z.object({
  purpose: uploadPurposeSchema,
  file_name: z.string().trim().min(1).max(255),
  content_type: z.string().trim().min(1).max(255),
  size_bytes: z.coerce
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
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
