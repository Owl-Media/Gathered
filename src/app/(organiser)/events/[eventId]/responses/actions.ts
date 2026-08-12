"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthorisationError, requireOrganiserForAction } from "@/lib/auth/guards";
import { getGuestForOrganiser } from "@/lib/data/guests";
import { applyRsvp, validateSelections } from "@/lib/rsvp";
import { AUDIT_EVENT, recordAudit } from "@/lib/audit";
import { organiserRsvpEditSchema, toFieldErrors } from "@/lib/validation";
import { type ActionState, failure, fieldFailure, formString, success } from "@/lib/forms";

/**
 * Organiser manual RSVP editing (Spec 6.7).
 *
 * Deliberately not deadline-gated: Spec 6.8 states the organiser can still
 * update responses after the RSVP deadline has passed. Only guests are locked
 * out at the deadline.
 */

const idSchema = z.uuid();

export async function editGuestRsvpAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let organiserId: string;
  try {
    organiserId = (await requireOrganiserForAction()).id;
  } catch (error) {
    return failure(error instanceof AuthorisationError ? error.message : "Something went wrong.");
  }

  const guestIdResult = idSchema.safeParse(formString(formData, "guestId"));
  if (!guestIdResult.success) return failure("That guest could not be found.");

  // Ownership is checked against the guest's event, an organiser can never
  // edit a guest on another organiser's event (Spec 6.7, 8.1).
  const found = await getGuestForOrganiser(guestIdResult.data, organiserId);
  if (!found) return failure("That guest could not be found.");

  const { guest, event } = found;

  const selections: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("course-") && typeof value === "string" && value) {
      selections[key.slice("course-".length)] = value;
    }
  }

  const parsed = organiserRsvpEditSchema.safeParse({
    status: formString(formData, "status"),
    dietaryRequirements: formString(formData, "dietaryRequirements"),
    guestMessage: formString(formData, "guestMessage"),
    organiserNote: formString(formData, "organiserNote"),
    selections,
  });
  if (!parsed.success) return fieldFailure(toFieldErrors(parsed.error));

  const edit = parsed.data;

  // Spec 6.7."Organiser edits must obey the same menu validation rules."
  const validation = await validateSelections(event.id, edit.status, edit.selections);
  if (!validation.ok) {
    return fieldFailure(validation.errors, "Please check the menu choices.");
  }

  await applyRsvp({
    guestId: guest.id,
    status: edit.status,
    dietaryRequirements: edit.status === "accepted" ? edit.dietaryRequirements : null,
    guestMessage: edit.guestMessage,
    organiserNote: edit.organiserNote,
    selections: validation.selections,
    /**
     * Spec 5.5 response sources. Clearing a reply back to "not responded"
     * leaves no response to attribute, so the source returns to that state;
     * the edit itself is still recorded in the audit log below.
     */
    source: edit.status === "not_responded" ? "not_responded" : "organiser_edited",
    editedByUserId: organiserId,
  });

  // Spec 6.7.Record that this was a manual edit, by whom, and when.
  await recordAudit({
    actorType: "organiser",
    actorId: organiserId,
    eventType: AUDIT_EVENT.RSVP_EDITED_BY_ORGANISER,
    entityType: "guest",
    entityId: guest.id,
    metadata: { eventId: event.id, status: edit.status },
  });

  revalidatePath(`/events/${event.id}/responses`);
  revalidatePath(`/events/${event.id}/guests`);
  revalidatePath("/dashboard");

  return success(`${guest.forename}'s reply has been updated.`);
}
