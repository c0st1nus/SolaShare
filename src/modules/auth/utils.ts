import { createHmac } from "node:crypto";
import { ApiError } from "../../lib/api-error";

export type TelegramIdentity = {
  telegramUserId: string;
  telegramUsername: string | null;
  displayName: string;
};

export type BootstrapRoleConfig = {
  adminTelegramIds?: string[];
  issuerTelegramIds?: string[];
};

export const getBearerToken = (authorizationHeader?: string) => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

export const getBootstrapRole = (telegramUserId: string, config: BootstrapRoleConfig = {}) => {
  if (config.adminTelegramIds?.includes(telegramUserId)) {
    return "admin" as const;
  }

  if (config.issuerTelegramIds?.includes(telegramUserId)) {
    return "issuer" as const;
  }

  return "investor" as const;
};

export const validateTelegramInitData = (telegramInitData: string, telegramBotToken?: string) => {
  const params = new URLSearchParams(telegramInitData);
  const hash = params.get("hash");

  if (!hash) {
    return;
  }

  if (!telegramBotToken) {
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

  const secretKey = createHmac("sha256", "WebAppData").update(telegramBotToken).digest();
  const computedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (computedHash !== hash) {
    throw new ApiError(
      401,
      "INVALID_TELEGRAM_SIGNATURE",
      "Telegram init data signature is invalid",
    );
  }
};

export const parseTelegramInitData = (telegramInitData: string): TelegramIdentity => {
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
      // Fall through to the simpler parser below.
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
