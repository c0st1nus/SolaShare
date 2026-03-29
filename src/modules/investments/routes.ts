import { Elysia } from "elysia";
import { authPlugin, requireUserRole } from "../../plugins/auth";
import {
  investmentPrepareResponseSchema,
  investmentQuoteBodySchema,
  investmentQuoteResponseSchema,
} from "./contracts";
import { investmentsService } from "./service";

export const investmentsRoutes = new Elysia({
  prefix: "/investments",
  tags: ["Investments"],
})
  .use(authPlugin)
  .post(
    "/quote",
    ({ auth, body }) =>
      investmentsService.getQuote(requireUserRole(auth, ["investor", "admin"]), body),
    {
      body: investmentQuoteBodySchema,
      detail: {
        summary: "Get investment quote",
      },
      response: {
        200: investmentQuoteResponseSchema,
      },
    },
  )
  .post(
    "/prepare",
    ({ auth, body }) =>
      investmentsService.prepareInvestment(requireUserRole(auth, ["investor", "admin"]), body),
    {
      body: investmentQuoteBodySchema,
      detail: {
        summary: "Prepare investment transaction payload",
      },
      response: {
        200: investmentPrepareResponseSchema,
      },
    },
  );
