import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { guests } from "@/db/schema";
import {
  createEvent,
  createGuest,
  createOrganiser,
  resetDatabase,
} from "../../../test/helpers/db";
import { getEventByPublicSlug, getEventForOrganiser, listEventsForOrganiser, requireEventForOrganiser } from "./events";
import { getGuestByRsvpToken, getGuestForOrganiser, listGuestsForEvent } from "./guests";
import { generateRsvpToken, hashToken } from "@/lib/crypto/tokens";
import { AuthorisationError } from "@/lib/auth/guards";

/**
 * Access control and privacy integration tests (Spec 8.1, 8.2, 15.2, 15.5).
 *
 * Run against a real database so the partial unique index on active guest
 * emails and the ownership-scoped joins are genuinely exercised.
 */

beforeEach(async () => {
  await resetDatabase();
});

describe("event ownership (Spec 15.2, 15.3)", () => {
  it("does not return another organiser's event", async () => {
    const owner = await createOrganiser();
    const stranger = await createOrganiser();
    const event = await createEvent(owner.id);

    expect(await getEventForOrganiser(event.id, owner.id)).not.toBeNull();
    expect(await getEventForOrganiser(event.id, stranger.id)).toBeNull();
  });

  it("throws the same error for a stranger's event as for one that does not exist", async () => {
    const owner = await createOrganiser();
    const stranger = await createOrganiser();
    const event = await createEvent(owner.id);

    const strangerError = await requireEventForOrganiser(event.id, stranger.id).catch(
      (error) => error,
    );
    const missingError = await requireEventForOrganiser(
      "00000000-0000-4000-8000-000000000000",
      stranger.id,
    ).catch((error) => error);

    expect(strangerError).toBeInstanceOf(AuthorisationError);
    expect(missingError).toBeInstanceOf(AuthorisationError);
    // Identical messages, so responses cannot be used to probe which ids exist.
    expect(strangerError.message).toBe(missingError.message);
  });

  it("lists only the organiser's own events on the dashboard", async () => {
    const owner = await createOrganiser();
    const stranger = await createOrganiser();

    await createEvent(owner.id, { name: "Mine A" });
    await createEvent(owner.id, { name: "Mine B" });
    await createEvent(stranger.id, { name: "Theirs" });

    const mine = await listEventsForOrganiser(owner.id);
    expect(mine.map((event) => event.name).sort()).toEqual(["Mine A", "Mine B"]);
  });
});

describe("dashboard RSVP counts (Spec 5.1, 15.9)", () => {
  it("counts by status and excludes removed guests", async () => {
    const organiser = await createOrganiser();
    const event = await createEvent(organiser.id);

    const accepted = await createGuest(event.id);
    const declined = await createGuest(event.id);
    await createGuest(event.id); // left as not responded
    const removed = await createGuest(event.id);

    await db
      .update(guests)
      .set({ rsvpStatus: "accepted" })
      .where(eq(guests.id, accepted.guest.id));
    await db
      .update(guests)
      .set({ rsvpStatus: "declined" })
      .where(eq(guests.id, declined.guest.id));
    await db
      .update(guests)
      .set({ rsvpStatus: "accepted", removedAt: new Date() })
      .where(eq(guests.id, removed.guest.id));

    const [dashboardEvent] = await listEventsForOrganiser(organiser.id);

    expect(dashboardEvent?.counts).toEqual({
      invited: 3, // the removed guest is not counted
      accepted: 1,
      declined: 1,
      notResponded: 1,
    });
  });
});

