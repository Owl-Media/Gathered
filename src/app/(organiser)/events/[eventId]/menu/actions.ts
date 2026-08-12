"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { menuCourses, menuOptions } from "@/db/schema";
import { AuthorisationError, requireOrganiserForAction } from "@/lib/auth/guards";
import { requireEventForOrganiser } from "@/lib/data/events";
import {
  courseHasSelections,
  nextCourseOrder,
  nextOptionOrder,
  optionHasSelections,
  requireCourseForOrganiser,
  requireOptionForOrganiser,
} from "@/lib/data/menu";
import { AUDIT_EVENT, recordAudit } from "@/lib/audit";
import { menuCourseSchema, menuOptionSchema, toFieldErrors } from "@/lib/validation";
import { type ActionState, failure, fieldFailure, formString, success } from "@/lib/forms";

/**
 * Menu management (Spec 4.4, 8.4).
 *
 * The central rule: a course or option any guest has already chosen must never
 * be hard-deleted. Removing one archives it instead, keeping existing responses
 * and their exports intact (Spec 8.4, 15.4).
 *
 * Every action takes the `useActionState` shape and reads its target id from the
 * form. Ids arriving from the client are always resolved through an
 * ownership-scoped query before anything is written (Spec 8.1).
 */

const idSchema = z.uuid();

function readId(formData: FormData, key: string): string {
  const parsed = idSchema.safeParse(formString(formData, key));
  if (!parsed.success) throw new AuthorisationError("That item could not be found.");
  return parsed.data;
}

function refresh(eventId: string) {
  revalidatePath(`/events/${eventId}/menu`);
  revalidatePath(`/events/${eventId}/responses`);
  // Guest RSVP forms and the public event page show the menu too.
  revalidatePath("/e", "layout");
  revalidatePath("/rsvp", "layout");
}

/** Resolves the organiser and normalises thrown authorisation errors. */
async function withOrganiser(
  run: (organiserId: string) => Promise<ActionState>,
): Promise<ActionState> {
  try {
    const organiser = await requireOrganiserForAction();
    return await run(organiser.id);
  } catch (error) {
    if (error instanceof AuthorisationError) return failure(error.message);
    console.error("[menu] action failed", error);
    return failure("Something went wrong. Please try again.");
  }
}

/* -------------------------------------------------------------------------- */
/* Courses                                                                    */
/* -------------------------------------------------------------------------- */

export async function addCourseAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withOrganiser(async (organiserId) => {
    const eventId = readId(formData, "eventId");
    await requireEventForOrganiser(eventId, organiserId);

    const parsed = menuCourseSchema.safeParse({ name: formString(formData, "name") });
    if (!parsed.success) return fieldFailure(toFieldErrors(parsed.error));

    await db.insert(menuCourses).values({
      eventId,
      name: parsed.data.name,
      displayOrder: await nextCourseOrder(eventId),
    });

    refresh(eventId);
    return success(`"${parsed.data.name}" added.`);
  });
}

export async function renameCourseAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withOrganiser(async (organiserId) => {
    const courseId = readId(formData, "courseId");
    const { event } = await requireCourseForOrganiser(courseId, organiserId);

    const parsed = menuCourseSchema.safeParse({ name: formString(formData, "name") });
    if (!parsed.success) return fieldFailure(toFieldErrors(parsed.error));

    await db
      .update(menuCourses)
      .set({ name: parsed.data.name, updatedAt: new Date() })
      .where(eq(menuCourses.id, courseId));

    refresh(event.id);
    return success("Course renamed.");
  });
}

/**
 * Removes a course: archived when guests have already chosen from it,
 * hard-deleted only when nothing references it, so a course added by mistake
 * can still be cleaned up without leaving clutter (Spec 8.4).
 */
export async function removeCourseAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withOrganiser(async (organiserId) => {
    const courseId = readId(formData, "courseId");
    const { course, event } = await requireCourseForOrganiser(courseId, organiserId);

    if (await courseHasSelections(courseId)) {
      await db
        .update(menuCourses)
        .set({ archivedAt: new Date(), updatedAt: new Date() })
        .where(eq(menuCourses.id, courseId));

      await recordAudit({
        actorType: "organiser",
        actorId: organiserId,
        eventType: AUDIT_EVENT.MENU_COURSE_ARCHIVED,
        entityType: "menu_course",
        entityId: courseId,
        metadata: { eventId: event.id, reason: "referenced_by_responses" },
      });

      refresh(event.id);
      return success(
        `"${course.name}" has been archived. Guests will no longer be asked for it, and existing replies are unchanged.`,
      );
    }

    // Options cascade with the course; no response references either.
    await db.delete(menuCourses).where(eq(menuCourses.id, courseId));
    refresh(event.id);
    return success(`"${course.name}" removed.`);
  });
}

export async function restoreCourseAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withOrganiser(async (organiserId) => {
    const courseId = readId(formData, "courseId");
    const { course, event } = await requireCourseForOrganiser(courseId, organiserId);

    await db
      .update(menuCourses)
      .set({ archivedAt: null, updatedAt: new Date() })
      .where(eq(menuCourses.id, courseId));

    refresh(event.id);
    return success(`"${course.name}" restored.`);
  });
}

/**
 * Moves a course one position. Swapping the two display orders keeps ordering
 * stable and organiser-controlled (Spec 4.4, 10.3) with no renumbering pass.
 */
