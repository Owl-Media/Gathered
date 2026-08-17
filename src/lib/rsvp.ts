import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { guests, menuSelections } from "@/db/schema";
import type { ResponseSource, RsvpStatus } from "@/db/schema";
import { listSelectableCourses } from "@/lib/data/menu";
import type { FieldErrors } from "@/lib/validation";

/**
 * RSVP application logic, shared by the guest flow (Spec 6.6) and the
 * organiser's manual edit (Spec 6.7).
 *
 * Both paths run through the same validation, which is what Spec 6.7 requires:
 * "Organiser edits must obey the same menu validation rules."
 */

export interface ResolvedSelection {
  courseId: string;
  optionId: string;
  courseNameSnapshot: string;
  optionNameSnapshot: string;
}

export type SelectionValidation =
  | { ok: true; selections: ResolvedSelection[] }
  | { ok: false; errors: FieldErrors };

/**
 * Validates menu choices against the event's *current* active courses.
 *
 * Called on every submission and every update, so a response saved before the
 * organiser changed the menu is re-checked against the menu as it now stands
 * (Spec 6.6, "Menu selections must be revalidated against current active menu
 * courses").
 *
 * Accepting guests must choose exactly one option per selectable course.
 * Declining guests choose nothing (Spec 8.4).
 */
export async function validateSelections(
  eventId: string,
  status: RsvpStatus,
  submitted: Record<string, string>,
): Promise<SelectionValidation> {
  // Spec 8.4: "Declined guests skip menu selection." Not responded likewise.
  if (status !== "accepted") return { ok: true, selections: [] };

  const courses = await listSelectableCourses(eventId);
  // Spec 4.4: "If no courses exist, the RSVP flow skips menu selection."
  if (courses.length === 0) return { ok: true, selections: [] };

  const errors: FieldErrors = {};
  const resolved: ResolvedSelection[] = [];

  for (const course of courses) {
    const optionId = submitted[course.id];

    if (!optionId) {
      // Spec 9.4: the error must identify the missing course by name.
      errors[`selections.${course.id}`] = `Please choose an option for ${course.name}.`;
      continue;
    }

    // The option must belong to this course and still be active, a client
    // could otherwise post an option id from a different course or an
    // archived one.
    const option = course.options.find((candidate) => candidate.id === optionId);
    if (!option) {
      errors[`selections.${course.id}`] =
        `That choice is no longer available for ${course.name}. Please choose again.`;
      continue;
    }

    resolved.push({
      courseId: course.id,
      optionId: option.id,
      // Snapshots preserve what was chosen even if renamed or archived later
      // (Spec 8.4, 10.6, 15.4).
      courseNameSnapshot: course.name,
      optionNameSnapshot: option.name,
    });
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, selections: resolved };
}

export interface ApplyRsvpInput {
  guestId: string;
  status: RsvpStatus;
  dietaryRequirements: string | null;
  /**
   * Guest path only. Left undefined by an organiser edit, which must not
   * manufacture a consent record on the guest's behalf (Spec 6.7).
   */
  dietaryConsentAt?: Date | null;
  guestMessage: string | null;
  /** Organiser-only note; omitted entirely on the guest path. */
  organiserNote?: string | null;
  selections: ResolvedSelection[];
  source: ResponseSource;
  /** Set when an organiser made the edit (Spec 6.7). */
  editedByUserId?: string | null;
}

/**
 * Persists a response, replacing any previous one.
 *
 * Runs in a transaction so a guest can never end up with menu selections from
 * two different submissions, or with an "accepted" status but no choices.
 */
export async function applyRsvp(input: ApplyRsvpInput): Promise<void> {
  const now = new Date();

  /**
   * A consent record must not outlive the data it was given for, so clearing
   * the dietary note clears it whichever path did the clearing. Otherwise an
   * organiser edit leaves any existing consent exactly as the guest left it.
   */
  const consentUpdate =
    input.dietaryRequirements === null
      ? { dietaryConsentAt: null }
      : input.dietaryConsentAt !== undefined
        ? { dietaryConsentAt: input.dietaryConsentAt }
        : {};

  await db.transaction(async (tx) => {
    // Spec 6.6: "Previous active values are replaced." Rows are deleted and
    // rewritten rather than merged, so a course removed from the menu cannot
    // leave a stale selection behind.
    await tx.delete(menuSelections).where(eq(menuSelections.guestId, input.guestId));

    if (input.selections.length > 0) {
      await tx.insert(menuSelections).values(
        input.selections.map((selection) => ({
          guestId: input.guestId,
          courseId: selection.courseId,
          optionId: selection.optionId,
          courseNameSnapshot: selection.courseNameSnapshot,
          optionNameSnapshot: selection.optionNameSnapshot,
        })),
      );
    }

    await tx
      .update(guests)
      .set({
        rsvpStatus: input.status,
        dietaryRequirements: input.dietaryRequirements,
        ...consentUpdate,
        guestMessage: input.guestMessage,
        ...(input.organiserNote !== undefined ? { organiserNote: input.organiserNote } : {}),
        responseSource: input.source,
        // Spec 5.5: a guest reset to "not responded" has no response to timestamp.
        lastResponseAt: input.status === "not_responded" ? null : now,
        lastEditedByUserId: input.editedByUserId ?? null,
        updatedAt: now,
      })
      .where(eq(guests.id, input.guestId));
  });
}

/** Human-readable response source for exports (Spec 5.5). */
export function responseSourceLabel(source: ResponseSource): string {
  switch (source) {
    case "guest_submitted":
      return "Guest submitted";
    case "organiser_edited":
      return "Organiser edited";
    case "not_responded":
      return "Not responded";
  }
}
