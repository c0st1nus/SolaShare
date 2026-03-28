import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import { db } from "../../db";
import { users, walletBindings } from "../../db/schema";
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
    const parsedIdentity = parseTelegramInitData(input.telegram_init_data);
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.telegramUserId, parsedIdentity.telegramUserId))
      .limit(1);

    const user =
      existingUser ??
      (
        await db
          .insert(users)
          .values({
            telegramUserId: parsedIdentity.telegramUserId,
            telegramUsername: parsedIdentity.telegramUsername,
            displayName: parsedIdentity.displayName,
          })
          .returning()
      )[0];

    const accessToken = await jwt.sign({ sub: user.id });

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
          verificationMessage: input.signed_message,
          updatedAt: new Date(),
        })
        .where(eq(walletBindings.id, userWalletBinding.id));
    } else {
      await db.insert(walletBindings).values({
        userId: currentUser.id,
        walletAddress: input.wallet_address,
        verificationMessage: input.signed_message,
      });
    }

    return {
      success: true,
    };
  }
}

export const authService = new AuthService();
