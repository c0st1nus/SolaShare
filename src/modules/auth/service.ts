import { and, eq, gt, isNull } from "drizzle-orm";
import type { z } from "zod";
import { env } from "../../config/env";
import { db } from "../../db";
import {
  auditLogs,
  authIdentities,
  passwordCredentials,
  userSessions,
  users,
  walletBindings,
} from "../../db/schema";
import { ApiError } from "../../lib/api-error";
import type {
  authMeResponseSchema,
  authSessionResponseSchema,
  googleAuthBodySchema,
  googleAuthUrlQuerySchema,
  googleAuthUrlResponseSchema,
  loginBodySchema,
  logoutBodySchema,
  refreshBodySchema,
  registerBodySchema,
  telegramLoginBodySchema,
  telegramMiniAppBodySchema,
  walletLinkBodySchema,
  walletLinkResponseSchema,
} from "./contracts";
import {
  generateOpaqueToken,
  getBootstrapRole,
  hashOpaqueToken,
  parseTelegramLoginPayload,
  parseTelegramMiniAppData,
  validateTelegramLoginPayload,
  validateTelegramMiniAppData,
} from "./utils";

type RegisterBody = z.infer<typeof registerBodySchema>;
type LoginBody = z.infer<typeof loginBodySchema>;
type RefreshBody = z.infer<typeof refreshBodySchema>;
type LogoutBody = z.infer<typeof logoutBodySchema>;
type GoogleAuthBody = z.infer<typeof googleAuthBodySchema>;
type GoogleAuthUrlQuery = z.infer<typeof googleAuthUrlQuerySchema>;
type TelegramLoginBody = z.infer<typeof telegramLoginBodySchema>;
type TelegramMiniAppBody = z.infer<typeof telegramMiniAppBodySchema>;
type AuthSessionResponse = z.infer<typeof authSessionResponseSchema>;
type AuthMeResponse = z.infer<typeof authMeResponseSchema>;
type GoogleAuthUrlResponse = z.infer<typeof googleAuthUrlResponseSchema>;
type WalletLinkBody = z.infer<typeof walletLinkBodySchema>;
type WalletLinkResponse = z.infer<typeof walletLinkResponseSchema>;

type JwtSigner = {
  sign(payload: { sub: string; exp: number }): Promise<string>;
};

type SessionContext = {
  ip?: string | null;
  userAgent?: string | null;
};

type GoogleIdentity = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
};

type GoogleAuthClient = {
  exchangeCode(input: { code: string; redirectUri: string }): Promise<GoogleIdentity>;
};

type AuthenticatedUser = {
  id: string;
};

type AuthProvider = "password" | "google" | "telegram";

const nowPlusSeconds = (seconds: number) => new Date(Date.now() + seconds * 1000);
const nowPlusDays = (days: number) => nowPlusSeconds(days * 24 * 60 * 60);
const normalizeEmail = (email: string) => email.trim().toLowerCase();

const buildGoogleAuthorizationUrl = (input: {
  clientId: string;
  redirectUri: string;
  state?: string;
}) => {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  });

  if (input.state) {
    params.set("state", input.state);
  }

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

const defaultGoogleAuthClient: GoogleAuthClient = {
  async exchangeCode({ code, redirectUri }) {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new ApiError(
        500,
        "GOOGLE_OAUTH_NOT_CONFIGURED",
        "Google OAuth credentials are not configured",
      );
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      throw new ApiError(
        401,
        "GOOGLE_OAUTH_EXCHANGE_FAILED",
        "Google authorization code exchange failed",
      );
    }

    const tokenPayload = (await tokenResponse.json()) as {
      access_token?: string;
    };

    if (!tokenPayload.access_token) {
      throw new ApiError(
        401,
        "GOOGLE_OAUTH_EXCHANGE_FAILED",
        "Google OAuth did not return an access token",
      );
    }

    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: {
        authorization: `Bearer ${tokenPayload.access_token}`,
      },
    });

    if (!profileResponse.ok) {
      throw new ApiError(401, "GOOGLE_PROFILE_FETCH_FAILED", "Failed to load Google profile");
    }

    const profile = (await profileResponse.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
    };

    if (!profile.sub || !profile.email) {
      throw new ApiError(401, "GOOGLE_PROFILE_INVALID", "Google profile response is incomplete");
    }

    return {
      sub: profile.sub,
      email: normalizeEmail(profile.email),
      emailVerified: Boolean(profile.email_verified),
      name: profile.name?.trim() || profile.email,
    };
  },
};

