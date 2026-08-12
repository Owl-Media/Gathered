import { notFound } from "next/navigation";
import Link from "next/link";
import { requireOrganiser } from "@/lib/auth/guards";
import { getEventForOrganiser } from "@/lib/data/events";
import { formatEventDateShort, formatInstant, isDeadlinePassed } from "@/lib/time";
import { EventTabs } from "./event-tabs";

/**
 * Event management shell (Spec 5.2).
 *
 * Desktop shows a tabbed interface; on mobile the same links become a
 * horizontally scrollable strip and each section stacks vertically.
 *
 * The event is loaded here with an ownership-scoped query, so a request for
 * another organiser's event 404s before any child page runs (Spec 15.2, 15.3).
 */
export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const organiser = await requireOrganiser();
  const event = await getEventForOrganiser(eventId, organiser.id);

  // Not found and not yours are indistinguishable on purpose (Spec 8.1).
  if (!event) notFound();

  const deadlinePassed = isDeadlinePassed(event.rsvpDeadlineAt);

  return (
    <div>
      <Link
        href="/dashboard"
        className="text-ink-500 hover:text-blush-700 mb-4 inline-block text-sm"
      >
        ← Back to your events
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl leading-tight">{event.name}</h1>
          <p className="text-ink-500 mt-1.5 text-sm">
            {formatEventDateShort(event.eventDate)} · {event.locationName}
          </p>
          <p className={`mt-1 text-xs ${deadlinePassed ? "text-clay-700" : "text-ink-400"}`}>
            {deadlinePassed ? "Replies closed " : "Replies close "}
            {formatInstant(event.rsvpDeadlineAt, event.timezone)}
          </p>
        </div>

        <Link
          href={`/e/${event.publicSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-sm"
        >
          View public page
        </Link>
      </div>

      <EventTabs eventId={event.id} />

      <div className="mt-6">{children}</div>
    </div>
  );
}
