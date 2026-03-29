import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { ApiError } from "./lib/api-error";
import { logger } from "./lib/logger";
import { adminRoutes } from "./modules/admin/routes";
import { assetsRoutes } from "./modules/assets/routes";
import { authRoutes } from "./modules/auth/routes";
import { claimsRoutes } from "./modules/claims/routes";
import { investmentsRoutes } from "./modules/investments/routes";
import { issuerRoutes } from "./modules/issuer/routes";
import { meRoutes } from "./modules/me/routes";
import { notificationsRoutes } from "./modules/notifications/routes";
import { systemRoutes } from "./modules/system/routes";
import { transactionsRoutes } from "./modules/transactions/routes";
import { webhookRoutes } from "./modules/webhook/routes";
import { openApiPlugin } from "./plugins/openapi";

const api = new Elysia({ prefix: "/api/v1" })
  .use(systemRoutes)
  .use(authRoutes)
  .use(assetsRoutes)
  .use(issuerRoutes)
  .use(meRoutes)
  .use(investmentsRoutes)
  .use(claimsRoutes)
  .use(transactionsRoutes)
  .use(notificationsRoutes)
  .use(webhookRoutes)
  .use(adminRoutes);

export const app = new Elysia()
  .use(cors())
  .use(openApiPlugin)
  .get("/", () => ({
    service: "solashare-api",
    version: "v1",
    status: "ok",
    docs: "/openapi",
    spec: "/openapi/json",
  }))
  .use(api)
  .onError(({ code, error, set, path }) => {
    const status =
      error instanceof ApiError
        ? error.status
        : code === "VALIDATION"
          ? 422
          : code === "NOT_FOUND"
            ? 404
            : code === "PARSE"
              ? 400
              : 500;

    logger.error(
      {
        code,
        path,
        status,
        error,
      },
      "Request failed",
    );

    set.status = status;

    return {
      error: {
        code:
          error instanceof ApiError
            ? error.code
            : code === "VALIDATION"
              ? "VALIDATION_ERROR"
              : code === "NOT_FOUND"
                ? "NOT_FOUND"
                : "INTERNAL_SERVER_ERROR",
        message:
          code === "VALIDATION"
            ? "Request validation failed"
            : error instanceof Error
              ? error.message
              : "Unexpected error",
      },
    };
  });
