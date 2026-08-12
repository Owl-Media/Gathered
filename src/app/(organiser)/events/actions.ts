"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { requireOrganiserForAction, AuthorisationError } from "@/lib/auth/guards";
import { requireEventForOrganiser } from "@/lib/data/events";
import { AUDIT_EVENT, recordAudit } from "@/lib/audit";
import { buildPublicSlug } from "@/lib/slug";
import { wallClockToInstant } from "@/lib/time";
import { eventSchema, toFieldErrors } from "@/lib/validation";
import { type ActionState, failure, fieldFailure, formString } from "@/lib/forms";

/** Reads the shared event form fields out of FormData. */
function readEventForm(formData: FormData) {
  return {
    name: formString(formData, "name"),
    eventDate: formString(formData, "eventDate"),
    startTime: formString(formData, "startTime"),
    endTime: formString(formData, "endTime"),
    timezone: formString(formData, "timezone"),
    locationName: formString(formData, "locationName"),
    locationAddress: formString(formData, "locationAddress"),
    description: formString(formData, "description"),
    rsvpDeadlineDate: formString(formData, "rsvpDeadlineDate"),
    rsvpDeadlineTime: formString(formData, "rsvpDeadlineTime") || "23:59",
    placeholderTheme: formString(formData, "placeholderTheme") || "clouds",
    depositAmount: formString(formData, "depositAmount"),
    totalAmount: formString(formData, "totalAmount"),
  };
}

/* -------------------------------------------------------------------------- */
/* Create (Spec 6.2, 15.2)                                                    */
/* -------------------------------------------------------------------------- */

export async function createEventAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let organiserId: string;
  try {
    organiserId = (await requireOrganiserForAction()).id;
  } catch (error) {
    return failure(error instanceof AuthorisationError ? error.message : "Something went wrong.");
  }

  const parsed = eventSchema.safeParse(readEventForm(formData));
  if (!parsed.success) return fieldFailure(toFieldErrors(parsed.error));

  const input = parsed.data;
  const rsvpDeadlineAt = wallClockToInstant(
    input.rsvpDeadlineDate,
    input.rsvpDeadlineTime,
    input.timezone,
  );

  let eventId: string | undefined;

  // The random suffix makes a collision vanishingly unlikely, but the unique
  // index is the real guarantee. Retry rather than fail the organiser's save.
  for (let attempt = 0; attempt < 5 && !eventId; attempt += 1) {
    try {
      const inserted = await db
        .insert(events)
        .values({
          organiserId,
          publicSlug: buildPublicSlug(input.name),
          name: input.name,
          eventDate: input.eventDate,
          startTime: input.startTime,
          endTime: input.endTime,
          timezone: input.timezone,
          locationName: input.locationName,
          locationAddress: input.locationAddress,
          description: input.description,
          rsvpDeadlineAt,
          placeholderTheme: input.placeholderTheme,
          depositAmountMinor: input.depositAmount,
          totalAmountMinor: input.totalAmount,
        })
        .returning({ id: events.id });

      eventId = inserted[0]?.id;
    } catch (error) {
      if (attempt === 4) {
        console.error("[events] failed to create event", error);
        return failure("We could not save your event. Please try again.");
      }
    }
  }

  if (!eventId) return failure("We could not save your event. Please try again.");

  await recordAudit({
    actorType: "organiser",
    actorId: organiserId,
    eventType: AUDIT_EVENT.EVENT_CREATED,
    entityType: "event",
    entityId: eventId,
  });

  revalidatePath("/dashboard");
  redirect(`/events/${eventId}?created=1`);
}

/* -------------------------------------------------------------------------- */
/* Update (Spec 6.3, 15.3)                                                    */
/* -------------------------------------------------------------------------- */

export async function updateEventAction(
  eventId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let organiserId: string;
  try {
    organiserId = (await requireOrganiserForAction()).id;
    await requireEventForOrganiser(eventId, organiserId);
  } catch (error) {
    return failure(error instanceof AuthorisationError ? error.message : "Something went wrong.");
  }

  const parsed = eventSchema.safeParse(readEventForm(formData));
  if (!parsed.success) return fieldFailure(toFieldErrors(parsed.error));

  const input = parsed.data;
  const rsvpDeadlineAt = wallClockToInstant(
    input.rsvpDeadlineDate,
    input.rsvpDeadlineTime,
    input.timezone,
  );

  try {
    await db
      .update(events)
      .set({
        name: input.name,
        eventDate: input.eventDate,
        startTime: input.startTime,
        endTime: input.endTime,
        timezone: input.timezone,
        locationName: input.locationName,
        locationAddress: input.locationAddress,
        description: input.description,
        rsvpDeadlineAt,
        placeholderTheme: input.placeholderTheme,
        depositAmountMinor: input.depositAmount,
        totalAmountMinor: input.totalAmount,
        // Drives the "last updated" notice shown to guests (Spec 6.3).
        updatedAt: new Date(),
      })
      .where(eq(events.id, eventId));
  } catch (error) {
    console.error("[events] failed to update event", error);
    return failure("We could not save your changes. Please try again.");
  }

  await recordAudit({
    actorType: "organiser",
    actorId: organiserId,
    eventType: AUDIT_EVENT.EVENT_UPDATED,
    entityType: "event",
    entityId: eventId,
  });

  // The public event page and every guest RSVP page must reflect the change
  // immediately (Spec 6.3).
  revalidatePath("/dashboard");
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/e", "layout");
  revalidatePath("/rsvp", "layout");

  return { ok: true, message: "Your changes have been saved." };
}
