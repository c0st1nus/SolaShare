import { Elysia } from "elysia";
import { authPlugin, requireAuthenticatedUser } from "../../plugins/auth";
import {
  authMeResponseSchema,
  authSessionResponseSchema,
  googleAuthBodySchema,
  googleAuthUrlQuerySchema,
  googleAuthUrlResponseSchema,
  loginBodySchema,
  logoutBodySchema,
  refreshBodySchema,
  registerBodySchema,
  telegramLoginBodySchema,
  telegramMiniAppBodySchema,
  walletChallengeRequestBodySchema,
  walletChallengeResponseSchema,
  walletLinkBodySchema,
  walletLinkResponseSchema,
  walletVerifyBodySchema,
  walletVerifyResponseSchema,
} from "./contracts";
import { authService } from "./service";

const getSessionContext = (request: Request) => ({
  ip: request.headers.get("x-forwarded-for"),
  userAgent: request.headers.get("user-agent"),
});

export const authRoutes = new Elysia({ prefix: "/auth", tags: ["Auth"] })
  .use(authPlugin)
  .post(
    "/register",
    ({ body, jwt, request }) => authService.register(body, jwt, getSessionContext(request)),
    {
      body: registerBodySchema,
      detail: {
        summary: "Register a password-based web account",
      },
      response: {
        200: authSessionResponseSchema,
      },
    },
  )
  .post(
    "/login",
    ({ body, jwt, request }) => authService.login(body, jwt, getSessionContext(request)),
    {
      body: loginBodySchema,
      detail: {
        summary: "Authenticate with email and password",
      },
      response: {
        200: authSessionResponseSchema,
      },
    },
  )
  .post(
    "/refresh",
    ({ body, jwt, request }) => authService.refresh(body, jwt, getSessionContext(request)),
    {
      body: refreshBodySchema,
      detail: {
        summary: "Rotate a refresh token and issue a new access token",
      },
      response: {
        200: authSessionResponseSchema,
      },
    },
  )
  .post("/logout", ({ body }) => authService.logout(body), {
    body: logoutBodySchema,
    detail: {
      summary: "Revoke a refresh session",
    },
  })
  .get("/me", ({ auth }) => authService.getAuthMe(requireAuthenticatedUser(auth)), {
    detail: {
      summary: "Read the current authenticated user profile",
    },
    response: {
      200: authMeResponseSchema,
    },
  })
  .get("/google/url", ({ query }) => authService.getGoogleAuthorizationUrl(query), {
    query: googleAuthUrlQuerySchema,
    detail: {
      summary: "Build the Google OAuth authorization URL",
    },
    response: {
      200: googleAuthUrlResponseSchema,
    },
  })
  .post(
    "/google",
    ({ body, jwt, request }) =>
      authService.authenticateWithGoogle(body, jwt, getSessionContext(request)),
    {
      body: googleAuthBodySchema,
      detail: {
        summary: "Exchange a Google authorization code and start a local session",
      },
      response: {
        200: authSessionResponseSchema,
      },
    },
  )
  .post(
    "/telegram",
    ({ body, jwt, request }) =>
      authService.authenticateWithTelegram(body, jwt, getSessionContext(request)),
    {
      body: telegramMiniAppBodySchema,
      detail: {
        summary: "Authenticate with Telegram Mini App init data",
      },
      response: {
        200: authSessionResponseSchema,
      },
    },
  )
  .post(
    "/telegram/miniapp",
    ({ body, jwt, request }) =>
      authService.authenticateWithTelegram(body, jwt, getSessionContext(request)),
    {
      body: telegramMiniAppBodySchema,
      detail: {
        summary: "Authenticate with Telegram Mini App init data",
      },
      response: {
        200: authSessionResponseSchema,
      },
    },
  )
  .post(
    "/telegram/login",
    ({ body, jwt, request }) =>
      authService.authenticateWithTelegramLogin(body, jwt, getSessionContext(request)),
    {
      body: telegramLoginBodySchema,
      detail: {
        summary: "Authenticate with Telegram Login Widget payload",
      },
      response: {
        200: authSessionResponseSchema,
      },
    },
  )
  .post(
    "/wallet/link",
    ({ auth, body }) => authService.linkWallet(requireAuthenticatedUser(auth), body),
    {
      body: walletLinkBodySchema,
      detail: {
        summary: "Link a Solana wallet to the authenticated user (legacy flow)",
        description:
          "Creates a pending wallet binding. For the secure flow, use /wallet/challenge and /wallet/verify instead.",
      },
      response: {
        200: walletLinkResponseSchema,
      },
    },
  )
  .post(
    "/wallet/challenge",
    ({ auth, body }) => authService.requestWalletChallenge(requireAuthenticatedUser(auth), body),
    {
      body: walletChallengeRequestBodySchema,
      detail: {
        summary: "Request a challenge for wallet ownership verification",
        description:
          "Returns a challenge message that must be signed by the wallet and submitted to /wallet/verify.",
      },
      response: {
        200: walletChallengeResponseSchema,
      },
    },
  )
  .post(
    "/wallet/verify",
    ({ auth, body }) => authService.verifyWalletChallenge(requireAuthenticatedUser(auth), body),
    {
      body: walletVerifyBodySchema,
      detail: {
        summary: "Verify a wallet signature and activate the binding",
        description:
          "Verifies the signature against the previously issued challenge. On success, activates the wallet binding.",
      },
      response: {
        200: walletVerifyResponseSchema,
      },
    },
  );
