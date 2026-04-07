import { Elysia } from "elysia";
import { authPlugin, requireAuthenticatedUser } from "../../plugins/auth";
import { transactionConfirmBodySchema, transactionConfirmResponseSchema } from "./contracts";
import { transactionsService } from "./service";

export const transactionsRoutes = new Elysia({
  prefix: "/transactions",
  tags: ["Transactions"],
})
  .use(authPlugin)
  .post(
    "/confirm",
    ({ auth, body }) =>
      transactionsService.confirmTransaction(requireAuthenticatedUser(auth), body),
    {
      body: transactionConfirmBodySchema,
      detail: {
        summary: "Confirm transaction metadata for sync workflows",
      },
      response: {
        200: transactionConfirmResponseSchema,
      },
    },
  );
