import { jwt } from "@elysiajs/jwt";
import { eq } from "drizzle-orm";
import type { Elysia } from "elysia";
import { env } from "../config/env";
import { db } from "../db";
import { type User, users } from "../db/schema";
import { ApiError } from "../lib/api-error";

const getBearerToken = (authorizationHeader?: string) => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

export const authPlugin = (app: Elysia) =>
  app
    .use(
      jwt({
        name: "jwt",
        secret: env.JWT_SECRET,
      }),
    )
    .derive(async ({ headers, jwt }) => {
      const token = getBearerToken(headers.authorization);

      if (!token) {
        return {
          auth: {
            token: null,
            tokenPayload: null,
            currentUser: null,
          },
        };
      }

      const tokenPayload = await jwt.verify(token);

      if (tokenPayload === false || !tokenPayload.sub) {
        return {
          auth: {
            token,
            tokenPayload: null,
            currentUser: null,
          },
        };
      }

      const [currentUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, tokenPayload.sub))
        .limit(1);

      return {
        auth: {
          token,
          tokenPayload,
          currentUser: currentUser ?? null,
        },
      };
    });

export type AuthState = {
  token: string | null;
  tokenPayload: {
    sub?: string;
  } | null;
  currentUser: User | null;
};

export const requireAuthenticatedUser = (auth: AuthState) => {
  if (!auth.currentUser) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  }

  if (auth.currentUser.status !== "active") {
    throw new ApiError(403, "FORBIDDEN", "User is not allowed to access this resource");
  }

  return auth.currentUser;
};

export const requireUserRole = (
  auth: AuthState,
  allowedRoles: Array<"investor" | "issuer" | "admin">,
) => {
  const currentUser = requireAuthenticatedUser(auth);

  if (!allowedRoles.includes(currentUser.role)) {
    throw new ApiError(403, "FORBIDDEN", "User does not have access to this resource");
  }

  return currentUser;
};
