"use server";

import { revalidatePath } from "next/cache";
import { getGuestByRsvpToken } from "@/lib/data/guests";
import { grantRsvpAccess, hasRsvpAccess } from "@/lib/rsvp-access";
import { applyRsvp, validateSelections } from "@/lib/rsvp";
import { AUDIT_EVENT, recordAudit } from "@/lib/audit";
import { clientIdentifier, consumeRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { safeEqual } from "@/lib/crypto/tokens";
import { isDeadlinePassed } from "@/lib/time";
import {
  DEADLINE_PASSED_MESSAGE,
  EMAIL_MISMATCH_MESSAGE,
  INVALID_INVITATION_MESSAGE,
} from "@/lib/messages";
import {
  guestEmailVerificationSchema,
  rsvpSubmissionSchema,
  toFieldErrors,
} from "@/lib/validation";
import {
  type ActionState,
  failure,
  fieldFailure,
  formString,
  success,
  withValues,
} from "@/lib/forms";

/**
 * Guest RSVP actions (Spec 6.6).
 *
 * Every one of these re-resolves the invitation from the token and re-checks
 * the deadline. Nothing is trusted from the page that rendered the form
 * (Spec 8.1).
 */

const TOO_MANY_ATTEMPTS =
  "Too many attempts. Please wait a few minutes before trying again.";

/* -------------------------------------------------------------------------- */
/* Email verification (Spec 5.4, 9.1)                                         */
/* -------------------------------------------------------------------------- */

export async function verifyGuestEmailAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = formString(formData, "token");

  const parsed = guestEmailVerificationSchema.safeParse({
    email: formString(formData, "email"),
  });
  if (!parsed.success) return fieldFailure(toFieldErrors(parsed.error));

  // Scoped by client and by token so one guest's failed attempts cannot lock
  // out an unrelated guest on the same network.
  const scope = `${await clientIdentifier()}:${token.slice(0, 12)}`;
  const limit = await consumeRateLimit("guestEmailVerification", scope);
  if (!limit.allowed) return failure(TOO_MANY_ATTEMPTS);

  const invitation = await getGuestByRsvpToken(token);

  /**
   * A bad token and a bad email produce the same message, so a wrong address
   * never confirms that the token itself was valid, and vice versa
   * (Spec 9.1, "Do not reveal whether the token is valid").
   */
  if (!invitation || invitation.organiserDisabled) {
    return failure(EMAIL_MISMATCH_MESSAGE);
  }

  // Constant-time comparison; both sides are already normalised lowercase.
  if (!safeEqual(invitation.guest.email, parsed.data.email)) {
    return failure(EMAIL_MISMATCH_MESSAGE);
  }

  await resetRateLimit("guestEmailVerification", scope);
  await grantRsvpAccess(invitation.guest.id);

  revalidatePath(`/rsvp/${token}`);
  return success();
}

/* -------------------------------------------------------------------------- */
/* RSVP submission (Spec 6.6, 6.8)                                            */
/* -------------------------------------------------------------------------- */

export async function submitRsvpAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = formString(formData, "token");

  // Menu choices arrive as course-<courseId> fields.
  const selections: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("course-") && typeof value === "string" && value) {
      selections[key.slice("course-".length)] = value;
    }
  }

  /**
   * Everything the guest entered, echoed back on any failure so the form can
   * repopulate rather than losing their message and choices when React resets
   * the form after this action resolves.
   */
  const submitted: Record<string, string> = {
    status: formString(formData, "status"),
    dietaryRequirements: formString(formData, "dietaryRequirements"),
    dietaryConsent: formString(formData, "dietaryConsent"),
    guestMessage: formString(formData, "guestMessage"),
    ...Object.fromEntries(
      Object.entries(selections).map(([courseId, optionId]) => [
        `course-${courseId}`,
        optionId,
      ]),
    ),
  };
  const reject = (state: ActionState) => withValues(state, submitted);

  const invitation = await getGuestByRsvpToken(token);
  if (!invitation || invitation.organiserDisabled) {
    return reject(failure(INVALID_INVITATION_MESSAGE));
  }

  const { guest, event } = invitation;

  // Verification is re-checked here, not assumed from the rendered form: the
  // token alone must never be sufficient to submit (Spec 5.4).
  if (!(await hasRsvpAccess(guest.id))) {
    return reject(failure("Please confirm your email address before replying."));
  }

  // Spec 6.8: no new or updated response once the deadline has passed.
  if (isDeadlinePassed(event.rsvpDeadlineAt)) {
    return reject(failure(DEADLINE_PASSED_MESSAGE));
  }

  const limit = await consumeRateLimit("rsvpSubmission", await clientIdentifier());
  if (!limit.allowed) return reject(failure(TOO_MANY_ATTEMPTS));

  const parsed = rsvpSubmissionSchema.safeParse({
    status: submitted.status,
    dietaryRequirements: submitted.dietaryRequirements,
    dietaryConsent: submitted.dietaryConsent,
    guestMessage: submitted.guestMessage,
    selections,
  });
  if (!parsed.success) return reject(fieldFailure(toFieldErrors(parsed.error)));

  const submission = parsed.data;

  // Revalidated against the menu as it stands right now (Spec 6.6).
  const validation = await validateSelections(event.id, submission.status, submission.selections);
  if (!validation.ok) {
    return reject(fieldFailure(validation.errors, "Please check your menu choices."));
  }

  const isUpdate = guest.rsvpStatus !== "not_responded";

  // A declining guest has no meal, so dietary notes are not carried over.
  const dietaryRequirements =
    submission.status === "accepted" ? submission.dietaryRequirements : null;

  await applyRsvp({
    guestId: guest.id,
    status: submission.status,
    dietaryRequirements,
    /**
     * Stamped at the moment the guest ticked the box, which is the record
     * Art. 9(2)(a) consent has to leave behind. Null once there is no dietary
     * note left to consent to.
     */
    dietaryConsentAt: dietaryRequirements === null ? null : new Date(),
    guestMessage: submission.guestMessage,
    selections: validation.selections,
    // Spec 6.6 step 13, a guest's own submission is always "guest submitted",
    // even when it replaces an earlier organiser edit.
    source: "guest_submitted",
  });

  await recordAudit({
    actorType: "guest",
    eventType: isUpdate ? AUDIT_EVENT.RSVP_UPDATED : AUDIT_EVENT.RSVP_SUBMITTED,
    entityType: "guest",
    entityId: guest.id,
    metadata: { eventId: event.id, status: submission.status },
  });

  revalidatePath(`/rsvp/${token}`);
  revalidatePath(`/events/${event.id}/responses`);
  revalidatePath("/dashboard");

  return success(
    submission.status === "accepted"
      ? "Wonderful! Your reply has been saved."
      : "Thank you for letting us know. Your reply has been saved.",
  );
}
