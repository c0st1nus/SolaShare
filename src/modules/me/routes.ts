import { Elysia } from "elysia";
import { authPlugin, requireAuthenticatedUser } from "../../plugins/auth";
import { meClaimsResponseSchema, mePortfolioResponseSchema } from "./contracts";
import { meService } from "./service";

export const meRoutes = new Elysia({ prefix: "/me", tags: ["Investor"] })
  .use(authPlugin)
  .get("/portfolio", ({ auth }) => meService.getPortfolio(requireAuthenticatedUser(auth).id), {
    detail: {
      summary: "Get authenticated investor portfolio",
    },
    response: {
      200: mePortfolioResponseSchema,
    },
  })
  .get("/claims", ({ auth }) => meService.getClaims(requireAuthenticatedUser(auth).id), {
    detail: {
      summary: "Get authenticated investor claim history",
    },
    response: {
      200: meClaimsResponseSchema,
    },
  });
