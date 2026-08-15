import "server-only";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";

/**
 * Fixed-window rate limiting for sensitive endpoints (Spec 11).
 *
 * Counters live in Postgres rather than Redis: the MVP runs as a single Coolify
 * service, and this avoids another piece of infrastructure to deploy, back up
 * and monitor. The whole check is a single atomic upsert, so concurrent
 * requests cannot race past the limit.
 */

export interface RateLimitRule {
  /** Maximum attempts permitted inside the window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

/** Limits for the endpoints Spec 11 calls out as sensitive. */
export const RATE_LIMITS = {
  login: { limit: 10, windowSeconds: 15 * 60 },
  passwordResetRequest: { limit: 5, windowSeconds: 60 * 60 },
  passwordResetSubmit: { limit: 10, windowSeconds: 60 * 60 },
  registration: { limit: 5, windowSeconds: 60 * 60 },
  /** Spec 9.1."Apply rate limiting to repeated failed attempts". */
  guestEmailVerification: { limit: 10, windowSeconds: 15 * 60 },
  rsvpSubmission: { limit: 30, windowSeconds: 15 * 60 },
  imageUpload: { limit: 40, windowSeconds: 15 * 60 },
  export: { limit: 30, windowSeconds: 15 * 60 },
  invitationEmail: { limit: 100, windowSeconds: 60 * 60 },
  testEmail: { limit: 10, windowSeconds: 15 * 60 },
} satisfies Record<string, RateLimitRule>;

export type RateLimitName = keyof typeof RATE_LIMITS;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the current window resets. */
  retryAfterSeconds: number;
}

/**
 * Best-effort client identifier. Behind Coolify's proxy the real address
 * arrives in `x-forwarded-for`; the value is hashed so raw IP addresses are not
 * persisted.
 */
export async function clientIdentifier(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip")?.trim() ||
    "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

/**
 * Consumes one unit against `name:scope`. Returns whether the caller may
 * proceed.
 *
 * Fails open: if the counter cannot be written the request is allowed through
 * rather than locking every organiser out during a database hiccup. The
 * underlying operations remain protected by their own authorisation checks.
 */
export async function consumeRateLimit(
  name: RateLimitName,
  scope: string,
): Promise<RateLimitResult> {
  const rule = RATE_LIMITS[name];
  const key = `${name}:${scope}`;
  const windowInterval = sql.raw(`interval '${rule.windowSeconds} seconds'`);

  try {
    const rows = await db
      .insert(rateLimits)
      .values({ key, count: 1, windowStartedAt: new Date() })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          // Expired window: restart at 1. Live window: increment.
          count: sql`case
            when ${rateLimits.windowStartedAt} < now() - ${windowInterval} then 1
            else ${rateLimits.count} + 1
          end`,
          windowStartedAt: sql`case
            when ${rateLimits.windowStartedAt} < now() - ${windowInterval} then now()
            else ${rateLimits.windowStartedAt}
          end`,
        },
      })
      .returning({
        count: rateLimits.count,
        windowStartedAt: rateLimits.windowStartedAt,
      });

    const row = rows[0];
    if (!row) return { allowed: true, remaining: rule.limit - 1, retryAfterSeconds: 0 };

    const elapsedSeconds = Math.floor((Date.now() - row.windowStartedAt.getTime()) / 1000);
    const retryAfterSeconds = Math.max(0, rule.windowSeconds - elapsedSeconds);

    return {
      allowed: row.count <= rule.limit,
      remaining: Math.max(0, rule.limit - row.count),
      retryAfterSeconds,
    };
  } catch (error) {
    console.error("[rate-limit] check failed, allowing request", {
      name,
      error: error instanceof Error ? error.message : String(error),
    });
    return { allowed: true, remaining: rule.limit, retryAfterSeconds: 0 };
  }
}

/** Clears a counter after a successful attempt, so honest users are not punished. */
export async function resetRateLimit(name: RateLimitName, scope: string): Promise<void> {
  try {
    await db.delete(rateLimits).where(sql`${rateLimits.key} = ${`${name}:${scope}`}`);
  } catch {
    // Non-critical: the window will expire on its own.
  }
}

/** Removes expired counters. Called opportunistically; safe to run any time. */
export async function pruneRateLimits(): Promise<void> {
  try {
    await db.delete(rateLimits).where(sql`${rateLimits.windowStartedAt} < now() - interval '24 hours'`);
  } catch {
    // Non-critical.
  }
}
