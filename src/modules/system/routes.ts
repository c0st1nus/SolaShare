import { sql } from "drizzle-orm";
import { Elysia } from "elysia";
import { z } from "zod";
import { env } from "../../config/env";
import { db } from "../../db";
import { redis } from "../../lib/redis";

const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("solashare-api"),
  timestamp: z.string().datetime({ offset: true }),
});

const readinessResponseSchema = z.object({
  status: z.enum(["ready", "degraded"]),
  dependencies: z.object({
    database: z.enum(["ready", "failed"]),
    redis: z.enum(["ready", "failed"]),
    solanaRpc: z.enum(["ready", "failed"]),
  }),
});

export const systemRoutes = new Elysia({ tags: ["System"] })
  .get(
    "/health",
    () => ({
      status: "ok" as const,
      service: "solashare-api" as const,
      timestamp: new Date().toISOString(),
    }),
    {
      detail: {
        summary: "Liveness probe",
        description: "Simple health check for process liveness.",
      },
      response: {
        200: healthResponseSchema,
      },
    },
  )
  .get(
    "/ready",
    async ({ set }) => {
      const [databaseReady, redisReady, solanaRpcReady] = await Promise.all([
        db
          .execute(sql`select 1`)
          .then(() => true)
          .catch(() => false),
        redis
          .ping()
          .then(() => true)
          .catch(() => false),
        (() => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          return fetch(env.SOLANA_RPC_URL, {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "getHealth",
            }),
            signal: controller.signal,
          })
            .then((response) => response.ok)
            .catch(() => false)
            .finally(() => clearTimeout(timeout));
        })(),
      ]);

      const status =
        databaseReady && redisReady && solanaRpcReady ? ("ready" as const) : ("degraded" as const);

      if (status !== "ready") {
        set.status = 503;
      }

      return {
        status,
        dependencies: {
          database: databaseReady ? ("ready" as const) : ("failed" as const),
          redis: redisReady ? ("ready" as const) : ("failed" as const),
          solanaRpc: solanaRpcReady ? ("ready" as const) : ("failed" as const),
        },
      };
    },
    {
      detail: {
        summary: "Readiness probe",
        description: "Readiness endpoint for infrastructure and orchestration checks.",
      },
      response: {
        200: readinessResponseSchema,
      },
    },
  );
