import { z } from "zod";
import { successResponseSchema, uuidSchema } from "../shared/contracts";
import { userRoleSchema } from "../shared/domain";

export const telegramAuthBodySchema = z.object({
  telegram_init_data: z.string().min(1),
});

export const authUserSchema = z.object({
  id: uuidSchema,
  display_name: z.string(),
  role: userRoleSchema,
});

export const telegramAuthResponseSchema = z.object({
  access_token: z.string(),
  user: authUserSchema,
});

export const walletLinkBodySchema = z.object({
  wallet_address: z.string().min(32),
  signed_message: z.string().min(1),
});

export const walletLinkResponseSchema = successResponseSchema;
