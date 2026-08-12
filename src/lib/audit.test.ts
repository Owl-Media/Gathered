import { describe, expect, it } from "vitest";
import { __testing } from "./audit";

const { scrubMetadata } = __testing;

/**
 * Audit metadata redaction (Spec 3.3, 6.9, 10.7).
 *
 * Superadmins can read the audit log but are barred from guest dietary
 * requirements, guest messages and RSVP tokens. Redaction happens at write
 * time, so no reader of the log can reach that data regardless of how a caller
 * populated the metadata.
 */
describe("scrubMetadata", () => {
  it("keeps innocuous operational keys", () => {
    expect(
      scrubMetadata({ eventId: "abc", status: "accepted", guestCount: 12 }),
    ).toEqual({ eventId: "abc", status: "accepted", guestCount: 12 });
  });

  it.each([
    "rsvpToken",
    "token",
    "dietaryRequirements",
    "dietary",
    "guestMessage",
    "message",
    "organiserNote",
    "note",
    "password",
    "passwordHash",
    "sessionSecret",
    "guestEmail",
    "email",
  ])("redacts %s", (key) => {
    expect(scrubMetadata({ [key]: "sensitive value" })).toEqual({ [key]: "[redacted]" });
  });

  it("matches case-insensitively and as a substring", () => {
    expect(scrubMetadata({ GuestMESSAGE: "hi", RSVP_TOKEN_full: "abc" })).toEqual({
      GuestMESSAGE: "[redacted]",
      RSVP_TOKEN_full: "[redacted]",
    });
  });

  it("redacts sensitive keys while preserving the rest of the record", () => {
    expect(
      scrubMetadata({ eventId: "evt-1", guestMessage: "Congratulations!", status: "accepted" }),
    ).toEqual({ eventId: "evt-1", guestMessage: "[redacted]", status: "accepted" });
  });

  it("keeps boolean and numeric flags whose names merely resemble a sensitive field", () => {
    // Whether an export carried private notes is precisely what the audit log
    // should record, and a boolean cannot leak the notes themselves.
    expect(
      scrubMetadata({ includeOrganiserNotes: true, noteCount: 3, exportKind: "csv" }),
    ).toEqual({ includeOrganiserNotes: true, noteCount: 3, exportKind: "csv" });
  });

  it("still redacts a sensitive key holding string content", () => {
    expect(scrubMetadata({ organiserNote: "Sat with the grandparents" })).toEqual({
      organiserNote: "[redacted]",
    });
  });
});
