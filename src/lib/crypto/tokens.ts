import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Token generation and comparison helpers.
 *
 * Spec 8.5 / 11: tokens must be long, cryptographically random, unguessable,
 * never sequential, and must not encode database IDs.
 */

/**
 * Lowercase alphanumerics with each confusable group broken: `0`/`o` and
 * `1`/`l` are dropped, and digits start at 2. `i` is kept, with `1` and `l`
 * both absent there is nothing left for it to be mistaken for. 24 letters plus
 * 8 digits gives exactly 32 symbols, so each character carries 5 bits.
 */
const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

/**
 * Generates a random string from ALPHABET using rejection sampling, so every
 * character is uniformly distributed (a plain modulo would bias the first
 * few characters).
 */
export function randomToken(length: number): string {
  if (length <= 0) throw new Error("Token length must be positive");

  const max = 256 - (256 % ALPHABET.length);
  let out = "";

  while (out.length < length) {
    const bytes = randomBytes(length * 2);
    for (const byte of bytes) {
      if (byte >= max) continue; // reject, would skew the distribution
      out += ALPHABET[byte % ALPHABET.length];
      if (out.length === length) break;
    }
  }

  return out;
}

/**
 * Guest RSVP token. 32 chars of a 32-symbol alphabet = 160 bits of entropy.
 * Far beyond brute force, and the rate limiter caps attempts anyway.
 */
export function generateRsvpToken(): string {
  return randomToken(32);
}

/** Random suffix appended to an event's readable slug (Spec 17 Q5). */
export function generateSlugSuffix(): string {
  return randomToken(12);
}

/** URL-safe token for sessions and password resets. */
export function generateUrlSafeToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/**
 * Deterministic hash used as a database lookup key. Unsalted on purpose: the
 * value must be reproducible from the token presented in a URL. Safe here
 * because the inputs are high-entropy random tokens, not guessable secrets.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Constant-time string comparison, for values that must not leak via timing. */
export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");
  if (bufferA.length !== bufferB.length) {
    // timingSafeEqual throws on length mismatch; compare against self to keep
    // the work done roughly constant before returning.
    timingSafeEqual(bufferA, bufferA);
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
}

/**
 * Truncated token for log lines. Spec 11: tokens must never be logged in full.
 */
export function tokenFingerprint(token: string): string {
  return `${hashToken(token).slice(0, 8)}…`;
}
