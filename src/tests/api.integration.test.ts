import { beforeEach, describe, expect, it } from "bun:test";
import { env } from "../config/env";
import { db } from "../db";
import { userSessions, walletBindings } from "../db/schema";
import {
  apiRequest,
  createAccessToken,
  createActiveWalletBinding,
  createPasswordUser,
  createSignedTelegramInitData,
  createSignedTelegramLoginPayload,
  createUser,
  resetTestState,
} from "./helpers";

describe("api integration", () => {
  beforeEach(async () => {
    await resetTestState();
  });

  it("registers via password endpoint", async () => {
    const { response, json } = await apiRequest({
      method: "POST",
      path: "/api/v1/auth/register",
      body: {
        email: "api-register@example.com",
        password: "Password123!",
        display_name: "API Register",
      },
    });

    expect(response.status).toBe(200);
    expect(typeof json?.access_token).toBe("string");
    expect(typeof json?.refresh_token).toBe("string");
  });

  it("logs in via password endpoint", async () => {
    await createPasswordUser({
      email: "api-login@example.com",
      password: "Password123!",
      displayName: "API Login",
    });

    const { response, json } = await apiRequest({
      method: "POST",
      path: "/api/v1/auth/login",
      body: {
        email: "api-login@example.com",
        password: "Password123!",
      },
    });

    expect(response.status).toBe(200);
    expect(typeof json?.access_token).toBe("string");
  });

  it("refreshes and revokes refresh sessions over HTTP", async () => {
    const registerResult = await apiRequest({
      method: "POST",
      path: "/api/v1/auth/register",
      body: {
        email: "api-refresh@example.com",
        password: "Password123!",
        display_name: "API Refresh",
      },
    });
    const refreshToken = String(registerResult.json?.refresh_token);

    const refreshResult = await apiRequest({
      method: "POST",
      path: "/api/v1/auth/refresh",
      body: {
        refresh_token: refreshToken,
      },
    });

    expect(refreshResult.response.status).toBe(200);
    expect(String(refreshResult.json?.refresh_token)).not.toBe(refreshToken);

    const logoutResult = await apiRequest({
      method: "POST",
      path: "/api/v1/auth/logout",
      body: {
        refresh_token: String(refreshResult.json?.refresh_token),
      },
    });

    expect(logoutResult.response.status).toBe(200);

    const sessions = await db.select().from(userSessions);
    expect(sessions.filter((session) => session.revokedAt !== null).length).toBeGreaterThan(0);
  });

  it("returns the authenticated auth profile", async () => {
    const registerResult = await apiRequest({
      method: "POST",
      path: "/api/v1/auth/register",
      body: {
        email: "api-me@example.com",
        password: "Password123!",
        display_name: "API Me",
      },
    });

    const { response, json } = await apiRequest({
      method: "GET",
      path: "/api/v1/auth/me",
      token: String(registerResult.json?.access_token),
    });

    expect(response.status).toBe(200);
    expect(json?.user).toBeTruthy();
  });

  it("authenticates via telegram miniapp endpoint", async () => {
    const { response, json } = await apiRequest({
      method: "POST",
      path: "/api/v1/auth/telegram",
      body: {
        telegram_init_data: createSignedTelegramInitData({
          id: "api-auth",
          display_name: "API Auth",
        }),
      },
    });

    expect(response.status).toBe(200);
    expect(typeof json?.access_token).toBe("string");
  });

  it("authenticates via telegram login widget endpoint", async () => {
    const { response, json } = await apiRequest({
      method: "POST",
      path: "/api/v1/auth/telegram/login",
      body: createSignedTelegramLoginPayload({
        id: "api-widget",
        first_name: "API",
        last_name: "Widget",
        username: "apiwidget",
      }),
    });

    expect(response.status).toBe(200);
    expect(typeof json?.access_token).toBe("string");
  });

  it("returns a google authorization url when configured", async () => {
    Object.assign(env, {
      GOOGLE_CLIENT_ID: "google-client-id",
      GOOGLE_OAUTH_REDIRECT_URI: "https://web.solashare.test/auth/google/callback",
    });

    const { response, json } = await apiRequest({
      method: "GET",
      path: "/api/v1/auth/google/url",
    });

    expect(response.status).toBe(200);
    expect(String(json?.authorization_url)).toContain("accounts.google.com");
  });

  it("rejects protected routes without authentication", async () => {
    const { response, text } = await apiRequest({
      method: "GET",
      path: "/api/v1/me/portfolio",
    });

    expect(response.status).toBe(401);
    expect(text).toContain("Authentication required");
  });

  it("rejects forbidden admin access for investors", async () => {
    const investor = await createUser({
      role: "investor",
      telegramUserId: "api-investor",
    });
    const token = createAccessToken(investor.id);

    const { response, text } = await apiRequest({
      method: "GET",
      path: "/api/v1/admin/audit-logs",
      token,
    });

    expect(response.status).toBe(403);
    expect(text).toContain("User does not have access");
  });

  it("returns validation errors for malformed payloads", async () => {
    const investor = await createUser({
      role: "investor",
      telegramUserId: "api-invalid-payload",
    });
    const token = createAccessToken(investor.id);

    const { response } = await apiRequest({
      method: "POST",
      path: "/api/v1/investments/quote",
      token,
      body: {
        asset_id: "not-a-uuid",
        amount_usdc: -1,
      },
    });

    expect(response.status).toBe(422);
  });

  it("supports issuer and investment flow over HTTP", async () => {
    const issuer = await createUser({
      role: "issuer",
      telegramUserId: "api-issuer",
    });
    const admin = await createUser({
      role: "admin",
      telegramUserId: "api-admin",
    });
    const investor = await createUser({
      role: "investor",
      telegramUserId: "api-investor-flow",
    });
    await createActiveWalletBinding(investor.id);

    const { response: createResponse, json: createJson } = await apiRequest({
      method: "POST",
      path: "/api/v1/issuer/assets",
      token: createAccessToken(issuer.id),
      body: {
        title: "API Asset",
        short_description: "API asset for HTTP integration testing",
        full_description: "Detailed API asset for issuer HTTP integration testing.",
        energy_type: "solar",
        location_country: "Kazakhstan",
        location_city: "Almaty",
        capacity_kw: 100,
      },
    });
    expect(createResponse.status).toBe(200);
    const assetId = String(createJson?.asset_id);

    await apiRequest({
      method: "POST",
      path: `/api/v1/issuer/assets/${assetId}/documents`,
      token: createAccessToken(issuer.id),
      body: {
        type: "technical_passport",
        title: "Passport",
        storage_provider: "arweave",
        storage_uri: "https://example.com/passport",
        content_hash: "sha256:api-passport",
        is_public: true,
      },
    });
    await apiRequest({
      method: "POST",
      path: `/api/v1/issuer/assets/${assetId}/sale-terms`,
      token: createAccessToken(issuer.id),
      body: {
        valuation_usdc: 100000,
        total_shares: 10000,
        price_per_share_usdc: 10,
        minimum_buy_amount_usdc: 50,
        target_raise_usdc: 1000,
      },
    });
    await apiRequest({
      method: "POST",
      path: `/api/v1/issuer/assets/${assetId}/submit`,
      token: createAccessToken(issuer.id),
    });
    await apiRequest({
      method: "POST",
      path: `/api/v1/admin/assets/${assetId}/verify`,
      token: createAccessToken(admin.id),
      body: {
        outcome: "approved",
      },
    });
    await apiRequest({
      method: "POST",
      path: `/api/v1/issuer/assets/${assetId}/submit`,
      token: createAccessToken(issuer.id),
    });

    const quote = await apiRequest({
      method: "POST",
      path: "/api/v1/investments/quote",
      token: createAccessToken(investor.id),
      body: {
        asset_id: assetId,
        amount_usdc: 100,
      },
    });
    expect(quote.response.status).toBe(200);
    expect(quote.json?.shares_to_receive).toBe(10);
  });

  it("requires operation_id for investment confirmation", async () => {
    const investor = await createUser({
      role: "investor",
      telegramUserId: "api-op-id",
    });
    const token = createAccessToken(investor.id);

    const { response, text } = await apiRequest({
      method: "POST",
      path: "/api/v1/transactions/confirm",
      token,
      body: {
        kind: "investment",
        transaction_signature: "sig",
      },
    });

    expect(response.status).toBe(422);
    expect(text).toContain("operation_id");
  });

  it("creates a pending wallet binding over HTTP", async () => {
    const investor = await createUser({
      role: "investor",
      telegramUserId: "api-wallet",
    });
    const token = createAccessToken(investor.id);

    const { response } = await apiRequest({
      method: "POST",
      path: "/api/v1/auth/wallet/link",
      token,
      body: {
        wallet_address: "WalletApi44444444444444444444444444444444",
        signed_message: "signed",
      },
    });

    expect(response.status).toBe(200);

    const rows = await db.select().from(walletBindings);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("pending");
  });
});
