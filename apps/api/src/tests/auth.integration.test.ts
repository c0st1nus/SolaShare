import { beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { auditLogs, authIdentities, userSessions, users, walletBindings } from "../db/schema";
import { ApiError } from "../lib/api-error";
import { bootstrapPasswordAdmin } from "../modules/auth/bootstrap";
import { authService } from "../modules/auth/service";
import {
  createPasswordUser,
  createSignedTelegramInitData,
  createSignedTelegramLoginPayload,
  resetTestState,
} from "./helpers";

const jwtSigner = {
  sign: async ({ sub }: { sub: string }) => `signed:${sub}`,
};

describe("auth integration", () => {
  beforeEach(async () => {
    await resetTestState();
  });

  it("registers a password user and returns access plus refresh tokens", async () => {
    const response = await authService.register(
      {
        email: "investor@example.com",
        password: "Password123!",
        display_name: "Investor One",
      },
      jwtSigner,
      {
        ip: "127.0.0.1",
        userAgent: "bun-test",
      },
    );

    expect(response.access_token.startsWith("signed:")).toBe(true);
    expect(response.refresh_token.length).toBeGreaterThan(20);
    expect(response.user.email).toBe("investor@example.com");
    expect(response.user.auth_providers).toEqual(["password"]);

    const [identity] = await db
      .select()
      .from(authIdentities)
      .where(eq(authIdentities.email, "investor@example.com"))
      .limit(1);
    expect(identity?.provider).toBe("password");

    const sessions = await db.select().from(userSessions);
    expect(sessions).toHaveLength(1);
  });

  it("bootstraps the first password admin only once", async () => {
    const first = await bootstrapPasswordAdmin({
      email: "admin@example.com",
      password: "StrongPassword123!",
      displayName: "Initial Admin",
    });

    expect(first.role).toBe("admin");

    const [adminUser] = await db.select().from(users).where(eq(users.id, first.userId)).limit(1);
    expect(adminUser?.role).toBe("admin");

    const rows = await db.select().from(auditLogs);
    expect(rows.some((row) => row.action === "system.bootstrap_admin_created")).toBe(true);

    await expect(
      bootstrapPasswordAdmin({
        email: "second-admin@example.com",
        password: "StrongPassword123!",
      }),
    ).rejects.toThrow(ApiError);
  });

  it("authenticates an existing password user", async () => {
    const user = await createPasswordUser({
      email: "login@example.com",
      password: "Password123!",
      displayName: "Login User",
    });

    const response = await authService.login(
      {
        email: "login@example.com",
        password: "Password123!",
      },
      jwtSigner,
    );

    expect(response.user.id).toBe(user.id);
    expect(response.user.auth_providers).toEqual(["password"]);
  });

  it("rejects invalid password credentials", async () => {
    await createPasswordUser({
      email: "login@example.com",
      password: "Password123!",
    });

    await expect(
      authService.login(
        {
          email: "login@example.com",
          password: "wrong-password",
        },
        jwtSigner,
      ),
    ).rejects.toThrow(ApiError);
  });

  it("rotates refresh sessions", async () => {
    const registered = await authService.register(
      {
        email: "refresh@example.com",
        password: "Password123!",
        display_name: "Refresh User",
      },
      jwtSigner,
    );

    const refreshed = await authService.refresh(
      {
        refresh_token: registered.refresh_token,
      },
      jwtSigner,
      {
        ip: "127.0.0.1",
      },
    );

    expect(refreshed.refresh_token).not.toBe(registered.refresh_token);

    const sessions = await db.select().from(userSessions);
    expect(sessions).toHaveLength(2);
    expect(sessions.filter((session) => session.revokedAt !== null)).toHaveLength(1);
  });

  it("revokes a refresh session on logout", async () => {
    const registered = await authService.register(
      {
        email: "logout@example.com",
        password: "Password123!",
        display_name: "Logout User",
      },
      jwtSigner,
    );

    const result = await authService.logout({
      refresh_token: registered.refresh_token,
    });

    expect(result.success).toBe(true);

    const [session] = await db.select().from(userSessions).limit(1);
    expect(session?.revokedAt).not.toBeNull();
  });

  it("creates a user on telegram miniapp auth and returns a session pair", async () => {
    const response = await authService.authenticateWithTelegram(
      {
        telegram_init_data: createSignedTelegramInitData({
          id: "telegram-1",
          username: "tester",
          display_name: "Test User",
        }),
      },
      jwtSigner,
    );

    expect(response.access_token.startsWith("signed:")).toBe(true);
    expect(response.user.role).toBe("investor");

    const [persistedUser] = await db
      .select()
      .from(users)
      .where(eq(users.telegramUserId, "telegram-1"))
      .limit(1);
    expect(persistedUser?.displayName).toBe("Test User");
  });

  it("returns a register suggestion for a new telegram miniapp user", async () => {
    const preview = await authService.previewTelegramAuth({
      telegram_init_data: createSignedTelegramInitData({
        id: "telegram-preview-new",
        username: "newuser",
        display_name: "New User",
      }),
    });

    expect(preview.suggested_action).toBe("register");
    expect(preview.existing_account).toBeNull();
    expect(preview.telegram_user.telegram_user_id).toBe("telegram-preview-new");
  });

  it("returns a login suggestion for an existing telegram miniapp user", async () => {
    const session = await authService.authenticateWithTelegram(
      {
        telegram_init_data: createSignedTelegramInitData({
          id: "telegram-preview-existing",
          username: "existinguser",
          display_name: "Existing User",
        }),
      },
      jwtSigner,
    );

    const preview = await authService.previewTelegramAuth({
      telegram_init_data: createSignedTelegramInitData({
        id: "telegram-preview-existing",
        username: "existinguser",
        display_name: "Existing User",
      }),
    });

    expect(preview.suggested_action).toBe("login");
    expect(preview.existing_account?.user_id).toBe(session.user.id);
    expect(preview.existing_account?.auth_providers).toEqual(["telegram"]);
  });

  it("updates an existing user profile on repeated telegram login widget auth", async () => {
    const miniappResponse = await authService.authenticateWithTelegram(
      {
        telegram_init_data: createSignedTelegramInitData({
          id: "telegram-2",
          username: "oldhandle",
          display_name: "Old Name",
        }),
      },
      jwtSigner,
    );

    const response = await authService.authenticateWithTelegramLogin(
      createSignedTelegramLoginPayload({
        id: "telegram-2",
        first_name: "New",
        last_name: "Name",
        username: "newhandle",
      }),
      jwtSigner,
    );

    expect(response.user.id).toBe(miniappResponse.user.id);

    const [updatedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, miniappResponse.user.id))
      .limit(1);
    expect(updatedUser?.displayName).toBe("New Name");
    expect(updatedUser?.telegramUsername).toBe("newhandle");
  });

  it("links google auth to an existing password user by email", async () => {
    const user = await createPasswordUser({
      email: "google@example.com",
      password: "Password123!",
      displayName: "Existing User",
    });

    const response = await authService.authenticateWithGoogle(
      {
        code: "google-code",
        redirect_uri: "https://web.solashare.test/auth/google/callback",
      },
      jwtSigner,
      {},
      {
        exchangeCode: async () => ({
          sub: "google-sub-1",
          email: "google@example.com",
          emailVerified: true,
          name: "Google User",
        }),
      },
    );

    expect(response.user.id).toBe(user.id);
    expect(response.user.auth_providers).toEqual(["google", "password"]);
  });

  it("links email and password to a telegram account so it can be used in a browser", async () => {
    const telegramSession = await authService.authenticateWithTelegram(
      {
        telegram_init_data: createSignedTelegramInitData({
          id: "telegram-password-link",
          username: "browseruser",
          display_name: "Browser User",
        }),
      },
      jwtSigner,
    );

    const linked = await authService.linkPasswordIdentity(
      { id: telegramSession.user.id },
      {
        email: "browser@example.com",
        password: "Password123!",
      },
    );

    expect(linked.success).toBe(true);
    expect(linked.user.auth_providers).toEqual(["password", "telegram"]);
    expect(linked.user.email).toBe("browser@example.com");

    const passwordSession = await authService.login(
      {
        email: "browser@example.com",
        password: "Password123!",
      },
      jwtSigner,
    );

    expect(passwordSession.user.id).toBe(telegramSession.user.id);
    expect(passwordSession.user.auth_providers).toEqual(["password", "telegram"]);
  });

  it("creates a pending wallet binding request", async () => {
    const [user] = await db
      .insert(users)
      .values({
        telegramUserId: "wallet-user",
        displayName: "Wallet User",
      })
      .returning();

    const result = await authService.linkWallet(
      { id: user.id },
      {
        wallet_address: "Wallet11111111111111111111111111111111",
        signed_message: "signature",
      },
    );

    expect(result.success).toBe(true);

    const [binding] = await db
      .select()
      .from(walletBindings)
      .where(eq(walletBindings.userId, user.id))
      .limit(1);
    expect(binding?.status).toBe("pending");
    expect(binding?.verificationMessage).toBe("signature");
  });

  it("updates an existing pending wallet binding for the same user", async () => {
    const [user] = await db
      .insert(users)
      .values({
        telegramUserId: "wallet-user-2",
        displayName: "Wallet User 2",
      })
      .returning();
    const [binding] = await db
      .insert(walletBindings)
      .values({
        userId: user.id,
        walletAddress: "Wallet22222222222222222222222222222222",
        status: "pending",
        verificationMessage: "old",
      })
      .returning();

    await authService.linkWallet(
      { id: user.id },
      {
        wallet_address: binding.walletAddress,
        signed_message: "new-signature",
      },
    );

    const [updatedBinding] = await db
      .select()
      .from(walletBindings)
      .where(eq(walletBindings.id, binding.id))
      .limit(1);
    expect(updatedBinding?.verificationMessage).toBe("new-signature");
  });

  it("rejects linking a wallet that already belongs to another user", async () => {
    const [owner, otherUser] = await db
      .insert(users)
      .values([
        {
          telegramUserId: "owner",
          displayName: "Owner",
        },
        {
          telegramUserId: "other",
          displayName: "Other",
        },
      ])
      .returning();

    await db.insert(walletBindings).values({
      userId: owner.id,
      walletAddress: "Wallet33333333333333333333333333333333",
      status: "pending",
      verificationMessage: "old",
    });

    await expect(
      authService.linkWallet(
        { id: otherUser.id },
        {
          wallet_address: "Wallet33333333333333333333333333333333",
          signed_message: "signature",
        },
      ),
    ).rejects.toThrow(ApiError);
  });

  it("writes auth and wallet audit logs", async () => {
    const response = await authService.authenticateWithTelegram(
      {
        telegram_init_data: createSignedTelegramInitData({
          id: "telegram-audit",
          display_name: "Audit User",
        }),
      },
      jwtSigner,
    );

    await authService.linkWallet(
      { id: response.user.id },
      {
        wallet_address: "Wallet44444444444444444444444444444444",
        signed_message: "signature",
      },
    );

    const rows = await db.select().from(auditLogs);
    expect(rows.some((row) => row.action === "auth.telegram_login")).toBe(true);
    expect(rows.some((row) => row.action === "wallet_binding.requested")).toBe(true);
  });
});
