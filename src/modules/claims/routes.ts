import { Elysia } from "elysia";
import { claimPrepareBodySchema, claimPrepareResponseSchema } from "./contracts";
import { claimsService } from "./service";

export const claimsRoutes = new Elysia({ prefix: "/claims", tags: ["Claims"] }).post(
  "/prepare",
  ({ body }) => claimsService.prepareClaim(body),
  {
    body: claimPrepareBodySchema,
    detail: {
      summary: "Prepare claim transaction payload",
    },
    response: {
      200: claimPrepareResponseSchema,
    },
  },
);
