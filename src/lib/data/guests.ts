import "server-only";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { events, guests, menuSelections, users } from "@/db/schema";
import type { Event, Guest, MenuSelection } from "@/db/schema";
import { hashToken } from "@/lib/crypto/tokens";

/**
 * Guest queries (Spec 6.4, 10.5).
 *
 * Soft-deleted ("removed") guests are excluded from every normal read. They
 * remain in the table for audit purposes only (Spec 6.4).
 */

export interface GuestWithSelections extends Guest {
  selections: MenuSelection[];
}

/** Active guests for an event, ordered by name. */
export async function listGuestsForEvent(eventId: string): Promise<Guest[]> {
  return db
    .select()
    .from(guests)
    .where(and(eq(guests.eventId, eventId), isNull(guests.removedAt)))
    .orderBy(asc(guests.surname), asc(guests.forename), asc(guests.id));
}

/** Active guests with their menu selections attached, responses view and exports. */
export async function listGuestsWithSelections(eventId: string): Promise<GuestWithSelections[]> {
  const guestRows = await listGuestsForEvent(eventId);
  if (guestRows.length === 0) return [];

  const selectionRows = await db
    .select()
    .from(menuSelections)
    .where(
      inArray(
        menuSelections.guestId,
        guestRows.map((guest) => guest.id),
      ),
    );

  const byGuest = new Map<string, MenuSelection[]>();
  for (const selection of selectionRows) {
    const list = byGuest.get(selection.guestId);
    if (list) list.push(selection);
    else byGuest.set(selection.guestId, [selection]);
  }

  return guestRows.map((guest) => ({
    ...guest,
    selections: byGuest.get(guest.id) ?? [],
  }));
}

/**
 * Fetches a guest scoped to an event the organiser owns. The event ownership
 * check is part of the join, so an organiser cannot reach a guest on someone
 * else's event by guessing an id (Spec 6.7, 8.1).
 */
export async function getGuestForOrganiser(
  guestId: string,
  organiserId: string,
): Promise<{ guest: Guest; event: Event } | null> {
  const rows = await db
    .select({ guest: guests, event: events })
    .from(guests)
    .innerJoin(events, eq(events.id, guests.eventId))
    .where(
      and(
        eq(guests.id, guestId),
        eq(events.organiserId, organiserId),
        isNull(guests.removedAt),
        isNull(events.deletedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

export interface GuestInvitationLookup {
  guest: Guest;
  event: Event;
  organiserName: string;
  organiserDisabled: boolean;
}

/**
 * Resolves a private RSVP link.
 *
 * The presented token is hashed and matched against the stored lookup hash, 
 * the plaintext token is never used in a query, and never leaves the request.
 * Removed guests and soft-deleted events resolve to null, which the caller
 * renders as the single generic "no longer valid" message (Spec 9.2).
 */
export async function getGuestByRsvpToken(token: string): Promise<GuestInvitationLookup | null> {
  if (!token) return null;

  const rows = await db
    .select({
      guest: guests,
      event: events,
      organiserName: users.name,
      organiserDisabledAt: users.disabledAt,
    })
    .from(guests)
    .innerJoin(events, eq(events.id, guests.eventId))
    .innerJoin(users, eq(users.id, events.organiserId))
    .where(
      and(
        eq(guests.rsvpTokenLookup, hashToken(token)),
        isNull(guests.removedAt),
        isNull(events.deletedAt),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    guest: row.guest,
    event: row.event,
    organiserName: row.organiserName,
    organiserDisabled: row.organiserDisabledAt !== null,
  };
}

export async function getSelectionsForGuest(guestId: string): Promise<MenuSelection[]> {
  return db.select().from(menuSelections).where(eq(menuSelections.guestId, guestId));
}
