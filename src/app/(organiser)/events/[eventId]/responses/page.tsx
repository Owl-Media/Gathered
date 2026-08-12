import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOrganiser } from "@/lib/auth/guards";
import { getEventCounts, getEventForOrganiser } from "@/lib/data/events";
import { listGuestsWithSelections } from "@/lib/data/guests";
import { listSelectableCourses } from "@/lib/data/menu";
import { responseSourceLabel } from "@/lib/rsvp";
import { formatInstant } from "@/lib/time";
import { ResponsesView, type ResponseRow } from "./responses-view";

export const metadata: Metadata = { title: "Responses" };

export default async function ResponsesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const organiser = await requireOrganiser();

  const event = await getEventForOrganiser(eventId, organiser.id);
  if (!event) notFound();

  const [guests, courses, counts] = await Promise.all([
    // Removed guests are excluded by this query (Spec 15.9).
    listGuestsWithSelections(event.id),
    listSelectableCourses(event.id),
    getEventCounts(event.id),
  ]);

  const rows: ResponseRow[] = guests.map((guest) => ({
    id: guest.id,
    forename: guest.forename,
    surname: guest.surname,
    email: guest.email,
    rsvpStatus: guest.rsvpStatus,
    responseSourceLabel: responseSourceLabel(guest.responseSource),
    lastResponseLabel: guest.lastResponseAt
      ? formatInstant(guest.lastResponseAt, event.timezone)
      : null,
    dietaryRequirements: guest.dietaryRequirements,
    guestMessage: guest.guestMessage,
    organiserNote: guest.organiserNote,
    selections: guest.selections.map((selection) => ({
      courseId: selection.courseId,
      optionId: selection.optionId,
      // Snapshots, so an archived or renamed option still reads correctly
      // (Spec 8.4, 10.6).
      course: selection.courseNameSnapshot,
      option: selection.optionNameSnapshot,
    })),
  }));

  return (
    <ResponsesView
      guests={rows}
      counts={counts}
      courses={courses.map((course) => ({
        id: course.id,
        name: course.name,
        options: course.options.map((option) => ({ id: option.id, name: option.name })),
      }))}
    />
  );
}
