"use client";

import { useMemo, useState } from "react";
import type { RsvpStatus } from "@/db/schema";
import { LIMITS } from "@/lib/validation";
import { ActionForm } from "@/components/ui/action-form";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { SubmitButton } from "@/components/ui/submit-button";
import { editGuestRsvpAction } from "./actions";

export interface ResponseCourse {
  id: string;
  name: string;
  options: { id: string; name: string }[];
}

export interface ResponseRow {
  id: string;
  forename: string;
  surname: string;
  email: string;
  rsvpStatus: RsvpStatus;
  responseSourceLabel: string;
  lastResponseLabel: string | null;
  dietaryRequirements: string | null;
  guestMessage: string | null;
  organiserNote: string | null;
  selections: { courseId: string; optionId: string; course: string; option: string }[];
}

type Filter = "all" | RsvpStatus | "withMessage" | "withDietary";

/**
 * Organiser responses view (Spec 5.2, 6.7, 15.9).
 *
 * Shows every active guest with their reply, and allows a manual edit inline.
 * Removed guests are not shown (Spec 15.9).
 */
export function ResponsesView({
  guests,
  courses,
  counts,
}: {
  guests: ResponseRow[];
  courses: ResponseCourse[];
  counts: { invited: number; accepted: number; declined: number; notResponded: number };
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    switch (filter) {
      case "accepted":
      case "declined":
      case "not_responded":
        return guests.filter((guest) => guest.rsvpStatus === filter);
      case "withMessage":
        return guests.filter((guest) => guest.guestMessage);
      case "withDietary":
        return guests.filter((guest) => guest.dietaryRequirements);
      default:
        return guests;
    }
  }, [guests, filter]);

  const messageCount = guests.filter((guest) => guest.guestMessage).length;
  const dietaryCount = guests.filter((guest) => guest.dietaryRequirements).length;

  return (
    <div className="flex flex-col gap-5">
      <section className="card card-padded">
        <h2 className="mb-4 text-lg">At a glance</h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Summary label="Invited" value={counts.invited} />
          <Summary label="Accepted" value={counts.accepted} tone="text-sage-700" />
          <Summary label="Declined" value={counts.declined} tone="text-clay-700" />
          <Summary label="Not responded" value={counts.notResponded} />
        </dl>
      </section>

      <section className="card card-padded">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg">Replies</h2>
        </div>

        <div className="table-scroll -mx-5 mb-5 px-5 sm:mx-0 sm:px-0">
          <div className="flex min-w-max gap-2">
            <FilterChip current={filter} value="all" onSelect={setFilter}>
              All ({guests.length})
            </FilterChip>
            <FilterChip current={filter} value="accepted" onSelect={setFilter}>
              Accepted ({counts.accepted})
            </FilterChip>
            <FilterChip current={filter} value="declined" onSelect={setFilter}>
              Declined ({counts.declined})
            </FilterChip>
            <FilterChip current={filter} value="not_responded" onSelect={setFilter}>
              Waiting ({counts.notResponded})
            </FilterChip>
            <FilterChip current={filter} value="withDietary" onSelect={setFilter}>
              Dietary notes ({dietaryCount})
            </FilterChip>
            <FilterChip current={filter} value="withMessage" onSelect={setFilter}>
              Messages ({messageCount})
            </FilterChip>
          </div>
        </div>

        {guests.length === 0 ? (
          <EmptyState
            title="No guests yet"
            description="Add guests first, then their replies will appear here."
          />
        ) : filtered.length === 0 ? (
          <EmptyState title="Nothing to show" description="No guest matches that filter." />
        ) : (
          <ul className="flex flex-col gap-3">
            {filtered.map((guest) => (
              <ResponseCard key={guest.id} guest={guest} courses={courses} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function ResponseCard({ guest, courses }: { guest: ResponseRow; courses: ResponseCourse[] }) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <li className="border-blush-200 bg-blush-50 rounded-2xl border p-4">
        <EditForm guest={guest} courses={courses} onDone={() => setIsEditing(false)} />
      </li>
    );
  }

  return (
    <li className="border-cream-300 rounded-2xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-ink-900 font-medium">
            {guest.forename} {guest.surname}
          </p>
          <p className="text-ink-500 truncate text-sm">{guest.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={guest.rsvpStatus} />
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="btn btn-secondary btn-sm"
          >
            Edit
          </button>
        </div>
      </div>

      {guest.selections.length > 0 && (
        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
          {guest.selections.map((selection) => (
            <div key={selection.courseId} className="flex gap-1.5 text-sm">
              <dt className="text-ink-500">{selection.course}:</dt>
              <dd className="text-ink-900">{selection.option}</dd>
            </div>
          ))}
        </dl>
      )}

      {guest.dietaryRequirements && (
        <div className="border-butter-200 bg-butter-50 mt-3 rounded-xl border p-3">
          <h3 className="text-butter-700 text-xs font-semibold tracking-wide uppercase">
            Dietary requirements
          </h3>
          <p className="prose-plain text-ink-900 mt-1 text-sm">{guest.dietaryRequirements}</p>
        </div>
      )}

      {guest.guestMessage && (
        <div className="border-cream-300 bg-cream-50 mt-3 rounded-xl border p-3">
          <h3 className="text-ink-500 text-xs font-semibold tracking-wide uppercase">Message</h3>
          <p className="prose-plain text-ink-900 mt-1 text-sm">{guest.guestMessage}</p>
        </div>
      )}

      {guest.organiserNote && (
        <div className="border-sky-200 bg-sky-50 mt-3 rounded-xl border p-3">
          <h3 className="text-sky-700 text-xs font-semibold tracking-wide uppercase">
            Your private note
          </h3>
          <p className="prose-plain text-ink-900 mt-1 text-sm">{guest.organiserNote}</p>
        </div>
      )}

      <p className="text-ink-400 mt-3 text-xs">
        {guest.responseSourceLabel}
        {guest.lastResponseLabel && ` · ${guest.lastResponseLabel}`}
      </p>
    </li>
  );
}

/* -------------------------------------------------------------------------- */

function EditForm({
  guest,
  courses,
  onDone,
}: {
  guest: ResponseRow;
  courses: ResponseCourse[];
  onDone: () => void;
}) {
  const [status, setStatus] = useState<RsvpStatus>(guest.rsvpStatus);
  const selectionMap = Object.fromEntries(
    guest.selections.map((selection) => [selection.courseId, selection.optionId]),
  );

  return (
    <ActionForm action={editGuestRsvpAction}>
      {(state) => (
        <div className="flex flex-col gap-5">
          <input type="hidden" name="guestId" value={guest.id} />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg">
              Editing {guest.forename} {guest.surname}
            </h3>
            <button type="button" onClick={onDone} className="btn btn-ghost btn-sm">
              Close
            </button>
          </div>

          <fieldset>
            <legend className="field-label">Reply</legend>
            <div className="flex flex-wrap gap-2">
              {(["accepted", "declined", "not_responded"] as const).map((value) => (
                <label key={value} className="choice max-w-48 flex-1 py-2.5">
                  <input
                    type="radio"
                    name="status"
                    value={value}
                    checked={status === value}
                    onChange={() => setStatus(value)}
                    className="accent-blush-600 size-4 shrink-0"
                  />
                  <span className="text-sm font-medium">
                    {value === "accepted"
                      ? "Accepted"
                      : value === "declined"
                        ? "Declined"
                        : "Not responded"}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Menu choices are only required when accepting, the same rule the
              guest flow applies (Spec 6.7). */}
          {status === "accepted" && courses.length > 0 && (
            <div className="flex flex-col gap-3">
              {courses.map((course) => (
                <div key={course.id}>
                  <label htmlFor={`edit-${guest.id}-${course.id}`} className="field-label">
                    {course.name}
                  </label>
                  <select
                    id={`edit-${guest.id}-${course.id}`}
                    name={`course-${course.id}`}
                    defaultValue={selectionMap[course.id] ?? ""}
                    className="input"
                    aria-invalid={state.errors?.[`selections.${course.id}`] ? true : undefined}
                  >
                    <option value="">Not chosen</option>
                    {course.options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  {state.errors?.[`selections.${course.id}`] && (
                    <p className="field-error">{state.errors[`selections.${course.id}`]}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {status === "accepted" && (
            <div>
              <label htmlFor={`edit-dietary-${guest.id}`} className="field-label">
                Dietary requirements
              </label>
              <textarea
                id={`edit-dietary-${guest.id}`}
                name="dietaryRequirements"
                defaultValue={guest.dietaryRequirements ?? ""}
                maxLength={LIMITS.dietaryRequirements}
                rows={2}
                className="input"
              />
            </div>
          )}

          <div>
            <label htmlFor={`edit-message-${guest.id}`} className="field-label">
              Guest message
            </label>
            <textarea
              id={`edit-message-${guest.id}`}
              name="guestMessage"
              defaultValue={guest.guestMessage ?? ""}
              maxLength={LIMITS.guestMessage}
              rows={3}
              className="input"
            />
          </div>

          <div>
            <label htmlFor={`edit-note-${guest.id}`} className="field-label">
              Your private note <span className="text-ink-400 font-normal">(optional)</span>
            </label>
            <textarea
              id={`edit-note-${guest.id}`}
              name="organiserNote"
              defaultValue={guest.organiserNote ?? ""}
              maxLength={LIMITS.organiserNote}
              rows={2}
              className="input"
              aria-describedby={`edit-note-hint-${guest.id}`}
            />
            <p id={`edit-note-hint-${guest.id}`} className="field-hint">
              Only you can see this. It's left out of exports unless you choose to include it.
            </p>
          </div>

          <div className="flex gap-2">
            <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
              Save changes
            </SubmitButton>
            <button type="button" onClick={onDone} className="btn btn-ghost">
              Cancel
            </button>
          </div>
        </div>
      )}
    </ActionForm>
  );
}

/* -------------------------------------------------------------------------- */

function Summary({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="bg-cream-50 border-cream-300 rounded-xl border px-4 py-3">
      <dt className="text-ink-500 text-xs">{label}</dt>
      <dd className={`mt-0.5 text-2xl font-semibold tabular-nums ${tone ?? "text-ink-900"}`}>
        {value}
      </dd>
    </div>
  );
}

function FilterChip({
  current,
  value,
  onSelect,
  children,
}: {
  current: Filter;
  value: Filter;
  onSelect: (value: Filter) => void;
  children: React.ReactNode;
}) {
  const isActive = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      aria-pressed={isActive}
      className={`pill min-h-9 px-3.5 transition-colors ${
        isActive ? "bg-blush-600 text-white" : "bg-cream-200 text-ink-700 hover:bg-blush-100"
      }`}
    >
      {children}
    </button>
  );
}
