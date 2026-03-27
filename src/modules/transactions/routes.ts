import { Elysia } from "elysia";
import { transactionConfirmBodySchema, transactionConfirmResponseSchema } from "./contracts";
import { transactionsService } from "./service";

export const transactionsRoutes = new Elysia({
  prefix: "/transactions",
  tags: ["Transactions"],
}).post("/confirm", ({ body }) => transactionsService.confirmTransaction(body), {
  body: transactionConfirmBodySchema,
  detail: {
    summary: "Confirm transaction metadata for sync workflows",
  },
  response: {
    200: transactionConfirmResponseSchema,
  },
});
