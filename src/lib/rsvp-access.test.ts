import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Guest RSVP access cookie tests (Spec 5.4, 8.1).
 *
 * `next/headers` is mocked with a minimal in-memory cookie jar so the real
 * public API, including the binding of a grant to one specific guest. Is
 * exercised rather than a re-implementation of it.
 */

interface StoredCookie {
  value: string;
  expires?: Date;
}

const jar = new Map<string, StoredCookie>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const found = jar.get(name);
      return found ? { name, value: found.value } : undefined;
    },
    set: (name: string, value: string, options?: { expires?: Date }) => {
      jar.set(name, { value, expires: options?.expires });
    },
    delete: (arg: string | { name: string }) => {
      jar.delete(typeof arg === "string" ? arg : arg.name);
    },
  }),
}));

const { grantRsvpAccess, hasRsvpAccess, revokeRsvpAccess } = await import("./rsvp-access");

const GUEST_A = "11111111-1111-4111-8111-111111111111";
const GUEST_B = "22222222-2222-4222-8222-222222222222";
const COOKIE_NAME = "gathered_rsvp_access";

beforeEach(() => {
  jar.clear();
});

describe("granting access", () => {
  it("grants access to the verified guest", async () => {
    await grantRsvpAccess(GUEST_A);
    expect(await hasRsvpAccess(GUEST_A)).toBe(true);
  });

  it("denies access when no cookie is present", async () => {
    expect(await hasRsvpAccess(GUEST_A)).toBe(false);
  });

  it("revokes access", async () => {
    await grantRsvpAccess(GUEST_A);
    await revokeRsvpAccess();
    expect(await hasRsvpAccess(GUEST_A)).toBe(false);
  });
});

describe("access is bound to one invitation (Spec 8.1)", () => {
  it("does not unlock a different guest's RSVP", async () => {
    await grantRsvpAccess(GUEST_A);

    expect(await hasRsvpAccess(GUEST_A)).toBe(true);
    // The core privacy property: verifying as one guest must never grant
    // access to another guest's form.
    expect(await hasRsvpAccess(GUEST_B)).toBe(false);
  });

  it("cannot be re-pointed at another guest by editing the cookie", async () => {
    await grantRsvpAccess(GUEST_A);

    const original = jar.get(COOKIE_NAME)!.value;
    const [, expiry, signature] = original.split(".") as [string, string, string];

    // Swap the guest id but keep the original signature.
    jar.set(COOKIE_NAME, { value: `${GUEST_B}.${expiry}.${signature}` });

    expect(await hasRsvpAccess(GUEST_B)).toBe(false);
  });
});

describe("tamper resistance", () => {
  it("rejects a forged signature", async () => {
    jar.set(COOKIE_NAME, {
      value: `${GUEST_A}.${Date.now() + 60_000}.not-a-real-signature`,
    });

    expect(await hasRsvpAccess(GUEST_A)).toBe(false);
  });

  it("rejects an extended expiry, because the expiry is signed", async () => {
    await grantRsvpAccess(GUEST_A);

    const original = jar.get(COOKIE_NAME)!.value;
    const [guestId, , signature] = original.split(".") as [string, string, string];
    const farFuture = Date.now() + 10 * 365 * 24 * 60 * 60 * 1000;

    jar.set(COOKIE_NAME, { value: `${guestId}.${farFuture}.${signature}` });

    expect(await hasRsvpAccess(GUEST_A)).toBe(false);
  });

  it("rejects a malformed cookie rather than throwing", async () => {
    for (const malformed of ["", "garbage", "a.b", "a.b.c.d"]) {
      jar.set(COOKIE_NAME, { value: malformed });
      await expect(hasRsvpAccess(GUEST_A)).resolves.toBe(false);
    }
  });
});

describe("expiry", () => {
  it("rejects a grant whose signed expiry has passed", async () => {
    // Freeze time, grant, then jump past the two-hour window.
    const now = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(now);

    try {
      await grantRsvpAccess(GUEST_A);
      expect(await hasRsvpAccess(GUEST_A)).toBe(true);

      vi.setSystemTime(now + 2 * 60 * 60 * 1000 + 1000);
      expect(await hasRsvpAccess(GUEST_A)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
