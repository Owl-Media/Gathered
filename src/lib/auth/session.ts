import "server-only";
import { cookies } from "next/headers";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import type { User } from "@/db/schema";
import { generateUrlSafeToken, hashToken } from "@/lib/crypto/tokens";

/**
 * Server-side session management (Spec 6.1, 11).
 *
 * The cookie carries a random opaque token; only its SHA-256 hash is stored, so
 * a database leak yields no usable sessions. Because state lives server-side, a
 * superadmin disabling an account takes effect on the very next request, a
 * guarantee stateless JWTs could not give (Spec 6.9).
 */

const COOKIE_NAME = "gathered_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
/** Sessions past their halfway point are extended on use. */
const RENEW_AFTER_MS = SESSION_TTL_MS / 2;

export async function createSession(userId: string): Promise<void> {
  const token = generateUrlSafeToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessions).values({
    tokenHash: hashToken(token),
    userId,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/**
 * Resolves the signed-in user, or null.
 *
 * Disabled accounts resolve to null and have their session deleted, so a
 * disabled organiser is signed out immediately rather than at cookie expiry
 * (Spec 6.9, 15.1).
 */
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);

  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const user = rows[0]?.user;
  if (!user) return null;

  if (user.disabledAt) {
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
    return null;
  }

  return user;
}

/**
 * Extends a session that is over halfway through its life. Called from the
 * layout rather than `getCurrentUser` so that read-only paths (and Server
 * Components that may render more than once) do not each issue a write.
 */
export async function renewSessionIfNeeded(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return;

  const tokenHash = hashToken(token);
  const renewThreshold = new Date(Date.now() + RENEW_AFTER_MS);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const updated = await db
    .update(sessions)
    .set({ expiresAt })
    .where(and(eq(sessions.tokenHash, tokenHash), lt(sessions.expiresAt, renewThreshold)))
    .returning({ tokenHash: sessions.tokenHash });

  if (updated.length > 0) {
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt,
    });
  }
}

/** Signs the current user out and removes the server-side record. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  cookieStore.delete(COOKIE_NAME);
}

/** Invalidates every session for a user. Used on password reset and disable. */
export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/** Housekeeping for expired rows. Safe to call at any time. */
export async function pruneExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}
