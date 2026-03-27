import { Elysia } from "elysia";
import { meClaimsResponseSchema, mePortfolioResponseSchema } from "./contracts";
import { meService } from "./service";

export const meRoutes = new Elysia({ prefix: "/me", tags: ["Investor"] })
  .get("/portfolio", () => meService.getPortfolio(), {
    detail: {
      summary: "Get authenticated investor portfolio",
    },
    response: {
      200: mePortfolioResponseSchema,
    },
  })
  .get("/claims", () => meService.getClaims(), {
    detail: {
      summary: "Get authenticated investor claim history",
    },
    response: {
      200: meClaimsResponseSchema,
    },
  });
