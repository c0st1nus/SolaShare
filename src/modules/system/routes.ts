import { Elysia } from "elysia";
import { z } from "zod";

const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("solashare-api"),
  timestamp: z.string().datetime({ offset: true }),
});

const readinessResponseSchema = z.object({
  status: z.literal("ready"),
  dependencies: z.object({
    database: z.literal("configured"),
    redis: z.literal("configured"),
    solanaRpc: z.literal("configured"),
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
    () => ({
      status: "ready" as const,
      dependencies: {
        database: "configured" as const,
        redis: "configured" as const,
        solanaRpc: "configured" as const,
      },
    }),
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