export class AuthService {
  private resolveBootstrapRole(telegramUserId: string) {
    return getBootstrapRole(telegramUserId, {
      adminTelegramIds: (env.ADMIN_TELEGRAM_IDS ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      issuerTelegramIds: (env.ISSUER_TELEGRAM_IDS ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    });
  }

  private async getAuthUser(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
    }

    if (user.status !== "active") {
      throw new ApiError(403, "FORBIDDEN", "User is not allowed to access this resource");
    }

    const providerRows = await db
      .select({
        provider: authIdentities.provider,
        email: authIdentities.email,
      })
      .from(authIdentities)
      .where(eq(authIdentities.userId, userId));

    const email = providerRows.find((row) => row.email)?.email ?? null;

    return {
      id: user.id,
      email,
      display_name: user.displayName ?? email ?? "SolaShare User",
      bio: user.bio ?? null,
      avatar_url: user.avatarUrl ?? null,
      role: user.role,
      kyc_status: user.kycStatus,
      auth_providers: [
        ...new Set(providerRows.map((row) => row.provider)),
      ].sort() as AuthProvider[],
    };
  }

  private async issueSession(
    userId: string,
    jwt: JwtSigner,
    context: SessionContext,
  ): Promise<AuthSessionResponse> {
    const accessExpiresAt = nowPlusSeconds(env.ACCESS_TOKEN_TTL_SECONDS);
    const accessToken = await jwt.sign({
      sub: userId,
      exp: Math.floor(accessExpiresAt.getTime() / 1000),
    });
    const refreshToken = generateOpaqueToken(48);

    await db.insert(userSessions).values({
      userId,
      sessionTokenHash: hashOpaqueToken(refreshToken),
      expiresAt: nowPlusDays(env.REFRESH_TOKEN_TTL_DAYS),
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
      lastUsedAt: new Date(),
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: env.ACCESS_TOKEN_TTL_SECONDS,
      user: await this.getAuthUser(userId),
    };
  }

  private async resolveUserBySessionToken(refreshToken: string) {
    const sessionTokenHash = hashOpaqueToken(refreshToken);
    const [session] = await db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.sessionTokenHash, sessionTokenHash),
          isNull(userSessions.revokedAt),
          gt(userSessions.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!session) {
      throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
    }

    const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);

    if (!user || user.status !== "active") {
      throw new ApiError(401, "UNAUTHORIZED", "Refresh token user is not active");
    }

    return {
      session,
      user,
    };
  }

  private async rotateSession(
    sessionId: string,
    userId: string,
    jwt: JwtSigner,
    context: SessionContext,
  ) {
    await db
      .update(userSessions)
      .set({
        revokedAt: new Date(),
        lastUsedAt: new Date(),
      })
      .where(eq(userSessions.id, sessionId));

    return this.issueSession(userId, jwt, context);
  }

