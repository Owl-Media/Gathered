import type { Metadata } from "next";
import Link from "next/link";
import { requireOrganiser } from "@/lib/auth/guards";
import { env } from "@/lib/env";
import { supportedTimeZones } from "@/lib/time";
import { currencySymbolFor } from "@/lib/money";
import { EventForm } from "@/components/event-form";
import { createEventAction } from "../actions";

export const metadata: Metadata = { title: "Create an event" };

export default async function NewEventPage() {
  await requireOrganiser();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard" className="text-ink-500 hover:text-blush-700 mb-4 inline-block text-sm">
        ← Back to your events
      </Link>

      <h1 className="mb-1 text-3xl">Create an event</h1>
      <p className="text-ink-500 mb-7 text-sm">
        You can change any of this later, and add your menu and guest list next.
      </p>

      <div className="card card-padded">
        <EventForm
          action={createEventAction}
          timezones={supportedTimeZones()}
          currencySymbol={currencySymbolFor(env.DEFAULT_CURRENCY)}
          submitLabel="Create event"
          pendingLabel="Creating…"
          defaultValues={{
            name: "",
            eventDate: "",
            startTime: "14:00",
            endTime: "17:00",
            // Spec 17 Q6, the application default, overridable per event.
            timezone: env.DEFAULT_TIMEZONE,
            locationName: "",
            locationAddress: "",
            description: "",
            rsvpDeadlineDate: "",
            rsvpDeadlineTime: "23:59",
            placeholderTheme: "clouds",
            depositAmount: "",
            totalAmount: "",
          }}
        />
      </div>
    </div>
  );
}