describe("guest access by RSVP token (Spec 8.5, 15.5)", () => {
  it("resolves a guest from their own token", async () => {
    const organiser = await createOrganiser();
    const event = await createEvent(organiser.id);
    const { guest, token } = await createGuest(event.id);

    const lookup = await getGuestByRsvpToken(token);
    expect(lookup?.guest.id).toBe(guest.id);
  });

  it("returns null for an unknown or malformed token", async () => {
    expect(await getGuestByRsvpToken(generateRsvpToken())).toBeNull();
    expect(await getGuestByRsvpToken("")).toBeNull();
    expect(await getGuestByRsvpToken("../../etc/passwd")).toBeNull();
  });

  it("stops resolving once the guest is removed (Spec 15.5)", async () => {
    const organiser = await createOrganiser();
    const event = await createEvent(organiser.id);
    const { guest, token } = await createGuest(event.id);

    expect(await getGuestByRsvpToken(token)).not.toBeNull();

    // Mirrors removeGuestAction: soft delete and replace the lookup hash.
    await db
      .update(guests)
      .set({
        removedAt: new Date(),
        rsvpTokenLookup: hashToken(generateRsvpToken()),
        rsvpTokenSealed: "",
      })
      .where(eq(guests.id, guest.id));

    expect(await getGuestByRsvpToken(token)).toBeNull();
  });

  it("reports the organiser's disabled state so pages can show the unavailable message", async () => {
    const organiser = await createOrganiser({ disabled: true });
    const event = await createEvent(organiser.id);
    const { token } = await createGuest(event.id);

    const lookup = await getGuestByRsvpToken(token);
    expect(lookup?.organiserDisabled).toBe(true);
  });

  it("never exposes one guest's token through another guest's lookup", async () => {
    const organiser = await createOrganiser();
    const event = await createEvent(organiser.id);
    const first = await createGuest(event.id, { email: "first@example.com" });
    const second = await createGuest(event.id, { email: "second@example.com" });

    const lookup = await getGuestByRsvpToken(first.token);
    expect(lookup?.guest.id).toBe(first.guest.id);
    expect(lookup?.guest.id).not.toBe(second.guest.id);
    expect(await getGuestByRsvpToken(second.token)).toMatchObject({
      guest: { id: second.guest.id },
    });
  });
});

describe("guest access by organiser (Spec 6.7, 8.1)", () => {
  it("refuses a guest belonging to another organiser's event", async () => {
    const owner = await createOrganiser();
    const stranger = await createOrganiser();
    const event = await createEvent(owner.id);
    const { guest } = await createGuest(event.id);

    expect(await getGuestForOrganiser(guest.id, owner.id)).not.toBeNull();
    expect(await getGuestForOrganiser(guest.id, stranger.id)).toBeNull();
  });

  it("refuses a removed guest", async () => {
    const organiser = await createOrganiser();
    const event = await createEvent(organiser.id);
    const { guest } = await createGuest(event.id);

    await db.update(guests).set({ removedAt: new Date() }).where(eq(guests.id, guest.id));

    expect(await getGuestForOrganiser(guest.id, organiser.id)).toBeNull();
  });
});

describe("duplicate guest emails (Spec 4.5, 15.5)", () => {
  it("prevents two active guests with the same email on one event", async () => {
    const organiser = await createOrganiser();
    const event = await createEvent(organiser.id);

    await createGuest(event.id, { email: "ada@example.com" });

    await expect(createGuest(event.id, { email: "ada@example.com" })).rejects.toThrow();
  });

  it("allows the same email on two different events", async () => {
    const organiser = await createOrganiser();
    const first = await createEvent(organiser.id, { name: "First" });
    const second = await createEvent(organiser.id, { name: "Second" });

    await createGuest(first.id, { email: "ada@example.com" });
    await expect(
      createGuest(second.id, { email: "ada@example.com" }),
    ).resolves.toBeDefined();
  });

  it("allows re-adding an email after the original guest was removed", async () => {
    const organiser = await createOrganiser();
    const event = await createEvent(organiser.id);
    const { guest } = await createGuest(event.id, { email: "ada@example.com" });

    await db.update(guests).set({ removedAt: new Date() }).where(eq(guests.id, guest.id));

    // The unique index is partial on `removed_at is null`, so this succeeds.
    await expect(
      createGuest(event.id, { email: "ada@example.com" }),
    ).resolves.toBeDefined();
  });
});

describe("public event lookup (Spec 5.3, 6.9)", () => {
  it("resolves by public slug and reports the organiser's disabled state", async () => {
    const organiser = await createOrganiser({ disabled: true, name: "Disabled Org" });
    const event = await createEvent(organiser.id);

    const lookup = await getEventByPublicSlug(event.publicSlug);
    expect(lookup?.event.id).toBe(event.id);
    expect(lookup?.organiserDisabled).toBe(true);
  });

  it("returns null for an unknown slug", async () => {
    expect(await getEventByPublicSlug("does-not-exist-abcdefgh")).toBeNull();
  });
});

describe("guest listing (Spec 15.9)", () => {
  it("excludes removed guests from the organiser's normal view", async () => {
    const organiser = await createOrganiser();
    const event = await createEvent(organiser.id);

    await createGuest(event.id, { forename: "Ada", email: "ada@example.com" });
    const removed = await createGuest(event.id, { forename: "Bob", email: "bob@example.com" });

    await db
      .update(guests)
      .set({ removedAt: new Date() })
      .where(eq(guests.id, removed.guest.id));

    const active = await listGuestsForEvent(event.id);
    expect(active.map((guest) => guest.forename)).toEqual(["Ada"]);
  });
});
