import { describe, expect, it } from "vitest";
import {
  formatEventDate,
  formatInstant,
  formatWallTime,
  instantToWallClock,
  isDeadlinePassed,
  isRealCalendarDate,
  isValidTimeZone,
  isValidWallTime,
  wallClockToInstant,
} from "./time";

describe("wallClockToInstant", () => {
  it("interprets wall time in the event timezone, not the server's (GMT)", () => {
    // 14 Jan is outside British Summer Time, so Europe/London is UTC+0.
    const instant = wallClockToInstant("2026-01-14", "14:00", "Europe/London");
    expect(instant.toISOString()).toBe("2026-01-14T14:00:00.000Z");
  });

  it("applies British Summer Time when the date falls inside it", () => {
    // 14 July is BST (UTC+1), so 14:00 local is 13:00Z.
    const instant = wallClockToInstant("2026-07-14", "14:00", "Europe/London");
    expect(instant.toISOString()).toBe("2026-07-14T13:00:00.000Z");
  });

  it("handles zones far from the server timezone", () => {
    const instant = wallClockToInstant("2026-07-14", "09:00", "Australia/Sydney");
    expect(instant.toISOString()).toBe("2026-07-13T23:00:00.000Z");
  });

  it("handles a negative-offset zone", () => {
    const instant = wallClockToInstant("2026-01-14", "18:30", "America/New_York");
    expect(instant.toISOString()).toBe("2026-01-14T23:30:00.000Z");
  });

  it("round-trips through instantToWallClock", () => {
    const cases = [
      { date: "2026-03-14", time: "15:30", zone: "Europe/London" },
      { date: "2026-08-01", time: "09:05", zone: "Europe/London" },
      { date: "2026-11-22", time: "23:59", zone: "America/Los_Angeles" },
      { date: "2026-06-06", time: "00:00", zone: "Asia/Tokyo" },
    ];

    for (const { date, time, zone } of cases) {
      const instant = wallClockToInstant(date, time, zone);
      expect(instantToWallClock(instant, zone)).toEqual({ date, time });
    }
  });

  it("rejects malformed input rather than silently coercing", () => {
    expect(() => wallClockToInstant("14/03/2026", "14:00", "Europe/London")).toThrow();
    expect(() => wallClockToInstant("2026-03-14", "2pm", "Europe/London")).toThrow();
  });
});

describe("isRealCalendarDate", () => {
  it("accepts real dates including a leap day", () => {
    expect(isRealCalendarDate("2026-03-14")).toBe(true);
    expect(isRealCalendarDate("2028-02-29")).toBe(true);
  });

  it("rejects dates that do not exist (Spec 4.2)", () => {
    expect(isRealCalendarDate("2026-02-30")).toBe(false);
    expect(isRealCalendarDate("2026-02-29")).toBe(false); // 2026 is not a leap year
    expect(isRealCalendarDate("2026-13-01")).toBe(false);
    expect(isRealCalendarDate("2026-00-10")).toBe(false);
    expect(isRealCalendarDate("not-a-date")).toBe(false);
  });
});

describe("isValidWallTime", () => {
  it("accepts valid 24-hour times", () => {
    expect(isValidWallTime("00:00")).toBe(true);
    expect(isValidWallTime("23:59")).toBe(true);
    expect(isValidWallTime("14:30:00")).toBe(true);
  });

  it("rejects out-of-range times", () => {
    expect(isValidWallTime("24:00")).toBe(false);
    expect(isValidWallTime("12:60")).toBe(false);
    expect(isValidWallTime("2:30")).toBe(false);
  });
});

describe("isDeadlinePassed", () => {
  const deadline = new Date("2026-03-01T23:59:00.000Z");

  it("is false before the deadline", () => {
    expect(isDeadlinePassed(deadline, new Date("2026-03-01T23:58:59.000Z"))).toBe(false);
  });

  it("is false exactly at the deadline", () => {
    expect(isDeadlinePassed(deadline, deadline)).toBe(false);
  });

  it("is true after the deadline", () => {
    expect(isDeadlinePassed(deadline, new Date("2026-03-01T23:59:00.001Z"))).toBe(true);
  });
});

describe("isValidTimeZone", () => {
  it("accepts IANA identifiers and rejects nonsense", () => {
    expect(isValidTimeZone("Europe/London")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus_Mons")).toBe(false);
  });
});

describe("display formatting", () => {
  it("formats the event date as the organiser typed it", () => {
    expect(formatEventDate("2026-03-14")).toBe("Saturday, 14 March 2026");
  });

  it("formats times conversationally", () => {
    expect(formatWallTime("14:00")).toBe("2pm");
    expect(formatWallTime("14:30")).toBe("2:30pm");
    expect(formatWallTime("09:05")).toBe("9:05am");
    expect(formatWallTime("00:00")).toBe("12am");
    expect(formatWallTime("12:00")).toBe("12pm");
  });

  it("formats an instant back in the event timezone", () => {
    const deadline = wallClockToInstant("2026-03-01", "23:59", "Europe/London");
    expect(formatInstant(deadline, "Europe/London")).toBe("1 March 2026 at 11:59pm");
  });
});
