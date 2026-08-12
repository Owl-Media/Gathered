import { beforeEach, describe, expect, it, vi } from "vitest";
import { openToken, resetTokenCipherKeyCache, sealToken } from "./token-cipher";
import { generateRsvpToken } from "./tokens";

/**
 * RSVP token encryption at rest (Spec 8.5).
 */

beforeEach(() => {
  resetTokenCipherKeyCache();
});

describe("sealToken / openToken", () => {
  it("round-trips a token", () => {
    const token = generateRsvpToken();
    expect(openToken(sealToken(token))).toBe(token);
  });

  it("never stores the plaintext in the sealed value", () => {
    const token = generateRsvpToken();
    const sealed = sealToken(token);

    expect(sealed).not.toContain(token);
  });

  it("produces a different ciphertext each time (random nonce)", () => {
    const token = generateRsvpToken();
    const first = sealToken(token);
    const second = sealToken(token);

    expect(first).not.toBe(second);
    // Both still decrypt to the same token.
    expect(openToken(first)).toBe(token);
    expect(openToken(second)).toBe(token);
  });

  it("carries a version prefix so the format can change later", () => {
    expect(sealToken("abc").startsWith("v1.")).toBe(true);
  });
});

describe("tamper resistance", () => {
  it("rejects a modified ciphertext rather than returning wrong plaintext", () => {
    const sealed = sealToken(generateRsvpToken());
    const parts = sealed.split(".");
    const ciphertext = parts[2] as string;

    // Flip a character in the ciphertext segment.
    const tampered = [
      parts[0],
      parts[1],
      ciphertext[0] === "a" ? `b${ciphertext.slice(1)}` : `a${ciphertext.slice(1)}`,
      parts[3],
    ].join(".");

    expect(openToken(tampered)).toBeNull();
  });

  it("rejects a stripped authentication tag", () => {
    const sealed = sealToken("abc");
    const parts = sealed.split(".");
    expect(openToken(`${parts[0]}.${parts[1]}.${parts[2]}.`)).toBeNull();
  });

  it("returns null for malformed input rather than throwing", () => {
    expect(openToken("")).toBeNull();
    expect(openToken("not-sealed")).toBeNull();
    expect(openToken("v1.a.b")).toBeNull();
    expect(openToken("v2.a.b.c")).toBeNull();
  });
});

describe("key separation", () => {
  /**
   * The encryption key is derived from SESSION_SECRET, which `lib/env.ts`
   * parses once at module load. Reassigning `process.env` mid-test therefore
   * changes nothing, the module graph has to be reloaded to pick up a
   * different secret, which is what `vi.resetModules()` plus a dynamic import
   * does here.
   *
   * This is the behaviour documented in token-cipher.ts: rotating
   * SESSION_SECRET makes previously sealed tokens unreadable.
   */
  it("cannot decrypt a value sealed under a different SESSION_SECRET", async () => {
    const token = generateRsvpToken();
    const sealed = sealToken(token);

    const original = process.env.SESSION_SECRET;
    try {
      vi.resetModules();
      process.env.SESSION_SECRET = "a-completely-different-secret-value-here-32+";

      const reloaded = await import("./token-cipher");
      expect(reloaded.openToken(sealed)).toBeNull();

      // A token sealed under the new secret does open under that same secret.
      expect(reloaded.openToken(reloaded.sealToken("hello"))).toBe("hello");
    } finally {
      process.env.SESSION_SECRET = original;
      vi.resetModules();
    }
  });
});
