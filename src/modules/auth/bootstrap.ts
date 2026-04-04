import { count, eq } from "drizzle-orm";
import { db } from "../../db";
import {
  auditLogs,
  authIdentities,
  passwordCredentials,
  users,
} from "../../db/schema";
import { ApiError } from "../../lib/api-error";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export type BootstrapAdminInput = {
  email: string;
  password: string;
  displayName?: string;
};

export type BootstrapAdminResult = {
  userId: string;
  email: string;
  role: "admin";
};

export const bootstrapPasswordAdmin = async (
  input: BootstrapAdminInput,
): Promise<BootstrapAdminResult> => {
  const email = normalizeEmail(input.email);
  const displayName = input.displayName?.trim() || "Platform Admin";
  const passwordHash = await Bun.password.hash(input.password, {
    algorithm: "argon2id",
  });

  const [{ total: adminCount }] = await db
    .select({ total: count(users.id) })
    .from(users)
    .where(eq(users.role, "admin"));

  if (adminCount > 0) {
    throw new ApiError(
      409,
      "BOOTSTRAP_ADMIN_ALREADY_EXISTS",
      "Bootstrap admin creation is disabled because an admin already exists",
    );
  }

  const [existingIdentity] = await db
    .select()
    .from(authIdentities)
    .where(eq(authIdentities.email, email))
    .limit(1);

  if (existingIdentity) {
    throw new ApiError(
      409,
      "EMAIL_ALREADY_REGISTERED",
      "Email address is already registered",
    );
  }

  const user = await db.transaction(async (tx) => {
    const [createdUser] = await tx
      .insert(users)
      .values({
        displayName,
        role: "admin",
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
      action: "system.bootstrap_admin_created",
      payloadJson: {
        email,
      },
    });

    return createdUser;
  });

  return {
    userId: user.id,
    email,
    role: "admin",
  };
};
