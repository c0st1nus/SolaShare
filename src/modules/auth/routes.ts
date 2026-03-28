import { Elysia } from "elysia";
import { authPlugin, requireAuthenticatedUser } from "../../plugins/auth";
import {
  telegramAuthBodySchema,
  telegramAuthResponseSchema,
  walletLinkBodySchema,
  walletLinkResponseSchema,
} from "./contracts";
import { authService } from "./service";

export const authRoutes = new Elysia({ prefix: "/auth", tags: ["Auth"] })
  .use(authPlugin)
  .post("/telegram", ({ body, jwt }) => authService.authenticateWithTelegram(body, jwt), {
    body: telegramAuthBodySchema,
    detail: {
      summary: "Authenticate with Telegram WebApp init data",
    },
    response: {
      200: telegramAuthResponseSchema,
    },
  })
  .post(
    "/wallet/link",
    ({ auth, body }) => authService.linkWallet(requireAuthenticatedUser(auth), body),
    {
      body: walletLinkBodySchema,
      detail: {
        summary: "Link a Solana wallet to the authenticated user",
      },
      response: {
        200: walletLinkResponseSchema,
      },
    },
  );
