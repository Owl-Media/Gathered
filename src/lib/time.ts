import { TZDate } from "@date-fns/tz";

/**
 * Timezone handling (Spec 6.8).
 *
 * Every event carries its own IANA timezone. Wall-clock values the organiser
 * typed (event date, start/end time, RSVP deadline) are interpreted in that
 * timezone, never in the server's. The RSVP deadline is persisted as an exact
 * instant so "has the deadline passed?" is a plain instant comparison that
 * cannot drift with server configuration.
 */

/** A calendar date as typed by the organiser: "YYYY-MM-DD". */
export type WallDate = string;
/** A wall-clock time as typed by the organiser: "HH:mm". */
export type WallTime = string;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** IANA zones offered in the event editor's timezone picker. */
export function supportedTimeZones(): string[] {
  const supported = Intl.supportedValuesOf?.("timeZone");
  return supported && supported.length > 0 ? [...supported] : ["Europe/London", "UTC"];
}

function parseWallDate(value: WallDate): { year: number; month: number; day: number } {
  const match = DATE_PATTERN.exec(value);
  if (!match) throw new Error(`Invalid date "${value}", expected YYYY-MM-DD`);
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function parseWallTime(value: WallTime): { hour: number; minute: number; second: number } {
  const match = TIME_PATTERN.exec(value);
  if (!match) throw new Error(`Invalid time "${value}", expected HH:mm`);
  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
    second: match[3] ? Number(match[3]) : 0,
  };
}

/**
 * Checks that a date string names a real calendar day.`Date` would silently
 * roll 2026-02-30 over to 2 March (Spec 4.2 "must be a valid calendar date").
 */
export function isRealCalendarDate(value: WallDate): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const { year, month, day } = parseWallDate(value);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day
  );
}

export function isValidWallTime(value: WallTime): boolean {
  if (!TIME_PATTERN.test(value)) return false;
  const { hour, minute, second } = parseWallTime(value);
  return hour <= 23 && minute <= 59 && second <= 59;
}

/**
 * Converts a wall-clock date + time in a given zone to the exact UTC instant.
 *
 * DST note: on a spring-forward day a time like 01:30 may not exist, and on a
 * fall-back day 01:30 happens twice. TZDate resolves both deterministically
 * rather than throwing, which is the right trade for an event planner, the
 * organiser sees the resolved time echoed back in the form.
 */
export function wallClockToInstant(date: WallDate, time: WallTime, timeZone: string): Date {
  const { year, month, day } = parseWallDate(date);
  const { hour, minute, second } = parseWallTime(time);
  return new Date(
    new TZDate(year, month - 1, day, hour, minute, second, 0, timeZone).getTime(),
  );
}

/** Inverse of {@link wallClockToInstant}, for repopulating edit forms. */
export function instantToWallClock(
  instant: Date,
  timeZone: string,
): { date: WallDate; time: WallTime } {
  const zoned = new TZDate(instant.getTime(), timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${zoned.getFullYear()}-${pad(zoned.getMonth() + 1)}-${pad(zoned.getDate())}`,
    time: `${pad(zoned.getHours())}:${pad(zoned.getMinutes())}`,
  };
}

/** True when `now` is past the event's RSVP deadline (Spec 6.8). */
export function isDeadlinePassed(rsvpDeadlineAt: Date, now: Date = new Date()): boolean {
  return now.getTime() > rsvpDeadlineAt.getTime();
}

/* -------------------------------------------------------------------------- */
/* Display formatting                                                         */
/* -------------------------------------------------------------------------- */

/**
 * "Saturday, 14 March 2026".
 *
 * Built from the literal date parts and formatted in UTC, so the calendar day
 * shown is exactly the one the organiser typed regardless of where the viewer
 * or server is.
 */
export function formatEventDate(date: WallDate): string {
  const { year, month, day } = parseWallDate(date);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/** "14 Mar 2026", the compact variant for dashboard cards and tables. */
export function formatEventDateShort(date: WallDate): string {
  const { year, month, day } = parseWallDate(date);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/** "2:30pm" */
export function formatWallTime(time: WallTime): string {
  const { hour, minute } = parseWallTime(time);
  const suffix = hour < 12 ? "am" : "pm";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return minute === 0
    ? `${displayHour}${suffix}`
    : `${displayHour}:${String(minute).padStart(2, "0")}${suffix}`;
}

/** "14 March 2026 at 11:59pm", used for deadlines and last-updated notices. */
export function formatInstant(instant: Date, timeZone: string): string {
  const { date, time } = instantToWallClock(instant, timeZone);
  const { year, month, day } = parseWallDate(date);
  const datePart = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
  return `${datePart} at ${formatWallTime(time)}`;
}

/** Timestamp used in export headers, including the zone for auditability. */
export function formatExportTimestamp(instant: Date, timeZone: string): string {
  return `${formatInstant(instant, timeZone)} (${timeZone})`;
}

/** Machine-readable timestamp for CSV columns. */
export function formatIsoTimestamp(instant: Date | null): string {
  return instant ? instant.toISOString() : "";
}
