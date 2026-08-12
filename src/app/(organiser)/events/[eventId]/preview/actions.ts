"use server";

import type { ActionState } from "@/lib/forms";
import { failure } from "@/lib/forms";

/**
 * Stand-in action for the organiser's RSVP preview.
 *
 * Spec 5.2: "Preview mode must not allow actual RSVP submission." The preview
 * form is rendered without a submit button, and this action is the server-side
 * guarantee behind that. Nothing can be written from the preview even if a
 * request is crafted by hand.
 */
export async function previewSubmitAction(
  _previous: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  return failure("This is only a preview, so replies can't be submitted from here.");
}
