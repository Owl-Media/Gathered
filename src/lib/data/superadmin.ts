import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditEvents, events, guests, users } from "@/db/schema";
import type { ActorType } from "@/db/schema";

/**
 * Superadmin queries (Spec 3.3, 6.9, 15.13).
 *
 * These deliberately select explicit column lists rather than whole rows. A
 * superadmin must not see guest dietary requirements, guest messages,
 * organiser notes, or RSVP tokens, so those columns are never fetched in the
 * first place. Enforcing it at the query keeps the boundary from depending on
 * a template remembering not to render something.
 */

export interface OrganiserSummary {
  id: string;
  name: string;
  email: string;
  role: "organiser" | "superadmin";
  disabledAt: Date | null;
  createdAt: Date;
  eventCount: number;
}

export async function listOrganisers(): Promise<OrganiserSummary[]> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      disabledAt: users.disabledAt,
      createdAt: users.createdAt,
      eventCount: sql<number>`count(${events.id}) filter (where ${events.deletedAt} is null)`.mapWith(
        Number,
      ),
    })
    .from(users)
    .leftJoin(events, eq(events.organiserId, users.id))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt));

  return rows;
}

export interface PlatformEventSummary {
  id: string;
  name: string;
  eventDate: string;
  organiserId: string;
  organiserName: string;
  organiserDisabled: boolean;
  createdAt: Date;
  invited: number;
  accepted: number;
  declined: number;
  notResponded: number;
}

/**
 * Event-level RSVP summaries across the platform (Spec 6.9).
 *
 * Counts only, no guest names, and nothing guest-identifying.
 */
export async function listPlatformEvents(): Promise<PlatformEventSummary[]> {
  const rows = await db
    .select({
      id: events.id,
      name: events.name,
      eventDate: events.eventDate,
      organiserId: users.id,
      organiserName: users.name,
      organiserDisabledAt: users.disabledAt,
      createdAt: events.createdAt,
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
    })
    .from(events)
    .innerJoin(users, eq(users.id, events.organiserId))
    .leftJoin(guests, eq(guests.eventId, events.id))
    .where(isNull(events.deletedAt))
    .groupBy(events.id, users.id)
    .orderBy(desc(events.createdAt));

  return rows.map(({ organiserDisabledAt, ...row }) => ({
    ...row,
    organiserDisabled: organiserDisabledAt !== null,
  }));
}

export interface AuditRow {
  id: string;
  actorType: ActorType;
  actorId: string | null;
  actorName: string | null;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  occurredAt: Date;
  metadata: Record<string, unknown> | null;
}

/**
 * Recent audit records (Spec 6.9, "Viewing basic audit information").
 *
 * Audit metadata is scrubbed of sensitive keys when it is written
 * (see lib/audit.ts), so nothing here can carry guest dietary requirements,
 * messages or tokens.
 */
export async function listRecentAuditEvents(limit = 200): Promise<AuditRow[]> {
  const rows = await db
    .select({
      id: auditEvents.id,
      actorType: auditEvents.actorType,
      actorId: auditEvents.actorId,
      actorName: users.name,
      eventType: auditEvents.eventType,
      entityType: auditEvents.entityType,
      entityId: auditEvents.entityId,
      occurredAt: auditEvents.occurredAt,
      metadata: auditEvents.metadata,
    })
    .from(auditEvents)
    .leftJoin(users, eq(users.id, auditEvents.actorId))
    .orderBy(desc(auditEvents.occurredAt))
    .limit(limit);

  return rows;
}

export interface PlatformTotals {
  organisers: number;
  disabledOrganisers: number;
  events: number;
  guests: number;
}

export async function getPlatformTotals(): Promise<PlatformTotals> {
  const [userRows, eventRows, guestRows] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)`.mapWith(Number),
        disabled: sql<number>`count(*) filter (where ${users.disabledAt} is not null)`.mapWith(
          Number,
        ),
      })
      .from(users)
      .where(eq(users.role, "organiser")),
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(events)
      .where(isNull(events.deletedAt)),
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(guests)
      .where(isNull(guests.removedAt)),
  ]);

  return {
    organisers: userRows[0]?.total ?? 0,
    disabledOrganisers: userRows[0]?.disabled ?? 0,
    events: eventRows[0]?.total ?? 0,
    guests: guestRows[0]?.total ?? 0,
  };
}

/** Looks up an organiser account for the enable/disable controls. */
export async function getOrganiserAccount(userId: string) {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      disabledAt: users.disabledAt,
    })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.role, "organiser")))
    .limit(1);

  return rows[0] ?? null;
}
