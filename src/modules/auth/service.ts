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
import { getBootstrapRole, parseTelegramInitData, validateTelegramInitData } from "./utils";

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

export class AuthService {
  async authenticateWithTelegram(
    input: TelegramAuthBody,
    jwt: JwtSigner,
  ): Promise<TelegramAuthResponse> {
    validateTelegramInitData(input.telegram_init_data, env.TELEGRAM_BOT_TOKEN);

    const parsedIdentity = parseTelegramInitData(input.telegram_init_data);
    const bootstrapRole = getBootstrapRole(parsedIdentity.telegramUserId, {
      adminTelegramIds: (env.ADMIN_TELEGRAM_IDS ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      issuerTelegramIds: (env.ISSUER_TELEGRAM_IDS ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    });
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
