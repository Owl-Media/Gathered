import type { Metadata } from "next";
import { getGuestByRsvpToken } from "@/lib/data/guests";
import { getSelectionsForGuest } from "@/lib/data/guests";
import { listSelectableCourses } from "@/lib/data/menu";
import { resolveEventImages } from "@/lib/data/uploads";
import { hasRsvpAccess } from "@/lib/rsvp-access";
import { isDeadlinePassed } from "@/lib/time";
import {
  DEADLINE_PASSED_MESSAGE,
  EVENT_UNAVAILABLE_MESSAGE,
  INVALID_INVITATION_MESSAGE,
} from "@/lib/messages";
import {
  EventCost,
  EventDescription,
  EventFacts,
  EventHero,
  EventMenuSummary,
  GuestPaymentStatus,
  LastUpdatedNotice,
} from "@/components/event-details";
import { env } from "@/lib/env";
import { eventHasPayment, formatMoney, paymentSummary } from "@/lib/money";
import { paymentStateOf } from "@/components/ui/payment-pill";
import { RsvpForm } from "@/components/rsvp-form";
import { StatusPill } from "@/components/ui/status-pill";
import { Wordmark } from "@/components/brand";
import { EmailGate } from "./email-gate";
import { submitRsvpAction } from "./actions";

