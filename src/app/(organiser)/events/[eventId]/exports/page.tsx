import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOrganiser } from "@/lib/auth/guards";
import { getEventCounts, getEventForOrganiser } from "@/lib/data/events";
import { listGuestsForEvent } from "@/lib/data/guests";
import { db } from "@/db";
import { guests } from "@/db/schema";
import { and, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { ExportPanel } from "./export-panel";

export const metadata: Metadata = { title: "Exports" };

export default async function ExportsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const organiser = await requireOrganiser();

  const event = await getEventForOrganiser(eventId, organiser.id);
  if (!event) notFound();

  const [counts, guestRows, messageCountRows, noteCountRows] = await Promise.all([
    getEventCounts(event.id),
    listGuestsForEvent(event.id),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(guests)
      .where(
        and(
          eq(guests.eventId, event.id),
          isNull(guests.removedAt),
          isNotNull(guests.guestMessage),
          ne(guests.guestMessage, ""),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(guests)
      .where(
        and(
          eq(guests.eventId, event.id),
          isNull(guests.removedAt),
          isNotNull(guests.organiserNote),
          ne(guests.organiserNote, ""),
        ),
      ),
  ]);

  return (
    <ExportPanel
      eventId={event.id}
      guestCount={guestRows.length}
      acceptedCount={counts.accepted}
      messageCount={messageCountRows[0]?.count ?? 0}
      noteCount={noteCountRows[0]?.count ?? 0}
    />
  );
}
