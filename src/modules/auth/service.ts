import { createHmac } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import { env } from "../../config/env";
import { db } from "../../db";
import { auditLogs, users, walletBindings } from "../../db/schema";
import { ApiError } from "../../lib/api-error";
import type {
  telegramAuthBodySchema,
  telegramAuthResponseSchema,
  walletLinkBodySchema,
  walletLinkResponseSchema,
} from "./contracts";

type TelegramAuthBody = z.infer<typeof telegramAuthBodySchema>;
type TelegramAuthResponse = z.infer<typeof telegramAuthResponseSchema>;
type WalletLinkBody = z.infer<typeof walletLinkBodySchema>;
type WalletLinkResponse = z.infer<typeof walletLinkResponseSchema>;

type JwtSigner = {
  sign(payload: { sub: string }): Promise<string>;
};

type AuthenticatedUser = {
  id: string;
};

const bootstrapRoleMap = {
  admin: new Set(
    (env.ADMIN_TELEGRAM_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  ),
  issuer: new Set(
    (env.ISSUER_TELEGRAM_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  ),
};

const getBootstrapRole = (telegramUserId: string) => {
  if (bootstrapRoleMap.admin.has(telegramUserId)) {
    return "admin" as const;
  }

  if (bootstrapRoleMap.issuer.has(telegramUserId)) {
    return "issuer" as const;
  }

  return "investor" as const;
};

const validateTelegramInitData = (telegramInitData: string) => {
  const params = new URLSearchParams(telegramInitData);
  const hash = params.get("hash");

  if (!hash) {
    return;
  }

  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new ApiError(
      500,
      "TELEGRAM_BOT_TOKEN_REQUIRED",
      "TELEGRAM_BOT_TOKEN must be configured to validate signed Telegram init data",
    );
  }

  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(env.TELEGRAM_BOT_TOKEN).digest();
  const computedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (computedHash !== hash) {
    throw new ApiError(
      401,
      "INVALID_TELEGRAM_SIGNATURE",
      "Telegram init data signature is invalid",
    );
  }
};

const parseTelegramInitData = (telegramInitData: string) => {
  const params = new URLSearchParams(telegramInitData);
  const rawUser = params.get("user");

  if (rawUser) {
    try {
      const parsedUser = JSON.parse(rawUser) as {
        id?: number | string;
        username?: string;
        first_name?: string;
        last_name?: string;
      };

      const displayName = [parsedUser.first_name, parsedUser.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();

      return {
        telegramUserId: parsedUser.id ? String(parsedUser.id) : telegramInitData,
        telegramUsername: parsedUser.username ?? null,
        displayName:
          displayName ||
          parsedUser.username ||
          `Telegram User ${String(parsedUser.id ?? "").slice(-6)}`,
      };
    } catch {
      // Fall through to a simpler parser below.
    }
  }

  const telegramUserId = params.get("id") ?? telegramInitData;
  const telegramUsername = params.get("username");
  const displayName =
    params.get("display_name") ?? telegramUsername ?? `Telegram User ${telegramUserId.slice(-6)}`;

  return {
    telegramUserId,
    telegramUsername,
    displayName,
  };
};

export class AuthService {
  async authenticateWithTelegram(
    input: TelegramAuthBody,
    jwt: JwtSigner,
  ): Promise<TelegramAuthResponse> {
    validateTelegramInitData(input.telegram_init_data);

    const parsedIdentity = parseTelegramInitData(input.telegram_init_data);
    const bootstrapRole = getBootstrapRole(parsedIdentity.telegramUserId);
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.telegramUserId, parsedIdentity.telegramUserId))
      .limit(1);

    const user = existingUser
      ? (
          await db
            .update(users)
            .set({
              telegramUsername: parsedIdentity.telegramUsername,
              displayName: parsedIdentity.displayName,
              role: bootstrapRole,
              updatedAt: new Date(),
            })
            .where(eq(users.id, existingUser.id))
            .returning()
        )[0]
      : (
          await db
            .insert(users)
            .values({
              telegramUserId: parsedIdentity.telegramUserId,
              telegramUsername: parsedIdentity.telegramUsername,
              displayName: parsedIdentity.displayName,
              role: bootstrapRole,
            })
            .returning()
        )[0];

    const accessToken = await jwt.sign({ sub: user.id });

    await db.insert(auditLogs).values({
      actorUserId: user.id,
      entityType: "user",
      entityId: user.id,
      action: "auth.telegram_login",
      payloadJson: {
        telegram_user_id: parsedIdentity.telegramUserId,
      },
    });

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        display_name: user.displayName ?? parsedIdentity.displayName,
        role: user.role,
      },
    };
  }

  async linkWallet(
    currentUser: AuthenticatedUser,
    input: WalletLinkBody,
  ): Promise<WalletLinkResponse> {
    const [existingWalletBinding] = await db
      .select()
      .from(walletBindings)
      .where(eq(walletBindings.walletAddress, input.wallet_address))
      .limit(1);

    if (existingWalletBinding && existingWalletBinding.userId !== currentUser.id) {
      throw new ApiError(
        409,
        "WALLET_ALREADY_LINKED",
        "Wallet address is already linked to another user",
      );
    }

    const [userWalletBinding] = await db
      .select()
      .from(walletBindings)
      .where(
        and(
          eq(walletBindings.userId, currentUser.id),
          eq(walletBindings.walletAddress, input.wallet_address),
        ),
      )
      .limit(1);

    if (userWalletBinding) {
      await db
        .update(walletBindings)
        .set({
          status: "pending",
          verificationMessage: input.signed_message,
          updatedAt: new Date(),
        })
        .where(eq(walletBindings.id, userWalletBinding.id));
    } else {
      await db.insert(walletBindings).values({
        userId: currentUser.id,
        walletAddress: input.wallet_address,
        status: "pending",
        verificationMessage: input.signed_message,
      });
    }

    await db.insert(auditLogs).values({
      actorUserId: currentUser.id,
      entityType: "wallet_binding",
      entityId: input.wallet_address,
      action: "wallet_binding.requested",
      payloadJson: {
        wallet_address: input.wallet_address,
      },
    });

    return {
      success: true,
    };
  }
}

export const authService = new AuthService();
