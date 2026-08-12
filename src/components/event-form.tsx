"use client";

import { useActionState, useState } from "react";
import { EMPTY_ACTION_STATE, type ActionState } from "@/lib/forms";
import { LIMITS } from "@/lib/validation";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { PLACEHOLDER_THEMES, PlaceholderHeader } from "@/components/placeholder-art";

export interface EventFormValues {
  name: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
  locationName: string;
  locationAddress: string;
  description: string;
  rsvpDeadlineDate: string;
  rsvpDeadlineTime: string;
  placeholderTheme: string;
  /** Blank when the event asks guests for nothing. */
  depositAmount: string;
  totalAmount: string;
}

/**
 * Event details form, shared by create and edit (Spec 4.2, 6.2, 6.3).
 *
 * The browser-side `required`/`type` attributes are a convenience for the
 * organiser only. Every rule here, including "start before end" and "deadline
 * on or before the event date", is enforced again server-side (Spec 8.1).
 */
export function EventForm({
  action,
  defaultValues,
  timezones,
  currencySymbol,
  submitLabel,
  pendingLabel,
}: {
  action: (previous: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues: EventFormValues;
  timezones: string[];
  /** Symbol for the configured currency, e.g. "£". */
  currencySymbol: string;
  submitLabel: string;
  pendingLabel: string;
}) {
  const [state, formAction] = useActionState(action, EMPTY_ACTION_STATE);
  const [theme, setTheme] = useState(defaultValues.placeholderTheme);

  return (
    <form action={formAction} className="flex flex-col gap-8" noValidate>
      {state.ok && state.message && (
        <div className="notice notice-success" role="status">
          {state.message}
        </div>
      )}
      <FormError message={state.ok ? undefined : state.message} />

      {/* --- The basics ---------------------------------------------------- */}
      <section className="flex flex-col gap-5">
        <Field id="name" label="Event name" error={state.errors?.name} required>
          {(props) => (
            <input
              {...props}
              name="name"
              type="text"
              maxLength={LIMITS.eventName}
              defaultValue={defaultValues.name}
              className="input"
              placeholder="Amelia's Baby Shower"
            />
          )}
        </Field>

        <Field id="eventDate" label="Date" error={state.errors?.eventDate} required>
          {(props) => (
            <input
              {...props}
              name="eventDate"
              type="date"
              defaultValue={defaultValues.eventDate}
              className="input"
            />
          )}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="startTime" label="Starts" error={state.errors?.startTime} required>
            {(props) => (
              <input
                {...props}
                name="startTime"
                type="time"
                defaultValue={defaultValues.startTime}
                className="input"
              />
            )}
          </Field>

          <Field id="endTime" label="Ends" error={state.errors?.endTime} required>
            {(props) => (
              <input
                {...props}
                name="endTime"
                type="time"
                defaultValue={defaultValues.endTime}
                className="input"
              />
            )}
          </Field>
        </div>

        <Field
          id="timezone"
          label="Timezone"
          hint="All times and the RSVP deadline are interpreted in this timezone."
          error={state.errors?.timezone}
          required
        >
          {(props) => (
            <select {...props} name="timezone" defaultValue={defaultValues.timezone} className="input">
              {timezones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          )}
        </Field>
      </section>

      {/* --- Where --------------------------------------------------------- */}
      <section className="flex flex-col gap-5">
        <h2 className="text-lg">Where</h2>

        <Field id="locationName" label="Venue name" error={state.errors?.locationName} required>
          {(props) => (
            <input
              {...props}
              name="locationName"
              type="text"
              maxLength={LIMITS.locationName}
              defaultValue={defaultValues.locationName}
              className="input"
              placeholder="The Garden Room"
            />
          )}
        </Field>

        <Field
          id="locationAddress"
          label="Address"
          error={state.errors?.locationAddress}
          required
        >
          {(props) => (
            <textarea
              {...props}
              name="locationAddress"
              maxLength={LIMITS.locationAddress}
              defaultValue={defaultValues.locationAddress}
              rows={3}
              className="input"
              placeholder={"12 Rose Lane\nBath\nBA1 2AB"}
            />
          )}
        </Field>
      </section>

      {/* --- Details ------------------------------------------------------- */}
      <section className="flex flex-col gap-5">
        <h2 className="text-lg">Details</h2>

        <Field
          id="description"
          label="Description"
          hint="Anything your guests should know, such as parking, dress code or gift preferences."
          error={state.errors?.description}
        >
          {(props) => (
            <textarea
              {...props}
              name="description"
              maxLength={LIMITS.eventDescription}
              defaultValue={defaultValues.description}
              rows={5}
              className="input"
            />
          )}
        </Field>
      </section>

      {/* --- RSVP deadline ------------------------------------------------- */}
      <section className="flex flex-col gap-5">
        <h2 className="text-lg">RSVP deadline</h2>
        <p className="text-ink-500 -mt-3 text-sm">
          After this moment guests can still see the event, but can no longer send or change a
          reply. You can extend it at any time.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="rsvpDeadlineDate"
            label="Replies close on"
            error={state.errors?.rsvpDeadlineDate}
            required
          >
            {(props) => (
              <input
                {...props}
                name="rsvpDeadlineDate"
                type="date"
                defaultValue={defaultValues.rsvpDeadlineDate}
                className="input"
              />
            )}
          </Field>

          <Field
            id="rsvpDeadlineTime"
            label="At"
            error={state.errors?.rsvpDeadlineTime}
            required
          >
            {(props) => (
              <input
                {...props}
                name="rsvpDeadlineTime"
                type="time"
                defaultValue={defaultValues.rsvpDeadlineTime}
                className="input"
              />
            )}
          </Field>
        </div>
      </section>

      {/* --- Contributions ---------------------------------------------------
          Optional. Leaving both blank hides everything about money from
          guests, and hides the payment controls on the Guests tab. */}
      <section className="flex flex-col gap-5">
        <h2 className="text-lg">Contributions</h2>
        <p className="text-ink-500 -mt-3 text-sm">
          Only if guests are chipping in. Leave both blank and nothing about money is shown
          anywhere. Guests see these amounts on their own invitation page, never on the public
          event page.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="depositAmount"
            label={`Deposit (${currencySymbol})`}
            hint="What each guest pays up front."
            error={state.errors?.depositAmount}
          >
            {(props) => (
              <input
                {...props}
                name="depositAmount"
                type="text"
                inputMode="decimal"
                defaultValue={defaultValues.depositAmount}
                className="input"
                placeholder="10"
              />
            )}
          </Field>

          <Field
            id="totalAmount"
            label={`Full amount (${currencySymbol})`}
            hint="The total per guest, including the deposit."
            error={state.errors?.totalAmount}
          >
            {(props) => (
              <input
                {...props}
                name="totalAmount"
                type="text"
                inputMode="decimal"
                defaultValue={defaultValues.totalAmount}
                className="input"
                placeholder="40"
              />
            )}
          </Field>
        </div>
      </section>

      {/* --- Placeholder artwork ------------------------------------------- */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg">Artwork</h2>
        <p className="text-ink-500 -mt-2 text-sm">
          Used wherever you haven't uploaded your own image. You can add photos in the Images tab.
        </p>

        <fieldset>
          <legend className="visually-hidden">Choose placeholder artwork</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PLACEHOLDER_THEMES.map((option) => (
              <label
                key={option.id}
                className={`group cursor-pointer overflow-hidden rounded-2xl border-2 transition-colors ${
                  theme === option.id
                    ? "border-blush-400"
                    : "border-cream-300 hover:border-blush-200"
                }`}
              >
                <input
                  type="radio"
                  name="placeholderTheme"
                  value={option.id}
                  checked={theme === option.id}
                  onChange={() => setTheme(option.id)}
                  className="visually-hidden"
                />
                <PlaceholderHeader theme={option.id} className="block h-20 w-full" />
                <span className="text-ink-700 block px-3 py-2 text-center text-sm font-medium">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <div className="border-cream-300 flex flex-col gap-3 border-t pt-6 sm:flex-row-reverse">
        <SubmitButton className="btn btn-primary btn-lg sm:px-8" pendingLabel={pendingLabel}>
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
