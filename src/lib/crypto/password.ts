import "server-only";
import { hash, verify } from "@node-rs/argon2";

/**
 * Password hashing (Spec 11, "Secure password hashing").
 *
 * Argon2id with OWASP's recommended parameters: 19 MiB memory, 2 iterations,
 * 1 degree of parallelism. Passwords are never stored in any recoverable form.
 */
const OPTIONS = {
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(plaintext: string): Promise<string> {
  return hash(plaintext, OPTIONS);
}

/**
 * Verifies a password. Returns false instead of throwing when the stored hash
 * is malformed, so a corrupted row denies login rather than 500-ing.
 */
export async function verifyPassword(storedHash: string, plaintext: string): Promise<boolean> {
  try {
    return await verify(storedHash, plaintext, OPTIONS);
  } catch {
    return false;
  }
}

/**
 * Argon2 verification against a throwaway hash, used to keep login timing
 * roughly constant when no account exists for the submitted email. Without it,
 * a fast rejection would reveal which addresses are registered.
 */
const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$c29tZS1maXhlZC1zYWx0LXY$0J8kMBnLW3rLtqe0m0m5xEwPGZK3H1DkjqCTx1EJ3nQ";

export async function fakeVerifyForTiming(plaintext: string): Promise<void> {
  try {
    await verify(DUMMY_HASH, plaintext, OPTIONS);
  } catch {
    // Expected, the point is the elapsed work, not the result.
  }
}
