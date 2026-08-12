import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEventByPublicSlug } from "@/lib/data/events";
import { listSelectableCourses } from "@/lib/data/menu";
import { resolveEventImages } from "@/lib/data/uploads";
import { EVENT_UNAVAILABLE_MESSAGE } from "@/lib/messages";
import {
  EventCost,
  EventDescription,
  EventFacts,
  EventHero,
  EventMenuSummary,
  LastUpdatedNotice,
} from "@/components/event-details";
import { Wordmark } from "@/components/brand";
import { env } from "@/lib/env";
import { eventHasPayment, formatMoney, paymentSummary } from "@/lib/money";

/**
 * Public event page (Spec 5.3, 15.10).
 *
 * Shows event information only. It never shows the guest list, RSVP counts,
 * attending or declined names, menu selections, dietary requirements, guest
 * messages, or any private RSVP link.
 *
 * The cost to attend is included, at the organiser's request. It is a property
 * of the event rather than of any guest, so it reveals nothing about who is
 * coming or what anyone has paid. Note that anyone holding the public link can
 * therefore see the price.
 */

export const metadata: Metadata = {
  // Spec 5.3: public event pages must carry noindex and must never be listed.
  robots: { index: false, follow: false, nocache: true },
};

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lookup = await getEventByPublicSlug(slug);

  if (!lookup) notFound();

  // Spec 6.9.When an organiser is disabled their pages show a generic
  // message. It says nothing about why, or that the event ever existed.
  if (lookup.organiserDisabled) {
    return (
      <UnavailableShell>
        <p className="text-ink-700 text-lg">{EVENT_UNAVAILABLE_MESSAGE}</p>
      </UnavailableShell>
    );
  }

  const { event } = lookup;
  const [courses, images] = await Promise.all([
    listSelectableCourses(event.id),
    resolveEventImages(event),
  ]);

  // Event-level amounts only. No guest's payment state is loaded here at all.
  const summary = paymentSummary(event.totalAmountMinor, event.depositAmountMinor);
  const currency = env.DEFAULT_CURRENCY;
  const cost = eventHasPayment(event.totalAmountMinor, event.depositAmountMinor)
    ? {
        depositLabel:
          summary.deposit !== null ? formatMoney(summary.deposit, currency) : null,
        totalLabel: summary.total !== null ? formatMoney(summary.total, currency) : null,
        balanceLabel:
          summary.balance !== null && summary.balance > 0
            ? formatMoney(summary.balance, currency)
            : null,
      }
    : null;

  return (
    <div className="from-blush-50 via-cream-100 to-sky-50 min-h-dvh bg-gradient-to-b">
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <EventHero event={event} headerUrl={images.headerUrl} profileUrl={images.profileUrl} />

        <div className="mt-6 text-center">
          <h1 className="text-3xl leading-tight sm:text-4xl">{event.name}</h1>
        </div>

        <div className="card card-padded mt-7 flex flex-col gap-7">
          <EventFacts event={event} />
          <EventDescription description={event.description} />
          {cost && <EventCost {...cost} />}
          <EventMenuSummary courses={courses} />
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          <p className="notice notice-info">
            Been invited? Open the private link you were sent to reply. It's just for you.
          </p>
          <LastUpdatedNotice event={event} />
        </div>

        <footer className="mt-10 flex justify-center pb-6 opacity-60">
          <Wordmark />
        </footer>
      </div>
    </div>
  );
}

function UnavailableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="from-cream-100 to-cream-200 flex min-h-dvh items-center justify-center bg-gradient-to-b px-5">
      <div className="card card-padded w-full max-w-md text-center">{children}</div>
    </div>
  );
}
