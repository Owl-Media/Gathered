import type { Metadata } from "next";
import Link from "next/link";
import { requireOrganiser } from "@/lib/auth/guards";
import { listEventsForOrganiser } from "@/lib/data/events";
import { formatEventDateShort, formatInstant, isDeadlinePassed } from "@/lib/time";
import { EmptyState } from "@/components/ui/empty-state";
import { BrandMark } from "@/components/brand";

export const metadata: Metadata = { title: "Your events" };

/**
 * Organiser dashboard (Spec 5.1).
 *
 * Shows only events owned by the signed-in organiser, each with its RSVP
 * counts and quick actions.
 */
export default async function DashboardPage() {
  const organiser = await requireOrganiser();
  const events = await listEventsForOrganiser(organiser.id);

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">Your events</h1>
          <p className="text-ink-500 mt-1 text-sm">
            {events.length === 0
              ? "Create your first event to get started."
              : `${events.length} ${events.length === 1 ? "event" : "events"}`}
          </p>
        </div>

        <Link href="/events/new" className="btn btn-primary">
          Create event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<BrandMark className="size-14 opacity-70" />}
            title="No events yet"
            description="Set up your event details, add your guest list, and share a private invitation link with each guest."
            action={
              <Link href="/events/new" className="btn btn-primary">
                Create your first event
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2">
          {events.map((event) => {
            const deadlinePassed = isDeadlinePassed(event.rsvpDeadlineAt);

            return (
              <li key={event.id} className="card card-padded flex flex-col gap-5">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-xl leading-snug">
                      <Link
                        href={`/events/${event.id}`}
                        className="hover:text-blush-700 rounded transition-colors"
                      >
                        {event.name}
                      </Link>
                    </h2>
                    {deadlinePassed && <span className="pill pill-pending shrink-0">Closed</span>}
                  </div>

                  <p className="text-ink-500 mt-1.5 text-sm">
                    {formatEventDateShort(event.eventDate)}
                  </p>
                  <p className="text-ink-400 mt-0.5 text-xs">
                    RSVP by {formatInstant(event.rsvpDeadlineAt, event.timezone)}
                  </p>
                </div>

                <dl className="border-cream-300 grid grid-cols-4 gap-2 border-y py-3.5 text-center">
                  <Stat label="Invited" value={event.counts.invited} />
                  <Stat label="Yes" value={event.counts.accepted} tone="text-sage-700" />
                  <Stat label="No" value={event.counts.declined} tone="text-clay-700" />
                  <Stat label="Waiting" value={event.counts.notResponded} />
                </dl>

                <div className="flex flex-wrap gap-2">
                  <Link href={`/events/${event.id}`} className="btn btn-primary btn-sm">
                    Manage
                  </Link>
                  <Link href={`/events/${event.id}/guests`} className="btn btn-secondary btn-sm">
                    Guests
                  </Link>
                  <Link href={`/events/${event.id}/exports`} className="btn btn-secondary btn-sm">
                    Export
                  </Link>
                  <Link
                    href={`/e/${event.publicSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm"
                  >
                    View page
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div>
      <dt className="text-ink-500 order-2 text-xs">{label}</dt>
      <dd className={`text-xl font-semibold tabular-nums ${tone ?? "text-ink-900"}`}>{value}</dd>
    </div>
  );
}
