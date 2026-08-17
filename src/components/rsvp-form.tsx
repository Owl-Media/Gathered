"use client";

import { useActionState, useState } from "react";
import type { RsvpStatus } from "@/db/schema";
import { EMPTY_ACTION_STATE, type ActionState } from "@/lib/forms";
import { LIMITS } from "@/lib/validation";
import { CharacterCount } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

/**
 * The guest RSVP form (Spec 6.6, Addendum).
 *
 * Mobile-first: choices are large tappable cards rather than small radios, and
 * every control clears the 44px touch target minimum (Spec 13, 14).
 *
 * In `preview` mode the organiser sees exactly this form with submission
 * disabled. Spec 5.2 requires the preview not to allow a real RSVP.
 */

export interface RsvpFormCourse {
  id: string;
  name: string;
  options: {
    id: string;
    name: string;
    description: string | null;
    dietaryLabel: string | null;
  }[];
}

export interface RsvpFormProps {
  token: string;
  courses: RsvpFormCourse[];
  action: (previous: ActionState, formData: FormData) => Promise<ActionState>;
  initial: {
    status: RsvpStatus;
    dietaryRequirements: string;
    /**
     * Whether this guest has already consented to their dietary note being
     * stored. Ticked only when they genuinely have: a box that arrives ticked
     * for someone who never agreed is not consent (GDPR Art. 9(2)(a)).
     */
    dietaryConsent: boolean;
    guestMessage: string;
    /** courseId -> optionId for the guest's existing choices. */
    selections: Record<string, string>;
  };
  guestForename: string;
  preview?: boolean;
}

