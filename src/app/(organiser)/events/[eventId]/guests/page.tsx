import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOrganiser } from "@/lib/auth/guards";
import { getEventForOrganiser } from "@/lib/data/events";
import { listGuestsForEvent } from "@/lib/data/guests";
import { openToken } from "@/lib/crypto/token-cipher";
import { guestRsvpUrl } from "@/lib/links";
import { env } from "@/lib/env";
import { eventHasPayment, formatMoney, paymentSummary } from "@/lib/money";
import { paymentStateOf } from "@/components/ui/payment-pill";
import { GuestList, type GuestRow } from "./guest-list";

export const metadata: Metadata = { title: "Guests" };

export default async function GuestsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const organiser = await requireOrganiser();

  const event = await getEventForOrganiser(eventId, organiser.id);
  if (!event) notFound();

  const guests = await listGuestsForEvent(event.id);

  /**
   * Private links are unsealed here, on the server, for the one organiser who
   * owns this event. Spec 15.6 requires them to be copyable at any time. They
   * are never rendered on a public page and never included in another guest's
   * email (Spec 8.1).
   */
  const rows: GuestRow[] = guests.map((guest) => {
    const token = openToken(guest.rsvpTokenSealed);
    return {
      id: guest.id,
      forename: guest.forename,
      surname: guest.surname,
      email: guest.email,
      rsvpStatus: guest.rsvpStatus,
      rsvpUrl: token ? guestRsvpUrl(token) : null,
      invitationSentAt: guest.invitationSentAt?.toISOString() ?? null,
      invitationLastError: guest.invitationLastError,
      payment: paymentStateOf(guest.depositPaidAt, guest.paidInFullAt),
      depositPaidAt: guest.depositPaidAt?.toISOString() ?? null,
      paidInFullAt: guest.paidInFullAt?.toISOString() ?? null,
    };
  });

  // Payment controls only exist when the organiser has set amounts.
  const summary = paymentSummary(event.totalAmountMinor, event.depositAmountMinor);
  const currency = env.DEFAULT_CURRENCY;

  return (
    <GuestList
      eventId={event.id}
      guests={rows}
      payment={
        eventHasPayment(event.totalAmountMinor, event.depositAmountMinor)
          ? {
              depositLabel:
                summary.deposit !== null ? formatMoney(summary.deposit, currency) : null,
              totalLabel: summary.total !== null ? formatMoney(summary.total, currency) : null,
              balanceLabel:
                summary.balance !== null ? formatMoney(summary.balance, currency) : null,
            }
          : null
      }
    />
  );
}
