import { beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { env } from "../config/env";
import { db } from "../db";
import { auditLogs, userSessions, users, verificationRequests, walletBindings } from "../db/schema";
import {
  apiRequest,
  createAccessToken,
  createActiveSaleAsset,
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

  it("reads and updates the authenticated profile", async () => {
    const user = await createPasswordUser({
      email: "profile@example.com",
      displayName: "Before Profile",
    });
    const token = createAccessToken(user.id);

    const before = await apiRequest({
      method: "GET",
      path: "/api/v1/me/profile",
      token,
    });

    expect(before.response.status).toBe(200);
    expect(before.json?.user).toMatchObject({
      display_name: "Before Profile",
      bio: null,
      avatar_url: null,
      kyc_status: "not_started",
    });

    const updated = await apiRequest({
      method: "PATCH",
      path: "/api/v1/me/profile",
      token,
      body: {
        display_name: "After Profile",
        bio: "Investor focused on renewable yield.",
        avatar_url: "https://cdn.example.com/avatar.png",
      },
    });

    expect(updated.response.status).toBe(200);
    expect(updated.json?.user).toMatchObject({
      display_name: "After Profile",
      bio: "Investor focused on renewable yield.",
      avatar_url: "https://cdn.example.com/avatar.png",
    });
  });

  it("submits KYC and lets admin review it over HTTP", async () => {
    const investor = await createUser({
      role: "investor",
      telegramUserId: "api-kyc-investor",
    });
    const admin = await createUser({
      role: "admin",
      telegramUserId: "api-kyc-admin",
    });

    const submit = await apiRequest({
      method: "POST",
      path: "/api/v1/me/kyc/submit",
      token: createAccessToken(investor.id),
      body: {
        document_uri: "https://example.com/kyc/passport.pdf",
        document_hash: "sha256:passport",
        notes: "Passport and proof of address",
      },
    });

    expect(submit.response.status).toBe(200);
    expect(submit.json).toMatchObject({
      success: true,
      kyc_status: "pending",
    });

    const review = await apiRequest({
      method: "POST",
      path: `/api/v1/admin/users/${investor.id}/kyc-review`,
      token: createAccessToken(admin.id),
      body: {
        outcome: "approved",
        reason: "Documents verified",
      },
    });

    expect(review.response.status).toBe(200);
    expect(review.json).toMatchObject({
      success: true,
      user_id: investor.id,
      kyc_status: "approved",
    });

    const [request] = await db.select().from(verificationRequests).limit(1);
    expect(request?.requestType).toBe("kyc_review");
    expect(request?.status).toBe("approved");
  });

  it("lets an admin assign issuer role over HTTP", async () => {
    const admin = await createUser({
      role: "admin",
      telegramUserId: "api-role-admin",
    });
    const investor = await createUser({
      role: "investor",
      telegramUserId: "api-role-investor",
    });

    const result = await apiRequest({
      method: "POST",
      path: `/api/v1/admin/users/${investor.id}/role`,
      token: createAccessToken(admin.id),
      body: {
        role: "issuer",
        reason: "Approved as issuer",
      },
    });

    expect(result.response.status).toBe(200);
    expect(result.json).toMatchObject({
      success: true,
      user_id: investor.id,
      role: "issuer",
    });

    const [updatedUser] = await db.select().from(users).where(eq(users.id, investor.id)).limit(1);
    expect(updatedUser?.role).toBe("issuer");

    const rows = await db.select().from(auditLogs);
    expect(rows.some((row) => row.action === "user.role.updated")).toBe(true);
  });

  it("lists and creates users over HTTP", async () => {
    const admin = await createUser({
      role: "admin",
      telegramUserId: "api-users-admin",
    });
    await createPasswordUser({
      email: "listed-user@example.com",
      displayName: "Listed User",
      role: "investor",
    });

    const listBefore = await apiRequest({
      method: "GET",
      path: "/api/v1/admin/users",
      token: createAccessToken(admin.id),
    });

    expect(listBefore.response.status).toBe(200);
    const listedItems = Array.isArray(listBefore.json?.items)
      ? (listBefore.json.items as Array<{ email?: string }>)
      : [];
    expect(listedItems.some((item) => item.email === "listed-user@example.com")).toBe(true);

    const createResult = await apiRequest({
      method: "POST",
      path: "/api/v1/admin/users",
      token: createAccessToken(admin.id),
      body: {
        email: "new-issuer@example.com",
        password: "Password123!",
        display_name: "New Issuer",
        role: "issuer",
      },
    });

    expect(createResult.response.status).toBe(200);
    expect(createResult.json).toMatchObject({
      success: true,
      role: "issuer",
    });
  });

  it("deletes an unreferenced user over HTTP", async () => {
    const admin = await createUser({
      role: "admin",
      telegramUserId: "api-delete-admin",
    });
    const deletable = await createPasswordUser({
      email: "delete-me@example.com",
      displayName: "Delete Me",
      role: "investor",
    });

    const result = await apiRequest({
      method: "DELETE",
      path: `/api/v1/admin/users/${deletable.id}`,
      token: createAccessToken(admin.id),
    });

    expect(result.response.status).toBe(200);
    expect(result.json).toMatchObject({
      success: true,
      user_id: deletable.id,
    });
  });

  it("blocks deleting a user with restricted references over HTTP", async () => {
    const admin = await createUser({
      role: "admin",
      telegramUserId: "api-delete-linked-admin",
    });
    const issuer = await createUser({
      role: "issuer",
      telegramUserId: "api-delete-linked-issuer",
    });

    await apiRequest({
      method: "POST",
      path: "/api/v1/issuer/assets",
      token: createAccessToken(issuer.id),
      body: {
        title: "Delete Blocked Asset",
        short_description: "Issuer has linked asset",
        full_description: "Issuer has linked asset and should not be deletable.",
        energy_type: "solar",
        location_country: "Kazakhstan",
        location_city: "Almaty",
        capacity_kw: 50,
      },
    });

    const result = await apiRequest({
      method: "DELETE",
      path: `/api/v1/admin/users/${issuer.id}`,
      token: createAccessToken(admin.id),
    });

    expect(result.response.status).toBe(409);
    expect(result.text).toContain("cannot be deleted");
  });

  it("prevents admin self-role changes over HTTP", async () => {
    const admin = await createUser({
      role: "admin",
      telegramUserId: "api-last-admin",
    });

    const result = await apiRequest({
      method: "POST",
      path: `/api/v1/admin/users/${admin.id}/role`,
      token: createAccessToken(admin.id),
      body: {
        role: "issuer",
        reason: "Attempt self demotion",
      },
    });

    expect(result.response.status).toBe(409);
    expect(result.text).toContain("Admins cannot change their own role");
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

  it("previews whether telegram miniapp auth should log in or register", async () => {
    const existingSession = await apiRequest({
      method: "POST",
      path: "/api/v1/auth/telegram",
      body: {
        telegram_init_data: createSignedTelegramInitData({
          id: "api-preview-existing",
          display_name: "Existing Mini App User",
        }),
      },
    });

    const existingPreview = await apiRequest({
      method: "POST",
      path: "/api/v1/auth/telegram/preview",
      body: {
        telegram_init_data: createSignedTelegramInitData({
          id: "api-preview-existing",
          display_name: "Existing Mini App User",
        }),
      },
    });

    expect(existingPreview.response.status).toBe(200);
    expect(existingPreview.json?.suggested_action).toBe("login");
    expect(existingPreview.json?.existing_account).not.toBeNull();
    expect((existingPreview.json?.existing_account as { user_id?: string }).user_id).toBe(
      (existingSession.json?.user as { id?: string }).id,
    );

    const newPreview = await apiRequest({
      method: "POST",
      path: "/api/v1/auth/telegram/preview",
      body: {
        telegram_init_data: createSignedTelegramInitData({
          id: "api-preview-new",
          display_name: "New Mini App User",
        }),
      },
    });

    expect(newPreview.response.status).toBe(200);
    expect(newPreview.json?.suggested_action).toBe("register");
    expect(newPreview.json?.existing_account).toBeNull();
  });

  it("links email/password to the authenticated telegram account over HTTP", async () => {
    const telegramSession = await apiRequest({
      method: "POST",
      path: "/api/v1/auth/telegram",
      body: {
        telegram_init_data: createSignedTelegramInitData({
          id: "api-password-link",
          display_name: "Telegram Browser User",
        }),
      },
    });

    const { response, json } = await apiRequest({
      method: "POST",
      path: "/api/v1/auth/password/link",
      token: createAccessToken((telegramSession.json?.user as { id: string }).id),
      body: {
        email: "browser-http@example.com",
        password: "Password123!",
      },
    });

    expect(response.status).toBe(200);
    expect(json?.success).toBe(true);
    expect((json?.user as { email?: string }).email).toBe("browser-http@example.com");
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
      kycStatus: "approved",
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

  it("blocks investment preparation until KYC is approved over HTTP", async () => {
    const issuer = await createUser({
      role: "issuer",
      telegramUserId: "api-kyc-block-issuer",
    });
    const admin = await createUser({
      role: "admin",
      telegramUserId: "api-kyc-block-admin",
    });
    const investor = await createUser({
      role: "investor",
      telegramUserId: "api-kyc-block-investor",
    });
    await createActiveWalletBinding(investor.id);
    const { asset } = await createActiveSaleAsset(issuer, admin);

    const { response, text } = await apiRequest({
      method: "POST",
      path: "/api/v1/investments/prepare",
      token: createAccessToken(investor.id),
      body: {
        asset_id: asset.id,
        amount_usdc: 100,
      },
    });

    expect(response.status).toBe(403);
    expect(text).toContain("KYC approval is required");
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
