import { describe, expect, it } from "vitest";
import {
  generateRsvpToken,
  generateSlugSuffix,
  hashToken,
  randomToken,
  safeEqual,
  tokenFingerprint,
} from "./tokens";

/**
 * Token tests (Spec 8.5, 11).
 */

describe("randomToken", () => {
  it("produces the requested length", () => {
    for (const length of [1, 8, 32, 100]) {
      expect(randomToken(length)).toHaveLength(length);
    }
  });

  it("only emits characters from the unambiguous alphabet", () => {
    const token = randomToken(2000);
    expect(token).toMatch(/^[abcdefghijkmnpqrstuvwxyz23456789]+$/);

    // Each confusable pair is broken by dropping one side: 0/o and 1/l are
    // absent, so the survivors ("i", and digits from 2) are unambiguous.
    for (const excluded of ["0", "o", "1", "l"]) {
      expect(token).not.toContain(excluded);
    }
  });

  it("rejects non-positive lengths", () => {
    expect(() => randomToken(0)).toThrow();
    expect(() => randomToken(-5)).toThrow();
  });

  it("is roughly uniform across the alphabet (rejection sampling, not modulo)", () => {
    const sample = randomToken(32000);
    const counts = new Map<string, number>();
    for (const char of sample) counts.set(char, (counts.get(char) ?? 0) + 1);

    const expected = sample.length / 32;
    for (const count of counts.values()) {
      // A modulo bias would skew the first characters well past this bound.
      expect(count).toBeGreaterThan(expected * 0.75);
      expect(count).toBeLessThan(expected * 1.25);
    }
  });
});

describe("generateRsvpToken", () => {
  it("is long enough to be unguessable (Spec 8.5)", () => {
    // 32 chars from a 32-symbol alphabet = 160 bits of entropy.
    expect(generateRsvpToken()).toHaveLength(32);
  });

  it("never repeats across many generations", () => {
    const tokens = new Set(Array.from({ length: 5000 }, generateRsvpToken));
    expect(tokens.size).toBe(5000);
  });

  it("is not sequential and encodes no database id", () => {
    const first = generateRsvpToken();
    const second = generateRsvpToken();
    expect(first).not.toBe(second);
    // Consecutive tokens share no long common prefix.
    let shared = 0;
    while (shared < first.length && first[shared] === second[shared]) shared += 1;
    expect(shared).toBeLessThan(6);
  });
});

describe("generateSlugSuffix", () => {
  it("carries 12 characters of entropy for public event links", () => {
    expect(generateSlugSuffix()).toHaveLength(12);
  });
});

describe("hashToken", () => {
  it("is deterministic, so a presented token resolves to its stored row", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
  });

  it("differs for different inputs", () => {
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });

  it("returns a 64-character hex digest", () => {
    expect(hashToken("abc")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("safeEqual", () => {
  it("matches identical strings", () => {
    expect(safeEqual("ada@example.com", "ada@example.com")).toBe(true);
  });

  it("rejects different strings, including different lengths", () => {
    expect(safeEqual("ada@example.com", "ada@example.co")).toBe(false);
    expect(safeEqual("ada@example.com", "bob@example.com")).toBe(false);
    expect(safeEqual("", "x")).toBe(false);
  });
});

describe("tokenFingerprint", () => {
  it("never contains the token itself (Spec 11, tokens must not be logged in full)", () => {
    const token = generateRsvpToken();
    const fingerprint = tokenFingerprint(token);

    expect(fingerprint).not.toContain(token);
    expect(fingerprint.length).toBeLessThan(12);
  });
});
