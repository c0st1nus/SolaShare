import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  TELEGRAM_BOT_TOKEN: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).optional(),
  ),
  TELEGRAM_BOT_USERNAME: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).optional(),
  ),
  GOOGLE_CLIENT_ID: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).optional(),
  ),
  GOOGLE_CLIENT_SECRET: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).optional(),
  ),
  GOOGLE_OAUTH_REDIRECT_URI: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().url().optional(),
  ),
  SOLANA_RPC_URL: z.string().url(),
  SOLANA_COMMITMENT: z.enum(["processed", "confirmed", "finalized"]),
  HELIUS_API_KEY: z.string().optional(),
  HELIUS_WEBHOOK_SECRET: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).optional(),
  ),
  CORS_ORIGINS: z.string().optional(),
  ADMIN_TELEGRAM_IDS: z.string().optional(),
  ISSUER_TELEGRAM_IDS: z.string().optional(),
});

export const env = envSchema.parse(Bun.env);

export type Env = typeof env;
