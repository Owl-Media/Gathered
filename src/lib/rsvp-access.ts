import "server-only";
import { createHmac, hkdfSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Proof that a guest has passed email verification (Spec 5.4, 6.6).
 *
 * The RSVP token alone is never enough to submit, the matching email address
 * is also required, and that check is enforced server-side (Spec 5.4). Once
 * verified, this short-lived signed cookie carries the result across the
 * subsequent requests, so the guest is not asked again on every page load.
 *
 * The cookie is a bearer of authorisation, so it is signed with an
 * application secret and carries its own expiry. It grants access to exactly
 * one guest invitation, never to a whole event.
 */

const COOKIE_NAME = "gathered_rsvp_access";
/** Short by design: a phone may be shared, or handed round at a party. */
const TTL_MS = 2 * 60 * 60 * 1000;

let cachedKey: Buffer | null = null;

function signingKey(): Buffer {
  if (!cachedKey) {
    // Imported lazily so this module can be unit tested without a full env.
    const secret = process.env.SESSION_SECRET ?? "development-only-insecure-session-secret";
    cachedKey = Buffer.from(
      hkdfSync(
        "sha256",
        Buffer.from(secret, "utf8"),
        Buffer.from("gathered/rsvp-access/salt", "utf8"),
        Buffer.from("guest-rsvp-access-cookie", "utf8"),
        32,
      ),
    );
  }
  return cachedKey;
}

function sign(payload: string): string {
  return createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

/** Records that this guest proved ownership of their invitation email. */
export async function grantRsvpAccess(guestId: string): Promise<void> {
  const expiresAt = Date.now() + TTL_MS;
  const payload = `${guestId}.${expiresAt}`;

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/rsvp",
    expires: new Date(expiresAt),
  });
}

/** True when the current request carries valid, unexpired access for this guest. */
export async function hasRsvpAccess(guestId: string): Promise<boolean> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return false;

  const parts = raw.split(".");
  if (parts.length !== 3) return false;

  const [cookieGuestId, expiryPart, signature] = parts as [string, string, string];
  const payload = `${cookieGuestId}.${expiryPart}`;

  const expected = Buffer.from(sign(payload), "utf8");
  const provided = Buffer.from(signature, "utf8");
  if (expected.length !== provided.length) return false;
  if (!timingSafeEqual(expected, provided)) return false;

  const expiresAt = Number(expiryPart);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  // Access is per-invitation: a cookie issued for one guest must never unlock
  // another (Spec 8.1, "Allow a guest to access another guest's RSVP form").
  return cookieGuestId === guestId;
}

export async function revokeRsvpAccess(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete({ name: COOKIE_NAME, path: "/rsvp" });
}

/** Test seam. Clears the memoised key after SESSION_SECRET changes. */
export function resetRsvpAccessKeyCache(): void {
  cachedKey = null;
}
