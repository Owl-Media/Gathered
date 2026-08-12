import "server-only";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, menuCourses, menuOptions, menuSelections } from "@/db/schema";
import type { Event, MenuCourse, MenuOption } from "@/db/schema";
import { AuthorisationError } from "@/lib/auth/guards";

/**
 * Menu queries (Spec 4.4, 8.4).
 *
 * "Active" means not archived. Guests only ever see active courses and options;
 * the organiser's editor also shows archived ones, because an archived option
 * may still be the historical choice behind an existing RSVP.
 */

export interface CourseWithOptions extends MenuCourse {
  options: MenuOption[];
}

async function loadCourses(eventId: string, activeOnly: boolean): Promise<CourseWithOptions[]> {
  const courseRows = await db
    .select()
    .from(menuCourses)
    .where(
      activeOnly
        ? and(eq(menuCourses.eventId, eventId), isNull(menuCourses.archivedAt))
        : eq(menuCourses.eventId, eventId),
    )
    // Display order is organiser-controlled; id breaks ties so ordering is
    // deterministic even when two courses share an order value (Spec 10.3).
    .orderBy(asc(menuCourses.displayOrder), asc(menuCourses.id));

  if (courseRows.length === 0) return [];

  const courseIds = courseRows.map((course) => course.id);

  const optionRows = await db
    .select()
    .from(menuOptions)
    .where(
      activeOnly
        ? and(inArray(menuOptions.courseId, courseIds), isNull(menuOptions.archivedAt))
        : inArray(menuOptions.courseId, courseIds),
    )
    .orderBy(asc(menuOptions.displayOrder), asc(menuOptions.id));

  const byCourse = new Map<string, MenuOption[]>();
  for (const option of optionRows) {
    const list = byCourse.get(option.courseId);
    if (list) list.push(option);
    else byCourse.set(option.courseId, [option]);
  }

  return courseRows.map((course) => ({
    ...course,
    options: byCourse.get(course.id) ?? [],
  }));
}

/** Every course and option, including archived, the organiser's menu editor. */
export function listMenuForOrganiser(eventId: string): Promise<CourseWithOptions[]> {
  return loadCourses(eventId, false);
}

/**
 * Courses a guest must choose from.
 *
 * A course with no active options is excluded: Spec 4.4 requires at least one
 * active option before a course can be used by guests, and offering an empty
 * course would make the RSVP form impossible to complete.
 */
export async function listSelectableCourses(eventId: string): Promise<CourseWithOptions[]> {
  const courses = await loadCourses(eventId, true);
  return courses.filter((course) => course.options.length > 0);
}

/* -------------------------------------------------------------------------- */
/* Ownership-scoped lookups                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Resolves a course only if it belongs to an event the organiser owns.
 * The ownership condition is part of the join, so a guessed course id from
 * another organiser's event resolves to nothing (Spec 8.1).
 */
export async function requireCourseForOrganiser(
  courseId: string,
  organiserId: string,
): Promise<{ course: MenuCourse; event: Event }> {
  const rows = await db
    .select({ course: menuCourses, event: events })
    .from(menuCourses)
    .innerJoin(events, eq(events.id, menuCourses.eventId))
    .where(
      and(
        eq(menuCourses.id, courseId),
        eq(events.organiserId, organiserId),
        isNull(events.deletedAt),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) throw new AuthorisationError("That course could not be found.");
  return row;
}

export async function requireOptionForOrganiser(
  optionId: string,
  organiserId: string,
): Promise<{ option: MenuOption; course: MenuCourse; event: Event }> {
  const rows = await db
    .select({ option: menuOptions, course: menuCourses, event: events })
    .from(menuOptions)
    .innerJoin(menuCourses, eq(menuCourses.id, menuOptions.courseId))
    .innerJoin(events, eq(events.id, menuCourses.eventId))
    .where(
      and(
        eq(menuOptions.id, optionId),
        eq(events.organiserId, organiserId),
        isNull(events.deletedAt),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) throw new AuthorisationError("That option could not be found.");
  return row;
}

/** Next display order value for a new course on this event. */
export async function nextCourseOrder(eventId: string): Promise<number> {
  const rows = await db
    .select({ max: sql<number | null>`max(${menuCourses.displayOrder})` })
    .from(menuCourses)
    .where(eq(menuCourses.eventId, eventId));
  return (rows[0]?.max ?? -1) + 1;
}

/** Next display order value for a new option within this course. */
export async function nextOptionOrder(courseId: string): Promise<number> {
  const rows = await db
    .select({ max: sql<number | null>`max(${menuOptions.displayOrder})` })
    .from(menuOptions)
    .where(eq(menuOptions.courseId, courseId));
  return (rows[0]?.max ?? -1) + 1;
}

/** True when any guest response references this option (Spec 8.4). */
export async function optionHasSelections(optionId: string): Promise<boolean> {
  const rows = await db
    .select({ exists: sql<number>`1` })
    .from(menuSelections)
    .where(eq(menuSelections.optionId, optionId))
    .limit(1);
  return rows.length > 0;
}

/** True when any guest response references any option in this course. */
export async function courseHasSelections(courseId: string): Promise<boolean> {
  const rows = await db
    .select({ exists: sql<number>`1` })
    .from(menuSelections)
    .where(eq(menuSelections.courseId, courseId))
    .limit(1);
  return rows.length > 0;
}