  private async upsertTelegramIdentity(input: {
    providerUserId: string;
    displayName: string;
    telegramUsername: string | null;
    photoUrl?: string | null;
  }) {
    const [existingIdentity] = await db
      .select()
      .from(authIdentities)
      .where(
        and(
          eq(authIdentities.provider, "telegram"),
          eq(authIdentities.providerUserId, input.providerUserId),
        ),
      )
      .limit(1);

    if (existingIdentity) {
      const [updatedUser] = await db
        .update(users)
        .set({
          telegramUserId: input.providerUserId,
          telegramUsername: input.telegramUsername,
          displayName: input.displayName,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingIdentity.userId))
        .returning();

      await db
        .update(authIdentities)
        .set({
          profileJson: {
            username: input.telegramUsername,
            photo_url: input.photoUrl ?? null,
          },
          updatedAt: new Date(),
        })
        .where(eq(authIdentities.id, existingIdentity.id));

      return updatedUser;
    }

    const bootstrapRole = this.resolveBootstrapRole(input.providerUserId);

    return db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          telegramUserId: input.providerUserId,
          telegramUsername: input.telegramUsername,
          displayName: input.displayName,
          role: bootstrapRole,
        })
        .returning();

      await tx.insert(authIdentities).values({
        userId: user.id,
        provider: "telegram",
        providerUserId: input.providerUserId,
        profileJson: {
          username: input.telegramUsername,
          photo_url: input.photoUrl ?? null,
        },
      });

      return user;
    });
  }

  private async upsertGoogleIdentity(identity: GoogleIdentity) {
    const [existingGoogleIdentity] = await db
      .select()
      .from(authIdentities)
      .where(
        and(eq(authIdentities.provider, "google"), eq(authIdentities.providerUserId, identity.sub)),
      )
      .limit(1);

    if (existingGoogleIdentity) {
      const [updatedUser] = await db
        .update(users)
        .set({
          displayName: identity.name,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingGoogleIdentity.userId))
        .returning();

      await db
        .update(authIdentities)
        .set({
          email: identity.email,
          emailVerifiedAt: identity.emailVerified ? new Date() : null,
          profileJson: {
            name: identity.name,
          },
          updatedAt: new Date(),
        })
        .where(eq(authIdentities.id, existingGoogleIdentity.id));

      return updatedUser;
    }

    const [matchingEmailIdentity] = await db
      .select()
      .from(authIdentities)
      .where(eq(authIdentities.email, identity.email))
      .limit(1);

    if (matchingEmailIdentity) {
      await db.insert(authIdentities).values({
        userId: matchingEmailIdentity.userId,
        provider: "google",
        providerUserId: identity.sub,
        email: identity.email,
        emailVerifiedAt: identity.emailVerified ? new Date() : null,
        profileJson: {
          name: identity.name,
        },
      });

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, matchingEmailIdentity.userId))
        .limit(1);

      if (!user) {
        throw new ApiError(404, "USER_NOT_FOUND", "Linked Google user was not found");
      }

      return user;
    }

    return db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          displayName: identity.name,
        })
        .returning();

      await tx.insert(authIdentities).values({
        userId: user.id,
        provider: "google",
        providerUserId: identity.sub,
        email: identity.email,
        emailVerifiedAt: identity.emailVerified ? new Date() : null,
        profileJson: {
          name: identity.name,
        },
      });

      return user;
    });
  }

  async register(
    input: RegisterBody,
    jwt: JwtSigner,
    context: SessionContext = {},
  ): Promise<AuthSessionResponse> {
    const email = normalizeEmail(input.email);
    const [existingIdentity] = await db
      .select()
      .from(authIdentities)
      .where(eq(authIdentities.email, email))
      .limit(1);

    if (existingIdentity) {
      throw new ApiError(409, "EMAIL_ALREADY_REGISTERED", "Email address is already registered");
    }

    const passwordHash = await Bun.password.hash(input.password, {
      algorithm: "argon2id",
    });

    const user = await db.transaction(async (tx) => {
      const [createdUser] = await tx
        .insert(users)
        .values({
          displayName: input.display_name,
          role: "investor",
        })
        .returning();

      await tx.insert(authIdentities).values({
        userId: createdUser.id,
        provider: "password",
        providerUserId: email,
        email,
        profileJson: {
          email,
        },
      });

      await tx.insert(passwordCredentials).values({
        userId: createdUser.id,
        passwordHash,
      });

      await tx.insert(auditLogs).values({
        actorUserId: createdUser.id,
        entityType: "user",
        entityId: createdUser.id,
        action: "auth.password_registered",
        payloadJson: {
          email,
        },
      });

      return createdUser;
    });

    return this.issueSession(user.id, jwt, context);
  }

  async login(
    input: LoginBody,
    jwt: JwtSigner,
    context: SessionContext = {},
  ): Promise<AuthSessionResponse> {
    const email = normalizeEmail(input.email);
    const [identity] = await db
      .select()
      .from(authIdentities)
      .where(and(eq(authIdentities.provider, "password"), eq(authIdentities.providerUserId, email)))
      .limit(1);

    if (!identity) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const [credential] = await db
      .select()
      .from(passwordCredentials)
      .where(eq(passwordCredentials.userId, identity.userId))
      .limit(1);

    if (!credential) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const isValidPassword = await Bun.password.verify(input.password, credential.passwordHash);

    if (!isValidPassword) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    await db.insert(auditLogs).values({
      actorUserId: identity.userId,
      entityType: "user",
      entityId: identity.userId,
      action: "auth.password_login",
      payloadJson: {
        email,
      },
    });

    return this.issueSession(identity.userId, jwt, context);
  }

  async refresh(
    input: RefreshBody,
    jwt: JwtSigner,
    context: SessionContext = {},
  ): Promise<AuthSessionResponse> {
    const { session, user } = await this.resolveUserBySessionToken(input.refresh_token);

    await db
      .update(userSessions)
      .set({
        lastUsedAt: new Date(),
      })
      .where(eq(userSessions.id, session.id));

    await db.insert(auditLogs).values({
      actorUserId: user.id,
      entityType: "user_session",
      entityId: session.id,
      action: "auth.session_refreshed",
      payloadJson: {
        user_id: user.id,
      },
    });

    return this.rotateSession(session.id, user.id, jwt, context);
  }

  async logout(input: LogoutBody): Promise<{ success: true }> {
    const { session, user } = await this.resolveUserBySessionToken(input.refresh_token);

    await db
      .update(userSessions)
      .set({
        revokedAt: new Date(),
        lastUsedAt: new Date(),
      })
      .where(eq(userSessions.id, session.id));

    await db.insert(auditLogs).values({
      actorUserId: user.id,
      entityType: "user_session",
      entityId: session.id,
      action: "auth.logout",
      payloadJson: {
        user_id: user.id,
      },
    });

    return {
      success: true,
    };
  }

  async getAuthMe(currentUser: AuthenticatedUser): Promise<AuthMeResponse> {
    return {
      user: await this.getAuthUser(currentUser.id),
    };
  }

  async getGoogleAuthorizationUrl(query: GoogleAuthUrlQuery): Promise<GoogleAuthUrlResponse> {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new ApiError(
        500,
        "GOOGLE_OAUTH_NOT_CONFIGURED",
        "Google OAuth credentials are not configured",
      );
    }

    const redirectUri = query.redirect_uri ?? env.GOOGLE_OAUTH_REDIRECT_URI;

    if (!redirectUri) {
      throw new ApiError(
        500,
        "GOOGLE_REDIRECT_URI_REQUIRED",
        "Google redirect URI must be configured",
      );
    }

    return {
      authorization_url: buildGoogleAuthorizationUrl({
        clientId: env.GOOGLE_CLIENT_ID,
        redirectUri,
        state: query.state,
      }),
    };
  }

  async authenticateWithGoogle(
    input: GoogleAuthBody,
    jwt: JwtSigner,
    context: SessionContext = {},
    googleClient: GoogleAuthClient = defaultGoogleAuthClient,
  ): Promise<AuthSessionResponse> {
    const redirectUri = input.redirect_uri ?? env.GOOGLE_OAUTH_REDIRECT_URI;

    if (!redirectUri) {
      throw new ApiError(
        500,
        "GOOGLE_REDIRECT_URI_REQUIRED",
        "Google redirect URI must be configured",
      );
    }

    const identity = await googleClient.exchangeCode({
      code: input.code,
      redirectUri,
    });
    const user = await this.upsertGoogleIdentity(identity);

    await db.insert(auditLogs).values({
      actorUserId: user.id,
      entityType: "user",
      entityId: user.id,
      action: "auth.google_login",
      payloadJson: {
        google_sub: identity.sub,
        email: identity.email,
      },
    });

    return this.issueSession(user.id, jwt, context);
  }

  async authenticateWithTelegram(
    input: TelegramMiniAppBody,
    jwt: JwtSigner,
    context: SessionContext = {},
  ): Promise<AuthSessionResponse> {
    validateTelegramMiniAppData(input.telegram_init_data);

    const parsedIdentity = parseTelegramMiniAppData(input.telegram_init_data);
    const user = await this.upsertTelegramIdentity({
      providerUserId: parsedIdentity.telegramUserId,
      displayName: parsedIdentity.displayName,
      telegramUsername: parsedIdentity.telegramUsername,
      photoUrl: parsedIdentity.photoUrl,
    });

    await db.insert(auditLogs).values({
      actorUserId: user.id,
      entityType: "user",
      entityId: user.id,
      action: "auth.telegram_login",
      payloadJson: {
        telegram_user_id: parsedIdentity.telegramUserId,
        method: "miniapp",
      },
    });

    return this.issueSession(user.id, jwt, context);
  }

  async authenticateWithTelegramLogin(
    input: TelegramLoginBody,
    jwt: JwtSigner,
    context: SessionContext = {},
  ): Promise<AuthSessionResponse> {
    validateTelegramLoginPayload(input);

    const parsedIdentity = parseTelegramLoginPayload(input);
    const user = await this.upsertTelegramIdentity({
      providerUserId: parsedIdentity.telegramUserId,
      displayName: parsedIdentity.displayName,
      telegramUsername: parsedIdentity.telegramUsername,
      photoUrl: parsedIdentity.photoUrl,
    });

    await db.insert(auditLogs).values({
      actorUserId: user.id,
      entityType: "user",
      entityId: user.id,
      action: "auth.telegram_login",
      payloadJson: {
        telegram_user_id: parsedIdentity.telegramUserId,
        method: "widget",
      },
    });

    return this.issueSession(user.id, jwt, context);
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
