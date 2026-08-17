import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { guests, menuOptions, menuSelections } from "@/db/schema";
import {
  createCourse,
  createEvent,
  createGuest,
  createOption,
  createOrganiser,
  resetDatabase,
} from "../../test/helpers/db";
import { applyRsvp, responseSourceLabel, validateSelections } from "./rsvp";
import { listSelectableCourses } from "./data/menu";
import { buildExportDataset, guestsWithMessages } from "./exports/data";

/**
 * RSVP engine tests (Spec 6.6, 6.7, 8.4, 15.4, 15.7).
 */

beforeEach(async () => {
  await resetDatabase();
});

async function eventWithMenu() {
  const organiser = await createOrganiser();
  const event = await createEvent(organiser.id);

  const main = await createCourse(event.id, "Main", 0);
  const chicken = await createOption(main.id, "Roast chicken", 0);
  const risotto = await createOption(main.id, "Wild mushroom risotto", 1);

  const dessert = await createCourse(event.id, "Dessert", 1);
  const tart = await createOption(dessert.id, "Lemon tart", 0);

  return { organiser, event, main, chicken, risotto, dessert, tart };
}

describe("validateSelections, accepting guests (Spec 8.4)", () => {
  it("requires exactly one option per course", async () => {
    const { event, main, chicken, dessert, tart } = await eventWithMenu();

    const result = await validateSelections(event.id, "accepted", {
      [main.id]: chicken.id,
      [dessert.id]: tart.id,
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.selections).toHaveLength(2);
  });

  it("names the missing course in the error (Spec 9.4)", async () => {
    const { event, main, chicken, dessert } = await eventWithMenu();

    const result = await validateSelections(event.id, "accepted", {
      [main.id]: chicken.id,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[`selections.${dessert.id}`]).toBe(
        "Please choose an option for Dessert.",
      );
    }
  });

  it("rejects an option belonging to a different course", async () => {
    const { event, main, dessert, tart } = await eventWithMenu();

    // Tart belongs to Dessert, submitted here against Main.
    const result = await validateSelections(event.id, "accepted", {
      [main.id]: tart.id,
      [dessert.id]: tart.id,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[`selections.${main.id}`]).toBeDefined();
  });

  it("rejects an archived option", async () => {
    const { event, main, chicken, dessert, tart } = await eventWithMenu();

    await db
      .update(menuOptions)
      .set({ archivedAt: new Date() })
      .where(eq(menuOptions.id, chicken.id));

    const result = await validateSelections(event.id, "accepted", {
      [main.id]: chicken.id,
      [dessert.id]: tart.id,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[`selections.${main.id}`]).toMatch(/no longer available/i);
    }
  });

  it("captures course and option name snapshots at selection time (Spec 10.6)", async () => {
    const { event, main, chicken, dessert, tart } = await eventWithMenu();

    const result = await validateSelections(event.id, "accepted", {
      [main.id]: chicken.id,
      [dessert.id]: tart.id,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.selections).toContainEqual(
        expect.objectContaining({
          courseNameSnapshot: "Main",
          optionNameSnapshot: "Roast chicken",
        }),
      );
    }
  });
});

describe("validateSelections, declining guests (Spec 8.4)", () => {
  it("requires no menu choices at all", async () => {
    const { event } = await eventWithMenu();

    const result = await validateSelections(event.id, "declined", {});
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.selections).toHaveLength(0);
  });

  it("discards any choices that were submitted anyway", async () => {
    const { event, main, chicken } = await eventWithMenu();

    const result = await validateSelections(event.id, "declined", {
      [main.id]: chicken.id,
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.selections).toHaveLength(0);
  });
});

describe("validateSelections, events with no menu (Spec 4.4)", () => {
  it("asks nothing of an accepting guest", async () => {
    const organiser = await createOrganiser();
    const event = await createEvent(organiser.id);

    const result = await validateSelections(event.id, "accepted", {});
    expect(result.ok).toBe(true);
  });

  it("skips a course that has no active options", async () => {
    const organiser = await createOrganiser();
    const event = await createEvent(organiser.id);
    await createCourse(event.id, "Empty course", 0);

    // A course with no options cannot be answered, so it is not offered.
    expect(await listSelectableCourses(event.id)).toHaveLength(0);
    expect((await validateSelections(event.id, "accepted", {})).ok).toBe(true);
  });
});

describe("applyRsvp (Spec 6.6)", () => {
  it("saves an acceptance with its selections and stamps the response time", async () => {
    const { event, main, chicken, dessert, tart } = await eventWithMenu();
    const { guest } = await createGuest(event.id);

    const validation = await validateSelections(event.id, "accepted", {
      [main.id]: chicken.id,
      [dessert.id]: tart.id,
    });
    if (!validation.ok) throw new Error("expected valid selections");

    await applyRsvp({
      guestId: guest.id,
      status: "accepted",
      dietaryRequirements: "No nuts",
      guestMessage: "Congratulations!",
      selections: validation.selections,
      source: "guest_submitted",
    });

    const saved = (await db.select().from(guests).where(eq(guests.id, guest.id)))[0]!;
    expect(saved.rsvpStatus).toBe("accepted");
    expect(saved.responseSource).toBe("guest_submitted");
    expect(saved.dietaryRequirements).toBe("No nuts");
    expect(saved.lastResponseAt).not.toBeNull();

    const rows = await db
      .select()
      .from(menuSelections)
      .where(eq(menuSelections.guestId, guest.id));
    expect(rows).toHaveLength(2);
  });

  it("replaces previous selections rather than accumulating them", async () => {
    const { event, main, chicken, risotto, dessert, tart } = await eventWithMenu();
    const { guest } = await createGuest(event.id);

    const first = await validateSelections(event.id, "accepted", {
      [main.id]: chicken.id,
      [dessert.id]: tart.id,
    });
    if (!first.ok) throw new Error("expected valid");
    await applyRsvp({
      guestId: guest.id,
      status: "accepted",
      dietaryRequirements: null,
      guestMessage: null,
      selections: first.selections,
      source: "guest_submitted",
    });

    const second = await validateSelections(event.id, "accepted", {
      [main.id]: risotto.id,
      [dessert.id]: tart.id,
    });
    if (!second.ok) throw new Error("expected valid");
    await applyRsvp({
      guestId: guest.id,
      status: "accepted",
      dietaryRequirements: null,
      guestMessage: null,
      selections: second.selections,
      source: "guest_submitted",
    });

    const rows = await db
      .select()
      .from(menuSelections)
      .where(eq(menuSelections.guestId, guest.id));

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.optionNameSnapshot).sort()).toEqual([
      "Lemon tart",
      "Wild mushroom risotto",
    ]);
  });

  it("clears menu selections when a guest switches to declined", async () => {
    const { event, main, chicken, dessert, tart } = await eventWithMenu();
    const { guest } = await createGuest(event.id);

    const accepted = await validateSelections(event.id, "accepted", {
      [main.id]: chicken.id,
      [dessert.id]: tart.id,
    });
    if (!accepted.ok) throw new Error("expected valid");
    await applyRsvp({
      guestId: guest.id,
      status: "accepted",
      dietaryRequirements: "No nuts",
      guestMessage: null,
      selections: accepted.selections,
      source: "guest_submitted",
    });

    await applyRsvp({
      guestId: guest.id,
      status: "declined",
      dietaryRequirements: null,
      guestMessage: "Sorry to miss it",
      selections: [],
      source: "guest_submitted",
    });

    const rows = await db
      .select()
      .from(menuSelections)
      .where(eq(menuSelections.guestId, guest.id));
    expect(rows).toHaveLength(0);

    const saved = (await db.select().from(guests).where(eq(guests.id, guest.id)))[0]!;
    expect(saved.rsvpStatus).toBe("declined");
    expect(saved.guestMessage).toBe("Sorry to miss it");
  });

  it("records an organiser edit with the editing organiser's id (Spec 6.7)", async () => {
    const { event, organiser } = await eventWithMenu();
    const { guest } = await createGuest(event.id);

    await applyRsvp({
      guestId: guest.id,
      status: "declined",
      dietaryRequirements: null,
      guestMessage: null,
      organiserNote: "Rang to say she can't make it",
      selections: [],
      source: "organiser_edited",
      editedByUserId: organiser.id,
    });

    const saved = (await db.select().from(guests).where(eq(guests.id, guest.id)))[0]!;
    expect(saved.responseSource).toBe("organiser_edited");
    expect(saved.lastEditedByUserId).toBe(organiser.id);
    expect(saved.organiserNote).toBe("Rang to say she can't make it");
  });

  it("clears the response timestamp when reset to not responded", async () => {
    const { event } = await eventWithMenu();
    const { guest } = await createGuest(event.id);

    await applyRsvp({
      guestId: guest.id,
      status: "declined",
      dietaryRequirements: null,
      guestMessage: null,
      selections: [],
      source: "guest_submitted",
    });

    await applyRsvp({
      guestId: guest.id,
      status: "not_responded",
      dietaryRequirements: null,
      guestMessage: null,
      selections: [],
      source: "not_responded",
    });

    const saved = (await db.select().from(guests).where(eq(guests.id, guest.id)))[0]!;
    expect(saved.rsvpStatus).toBe("not_responded");
    expect(saved.lastResponseAt).toBeNull();
  });

  it("leaves the organiser note untouched when the guest submits (Spec 6.7)", async () => {
    const { event, organiser } = await eventWithMenu();
    const { guest } = await createGuest(event.id);

    await applyRsvp({
      guestId: guest.id,
      status: "accepted",
      dietaryRequirements: null,
      guestMessage: null,
      organiserNote: "Private note",
      selections: [],
      source: "organiser_edited",
      editedByUserId: organiser.id,
    });

    // The guest path never passes organiserNote, so it must survive.
    await applyRsvp({
      guestId: guest.id,
      status: "declined",
      dietaryRequirements: null,
      guestMessage: "Changed my mind",
      selections: [],
      source: "guest_submitted",
    });

    const saved = (await db.select().from(guests).where(eq(guests.id, guest.id)))[0]!;
    expect(saved.organiserNote).toBe("Private note");
    expect(saved.responseSource).toBe("guest_submitted");
  });
});

