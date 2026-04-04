import { z } from "zod";
import { successResponseSchema, uuidSchema } from "../shared/contracts";
import { kycStatusSchema, userRoleSchema } from "../shared/domain";

export const authProviderSchema = z.enum(["password", "google", "telegram"]);

export const registerBodySchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8).max(128),
  display_name: z.string().trim().min(1).max(120),
});

export const loginBodySchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1).max(128),
});

export const refreshBodySchema = z.object({
  refresh_token: z.string().min(32),
});

export const logoutBodySchema = refreshBodySchema;

export const googleAuthUrlQuerySchema = z.object({
  redirect_uri: z.string().url().optional(),
  state: z.string().min(1).max(512).optional(),
});

export const googleAuthBodySchema = z.object({
  code: z.string().min(1),
  redirect_uri: z.string().url().optional(),
});

export const telegramLoginBodySchema = z.object({
  id: z.union([z.string(), z.number()]).transform((value) => String(value)),
  first_name: z.string().trim().min(1),
  last_name: z.string().trim().optional(),
  username: z.string().trim().optional(),
  photo_url: z.string().url().optional(),
  auth_date: z
    .union([z.string(), z.number()])
    .transform((value) => String(value)),
  hash: z.string().min(1),
});

export const telegramMiniAppBodySchema = z.object({
  telegram_init_data: z.string().min(1),
});

export const authUserSchema = z.object({
  id: uuidSchema,
  email: z.string().nullable(),
  display_name: z.string(),
  bio: z.string().nullable(),
  avatar_url: z.string().nullable(),
  role: userRoleSchema,
  kyc_status: kycStatusSchema,
  wallet_address: z.string().nullable().optional(),
  auth_providers: z.array(authProviderSchema),
});

export const authSessionResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  token_type: z.literal("Bearer"),
  expires_in: z.number().int().positive(),
  user: authUserSchema,
});

export const authMeResponseSchema = z.object({
  user: authUserSchema,
});

export const googleAuthUrlResponseSchema = z.object({
  authorization_url: z.string().url(),
});

export const walletLinkBodySchema = z.object({
  wallet_address: z.string().min(32),
  signed_message: z.string().min(1),
});

export const walletLinkResponseSchema = successResponseSchema;

export const walletChallengeRequestBodySchema = z.object({
  wallet_address: z.string().min(32).max(64),
});

export const walletChallengeResponseSchema = z.object({
  challenge: z.string(),
  nonce: z.string(),
  expires_at: z.string().datetime(),
});

export const walletVerifyBodySchema = z.object({
  wallet_address: z.string().min(32).max(64),
  challenge: z.string().min(1),
  signature: z.string().min(1),
});

export const walletVerifyResponseSchema = z.object({
  success: z.boolean(),
  verified: z.boolean(),
  error: z.string().optional(),
});
