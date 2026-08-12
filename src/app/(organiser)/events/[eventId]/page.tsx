import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrganiser } from "@/lib/auth/guards";
import { getEventForOrganiser } from "@/lib/data/events";
import { env } from "@/lib/env";
import { instantToWallClock, supportedTimeZones } from "@/lib/time";
import { currencySymbolFor, toAmountInputValue } from "@/lib/money";
import { EventForm } from "@/components/event-form";
import { CopyButton } from "@/components/ui/copy-button";
import { updateEventAction } from "../actions";

export const metadata: Metadata = { title: "Event details" };

export default async function EventDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { eventId } = await params;
  const { created } = await searchParams;

  const organiser = await requireOrganiser();
  const event = await getEventForOrganiser(eventId, organiser.id);
  if (!event) notFound();

  // The deadline is stored as an instant; show it back as the wall-clock values
  // the organiser originally typed, in the event's own timezone.
  const deadline = instantToWallClock(event.rsvpDeadlineAt, event.timezone);
  const publicUrl = `${env.APP_BASE_URL}/e/${event.publicSlug}`;

  return (
    <div className="flex flex-col gap-6">
      {created === "1" && (
        <div className="notice notice-success" role="status">
          Your event has been created. Next, add your menu and guest list.
        </div>
      )}

      {/* Public link (Spec 5.2, "Public event link") */}
      <section className="card card-padded">
        <h2 className="text-lg">Public event page</h2>
        <p className="text-ink-500 mt-1 mb-4 text-sm">
          Share this with anyone who needs the event details. It shows no guest information and is
          never listed in search engines.
        </p>

        <div className="bg-cream-100 border-cream-300 flex flex-wrap items-center gap-3 rounded-xl border p-3">
          <code className="text-ink-700 min-w-0 flex-1 truncate text-sm">{publicUrl}</code>
          <div className="flex shrink-0 gap-2">
            <CopyButton value={publicUrl} />
            <Link
              href={`/e/${event.publicSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
            >
              Open
            </Link>
          </div>
        </div>

        <p className="text-ink-500 mt-4 text-sm">
          Want to see what a guest sees when they reply?{" "}
          <Link href={`/events/${event.id}/preview`} className="text-blush-700 font-medium hover:underline">
            Preview the RSVP journey
          </Link>
        </p>
      </section>

      <section className="card card-padded">
        <h2 className="mb-5 text-lg">Event details</h2>

        <EventForm
          action={updateEventAction.bind(null, event.id)}
          timezones={supportedTimeZones()}
          currencySymbol={currencySymbolFor(env.DEFAULT_CURRENCY)}
          submitLabel="Save changes"
          pendingLabel="Saving…"
          defaultValues={{
            name: event.name,
            eventDate: event.eventDate,
            // Postgres returns "HH:MM:SS"; the time input wants "HH:MM".
            startTime: event.startTime.slice(0, 5),
            endTime: event.endTime.slice(0, 5),
            timezone: event.timezone,
            locationName: event.locationName,
            locationAddress: event.locationAddress,
            description: event.description ?? "",
            rsvpDeadlineDate: deadline.date,
            rsvpDeadlineTime: deadline.time,
            placeholderTheme: event.placeholderTheme,
            depositAmount: toAmountInputValue(event.depositAmountMinor),
            totalAmount: toAmountInputValue(event.totalAmountMinor),
          }}
        />
      </section>
    </div>
  );
}
