import { describe, expect, it } from "bun:test";
import { createHmac } from "node:crypto";
import { ApiError } from "../lib/api-error";
import {
  getBearerToken,
  getBootstrapRole,
  parseTelegramInitData,
  validateTelegramInitData,
} from "../modules/auth/utils";

const createSignedTelegramInitData = (payload: Record<string, string>, token: string) => {
  const params = new URLSearchParams(payload);
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(token).digest();
  const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  params.set("hash", hash);
  return params.toString();
};

describe("auth utils", () => {
  it("extracts bearer token from authorization header", () => {
    expect(getBearerToken("Bearer token-123")).toBe("token-123");
    expect(getBearerToken("Basic test")).toBeNull();
    expect(getBearerToken(undefined)).toBeNull();
  });

  it("parses telegram user payload", () => {
    const rawUser = JSON.stringify({
      id: 123,
      username: "waveofem",
      first_name: "Wave",
      last_name: "Ofem",
    });

    const result = parseTelegramInitData(`user=${encodeURIComponent(rawUser)}`);

    expect(result).toEqual({
      telegramUserId: "123",
      telegramUsername: "waveofem",
      displayName: "Wave Ofem",
    });
  });

  it("falls back to query params when user JSON is not provided", () => {
    const result = parseTelegramInitData("id=42&username=demo");

    expect(result).toEqual({
      telegramUserId: "42",
      telegramUsername: "demo",
      displayName: "demo",
    });
  });

  it("resolves bootstrap roles from configured telegram ids", () => {
    expect(getBootstrapRole("1", { adminTelegramIds: ["1"] })).toBe("admin");
    expect(getBootstrapRole("2", { issuerTelegramIds: ["2"] })).toBe("issuer");
    expect(getBootstrapRole("3", {})).toBe("investor");
  });

  it("validates a correctly signed telegram payload", () => {
    const signedPayload = createSignedTelegramInitData(
      {
        auth_date: "123456",
        query_id: "abc",
      },
      "telegram-token",
    );

    expect(() => validateTelegramInitData(signedPayload, "telegram-token")).not.toThrow();
  });

  it("rejects invalid telegram signatures", () => {
    expect(() =>
      validateTelegramInitData("auth_date=1&query_id=abc&hash=bad", "telegram-token"),
    ).toThrowError(ApiError);
  });

  it("requires a bot token when signed payload validation is requested", () => {
    const signedPayload = createSignedTelegramInitData(
      {
        auth_date: "123456",
      },
      "telegram-token",
    );

    expect(() => validateTelegramInitData(signedPayload)).toThrowError(ApiError);
  });
});
