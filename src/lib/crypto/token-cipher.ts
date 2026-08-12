import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Authenticated encryption for guest RSVP tokens at rest.
 *
 * Spec 8.5 requires tokens to be "stored securely", but Spec 15.6 also requires
 * the organiser to be able to copy a guest's invitation link at any time, so a
 * one-way hash alone is not enough. Tokens are therefore sealed with
 * AES-256-GCM and stored alongside a SHA-256 lookup hash. A leaked database
 * dump or backup yields no usable invitation links without the application
 * secret.
 *
 * The key is derived from SESSION_SECRET via HKDF with a distinct `info` label,
 * so it is cryptographically independent of any other use of that secret and no
 * extra environment variable is needed.
 *
 * IMPORTANT: rotating SESSION_SECRET makes existing sealed tokens undecryptable,
 * which means organisers can no longer copy previously issued invitation links
 * (already-shared links keep working, since lookup uses the hash). See
 * docs/DEPLOYMENT.md before rotating.
 */

const KEY_LENGTH = 32; // AES-256
const IV_LENGTH = 12; // GCM standard nonce size
const TAG_LENGTH = 16;
const VERSION = "v1";

let cachedKey: Buffer | null = null;

function key(): Buffer {
  if (!cachedKey) {
    cachedKey = Buffer.from(
      hkdfSync(
        "sha256",
        Buffer.from(env.SESSION_SECRET, "utf8"),
        Buffer.from("gathered/token-cipher/salt", "utf8"),
        Buffer.from("guest-rsvp-token-encryption", "utf8"),
        KEY_LENGTH,
      ),
    );
  }
  return cachedKey;
}

/** Encrypts a token. Output format: `v1.<iv>.<ciphertext>.<authTag>` (base64url). */
export function sealToken(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    tag.toString("base64url"),
  ].join(".");
}

/**
 * Decrypts a sealed token. Returns null rather than throwing when the value is
 * malformed or fails authentication. Callers surface that as "link cannot be
 * shown" rather than crashing the guest list.
 */
export function openToken(sealed: string): string | null {
  try {
    const parts = sealed.split(".");
    if (parts.length !== 4) return null;

    const [version, ivPart, ciphertextPart, tagPart] = parts as [string, string, string, string];
    if (version !== VERSION) return null;

    const iv = Buffer.from(ivPart, "base64url");
    const tag = Buffer.from(tagPart, "base64url");
    if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) return null;

    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextPart, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

/** Test seam. Clears the memoised key after SESSION_SECRET changes. */
export function resetTokenCipherKeyCache(): void {
  cachedKey = null;
}
