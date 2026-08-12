"use server";

import { redirect } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { fakeVerifyForTiming, hashPassword, verifyPassword } from "@/lib/crypto/password";
import { generateUrlSafeToken, hashToken } from "@/lib/crypto/tokens";
import { createSession, destroyAllSessionsForUser, destroySession } from "@/lib/auth/session";
import { AUDIT_EVENT, recordAudit } from "@/lib/audit";
import { clientIdentifier, consumeRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { getMailer } from "@/lib/email";
import { passwordResetEmail } from "@/lib/email/templates";
import { env } from "@/lib/env";
import {
  loginSchema,
  registerSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  toFieldErrors,
} from "@/lib/validation";
import { type ActionState, failure, fieldFailure, formString, success } from "@/lib/forms";

const RESET_TOKEN_TTL_MINUTES = 60;
const TOO_MANY_ATTEMPTS = "Too many attempts. Please wait a few minutes and try again.";

/* -------------------------------------------------------------------------- */
/* Registration (Spec 6.1, 15.1)                                              */
/* -------------------------------------------------------------------------- */

export async function registerAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    name: formString(formData, "name"),
    email: formString(formData, "email"),
    password: formString(formData, "password"),
  });

  if (!parsed.success) return fieldFailure(toFieldErrors(parsed.error));

  const limit = await consumeRateLimit("registration", await clientIdentifier());
  if (!limit.allowed) return failure(TOO_MANY_ATTEMPTS);

  const { name, email, password } = parsed.data;

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    return fieldFailure({ email: "An account with that email address already exists." });
  }

  const passwordHash = await hashPassword(password);

  let userId: string;
  try {
    const inserted = await db
      .insert(users)
      .values({ name, email, passwordHash, role: "organiser" })
      .returning({ id: users.id });

    const row = inserted[0];
    if (!row) return failure("We could not create your account. Please try again.");
    userId = row.id;
  } catch {
    // Unique index violation from a concurrent signup with the same address.
    return fieldFailure({ email: "An account with that email address already exists." });
  }

  await recordAudit({
    actorType: "organiser",
    actorId: userId,
    eventType: AUDIT_EVENT.ORGANISER_REGISTERED,
    entityType: "user",
    entityId: userId,
  });

  await createSession(userId);
  redirect("/dashboard");
}

/* -------------------------------------------------------------------------- */
/* Login (Spec 6.1, 15.1)                                                     */
/* -------------------------------------------------------------------------- */

/**
 * One message covers every failure. Wrong password, unknown address, and
 * disabled account alike, so login cannot be used to enumerate accounts or to
 * discover that an account was disabled (Spec 6.9, 8.1).
 */
const LOGIN_FAILED = "Those details do not match an active account.";

export async function loginAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formString(formData, "email"),
    password: formString(formData, "password"),
  });

  if (!parsed.success) return fieldFailure(toFieldErrors(parsed.error));

  const { email, password } = parsed.data;
  const scope = await clientIdentifier();

  const limit = await consumeRateLimit("login", `${scope}:${email}`);
  if (!limit.allowed) return failure(TOO_MANY_ATTEMPTS);

  const found = await db
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
      role: users.role,
      disabledAt: users.disabledAt,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const user = found[0];

  if (!user) {
    // Spend comparable time so a missing account is not detectable by timing.
    await fakeVerifyForTiming(password);
    await recordAudit({
      actorType: "system",
      eventType: AUDIT_EVENT.LOGIN_FAILED,
      metadata: { reason: "unknown_account" },
    });
    return failure(LOGIN_FAILED);
  }

  const passwordMatches = await verifyPassword(user.passwordHash, password);

  // Verify the password even for disabled accounts before rejecting, so the
  // response time does not distinguish "disabled" from "wrong password".
  if (!passwordMatches || user.disabledAt) {
    await recordAudit({
      actorType: "system",
      eventType: AUDIT_EVENT.LOGIN_FAILED,
      entityType: "user",
      entityId: user.id,
      metadata: { reason: user.disabledAt ? "account_disabled" : "bad_password" },
    });
    return failure(LOGIN_FAILED);
  }

  await resetRateLimit("login", `${scope}:${email}`);
  await recordAudit({
    actorType: user.role === "superadmin" ? "superadmin" : "organiser",
    actorId: user.id,
    eventType: AUDIT_EVENT.LOGIN_SUCCEEDED,
    entityType: "user",
    entityId: user.id,
  });

  await createSession(user.id);
  redirect(user.role === "superadmin" ? "/superadmin" : "/dashboard");
}

