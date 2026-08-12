import { sql } from "drizzle-orm";
import { db } from "@/db";
import {
  auditEvents,
  events,
  guests,
  menuCourses,
  menuOptions,
  users,
} from "@/db/schema";
import { generateRsvpToken, hashToken } from "@/lib/crypto/tokens";
import { sealToken } from "@/lib/crypto/token-cipher";
import { buildPublicSlug } from "@/lib/slug";
import { wallClockToInstant } from "@/lib/time";

/**
 * Integration test helpers.
 *
 * These run against a real PostgreSQL database (`gathered_test`) so the
 * partial unique indexes, foreign keys and cascade rules that enforce several
 * of the specification's guarantees are genuinely exercised, an in-memory fake
 * would not test any of them.
 *
 * Set up once with:
 *   docker compose -f docker-compose.dev.yml up -d
 *   docker exec gathered-postgres-dev psql -U postgres -c "CREATE DATABASE gathered_test"
 *   DATABASE_URL=postgres://postgres:postgres@localhost:5432/gathered_test npm run db:migrate
 */

/** Empties every table. `restart identity cascade` also resets sequences. */
export async function resetDatabase(): Promise<void> {
  await db.execute(sql`
    truncate table
      ${auditEvents},
      ${menuOptions},
      ${menuCourses},
      ${guests},
      ${events},
      ${users}
    restart identity cascade
  `);
}

let counter = 0;
function unique(prefix: string): string {
  counter += 1;
  return `${prefix}${counter}`;
}

export async function createOrganiser(
  overrides: { name?: string; email?: string; disabled?: boolean; role?: "organiser" | "superadmin" } = {},
) {
  const rows = await db
    .insert(users)
    .values({
      name: overrides.name ?? "Test Organiser",
      email: overrides.email ?? `${unique("organiser")}@example.com`,
      passwordHash: "argon2-placeholder-not-used-in-these-tests",
      role: overrides.role ?? "organiser",
      disabledAt: overrides.disabled ? new Date() : null,
    })
    .returning();

  return rows[0]!;
}

export async function createEvent(
  organiserId: string,
  overrides: {
    name?: string;
    eventDate?: string;
    rsvpDeadlineAt?: Date;
    timezone?: string;
  } = {},
) {
  const timezone = overrides.timezone ?? "Europe/London";
  const eventDate = overrides.eventDate ?? "2026-03-14";
  const name = overrides.name ?? "Test Baby Shower";

  const rows = await db
    .insert(events)
    .values({
      organiserId,
      publicSlug: buildPublicSlug(name),
      name,
      eventDate,
      startTime: "14:00:00",
      endTime: "17:00:00",
      timezone,
      locationName: "The Garden Room",
      locationAddress: "12 Rose Lane, Bath",
      description: null,
      rsvpDeadlineAt:
        overrides.rsvpDeadlineAt ?? wallClockToInstant("2026-03-01", "23:59", timezone),
    })
    .returning();

  return rows[0]!;
}

export interface CreatedGuest {
  guest: typeof guests.$inferSelect;
  /** The plaintext RSVP token, which production code never returns. */
  token: string;
}

export async function createGuest(
  eventId: string,
  overrides: { forename?: string; surname?: string; email?: string } = {},
): Promise<CreatedGuest> {
  const token = generateRsvpToken();

  const rows = await db
    .insert(guests)
    .values({
      eventId,
      forename: overrides.forename ?? "Ada",
      surname: overrides.surname ?? "Lovelace",
      email: overrides.email ?? `${unique("guest")}@example.com`,
      rsvpTokenLookup: hashToken(token),
      rsvpTokenSealed: sealToken(token),
    })
    .returning();

  return { guest: rows[0]!, token };
}

export async function createCourse(
  eventId: string,
  name: string,
  displayOrder = 0,
) {
  const rows = await db
    .insert(menuCourses)
    .values({ eventId, name, displayOrder })
    .returning();
  return rows[0]!;
}

export async function createOption(
  courseId: string,
  name: string,
  displayOrder = 0,
) {
  const rows = await db
    .insert(menuOptions)
    .values({ courseId, name, displayOrder })
    .returning();
  return rows[0]!;
}
