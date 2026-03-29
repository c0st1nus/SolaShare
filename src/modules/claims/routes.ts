import { Elysia } from "elysia";
import { authPlugin, requireUserRole } from "../../plugins/auth";
import { claimPrepareBodySchema, claimPrepareResponseSchema } from "./contracts";
import { claimsService } from "./service";

export const claimsRoutes = new Elysia({ prefix: "/claims", tags: ["Claims"] })
  .use(authPlugin)
  .post(
    "/prepare",
    ({ auth, body }) =>
      claimsService.prepareClaim(requireUserRole(auth, ["investor", "admin"]), body),
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
