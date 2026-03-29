import { beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { auditLogs, users, walletBindings } from "../db/schema";
import { ApiError } from "../lib/api-error";
import { authService } from "../modules/auth/service";
import { resetTestState } from "./helpers";

describe("auth integration", () => {
  beforeEach(async () => {
    await resetTestState();
  });

  it("creates a user on telegram auth and returns an access token", async () => {
    const response = await authService.authenticateWithTelegram(
      {
        telegram_init_data: "id=telegram-1&username=tester&display_name=Test%20User",
      },
      {
        sign: async ({ sub }) => `signed:${sub}`,
      },
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

  it("updates an existing user profile on repeated telegram auth", async () => {
    const [user] = await db
      .insert(users)
      .values({
        telegramUserId: "telegram-2",
        displayName: "Old Name",
        telegramUsername: "old",
      })
      .returning();

    const response = await authService.authenticateWithTelegram(
      {
        telegram_init_data: "id=telegram-2&username=newhandle&display_name=New%20Name",
      },
      {
        sign: async () => "token",
      },
    );

    expect(response.user.id).toBe(user.id);

    const [updatedUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    expect(updatedUser?.displayName).toBe("New Name");
    expect(updatedUser?.telegramUsername).toBe("newhandle");
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
        telegram_init_data: "id=telegram-audit&display_name=Audit%20User",
      },
      {
        sign: async () => "token",
      },
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