/**
 * Dietary notes are special-category data under GDPR Art. 9, so the record of
 * consent has to track the data it was given for: created when the guest ticks
 * the box, and gone as soon as there is nothing left to consent to.
 */
describe("dietary consent record (GDPR Art. 9)", () => {
  it("records when the guest consented", async () => {
    const { event } = await eventWithMenu();
    const { guest } = await createGuest(event.id);

    await applyRsvp({
      guestId: guest.id,
      status: "accepted",
      dietaryRequirements: "Coeliac",
      dietaryConsentAt: new Date(),
      guestMessage: null,
      selections: [],
      source: "guest_submitted",
    });

    const saved = (await db.select().from(guests).where(eq(guests.id, guest.id)))[0]!;
    expect(saved.dietaryRequirements).toBe("Coeliac");
    expect(saved.dietaryConsentAt).not.toBeNull();
  });

  it("clears the consent record when the guest clears their dietary note", async () => {
    const { event } = await eventWithMenu();
    const { guest } = await createGuest(event.id);

    await applyRsvp({
      guestId: guest.id,
      status: "accepted",
      dietaryRequirements: "Coeliac",
      dietaryConsentAt: new Date(),
      guestMessage: null,
      selections: [],
      source: "guest_submitted",
    });

    // Clearing the box is how a guest withdraws consent.
    await applyRsvp({
      guestId: guest.id,
      status: "accepted",
      dietaryRequirements: null,
      dietaryConsentAt: null,
      guestMessage: null,
      selections: [],
      source: "guest_submitted",
    });

    const saved = (await db.select().from(guests).where(eq(guests.id, guest.id)))[0]!;
    expect(saved.dietaryRequirements).toBeNull();
    expect(saved.dietaryConsentAt).toBeNull();
  });

  it("clears the consent record when a decline discards the dietary note", async () => {
    const { event } = await eventWithMenu();
    const { guest } = await createGuest(event.id);

    await applyRsvp({
      guestId: guest.id,
      status: "accepted",
      dietaryRequirements: "No nuts",
      dietaryConsentAt: new Date(),
      guestMessage: null,
      selections: [],
      source: "guest_submitted",
    });

    await applyRsvp({
      guestId: guest.id,
      status: "declined",
      dietaryRequirements: null,
      dietaryConsentAt: null,
      guestMessage: null,
      selections: [],
      source: "guest_submitted",
    });

    const saved = (await db.select().from(guests).where(eq(guests.id, guest.id)))[0]!;
    expect(saved.dietaryConsentAt).toBeNull();
  });

  it("does not manufacture consent when an organiser types the note (Spec 6.7)", async () => {
    const { event, organiser } = await eventWithMenu();
    const { guest } = await createGuest(event.id);

    // The organiser path never passes dietaryConsentAt: an organiser cannot
    // consent on the guest's behalf.
    await applyRsvp({
      guestId: guest.id,
      status: "accepted",
      dietaryRequirements: "Rang to say she is vegetarian",
      guestMessage: null,
      selections: [],
      source: "organiser_edited",
      editedByUserId: organiser.id,
    });

    const saved = (await db.select().from(guests).where(eq(guests.id, guest.id)))[0]!;
    expect(saved.dietaryRequirements).toBe("Rang to say she is vegetarian");
    expect(saved.dietaryConsentAt).toBeNull();
  });

  it("leaves a guest's consent alone when an organiser edits around it", async () => {
    const { event, organiser } = await eventWithMenu();
    const { guest } = await createGuest(event.id);

    await applyRsvp({
      guestId: guest.id,
      status: "accepted",
      dietaryRequirements: "Coeliac",
      dietaryConsentAt: new Date(),
      guestMessage: null,
      selections: [],
      source: "guest_submitted",
    });

    await applyRsvp({
      guestId: guest.id,
      status: "accepted",
      dietaryRequirements: "Coeliac",
      guestMessage: null,
      organiserNote: "Confirmed by phone",
      selections: [],
      source: "organiser_edited",
      editedByUserId: organiser.id,
    });

    const saved = (await db.select().from(guests).where(eq(guests.id, guest.id)))[0]!;
    expect(saved.dietaryConsentAt).not.toBeNull();
  });
});

