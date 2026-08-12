"use client";

import { useState } from "react";
import type { CourseWithOptions } from "@/lib/data/menu";
import { LIMITS } from "@/lib/validation";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  addCourseAction,
  addOptionAction,
  moveCourseAction,
  moveOptionAction,
  removeCourseAction,
  removeOptionAction,
  renameCourseAction,
  restoreCourseAction,
  restoreOptionAction,
  updateOptionAction,
} from "./actions";

/**
 * Menu editor (Spec 4.4, 5.2, 8.4).
 *
 * Ordering uses explicit move up/down buttons rather than drag and drop: they
 * work with a keyboard and a screen reader, and are far easier to hit on a
 * phone (Spec 13, 14).
 */
export function MenuEditor({
  eventId,
  courses,
}: {
  eventId: string;
  courses: CourseWithOptions[];
}) {
  const activeCourses = courses.filter((course) => course.archivedAt === null);
  const archivedCourses = courses.filter((course) => course.archivedAt !== null);

  return (
    <div className="flex flex-col gap-5">
      <div className="notice notice-info">
        <strong className="font-semibold">How the menu works.</strong> Guests who accept must pick
        one option from every course. If you add no courses at all, guests simply aren't asked
        about food.
      </div>

      {activeCourses.length === 0 && archivedCourses.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No courses yet"
            description="Add a course such as Starter, Main or Dessert, then list the options guests can choose from."
          />
        </div>
      ) : (
        activeCourses.map((course, index) => (
          <CourseCard
            key={course.id}
            course={course}
            isFirst={index === 0}
            isLast={index === activeCourses.length - 1}
          />
        ))
      )}

      <AddCourseCard eventId={eventId} />

      {archivedCourses.length > 0 && (
        <section className="card card-padded">
          <h2 className="text-lg">Archived courses</h2>
          <p className="text-ink-500 mt-1 mb-4 text-sm">
            These are no longer offered to guests, but replies that already chose from them are
            preserved and still appear in your exports.
          </p>
          <ul className="flex flex-col gap-2">
            {archivedCourses.map((course) => (
              <li
                key={course.id}
                className="border-cream-300 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3"
              >
                <span className="text-ink-500">{course.name}</span>
                <ActionForm action={restoreCourseAction} showFeedback={false}>
                  {() => (
                    <>
                      <input type="hidden" name="courseId" value={course.id} />
                      <SubmitButton className="btn btn-secondary btn-sm">Restore</SubmitButton>
                    </>
                  )}
                </ActionForm>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function CourseCard({
  course,
  isFirst,
  isLast,
}: {
  course: CourseWithOptions;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const activeOptions = course.options.filter((option) => option.archivedAt === null);
  const archivedOptions = course.options.filter((option) => option.archivedAt !== null);

  return (
    <section className="card card-padded">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {isRenaming ? (
          <ActionForm action={renameCourseAction} className="flex-1" showFeedback={false}>
            {(state) => (
              <div className="flex flex-wrap items-start gap-2">
                <input type="hidden" name="courseId" value={course.id} />
                <div className="min-w-48 flex-1">
                  <label htmlFor={`course-name-${course.id}`} className="visually-hidden">
                    Course name
                  </label>
                  <input
                    id={`course-name-${course.id}`}
                    name="name"
                    defaultValue={course.name}
                    maxLength={LIMITS.courseName}
                    autoFocus
                    className="input"
                    aria-invalid={state.errors?.name ? true : undefined}
                  />
                  {state.errors?.name && <p className="field-error">{state.errors.name}</p>}
                </div>
                <SubmitButton className="btn btn-primary btn-sm">Save</SubmitButton>
                <button
                  type="button"
                  onClick={() => setIsRenaming(false)}
                  className="btn btn-ghost btn-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </ActionForm>
        ) : (
          <h2 className="text-xl">{course.name}</h2>
        )}

        {!isRenaming && (
          <div className="flex shrink-0 items-center gap-1">
            <MoveButtons
              action={moveCourseAction}
              idName="courseId"
              id={course.id}
              label={course.name}
              isFirst={isFirst}
              isLast={isLast}
            />
            <button
              type="button"
              onClick={() => setIsRenaming(true)}
              className="btn btn-ghost btn-sm"
            >
              Rename
            </button>
            <ActionForm action={removeCourseAction} showFeedback={false}>
              {() => (
                <>
                  <input type="hidden" name="courseId" value={course.id} />
                  <SubmitButton className="btn btn-danger btn-sm">Remove</SubmitButton>
                </>
              )}
            </ActionForm>
          </div>
        )}
      </div>

      {activeOptions.length === 0 && (
        <p className="notice notice-warning mt-4">
          This course has no options yet, so guests won't be asked about it. Add at least one.
        </p>
      )}

      {activeOptions.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {activeOptions.map((option, index) => (
            <OptionRow
              key={option.id}
              option={option}
              isFirst={index === 0}
              isLast={index === activeOptions.length - 1}
            />
          ))}
        </ul>
      )}

      {archivedOptions.length > 0 && (
        <div className="border-cream-300 mt-4 border-t pt-4">
          <h3 className="text-ink-500 text-xs font-semibold tracking-wide uppercase">
            Archived options
          </h3>
          <ul className="mt-2 flex flex-col gap-2">
            {archivedOptions.map((option) => (
              <li
                key={option.id}
                className="border-cream-300 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2"
              >
                <span className="text-ink-500 text-sm">{option.name}</span>
                <ActionForm action={restoreOptionAction} showFeedback={false}>
                  {() => (
                    <>
                      <input type="hidden" name="optionId" value={option.id} />
                      <SubmitButton className="btn btn-secondary btn-sm">Restore</SubmitButton>
                    </>
                  )}
                </ActionForm>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AddOptionForm courseId={course.id} />
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function OptionRow({
  option,
  isFirst,
  isLast,
}: {
  option: CourseWithOptions["options"][number];
  isFirst: boolean;
  isLast: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <li className="border-cream-300 rounded-xl border p-3">
        <ActionForm action={updateOptionAction} showFeedback={false}>
          {(state) => (
            <div className="flex flex-col gap-3">
              <input type="hidden" name="optionId" value={option.id} />

              <div>
                <label htmlFor={`option-name-${option.id}`} className="field-label">
                  Option name
                </label>
                <input
                  id={`option-name-${option.id}`}
                  name="name"
                  defaultValue={option.name}
                  maxLength={LIMITS.optionName}
                  autoFocus
                  className="input"
                  aria-invalid={state.errors?.name ? true : undefined}
                />
                {state.errors?.name && <p className="field-error">{state.errors.name}</p>}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor={`option-desc-${option.id}`} className="field-label">
                    Short description <span className="text-ink-400 font-normal">(optional)</span>
                  </label>
                  <input
                    id={`option-desc-${option.id}`}
                    name="description"
                    defaultValue={option.description ?? ""}
                    maxLength={LIMITS.optionDescription}
                    className="input"
                  />
                </div>
                <div>
                  <label htmlFor={`option-diet-${option.id}`} className="field-label">
                    Dietary label <span className="text-ink-400 font-normal">(optional)</span>
                  </label>
                  <input
                    id={`option-diet-${option.id}`}
                    name="dietaryLabel"
                    defaultValue={option.dietaryLabel ?? ""}
                    maxLength={LIMITS.dietaryLabel}
                    placeholder="Vegetarian"
                    className="input"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <SubmitButton className="btn btn-primary btn-sm">Save option</SubmitButton>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="btn btn-ghost btn-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </ActionForm>
      </li>
    );
  }

  return (
    <li className="border-cream-300 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <span className="text-ink-900">{option.name}</span>
        {option.dietaryLabel && (
          <span className="pill pill-info ml-2 align-middle">{option.dietaryLabel}</span>
        )}
        {option.description && (
          <span className="text-ink-500 block text-sm">{option.description}</span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <MoveButtons
          action={moveOptionAction}
          idName="optionId"
          id={option.id}
          label={option.name}
          isFirst={isFirst}
          isLast={isLast}
        />
        <button type="button" onClick={() => setIsEditing(true)} className="btn btn-ghost btn-sm">
          Edit
        </button>
        <ActionForm action={removeOptionAction} showFeedback={false}>
          {() => (
            <>
              <input type="hidden" name="optionId" value={option.id} />
              <SubmitButton className="btn btn-danger btn-sm">Remove</SubmitButton>
            </>
          )}
        </ActionForm>
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */

function AddOptionForm({ courseId }: { courseId: string }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn btn-secondary btn-sm mt-4"
      >
        Add an option
      </button>
    );
  }

  return (
    <div className="bg-cream-50 border-cream-300 mt-4 rounded-xl border p-4">
      <ActionForm action={addOptionAction}>
        {(state) => (
          <div className="flex flex-col gap-3">
            <input type="hidden" name="courseId" value={courseId} />

            <div>
              <label htmlFor={`new-option-${courseId}`} className="field-label">
                Option name
              </label>
              <input
                id={`new-option-${courseId}`}
                name="name"
                maxLength={LIMITS.optionName}
                autoFocus
                className="input"
                placeholder="Roast chicken"
                aria-invalid={state.errors?.name ? true : undefined}
              />
              {state.errors?.name && <p className="field-error">{state.errors.name}</p>}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor={`new-option-desc-${courseId}`} className="field-label">
                  Short description <span className="text-ink-400 font-normal">(optional)</span>
                </label>
                <input
                  id={`new-option-desc-${courseId}`}
                  name="description"
                  maxLength={LIMITS.optionDescription}
                  className="input"
                />
              </div>
              <div>
                <label htmlFor={`new-option-diet-${courseId}`} className="field-label">
                  Dietary label <span className="text-ink-400 font-normal">(optional)</span>
                </label>
                <input
                  id={`new-option-diet-${courseId}`}
                  name="dietaryLabel"
                  maxLength={LIMITS.dietaryLabel}
                  placeholder="Vegetarian"
                  className="input"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <SubmitButton className="btn btn-primary btn-sm">Add option</SubmitButton>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="btn btn-ghost btn-sm"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </ActionForm>
    </div>
  );
}

function AddCourseCard({ eventId }: { eventId: string }) {
  return (
    <section className="card card-padded">
      <h2 className="text-lg">Add a course</h2>
      <p className="text-ink-500 mt-1 mb-4 text-sm">
        For example Starter, Main, Dessert, or a single course called "Food".
      </p>

      <ActionForm action={addCourseAction}>
        {(state) => (
          <div className="flex flex-wrap items-start gap-2">
            <input type="hidden" name="eventId" value={eventId} />
            <div className="min-w-48 flex-1">
              <label htmlFor="new-course-name" className="visually-hidden">
                Course name
              </label>
              <input
                id="new-course-name"
                name="name"
                maxLength={LIMITS.courseName}
                className="input"
                placeholder="Main"
                aria-invalid={state.errors?.name ? true : undefined}
              />
              {state.errors?.name && <p className="field-error">{state.errors.name}</p>}
            </div>
            <SubmitButton className="btn btn-primary">Add course</SubmitButton>
          </div>
        )}
      </ActionForm>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function MoveButtons({
  action,
  idName,
  id,
  label,
  isFirst,
  isLast,
}: {
  action: Parameters<typeof ActionForm>[0]["action"];
  idName: "courseId" | "optionId";
  id: string;
  label: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <>
      <ActionForm action={action} showFeedback={false}>
        {() => (
          <>
            <input type="hidden" name={idName} value={id} />
            <input type="hidden" name="direction" value="up" />
            <SubmitButton className="btn btn-ghost btn-sm px-2.5" disabled={isFirst}>
              <span aria-hidden="true">↑</span>
              <span className="visually-hidden">Move {label} up</span>
            </SubmitButton>
          </>
        )}
      </ActionForm>

      <ActionForm action={action} showFeedback={false}>
        {() => (
          <>
            <input type="hidden" name={idName} value={id} />
            <input type="hidden" name="direction" value="down" />
            <SubmitButton className="btn btn-ghost btn-sm px-2.5" disabled={isLast}>
              <span aria-hidden="true">↓</span>
              <span className="visually-hidden">Move {label} down</span>
            </SubmitButton>
          </>
        )}
      </ActionForm>
    </>
  );
}
