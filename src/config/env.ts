import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  SOLANA_RPC_URL: z.string().url(),
  SOLANA_COMMITMENT: z.enum(["processed", "confirmed", "finalized"]),
  HELIUS_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(Bun.env);

export type Env = typeof env;
