import { Elysia } from "elysia";
import {
  telegramAuthBodySchema,
  telegramAuthResponseSchema,
  walletLinkBodySchema,
  walletLinkResponseSchema,
} from "./contracts";
import { authService } from "./service";

export const authRoutes = new Elysia({ prefix: "/auth", tags: ["Auth"] })
  .post("/telegram", ({ body }) => authService.authenticateWithTelegram(body), {
    body: telegramAuthBodySchema,
    detail: {
      summary: "Authenticate with Telegram WebApp init data",
    },
    response: {
      200: telegramAuthResponseSchema,
    },
  })
  .post("/wallet/link", ({ body }) => authService.linkWallet(body), {
    body: walletLinkBodySchema,
    detail: {
      summary: "Link a Solana wallet to the authenticated user",
    },
    response: {
      200: walletLinkResponseSchema,
    },
  });
