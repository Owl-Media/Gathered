/**
 * Guest-facing messages fixed by the specification.
 *
 * Kept in one place so the exact wording is used consistently, and so the
 * privacy properties behind each are stated once. These strings are
 * deliberately vague: every one of them must be safe to show to someone who
 * should not learn why they are seeing it.
 */

/**
 * Spec 9.2. Shown for a malformed token, an unknown token, a removed guest, a
 * deleted event, and a disabled organiser alike, the guest must not be able to
 * tell these cases apart.
 */
export const INVALID_INVITATION_MESSAGE = "This invitation link is no longer valid.";

/**
 * Spec 9.1. Never reveals the correct address, and never confirms that the
 * token itself was valid.
 */
export const EMAIL_MISMATCH_MESSAGE = "The email address does not match this invitation.";

/** Spec 9.3 / 6.8. */
export const DEADLINE_PASSED_MESSAGE =
  "The RSVP deadline has passed. Please contact the organiser if you need to change your response.";

/** Spec 6.9, recommended unavailable message. */
export const EVENT_UNAVAILABLE_MESSAGE = "This event is currently unavailable.";