describe("archived options in exports (Spec 8.4, 15.4)", () => {
  it("still shows the historical option name after the option is archived", async () => {
    const { event, main, chicken, dessert, tart } = await eventWithMenu();
    const { guest } = await createGuest(event.id);

    const validation = await validateSelections(event.id, "accepted", {
      [main.id]: chicken.id,
      [dessert.id]: tart.id,
    });
    if (!validation.ok) throw new Error("expected valid");

    await applyRsvp({
      guestId: guest.id,
      status: "accepted",
      dietaryRequirements: null,
      guestMessage: null,
      selections: validation.selections,
      source: "guest_submitted",
    });

    // The organiser later archives and renames the option.
    await db
      .update(menuOptions)
      .set({ archivedAt: new Date(), name: "Renamed after the fact" })
      .where(eq(menuOptions.id, chicken.id));

    const dataset = await buildExportDataset(event);
    const exported = dataset.guests[0]!;

    expect(
      exported.selections.map((selection) => selection.option),
    ).toContain("Roast chicken");
    expect(
      exported.selections.map((selection) => selection.option),
    ).not.toContain("Renamed after the fact");
  });

  it("keeps a column for an archived course that guests still reference", async () => {
    const { event, main, chicken, dessert, tart } = await eventWithMenu();
    const { guest } = await createGuest(event.id);

    const validation = await validateSelections(event.id, "accepted", {
      [main.id]: chicken.id,
      [dessert.id]: tart.id,
    });
    if (!validation.ok) throw new Error("expected valid");
    await applyRsvp({
      guestId: guest.id,
      status: "accepted",
      dietaryRequirements: null,
      guestMessage: null,
      selections: validation.selections,
      source: "guest_submitted",
    });

    await db
      .update(menuOptions)
      .set({ archivedAt: new Date() })
      .where(eq(menuOptions.id, chicken.id));

    const dataset = await buildExportDataset(event);
    expect(dataset.courseColumns.map((column) => column.name)).toContain("Main");
  });
});

