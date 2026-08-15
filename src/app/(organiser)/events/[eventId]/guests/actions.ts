"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { guests } from "@/db/schema";
import { AuthorisationError, requireOrganiserForAction } from "@/lib/auth/guards";
import { requireEventForOrganiser } from "@/lib/data/events";
import { getGuestForOrganiser } from "@/lib/data/guests";
import { resolveEventImages } from "@/lib/data/uploads";
import { generateRsvpToken, hashToken } from "@/lib/crypto/tokens";
import { openToken, sealToken } from "@/lib/crypto/token-cipher";
import { AUDIT_EVENT, recordAudit } from "@/lib/audit";
import { clientIdentifier, consumeRateLimit } from "@/lib/rate-limit";
import { getMailer } from "@/lib/email";
import { invitationEmail } from "@/lib/email/templates";
import { absoluteUrl, guestRsvpUrl } from "@/lib/links";
import { guestSchema, toFieldErrors } from "@/lib/validation";
import { type ActionState, failure, fieldFailure, formString, success } from "@/lib/forms";

/**
 * Guest management (Spec 6.4, 6.5, 15.5, 15.6).
 */

const idSchema = z.uuid();

function readId(formData: FormData, key: string): string {
  const parsed = idSchema.safeParse(formString(formData, key));
  if (!parsed.success) throw new AuthorisationError("That guest could not be found.");
  return parsed.data;
}

async function withOrganiser(
  run: (organiserId: string) => Promise<ActionState>,
): Promise<ActionState> {
  try {
    const organiser = await requireOrganiserForAction();
    return await run(organiser.id);
  } catch (error) {
    if (error instanceof AuthorisationError) return failure(error.message);
    console.error("[guests] action failed", error);
    return failure("Something went wrong. Please try again.");
  }
}

function refresh(eventId: string) {
  revalidatePath(`/events/${eventId}/guests`);
  revalidatePath(`/events/${eventId}/responses`);
  revalidatePath("/dashboard");
}

/* -------------------------------------------------------------------------- */
/* Add a guest (Spec 6.4)                                                     */
/* -------------------------------------------------------------------------- */

export async function addGuestAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withOrganiser(async (organiserId) => {
    const eventId = readId(formData, "eventId");
    await requireEventForOrganiser(eventId, organiserId);

    const parsed = guestSchema.safeParse({
      forename: formString(formData, "forename"),
      surname: formString(formData, "surname"),
      email: formString(formData, "email"),
    });
    if (!parsed.success) return fieldFailure(toFieldErrors(parsed.error));

    const { forename, surname, email } = parsed.data;

    // Spec 4.5 / 15.5, one active guest per email address per event. Checked
    // here for a friendly message, and guaranteed by the partial unique index
    // below in case two submissions race.
    const existing = await db
      .select({ id: guests.id })
      .from(guests)
      .where(and(eq(guests.eventId, eventId), eq(guests.email, email), isNull(guests.removedAt)))
      .limit(1);

    if (existing.length > 0) {
      return fieldFailure({ email: "That email address is already on the guest list." });
    }

    // Spec 8.5: a fresh cryptographically random token per guest. The lookup
    // hash resolves incoming links; the sealed copy lets the organiser re-read
    // the link later without the database holding a directly usable secret.
    const token = generateRsvpToken();

    try {
      await db.insert(guests).values({
        eventId,
        forename,
        surname,
        email,
        rsvpTokenLookup: hashToken(token),
        rsvpTokenSealed: sealToken(token),
        rsvpStatus: "not_responded",
        responseSource: "not_responded",
      });
    } catch {
      return fieldFailure({ email: "That email address is already on the guest list." });
    }

    await recordAudit({
      actorType: "organiser",
      actorId: organiserId,
      eventType: AUDIT_EVENT.GUEST_ADDED,
      entityType: "event",
      entityId: eventId,
    });

    refresh(eventId);
    return success(`${forename} ${surname} added.`);
  });
}

/* -------------------------------------------------------------------------- */
/* Remove a guest (Spec 6.4, 15.5)                                            */
/* -------------------------------------------------------------------------- */

/**
 * Soft-deletes a guest.
 *
 * The RSVP token lookup hash is cleared at the same time, which is what makes
 * the guest's private link stop working immediately (Spec 8.5, 11, "Tokens
 * must be invalidated when guests are removed"). The row itself is retained for
 * audit purposes (Spec 6.4).
 */
export async function removeGuestAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withOrganiser(async (organiserId) => {
    const guestId = readId(formData, "guestId");
    const found = await getGuestForOrganiser(guestId, organiserId);
    if (!found) throw new AuthorisationError("That guest could not be found.");

    const now = new Date();

    await db
      .update(guests)
      .set({
        removedAt: now,
        updatedAt: now,
        // Replaced rather than nulled: the column is NOT NULL and carries a
        // unique index, and a random value keeps both intact while making the
        // old token unresolvable.
        rsvpTokenLookup: hashToken(generateRsvpToken()),
        rsvpTokenSealed: "",
      })
      .where(eq(guests.id, guestId));

    await recordAudit({
      actorType: "organiser",
      actorId: organiserId,
      eventType: AUDIT_EVENT.GUEST_REMOVED,
      entityType: "guest",
      entityId: guestId,
      metadata: { eventId: found.event.id },
    });

    refresh(found.event.id);
    return success(`${found.guest.forename} ${found.guest.surname} has been removed.`);
  });
}

