import { Elysia } from "elysia";
import {
  investmentPrepareResponseSchema,
  investmentQuoteBodySchema,
  investmentQuoteResponseSchema,
} from "./contracts";
import { investmentsService } from "./service";

export const investmentsRoutes = new Elysia({ prefix: "/investments", tags: ["Investments"] })
  .post("/quote", ({ body }) => investmentsService.getQuote(body), {
    body: investmentQuoteBodySchema,
    detail: {
      summary: "Get investment quote",
    },
    response: {
      200: investmentQuoteResponseSchema,
    },
  })
  .post("/prepare", ({ body }) => investmentsService.prepareInvestment(body), {
    body: investmentQuoteBodySchema,
    detail: {
      summary: "Prepare investment transaction payload",
    },
    response: {
      200: investmentPrepareResponseSchema,
    },
  });
