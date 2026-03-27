import type { z } from "zod";
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

export class AuthService {
  authenticateWithTelegram(_input: TelegramAuthBody): TelegramAuthResponse {
    return {
      access_token: "stub-access-token",
      user: {
        id: "11111111-1111-4111-8111-111111111111",
        display_name: "Stub Investor",
        role: "investor",
      },
    };
  }

  linkWallet(_input: WalletLinkBody): WalletLinkResponse {
    return {
      success: true,
    };
  }
}

export const authService = new AuthService();