/* -------------------------------------------------------------------------- */
/* Send an invitation email (Spec 6.5, 9.7, 15.6)                             */
/* -------------------------------------------------------------------------- */

/**
 * Sends one guest their invitation.
 *
 * Only ever runs because the organiser pressed the button. Nothing in this
 * application sends a guest email on any other trigger (Spec 6.5, 8.1).
 */
export async function sendInvitationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withOrganiser(async (organiserId) => {
    const guestId = readId(formData, "guestId");
    const found = await getGuestForOrganiser(guestId, organiserId);
    if (!found) throw new AuthorisationError("That guest could not be found.");

    const { guest, event } = found;

    const limit = await consumeRateLimit("invitationEmail", await clientIdentifier());
    if (!limit.allowed) {
      return failure("You've sent a lot of invitations just now. Please wait a moment.");
    }

    const token = openToken(guest.rsvpTokenSealed);
    if (!token) {
      // Only reachable if SESSION_SECRET changed after the guest was created.
      return failure(
        "We couldn't rebuild this guest's private link. Remove the guest and add them again to issue a new one.",
      );
    }

    const organiser = await requireOrganiserForAction();
    const { headerUrl } = await resolveEventImages(event);

    try {
      await getMailer().send(
        invitationEmail({
          guestForename: guest.forename,
          guestEmail: guest.email,
          eventName: event.name,
          eventDate: event.eventDate,
          startTime: event.startTime.slice(0, 5),
          locationName: event.locationName,
          locationAddress: event.locationAddress,
          organiserName: organiser.name,
          description: event.description,
          rsvpUrl: guestRsvpUrl(token),
          placeholderTheme: event.placeholderTheme,
          headerImageUrl: headerUrl ? absoluteUrl(headerUrl) : null,
        }),
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown error";

      // Spec 9.7.Record the failure, keep the guest and their link, and do
      // NOT mark the invitation as sent.
      await db
        .update(guests)
        .set({ invitationLastError: reason, updatedAt: new Date() })
        .where(eq(guests.id, guestId));

      await recordAudit({
        actorType: "organiser",
        actorId: organiserId,
        eventType: AUDIT_EVENT.INVITATION_EMAIL_FAILED,
        entityType: "guest",
        entityId: guestId,
        metadata: { eventId: event.id, reason },
      });

      console.error("[guests] invitation email failed", { guestId, reason });
      refresh(event.id);

      return failure(
        `We couldn't send that invitation: ${reason}. The guest is still on your list, so you can copy their private link and share it yourself.`,
      );
    }

    await db
      .update(guests)
      .set({ invitationSentAt: new Date(), invitationLastError: null, updatedAt: new Date() })
      .where(eq(guests.id, guestId));

    await recordAudit({
      actorType: "organiser",
      actorId: organiserId,
      eventType: AUDIT_EVENT.INVITATION_EMAIL_SENT,
      entityType: "guest",
      entityId: guestId,
      metadata: { eventId: event.id },
    });

    refresh(event.id);
    return success(`Invitation sent to ${guest.forename}.`);
  });
}

/* -------------------------------------------------------------------------- */
/* Recording payments                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Records or clears a guest's deposit / full payment.
 *
 * Bookkeeping for money taken offline: this platform never handles a payment
 * itself. Organiser-only, and never gated on the RSVP deadline, since money
 * usually arrives after replies have closed.
 *
 * Approved deviation from Spec 16, which lists paid events as a non-goal.
 */
export async function setGuestPaymentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withOrganiser(async (organiserId) => {
    const guestId = readId(formData, "guestId");
    const field = formString(formData, "field");
    const paid = formString(formData, "paid") === "true";

    if (field !== "deposit" && field !== "full") {
      return failure("That payment could not be recorded.");
    }

    const found = await getGuestForOrganiser(guestId, organiserId);
    if (!found) throw new AuthorisationError("That guest could not be found.");

    const { guest, event } = found;

    // Nothing to record against an event that asks guests for nothing.
    if (event.depositAmountMinor === null && event.totalAmountMinor === null) {
      return failure("This event has no contribution amounts set.");
    }

    const now = paid ? new Date() : null;

    await db
      .update(guests)
      .set(
        field === "deposit"
          ? { depositPaidAt: now, updatedAt: new Date() }
          : {
              paidInFullAt: now,
              /**
               * Paying in full covers the deposit, so record it as settled at
               * the same moment. That keeps the data honest if the full
               * payment is later undone, leaving the deposit still marked.
               */
              ...(paid && !guest.depositPaidAt ? { depositPaidAt: now } : {}),
              updatedAt: new Date(),
            },
      )
      .where(eq(guests.id, guestId));

    await recordAudit({
      actorType: "organiser",
      actorId: organiserId,
      eventType: AUDIT_EVENT.GUEST_PAYMENT_RECORDED,
      entityType: "guest",
      entityId: guestId,
      metadata: { eventId: event.id, field, paid },
    });

    refresh(event.id);

    const what = field === "deposit" ? "Deposit" : "Full payment";
    return success(
      paid
        ? `${what} recorded for ${guest.forename}.`
        : `${what} cleared for ${guest.forename}.`,
    );
  });
}