describe("export dataset (Spec 5.5, 5.6, Addendum)", () => {
  it("excludes removed guests", async () => {
    const organiser = await createOrganiser();
    const event = await createEvent(organiser.id);

    await createGuest(event.id, { forename: "Ada", email: "ada@example.com" });
    const removed = await createGuest(event.id, { forename: "Bob", email: "bob@example.com" });

    await db
      .update(guests)
      .set({ removedAt: new Date() })
      .where(eq(guests.id, removed.guest.id));

    const dataset = await buildExportDataset(event);
    expect(dataset.guests.map((guest) => guest.forename)).toEqual(["Ada"]);
  });

  it("includes only guests who left a message in the keepsake set", async () => {
    const organiser = await createOrganiser();
    const event = await createEvent(organiser.id);

    const withMessage = await createGuest(event.id, {
      forename: "Ada",
      email: "ada@example.com",
    });
    await createGuest(event.id, { forename: "Bob", email: "bob@example.com" });

    await applyRsvp({
      guestId: withMessage.guest.id,
      status: "accepted",
      dietaryRequirements: null,
      guestMessage: "So happy for you both",
      selections: [],
      source: "guest_submitted",
    });

    const dataset = await buildExportDataset(event);
    const keepsake = guestsWithMessages(dataset.guests);

    expect(keepsake).toHaveLength(1);
    expect(keepsake[0]?.forename).toBe("Ada");
  });

  it("excludes a removed guest even when they left a message", async () => {
    const organiser = await createOrganiser();
    const event = await createEvent(organiser.id);
    const { guest } = await createGuest(event.id);

    await applyRsvp({
      guestId: guest.id,
      status: "accepted",
      dietaryRequirements: null,
      guestMessage: "Best wishes",
      selections: [],
      source: "guest_submitted",
    });

    await db.update(guests).set({ removedAt: new Date() }).where(eq(guests.id, guest.id));

    const dataset = await buildExportDataset(event);
    expect(guestsWithMessages(dataset.guests)).toHaveLength(0);
  });
});

describe("responseSourceLabel (Spec 5.5)", () => {
  it("maps each source to its specified label", () => {
    expect(responseSourceLabel("guest_submitted")).toBe("Guest submitted");
    expect(responseSourceLabel("organiser_edited")).toBe("Organiser edited");
    expect(responseSourceLabel("not_responded")).toBe("Not responded");
  });
});
