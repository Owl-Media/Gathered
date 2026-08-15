import { describe, expect, it } from "vitest";
import { invitationEmail } from "./templates";

/**
 * Invitation email template (Spec 6.5).
 */

function baseInput() {
  return {
    guestForename: "Alex",
    guestEmail: "alex@example.com",
    eventName: "Baby Shower",
    eventDate: "2026-06-01",
    startTime: "14:00",
    locationName: "The Garden Hall",
    locationAddress: "1 Garden Lane",
    rsvpUrl: "https://example.com/rsvp/abc123",
    placeholderTheme: "clouds",
  };
}

describe("invitationEmail", () => {
  it("includes the required Spec 6.5 fields", () => {
    const message = invitationEmail(baseInput());

    expect(message.html).toContain("Baby Shower");
    expect(message.html).toContain("The Garden Hall");
    expect(message.html).toContain("1 Garden Lane");
    expect(message.html).toContain("https://example.com/rsvp/abc123");
    expect(message.text).toContain("https://example.com/rsvp/abc123");
  });

  it("themes the banner and button colour to match the event's chosen artwork", () => {
    const clouds = invitationEmail({ ...baseInput(), placeholderTheme: "clouds" });
    const botanical = invitationEmail({ ...baseInput(), placeholderTheme: "botanical" });

    expect(clouds.html).not.toEqual(botanical.html);
    // Sky (clouds) vs sage (botanical) accent colours from the design tokens.
    expect(clouds.html).toContain("#47708b");
    expect(botanical.html).toContain("#4d7053");
  });

  it("falls back to the clouds theme for an unrecognised value", () => {
    const message = invitationEmail({ ...baseInput(), placeholderTheme: "not-a-real-theme" });

    expect(message.html).toContain("#47708b");
  });

  it("uses the organiser's uploaded header photo instead of the theme banner when present", () => {
    const withPhoto = invitationEmail({
      ...baseInput(),
      headerImageUrl: "https://cdn.example.com/events/1/header.webp",
    });
    const withoutPhoto = invitationEmail(baseInput());

    expect(withPhoto.html).toContain(
      '<img src="https://cdn.example.com/events/1/header.webp"',
    );
    expect(withPhoto.html).not.toContain("☁️");
    expect(withoutPhoto.html).toContain("☁️");
    expect(withoutPhoto.html).not.toContain("<img");
  });

  it("HTML-escapes organiser-supplied text", () => {
    const message = invitationEmail({
      ...baseInput(),
      eventName: "<script>alert(1)</script>",
    });

    expect(message.html).not.toContain("<script>alert(1)</script>");
    expect(message.html).toContain("&lt;script&gt;");
  });
});
