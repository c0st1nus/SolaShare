import { z } from "zod";

const optionalNonEmptyString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const envSchema = z
  .object({
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),
    JWT_SECRET: z.string().min(1),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
    TELEGRAM_BOT_TOKEN: optionalNonEmptyString,
    TELEGRAM_BOT_USERNAME: optionalNonEmptyString,
    GOOGLE_CLIENT_ID: optionalNonEmptyString,
    GOOGLE_CLIENT_SECRET: optionalNonEmptyString,
    GOOGLE_OAUTH_REDIRECT_URI: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().url().optional(),
    ),
    SOLANA_RPC_URL: z.string().url(),
    SOLANA_COMMITMENT: z.enum(["processed", "confirmed", "finalized"]),
    SOLANA_PAYER_KEY: optionalNonEmptyString,
    SOLANA_PROGRAM_ID: optionalNonEmptyString,
    SOLANA_USDC_MINT_ADDRESS: optionalNonEmptyString,
    CHALLENGE_SECRET: z.string().min(32),
    CHALLENGE_EXPIRY_SECONDS: z.coerce.number().int().positive().default(600),
    STORAGE_PROVIDER: z.enum(["s3"]).default("s3"),
    S3_ENDPOINT: z.string().url(),
    S3_REGION: z.string().min(1).default("us-east-1"),
    S3_BUCKET: z.string().min(1),
    S3_ACCESS_KEY: z.string().min(1),
    S3_SECRET_KEY: z.string().min(1),
    HELIUS_API_KEY: z.string().optional(),
    HELIUS_WEBHOOK_SECRET: optionalNonEmptyString,
    CORS_ORIGINS: z.string().optional(),
    ADMIN_TELEGRAM_IDS: z.string().optional(),
    ISSUER_TELEGRAM_IDS: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const googleConfigPresent = [
      value.GOOGLE_CLIENT_ID,
      value.GOOGLE_CLIENT_SECRET,
      value.GOOGLE_OAUTH_REDIRECT_URI,
    ].some(Boolean);

    if (!googleConfigPresent) {
      return;
    }

    if (!value.GOOGLE_CLIENT_ID) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["GOOGLE_CLIENT_ID"],
        message: "GOOGLE_CLIENT_ID is required when Google OAuth is enabled",
      });
    }

    if (!value.GOOGLE_CLIENT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["GOOGLE_CLIENT_SECRET"],
        message: "GOOGLE_CLIENT_SECRET is required when Google OAuth is enabled",
      });
    }

    if (!value.GOOGLE_OAUTH_REDIRECT_URI) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["GOOGLE_OAUTH_REDIRECT_URI"],
        message: "GOOGLE_OAUTH_REDIRECT_URI is required when Google OAuth is enabled",
      });
    }

    if (value.GOOGLE_CLIENT_ID && !value.GOOGLE_CLIENT_ID.endsWith(".apps.googleusercontent.com")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["GOOGLE_CLIENT_ID"],
        message:
          "GOOGLE_CLIENT_ID must be a Google OAuth client id ending with .apps.googleusercontent.com",
      });
    }

    if (value.GOOGLE_OAUTH_REDIRECT_URI?.includes(".apps.googleusercontent.com")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["GOOGLE_OAUTH_REDIRECT_URI"],
        message:
          "GOOGLE_OAUTH_REDIRECT_URI must be a callback URL, not the Google client id. Example: http://localhost:3001/auth/google/callback",
      });
    }
  });

export const env = envSchema.parse(Bun.env);

export type Env = typeof env;
