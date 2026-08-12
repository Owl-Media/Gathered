import "server-only";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, guests, users } from "@/db/schema";
import type { Event } from "@/db/schema";
import { AuthorisationError } from "@/lib/auth/guards";

/**
 * Event queries.
 *
 * Ownership is part of the WHERE clause on every organiser-facing read, not a
 * check applied afterwards, an organiser simply cannot address another
 * organiser's event through these helpers (Spec 8.1, 15.2).
 */

export interface RsvpCounts {
  invited: number;
  accepted: number;
  declined: number;
  notResponded: number;
}

export interface EventWithCounts extends Event {
  counts: RsvpCounts;
}

/** Counts exclude soft-deleted guests (Spec 6.4, 15.9). */
const countExpressions = {
  invited: sql<number>`count(${guests.id}) filter (where ${guests.removedAt} is null)`.mapWith(
    Number,
  ),
  accepted:
    sql<number>`count(${guests.id}) filter (where ${guests.removedAt} is null and ${guests.rsvpStatus} = 'accepted')`.mapWith(
      Number,
    ),
  declined:
    sql<number>`count(${guests.id}) filter (where ${guests.removedAt} is null and ${guests.rsvpStatus} = 'declined')`.mapWith(
      Number,
    ),
  notResponded:
    sql<number>`count(${guests.id}) filter (where ${guests.removedAt} is null and ${guests.rsvpStatus} = 'not_responded')`.mapWith(
      Number,
    ),
};

/** Dashboard listing for one organiser, newest event date first (Spec 5.1). */
export async function listEventsForOrganiser(organiserId: string): Promise<EventWithCounts[]> {
  const rows = await db
    .select({
      event: events,
      invited: countExpressions.invited,
      accepted: countExpressions.accepted,
      declined: countExpressions.declined,
      notResponded: countExpressions.notResponded,
    })
    .from(events)
    .leftJoin(guests, eq(guests.eventId, events.id))
    .where(and(eq(events.organiserId, organiserId), isNull(events.deletedAt)))
    .groupBy(events.id)
    .orderBy(asc(events.eventDate));

  return rows.map((row) => ({
    ...row.event,
    counts: {
      invited: row.invited,
      accepted: row.accepted,
      declined: row.declined,
      notResponded: row.notResponded,
    },
  }));
}

/** Returns the event only if this organiser owns it, else null. */
export async function getEventForOrganiser(
  eventId: string,
  organiserId: string,
): Promise<Event | null> {
  const rows = await db
    .select()
    .from(events)
    .where(
      and(eq(events.id, eventId), eq(events.organiserId, organiserId), isNull(events.deletedAt)),
    )
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Ownership-checked fetch for Server Actions.
 *
 * Throws the same error for "not found" and "belongs to someone else", so the
 * response cannot be used to probe which event ids exist (Spec 8.1).
 */
export async function requireEventForOrganiser(
  eventId: string,
  organiserId: string,
): Promise<Event> {
  const event = await getEventForOrganiser(eventId, organiserId);
  if (!event) throw new AuthorisationError("That event could not be found.");
  return event;
}

export async function getEventCounts(eventId: string): Promise<RsvpCounts> {
  const rows = await db
    .select({
      invited: countExpressions.invited,
      accepted: countExpressions.accepted,
      declined: countExpressions.declined,
      notResponded: countExpressions.notResponded,
    })
    .from(guests)
    .where(eq(guests.eventId, eventId));

  return (
    rows[0] ?? { invited: 0, accepted: 0, declined: 0, notResponded: 0 }
  );
}

export interface PublicEventLookup {
  event: Event;
  organiserName: string;
  /** True when the owning organiser's account has been disabled (Spec 6.9). */
  organiserDisabled: boolean;
}

/**
 * Resolves an event from its public slug, for the public page and for guest
 * RSVP pages. Returns the organiser's disabled state so callers can show the
 * generic unavailable message.
 */
export async function getEventByPublicSlug(slug: string): Promise<PublicEventLookup | null> {
  const rows = await db
    .select({
      event: events,
      organiserName: users.name,
      organiserDisabledAt: users.disabledAt,
    })
    .from(events)
    .innerJoin(users, eq(users.id, events.organiserId))
    .where(and(eq(events.publicSlug, slug), isNull(events.deletedAt)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    event: row.event,
    organiserName: row.organiserName,
    organiserDisabled: row.organiserDisabledAt !== null,
  };
}