export function RsvpForm({
  token,
  courses,
  action,
  initial,
  guestForename,
  preview = false,
}: RsvpFormProps) {
  const [state, formAction] = useActionState(action, EMPTY_ACTION_STATE);

  const [status, setStatus] = useState<RsvpStatus>(initial.status);
  const [dietary, setDietary] = useState(initial.dietaryRequirements);
  const [dietaryConsent, setDietaryConsent] = useState(initial.dietaryConsent);
  const [message, setMessage] = useState(initial.guestMessage);

  /**
   * React resets the `<form>` once the Server Action resolves. On a rejected
   * submission that would blank everything the guest typed and leave the
   * accept/decline radio unchecked even though React state still said
   * "accepted", so the next submit failed with "choose whether you can make
   * it" and no way to see why.
   *
   * The action echoes the submitted values back, and they are folded into state
   * here during render (React's documented "adjust state when props change"
   * pattern). Bumping `formGeneration` also remounts the form, so the menu
   * radios pick up their `defaultChecked` from the echoed values too.
   */
  const [seenValues, setSeenValues] = useState(state.values);
  const [formGeneration, setFormGeneration] = useState(0);

  if (state.values !== seenValues) {
    setSeenValues(state.values);
    setFormGeneration((generation) => generation + 1);

    if (state.values) {
      const echoedStatus = state.values.status;
      if (echoedStatus === "accepted" || echoedStatus === "declined") {
        setStatus(echoedStatus);
      }
      setDietary(state.values.dietaryRequirements ?? "");
      setDietaryConsent(state.values.dietaryConsent === "on");
      setMessage(state.values.guestMessage ?? "");
    }
  }

  /** The option the guest had chosen for a course on the rejected attempt. */
  const echoedChoice = (courseId: string): string | undefined =>
    state.values?.[`course-${courseId}`] ?? initial.selections[courseId];

  const isAccepting = status === "accepted";

  if (state.ok) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="bg-sage-100 flex size-14 items-center justify-center rounded-full">
          <span className="text-sage-700 text-2xl" aria-hidden="true">
            ✓
          </span>
        </div>
        <h2 className="text-2xl">Thank you, {guestForename}</h2>
        <p className="text-ink-700">{state.message}</p>
        <p className="text-ink-500 text-sm">
          You can come back to this link any time before the deadline to change your reply.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn btn-secondary mt-1"
        >
          Change my reply
        </button>
      </div>
    );
  }

  return (
    <form
      key={formGeneration}
      action={formAction}
      className="flex flex-col gap-7"
      noValidate
    >
      <input type="hidden" name="token" value={token} />

      {state.message && !state.ok && (
        <div className="notice notice-error" role="alert">
          {state.message}
        </div>
      )}

      {/* --- Accept or decline ---------------------------------------------- */}
      <fieldset>
        <legend className="mb-3 text-lg font-semibold">Can you make it?</legend>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="choice">
            <input
              type="radio"
              name="status"
              value="accepted"
              checked={status === "accepted"}
              onChange={() => setStatus("accepted")}
              className="accent-blush-600 mt-0.5 size-5 shrink-0"
            />
            <span>
              <span className="text-ink-900 block font-medium">Yes, I'll be there</span>
              <span className="text-ink-500 block text-sm">Wouldn't miss it</span>
            </span>
          </label>

          <label className="choice">
            <input
              type="radio"
              name="status"
              value="declined"
              checked={status === "declined"}
              onChange={() => setStatus("declined")}
              className="accent-blush-600 mt-0.5 size-5 shrink-0"
            />
            <span>
              <span className="text-ink-900 block font-medium">Sorry, I can't</span>
              <span className="text-ink-500 block text-sm">Send my love</span>
            </span>
          </label>
        </div>

        {state.errors?.status && <p className="field-error">{state.errors.status}</p>}
      </fieldset>

      {/* --- Menu choices ---------------------------------------------------
          Only shown when accepting. Spec 6.6 step 9: a declining guest is not
          shown menu choices at all. */}
      {isAccepting && courses.length > 0 && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-lg">What would you like to eat?</h2>
            <p className="text-ink-500 mt-1 text-sm">Please choose one from each course.</p>
          </div>

          {courses.map((course) => (
            <fieldset key={course.id}>
              <legend className="field-label">{course.name}</legend>

              <div className="flex flex-col gap-2">
                {course.options.map((option) => (
                  <label key={option.id} className="choice">
                    <input
                      type="radio"
                      name={`course-${course.id}`}
                      value={option.id}
                      defaultChecked={echoedChoice(course.id) === option.id}
                      className="accent-blush-600 mt-0.5 size-5 shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="text-ink-900 block font-medium">
                        {option.name}
                        {option.dietaryLabel && (
                          <span className="pill pill-info ml-2 align-middle">
                            {option.dietaryLabel}
                          </span>
                        )}
                      </span>
                      {option.description && (
                        <span className="text-ink-500 block text-sm">{option.description}</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>

              {state.errors?.[`selections.${course.id}`] && (
                <p className="field-error" role="alert">
                  {state.errors[`selections.${course.id}`]}
                </p>
              )}
            </fieldset>
          ))}
        </div>
      )}

      {/* --- Dietary requirements ------------------------------------------- */}
      {isAccepting && (
        <div>
          <label htmlFor="dietaryRequirements" className="field-label">
            Allergies or dietary requirements{" "}
            <span className="text-ink-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="dietaryRequirements"
            name="dietaryRequirements"
            value={dietary}
            onChange={(fieldEvent) => setDietary(fieldEvent.target.value)}
            maxLength={LIMITS.dietaryRequirements}
            rows={3}
            className="input"
            placeholder="Anything we should know when planning the food"
            aria-describedby="dietary-hint"
          />
          <p id="dietary-hint" className="field-hint">
            Only the organiser sees this.
          </p>
          <CharacterCount value={dietary} max={LIMITS.dietaryRequirements} />

          {/* Explicit consent, asked only once there is something to consent
              to. What a guest writes here can reveal health or religious
              belief, which GDPR Art. 9 puts behind a higher bar than the rest
              of the form (Spec 8.2 already calls it sensitive). */}
          {dietary.trim() !== "" && (
            <div className="mt-3">
              <label className="choice">
                <input
                  type="checkbox"
                  name="dietaryConsent"
                  checked={dietaryConsent}
                  onChange={(fieldEvent) => setDietaryConsent(fieldEvent.target.checked)}
                  className="accent-blush-600 mt-0.5 size-5 shrink-0"
                  aria-describedby="dietary-consent-hint"
                />
                <span>
                  <span className="text-ink-900 block font-medium">
                    Yes, save this so the organiser can plan the food
                  </span>
                  <span id="dietary-consent-hint" className="text-ink-500 block text-sm">
                    Allergies and dietary needs can say something about your health or your
                    beliefs, so we ask before storing them. Clear the box above at any time before
                    the deadline to erase what you wrote.
                  </span>
                </span>
              </label>

              {state.errors?.dietaryConsent && (
                <p className="field-error" role="alert">
                  {state.errors.dietaryConsent}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- Message ---------------------------------------------------------
          Available whether accepting or declining (Addendum). */}
      <div>
        <label htmlFor="guestMessage" className="field-label">
          Leave a message for the parent-to-be{" "}
          <span className="text-ink-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="guestMessage"
          name="guestMessage"
          value={message}
          onChange={(fieldEvent) => setMessage(fieldEvent.target.value)}
          maxLength={LIMITS.guestMessage}
          rows={4}
          className="input"
          placeholder="A wish, a memory, or a bit of advice…"
          aria-describedby="message-hint"
        />
        <p id="message-hint" className="field-hint">
          Your message is private to the organiser, who may keep it as a keepsake.
        </p>
        <CharacterCount value={message} max={LIMITS.guestMessage} />
      </div>

      {preview ? (
        <div className="notice notice-warning" role="status">
          This is a preview of what your guests see. Replies can't be submitted from here.
        </div>
      ) : (
        <SubmitButton
          className="btn btn-primary btn-lg btn-block"
          pendingLabel="Sending your reply…"
          disabled={status === "not_responded"}
        >
          {initial.status === "not_responded" ? "Send my reply" : "Update my reply"}
        </SubmitButton>
      )}
    </form>
  );
}
