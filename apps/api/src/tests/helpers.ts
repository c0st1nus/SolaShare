import { createHash, createHmac } from "node:crypto";
import { Keypair } from "@solana/web3.js";
import { eq } from "drizzle-orm";
import { app } from "../app";
import { env } from "../config/env";
import { client, db } from "../db";
import {
  assetSaleTerms,
  assets,
  authIdentities,
  type NewUser,
  passwordCredentials,
  shareMints,
  users,
  verificationDecisions,
  verificationRequests,
  walletBindings,
} from "../db/schema";
import { redis } from "../lib/redis";
import { adminService } from "../modules/admin/service";
import { issuerService } from "../modules/issuer/service";

export const resetTestState = async () => {
  if (!env.TEST_DATABASE_URL) {
    throw new Error(
      "TEST_DATABASE_URL is required for tests. Refusing to truncate the development database.",
    );
  }

  if (env.NODE_ENV !== "test") {
    throw new Error("resetTestState can only run when NODE_ENV=test.");
  }

  const activeDatabaseUrl = env.TEST_DATABASE_URL;
  const databaseName = new URL(activeDatabaseUrl).pathname.replace(/^\//, "");

  if (!databaseName.includes("test")) {
    throw new Error(
      `Refusing to reset non-test database "${databaseName}". Set TEST_DATABASE_URL to a dedicated test database.`,
    );
  }

  if (!env.SOLANA_USDC_MINT_ADDRESS) {
    Object.assign(env, {
      SOLANA_USDC_MINT_ADDRESS: Keypair.generate().publicKey.toBase58(),
    });
  }

  await client.unsafe(`
    TRUNCATE TABLE
      webhook_events,
      wallet_bindings,
      verification_decisions,
      verification_requests,
      password_credentials,
      auth_identities,
      user_sessions,
      transfers_index,
      share_mints,
      revenue_deposits,
      revenue_epochs,
      notifications,
      job_execution_logs,
      investments,
      idempotency_keys,
      holdings_snapshots,
      claims,
      audit_logs,
      asset_status_history,
      asset_sale_terms,
      asset_documents,
      assets,
      users
    RESTART IDENTITY CASCADE
  `);

  await redis.flushdb();
};

const toBase64Url = (value: string) => Buffer.from(value).toString("base64url");

export const createAccessToken = (userId: string) => {
  const header = toBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = toBase64Url(JSON.stringify({ sub: userId }));
  const signature = createHmac("sha256", env.JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
};

export const createSignedTelegramInitData = (payload: Record<string, string>) => {
  const telegramBotToken = env.TELEGRAM_BOT_TOKEN ?? "test-telegram-bot-token";

  if (!env.TELEGRAM_BOT_TOKEN) {
    Object.assign(env, {
      TELEGRAM_BOT_TOKEN: telegramBotToken,
    });
  }

  const params = new URLSearchParams(payload);
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(telegramBotToken).digest();
  const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  params.set("hash", hash);

  return params.toString();
};

export const createSignedTelegramLoginPayload = (payload: {
  id: string;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date?: string;
}) => {
  const telegramBotToken = env.TELEGRAM_BOT_TOKEN ?? "test-telegram-bot-token";

  if (!env.TELEGRAM_BOT_TOKEN) {
    Object.assign(env, {
      TELEGRAM_BOT_TOKEN: telegramBotToken,
    });
  }

  const authDate = payload.auth_date ?? "1710000000";
  const params = new URLSearchParams({
    auth_date: authDate,
    first_name: payload.first_name,
    id: payload.id,
  });

  if (payload.last_name) {
    params.set("last_name", payload.last_name);
  }

  if (payload.photo_url) {
    params.set("photo_url", payload.photo_url);
  }

  if (payload.username) {
    params.set("username", payload.username);
  }

  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHash("sha256").update(telegramBotToken).digest();
  const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  return {
    id: payload.id,
    first_name: payload.first_name,
    last_name: payload.last_name,
    username: payload.username,
    photo_url: payload.photo_url,
    auth_date: authDate,
    hash,
  };
};

export const createUser = async (overrides: Partial<NewUser> = {}) => {
  const [user] = await db
    .insert(users)
    .values({
      telegramUserId: overrides.telegramUserId ?? crypto.randomUUID(),
      displayName: overrides.displayName ?? "Test User",
      bio: overrides.bio ?? null,
      avatarUrl: overrides.avatarUrl ?? null,
      role: overrides.role ?? "investor",
      status: overrides.status ?? "active",
      kycStatus: overrides.kycStatus ?? "not_started",
      kycSubmittedAt: overrides.kycSubmittedAt ?? null,
      kycReviewedAt: overrides.kycReviewedAt ?? null,
      kycDecisionNotes: overrides.kycDecisionNotes ?? null,
      telegramUsername: overrides.telegramUsername ?? null,
      walletAddress: overrides.walletAddress ?? null,
    })
    .returning();

  return user;
};

export const createActiveWalletBinding = async (
  userId: string,
  walletAddress = Keypair.generate().publicKey.toBase58(),
) => {
  const [binding] = await db
    .insert(walletBindings)
    .values({
      userId,
      walletAddress,
      status: "active",
      verificationMessage: "signed",
      verifiedAt: new Date(),
    })
    .returning();

  return binding;
};

export const createPasswordUser = async ({
  email,
  password = "Password123!",
  displayName = "Password User",
  role = "investor",
  kycStatus = "not_started",
}: {
  email: string;
  password?: string;
  displayName?: string;
  role?: "investor" | "issuer" | "admin";
  kycStatus?: "not_started" | "pending" | "approved" | "rejected" | "needs_changes";
}) => {
  const [user] = await db
    .insert(users)
    .values({
      displayName,
      role,
      kycStatus,
    })
    .returning();

  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await Bun.password.hash(password, {
    algorithm: "argon2id",
  });

  await db.insert(authIdentities).values({
    userId: user.id,
    provider: "password",
    providerUserId: normalizedEmail,
    email: normalizedEmail,
    profileJson: {
      email: normalizedEmail,
    },
  });

  await db.insert(passwordCredentials).values({
    userId: user.id,
    passwordHash,
  });

  return user;
};

export const approveUserKyc = async (userId: string, adminUserId?: string) => {
  const [request] = await db
    .insert(verificationRequests)
    .values({
      requestedByUserId: userId,
      requestType: "kyc_review",
      status: "approved",
      payloadJson: {
        document_uri: "https://example.com/kyc/passport.pdf",
        document_hash: `sha256:${userId}`,
      },
      resolvedAt: new Date(),
    })
    .returning();

  await db
    .update(users)
    .set({
      kycStatus: "approved",
      kycSubmittedAt: new Date(),
      kycReviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  if (adminUserId) {
    await db.insert(verificationDecisions).values({
      verificationRequestId: request.id,
      decidedByUserId: adminUserId,
      outcome: "approved",
      reason: "Approved in test fixture",
    });
  }

  return request;
};

export const createAssetDraftFixture = async (
  issuer: { id: string },
  options?: {
    title?: string;
    shortDescription?: string;
    fullDescription?: string;
    energyType?: "solar" | "wind" | "hydro" | "ev_charging" | "other";
    isPublicDocument?: boolean;
    saleTerms?: {
      valuation_usdc?: number;
      total_shares?: number;
      price_per_share_usdc?: number;
      minimum_buy_amount_usdc?: number;
      target_raise_usdc?: number;
    };
  },
) => {
  const createdAsset = await issuerService.createAssetDraft(issuer, {
    title: options?.title ?? "Solar Asset",
    short_description: options?.shortDescription ?? "Yield-bearing solar asset used in tests",
    full_description:
      options?.fullDescription ??
      "Detailed yield-bearing solar asset used to validate service and API integration tests.",
    energy_type: options?.energyType ?? "solar",
    location_country: "Kazakhstan",
    location_region: "Almaty Region",
    location_city: "Almaty",
    capacity_kw: 100,
  });

  await issuerService.registerAssetDocument(issuer, createdAsset.asset_id, {
    type: "technical_passport",
    title: "Technical passport",
    storage_provider: "arweave",
    storage_uri: "https://example.com/docs/technical-passport",
    content_hash: `sha256:${createdAsset.asset_id}`,
    is_public: options?.isPublicDocument ?? true,
  });

  await issuerService.saveSaleTerms(issuer, createdAsset.asset_id, {
    valuation_usdc: options?.saleTerms?.valuation_usdc ?? 100000,
    total_shares: options?.saleTerms?.total_shares ?? 10000,
    price_per_share_usdc: options?.saleTerms?.price_per_share_usdc ?? 10,
    minimum_buy_amount_usdc: options?.saleTerms?.minimum_buy_amount_usdc ?? 50,
    target_raise_usdc: options?.saleTerms?.target_raise_usdc ?? 5000,
  });

  return createdAsset;
};

export const createActiveSaleAsset = async (
  issuer: { id: string },
  admin: { id: string },
  options?: Parameters<typeof createAssetDraftFixture>[1],
) => {
  const createdAsset = await createAssetDraftFixture(issuer, options);
  await issuerService.submitAssetForWorkflow(issuer, createdAsset.asset_id);
  await adminService.verifyAsset(admin, createdAsset.asset_id, {
    outcome: "approved",
    reason: "Approved in test fixture",
    issues: [],
  });
  await issuerService.submitAssetForWorkflow(issuer, createdAsset.asset_id);

  const [asset, saleTerms] = await Promise.all([
    db.select().from(assets).where(eq(assets.id, createdAsset.asset_id)).limit(1),
    db
      .select()
      .from(assetSaleTerms)
      .where(eq(assetSaleTerms.assetId, createdAsset.asset_id))
      .limit(1),
  ]);

  const resolvedAsset = asset[0];
  const resolvedSaleTerms = saleTerms[0];

  if (!resolvedAsset || !resolvedSaleTerms) {
    throw new Error("Expected active sale asset fixture to persist asset and sale terms");
  }

  return {
    asset: resolvedAsset,
    saleTerms: resolvedSaleTerms,
  };
};

export const initializeAssetOnchainFixture = async (assetId: string) => {
  const onchainAssetPubkey = Keypair.generate().publicKey.toBase58();
  const shareMintPubkey = Keypair.generate().publicKey.toBase58();
  const vaultPubkey = Keypair.generate().publicKey.toBase58();

  await db
    .update(assets)
    .set({
      onchainAssetPubkey,
      shareMintPubkey,
      vaultPubkey,
      updatedAt: new Date(),
    })
    .where(eq(assets.id, assetId));

  await db.insert(shareMints).values({
    assetId,
    mintAddress: shareMintPubkey,
    vaultAddress: vaultPubkey,
    tokenProgram: "spl-token",
    decimals: 6,
    status: "minted",
  });

  return {
    onchainAssetPubkey,
    shareMintPubkey,
    vaultPubkey,
  };
};

export const apiRequest = async ({
  method,
  path,
  body,
  token,
}: {
  method: string;
  path: string;
  body?: unknown;
  token?: string;
}) => {
  const headers = new Headers();

  if (body !== undefined) {
    headers.set("content-type", "application/json");
  }

  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  const response = await app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );

  const text = await response.text();
  let json: Record<string, unknown> | null = null;

  if (text) {
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      json = null;
    }
  }

  return {
    response,
    json,
    text,
  };
};