export async function moveCourseAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withOrganiser(async (organiserId) => {
    const courseId = readId(formData, "courseId");
    const direction = formString(formData, "direction") === "up" ? "up" : "down";
    const { course, event } = await requireCourseForOrganiser(courseId, organiserId);

    const siblings = await db
      .select({ id: menuCourses.id, displayOrder: menuCourses.displayOrder })
      .from(menuCourses)
      .where(and(eq(menuCourses.eventId, event.id), isNull(menuCourses.archivedAt)))
      .orderBy(asc(menuCourses.displayOrder), asc(menuCourses.id));

    const index = siblings.findIndex((sibling) => sibling.id === courseId);
    const swapWith = direction === "up" ? siblings[index - 1] : siblings[index + 1];
    if (index === -1 || !swapWith) return success();

    await db.transaction(async (tx) => {
      await tx
        .update(menuCourses)
        .set({ displayOrder: swapWith.displayOrder })
        .where(eq(menuCourses.id, course.id));
      await tx
        .update(menuCourses)
        .set({ displayOrder: course.displayOrder })
        .where(eq(menuCourses.id, swapWith.id));
    });

    refresh(event.id);
    return success();
  });
}

/* -------------------------------------------------------------------------- */
/* Options                                                                    */
/* -------------------------------------------------------------------------- */

export async function addOptionAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withOrganiser(async (organiserId) => {
    const courseId = readId(formData, "courseId");
    const { event } = await requireCourseForOrganiser(courseId, organiserId);

    const parsed = menuOptionSchema.safeParse({
      name: formString(formData, "name"),
      description: formString(formData, "description"),
      dietaryLabel: formString(formData, "dietaryLabel"),
    });
    if (!parsed.success) return fieldFailure(toFieldErrors(parsed.error));

    await db.insert(menuOptions).values({
      courseId,
      name: parsed.data.name,
      description: parsed.data.description,
      dietaryLabel: parsed.data.dietaryLabel,
      displayOrder: await nextOptionOrder(courseId),
    });

    refresh(event.id);
    return success(`"${parsed.data.name}" added.`);
  });
}

export async function updateOptionAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withOrganiser(async (organiserId) => {
    const optionId = readId(formData, "optionId");
    const { event } = await requireOptionForOrganiser(optionId, organiserId);

    const parsed = menuOptionSchema.safeParse({
      name: formString(formData, "name"),
      description: formString(formData, "description"),
      dietaryLabel: formString(formData, "dietaryLabel"),
    });
    if (!parsed.success) return fieldFailure(toFieldErrors(parsed.error));

    // Renaming is always safe: existing responses keep the name they were saved
    // with, because each selection stores its own snapshot (Spec 10.6).
    await db
      .update(menuOptions)
      .set({
        name: parsed.data.name,
        description: parsed.data.description,
        dietaryLabel: parsed.data.dietaryLabel,
        updatedAt: new Date(),
      })
      .where(eq(menuOptions.id, optionId));

    refresh(event.id);
    return success("Option updated.");
  });
}

/** Archives the option when it has been chosen, otherwise deletes it (Spec 8.4). */
export async function removeOptionAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withOrganiser(async (organiserId) => {
    const optionId = readId(formData, "optionId");
    const { option, event } = await requireOptionForOrganiser(optionId, organiserId);

    if (await optionHasSelections(optionId)) {
      await db
        .update(menuOptions)
        .set({ archivedAt: new Date(), updatedAt: new Date() })
        .where(eq(menuOptions.id, optionId));

      await recordAudit({
        actorType: "organiser",
        actorId: organiserId,
        eventType: AUDIT_EVENT.MENU_OPTION_ARCHIVED,
        entityType: "menu_option",
        entityId: optionId,
        metadata: { eventId: event.id, reason: "referenced_by_responses" },
      });

      refresh(event.id);
      return success(
        `"${option.name}" has been archived. Guests can no longer choose it, and existing replies still show it.`,
      );
    }

    await db.delete(menuOptions).where(eq(menuOptions.id, optionId));
    refresh(event.id);
    return success(`"${option.name}" removed.`);
  });
}

export async function restoreOptionAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withOrganiser(async (organiserId) => {
    const optionId = readId(formData, "optionId");
    const { option, event } = await requireOptionForOrganiser(optionId, organiserId);

    await db
      .update(menuOptions)
      .set({ archivedAt: null, updatedAt: new Date() })
      .where(eq(menuOptions.id, optionId));

    refresh(event.id);
    return success(`"${option.name}" restored.`);
  });
}

export async function moveOptionAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withOrganiser(async (organiserId) => {
    const optionId = readId(formData, "optionId");
    const direction = formString(formData, "direction") === "up" ? "up" : "down";
    const { option, course, event } = await requireOptionForOrganiser(optionId, organiserId);

    const siblings = await db
      .select({ id: menuOptions.id, displayOrder: menuOptions.displayOrder })
      .from(menuOptions)
      .where(and(eq(menuOptions.courseId, course.id), isNull(menuOptions.archivedAt)))
      .orderBy(asc(menuOptions.displayOrder), asc(menuOptions.id));

    const index = siblings.findIndex((sibling) => sibling.id === optionId);
    const swapWith = direction === "up" ? siblings[index - 1] : siblings[index + 1];
    if (index === -1 || !swapWith) return success();

    await db.transaction(async (tx) => {
      await tx
        .update(menuOptions)
        .set({ displayOrder: swapWith.displayOrder })
        .where(eq(menuOptions.id, option.id));
      await tx
        .update(menuOptions)
        .set({ displayOrder: option.displayOrder })
        .where(eq(menuOptions.id, swapWith.id));
    });

    refresh(event.id);
    return success();
  });
}