/* -------------------------------------------------------------------------- */
/* Logout                                                                     */
/* -------------------------------------------------------------------------- */

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

/* -------------------------------------------------------------------------- */
/* Password reset request (Spec 4.1)                                          */
/* -------------------------------------------------------------------------- */

/**
 * Always reports the same outcome, whether or not the address is registered,
 * so this endpoint cannot be used to discover who has an account.
 */
const RESET_REQUESTED =
  "If that email address has an account, we've sent a link to reset the password. Please check your inbox.";

export async function requestPasswordResetAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = requestPasswordResetSchema.safeParse({
    email: formString(formData, "email"),
  });

  if (!parsed.success) return fieldFailure(toFieldErrors(parsed.error));

  const { email } = parsed.data;
  const limit = await consumeRateLimit("passwordResetRequest", await clientIdentifier());
  if (!limit.allowed) return failure(TOO_MANY_ATTEMPTS);

  const found = await db
    .select({ id: users.id, name: users.name, disabledAt: users.disabledAt })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const user = found[0];

  // Disabled accounts get no reset link. Resetting would not restore access
  // and would leak that the account exists (Spec 6.9).
  if (user && !user.disabledAt) {
    const token = generateUrlSafeToken();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

    await db.insert(passwordResetTokens).values({
      tokenHash: hashToken(token),
      userId: user.id,
      expiresAt,
    });

    await recordAudit({
      actorType: "organiser",
      actorId: user.id,
      eventType: AUDIT_EVENT.PASSWORD_RESET_REQUESTED,
      entityType: "user",
      entityId: user.id,
    });

    try {
      await getMailer().send(
        passwordResetEmail({
          to: email,
          name: user.name,
          resetUrl: `${env.APP_BASE_URL}/reset-password?token=${encodeURIComponent(token)}`,
          expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
        }),
      );
    } catch (error) {
      // Logged for the operator, but the response stays identical so the
      // outcome reveals nothing about whether the address exists.
      console.error("[auth] password reset email failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return success(RESET_REQUESTED);
}

/* -------------------------------------------------------------------------- */
/* Password reset completion (Spec 4.1, 15.1)                                 */
/* -------------------------------------------------------------------------- */

export async function resetPasswordAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formString(formData, "token"),
    password: formString(formData, "password"),
    confirmPassword: formString(formData, "confirmPassword"),
  });

  if (!parsed.success) return fieldFailure(toFieldErrors(parsed.error));

  const limit = await consumeRateLimit("passwordResetSubmit", await clientIdentifier());
  if (!limit.allowed) return failure(TOO_MANY_ATTEMPTS);

  const { token, password } = parsed.data;

  const rows = await db
    .select({ userId: passwordResetTokens.userId })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, hashToken(token)),
        gt(passwordResetTokens.expiresAt, new Date()),
        isNull(passwordResetTokens.usedAt),
      ),
    )
    .limit(1);

  const record = rows[0];
  if (!record) {
    return failure("That reset link is invalid or has expired. Please request a new one.");
  }

  const passwordHash = await hashPassword(password);

  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, record.userId));
    await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.tokenHash, hashToken(token)));
  });

  // Any session opened with the old password is no longer trustworthy.
  await destroyAllSessionsForUser(record.userId);

  await recordAudit({
    actorType: "organiser",
    actorId: record.userId,
    eventType: AUDIT_EVENT.PASSWORD_RESET_COMPLETED,
    entityType: "user",
    entityId: record.userId,
  });

  redirect("/login?reset=1");
}
