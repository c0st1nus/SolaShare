import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { z } from "zod";
import { env } from "../../config/env";
import { ApiError } from "../../lib/api-error";
import type { telegramLoginBodySchema, telegramMiniAppBodySchema } from "./contracts";

type TelegramMiniAppBody = z.infer<typeof telegramMiniAppBodySchema>;
type TelegramLoginBody = z.infer<typeof telegramLoginBodySchema>;

export type TelegramIdentity = {
  telegramUserId: string;
  telegramUsername: string | null;
  displayName: string;
  photoUrl?: string | null;
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

export const hashOpaqueToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const generateOpaqueToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

const ensureTelegramBotToken = (telegramBotToken?: string) => {
  if (!telegramBotToken) {
    throw new ApiError(
      500,
      "TELEGRAM_BOT_TOKEN_REQUIRED",
      "TELEGRAM_BOT_TOKEN must be configured to validate Telegram auth payloads",
    );
  }

  return telegramBotToken;
};

const compareSignature = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
};

export const validateTelegramMiniAppData = (
  telegramInitData: string,
  telegramBotToken = env.TELEGRAM_BOT_TOKEN,
) => {
  const params = new URLSearchParams(telegramInitData);
  const hash = params.get("hash");

  if (!hash) {
    throw new ApiError(
      401,
      "INVALID_TELEGRAM_SIGNATURE",
      "Telegram init data is missing a signature hash",
    );
  }

  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData")
    .update(ensureTelegramBotToken(telegramBotToken))
    .digest();
  const computedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (!compareSignature(computedHash, hash)) {
    throw new ApiError(
      401,
      "INVALID_TELEGRAM_SIGNATURE",
      "Telegram init data signature is invalid",
    );
  }
};

export const parseTelegramMiniAppData = (
  telegramInitData: TelegramMiniAppBody["telegram_init_data"],
): TelegramIdentity => {
  const params = new URLSearchParams(telegramInitData);
  const rawUser = params.get("user");

  if (rawUser) {
    try {
      const parsedUser = JSON.parse(rawUser) as {
        id?: number | string;
        username?: string;
        first_name?: string;
        last_name?: string;
        photo_url?: string;
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
        photoUrl: parsedUser.photo_url ?? null,
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
    photoUrl: null,
  };
};

export const validateTelegramLoginPayload = (
  input: TelegramLoginBody,
  telegramBotToken = env.TELEGRAM_BOT_TOKEN,
) => {
  const payload = new URLSearchParams();

  payload.set("auth_date", input.auth_date);
  payload.set("first_name", input.first_name);
  payload.set("id", input.id);

  if (input.last_name) {
    payload.set("last_name", input.last_name);
  }

  if (input.photo_url) {
    payload.set("photo_url", input.photo_url);
  }

  if (input.username) {
    payload.set("username", input.username);
  }

  const dataCheckString = [...payload.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHash("sha256").update(ensureTelegramBotToken(telegramBotToken)).digest();
  const computedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (!compareSignature(computedHash, input.hash)) {
    throw new ApiError(401, "INVALID_TELEGRAM_SIGNATURE", "Telegram login signature is invalid");
  }
};

export const parseTelegramLoginPayload = (input: TelegramLoginBody): TelegramIdentity => {
  const displayName = [input.first_name, input.last_name].filter(Boolean).join(" ").trim();

  return {
    telegramUserId: input.id,
    telegramUsername: input.username ?? null,
    displayName: (displayName || input.username) ?? `Telegram User ${input.id.slice(-6)}`,
    photoUrl: input.photo_url ?? null,
  };
};

export const validateTelegramInitData = validateTelegramMiniAppData;
export const parseTelegramInitData = parseTelegramMiniAppData;