/**
 * Private guest RSVP page (Spec 5.4, 6.6, 6.8).
 *
 * Never indexed, and shows only this guest's own invitation, no other guest's
 * name, status, choices, dietary requirements, message or link ever appears
 * here (Spec 8.2).
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function GuestRsvpPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await getGuestByRsvpToken(token);

  /**
   * One message for every failure mode. Unknown token, malformed token,
   * removed guest, deleted event. The guest cannot tell which applies
   * (Spec 9.2).
   */
  if (!invitation) {
    return <NoticeShell title="Invitation not available" body={INVALID_INVITATION_MESSAGE} />;
  }

  /**
   * A disabled organiser gets the dedicated unavailable message, which
   * Spec 6.9 and acceptance criterion 15.13 both require by name. This is the
   * one case distinguishable from an invalid link, and is called for
   * explicitly by the specification.
   */
  if (invitation.organiserDisabled) {
    return <NoticeShell title="Unavailable" body={EVENT_UNAVAILABLE_MESSAGE} />;
  }

  const { guest, event } = invitation;

  const [verified, courses, images, selections] = await Promise.all([
    hasRsvpAccess(guest.id),
    listSelectableCourses(event.id),
    resolveEventImages(event),
    getSelectionsForGuest(guest.id),
  ]);

  const deadlinePassed = isDeadlinePassed(event.rsvpDeadlineAt);

  const selectionMap: Record<string, string> = {};
  for (const selection of selections) {
    selectionMap[selection.courseId] = selection.optionId;
  }

  /**
   * Contribution amounts, prepared only when the event asks for money. Shown
   * to the guest after verification, never on the public page.
   */
  const summary = paymentSummary(event.totalAmountMinor, event.depositAmountMinor);
  const currency = env.DEFAULT_CURRENCY;
  const contribution = eventHasPayment(event.totalAmountMinor, event.depositAmountMinor)
    ? {
        depositLabel:
          summary.deposit !== null ? formatMoney(summary.deposit, currency) : null,
        totalLabel: summary.total !== null ? formatMoney(summary.total, currency) : null,
        balanceLabel:
          summary.balance !== null && summary.balance > 0
            ? formatMoney(summary.balance, currency)
            : null,
        paid: paymentStateOf(guest.depositPaidAt, guest.paidInFullAt),
      }
    : null;

  return (
    <div className="from-blush-50 via-cream-100 to-sky-50 min-h-dvh bg-gradient-to-b">
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <EventHero event={event} headerUrl={images.headerUrl} profileUrl={images.profileUrl} />

        <div className="mt-6 text-center">
          <p className="text-blush-700 text-sm font-semibold tracking-wide uppercase">
            You're invited
          </p>
          <h1 className="mt-1 text-3xl leading-tight sm:text-4xl">{event.name}</h1>
        </div>

        {/* Event details are visible without verification. They are the same
            details shown on the public event page (Spec 6.8). */}
        <div className="card card-padded mt-7 flex flex-col gap-7">
          <EventFacts event={event} />
          <EventDescription description={event.description} />
          {/* The cost is event information, so it shows either way. */}
          {contribution && (
            <EventCost
              depositLabel={contribution.depositLabel}
              totalLabel={contribution.totalLabel}
              balanceLabel={contribution.balanceLabel}
            />
          )}
          {/* What this guest has paid is personal, so it waits for verification. */}
          {verified && contribution && (
            <GuestPaymentStatus
              balanceLabel={contribution.balanceLabel}
              paid={contribution.paid}
            />
          )}
          {!verified && <EventMenuSummary courses={courses} />}
        </div>

        <div className="card card-padded mt-5">
          {deadlinePassed ? (
            <DeadlinePassedPanel
              verified={verified}
              token={token}
              guestForename={guest.forename}
              status={guest.rsvpStatus}
              selections={selections.map((selection) => ({
                course: selection.courseNameSnapshot,
                option: selection.optionNameSnapshot,
              }))}
              dietaryRequirements={guest.dietaryRequirements}
              guestMessage={guest.guestMessage}
            />
          ) : verified ? (
            <>
              {guest.rsvpStatus !== "not_responded" && (
                <div className="notice notice-info mb-6 flex flex-wrap items-center gap-2">
                  <span>Your current reply:</span>
                  <StatusPill status={guest.rsvpStatus} />
                  <span className="text-sm">You can change it below until the deadline.</span>
                </div>
              )}

              <RsvpForm
                token={token}
                courses={courses.map((course) => ({
                  id: course.id,
                  name: course.name,
                  options: course.options.map((option) => ({
                    id: option.id,
                    name: option.name,
                    description: option.description,
                    dietaryLabel: option.dietaryLabel,
                  })),
                }))}
                action={submitRsvpAction}
                guestForename={guest.forename}
                initial={{
                  status: guest.rsvpStatus,
                  dietaryRequirements: guest.dietaryRequirements ?? "",
                  guestMessage: guest.guestMessage ?? "",
                  selections: selectionMap,
                }}
              />
            </>
          ) : (
            <EmailGate token={token} guestForename={guest.forename} />
          )}
        </div>

        <div className="mt-5 text-center">
          <LastUpdatedNotice event={event} />
        </div>

        <footer className="mt-10 flex justify-center pb-6 opacity-60">
          <Wordmark />
        </footer>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * After the deadline the guest can still see the event and their own saved
 * reply, but every control is gone. There is no disabled form to re-enable
 * from the console (Spec 6.8, 9.3).
 */
function DeadlinePassedPanel({
  verified,
  token,
  guestForename,
  status,
  selections,
  dietaryRequirements,
  guestMessage,
}: {
  verified: boolean;
  token: string;
  guestForename: string;
  status: "not_responded" | "accepted" | "declined";
  selections: { course: string; option: string }[];
  dietaryRequirements: string | null;
  guestMessage: string | null;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="notice notice-warning" role="status">
        {DEADLINE_PASSED_MESSAGE}
      </div>

      {verified ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg">Your reply</h2>
            <StatusPill status={status} />
          </div>

          {selections.length > 0 && (
            <dl className="flex flex-col gap-2">
              {selections.map((selection) => (
                <div key={selection.course} className="flex flex-wrap gap-x-2 text-sm">
                  <dt className="text-ink-500">{selection.course}:</dt>
                  <dd className="text-ink-900">{selection.option}</dd>
                </div>
              ))}
            </dl>
          )}

          {dietaryRequirements && (
            <div>
              <h3 className="text-ink-500 text-xs font-semibold tracking-wide uppercase">
                Dietary requirements
              </h3>
              <p className="prose-plain mt-1 text-sm">{dietaryRequirements}</p>
            </div>
          )}

          {guestMessage && (
            <div>
              <h3 className="text-ink-500 text-xs font-semibold tracking-wide uppercase">
                Your message
              </h3>
              <p className="prose-plain mt-1 text-sm">{guestMessage}</p>
            </div>
          )}
        </div>
      ) : (
        <EmailGate token={token} guestForename={guestForename} />
      )}
    </div>
  );
}

function NoticeShell({ title, body }: { title: string; body: string }) {
  return (
    <div className="from-cream-100 to-cream-200 flex min-h-dvh items-center justify-center bg-gradient-to-b px-5">
      <div className="card card-padded w-full max-w-md text-center">
        <h1 className="text-2xl">{title}</h1>
        <p className="text-ink-700 mt-3">{body}</p>
      </div>
    </div>
  );
}
