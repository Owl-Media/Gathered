import type { FieldErrors } from "@/lib/validation";

/**
 * Shared shape returned by every Server Action that backs a form, consumed by
 * React's `useActionState`.
 */
export interface ActionState {
  /** True once the action has completed successfully. */
  ok?: boolean;
  /** Form-level message: an error, or a confirmation. */
  message?: string;
  /** Per-field validation messages keyed by field name. */
  errors?: FieldErrors;
  /**
   * The values that were submitted, echoed back so a rejected form can be
   * repopulated.
   *
   * React resets a `<form>` once its Server Action resolves, which would
   * otherwise wipe everything the user typed the moment a validation error came
   * back, and leave controlled radios visually unchecked while React state
   * still held their value. Re-seeding from this keeps the form exactly as the
   * user left it (Spec 9.5, do not lose already-entered form data).
   */
  values?: Record<string, string>;
}

export const EMPTY_ACTION_STATE: ActionState = {};

export function failure(message: string, errors?: FieldErrors): ActionState {
  return { ok: false, message, errors };
}

export function fieldFailure(errors: FieldErrors, message?: string): ActionState {
  return { ok: false, errors, message };
}

/** Attaches echoed form values to a failed result so the form can repopulate. */
export function withValues(state: ActionState, values: Record<string, string>): ActionState {
  return { ...state, values };
}

export function success(message?: string): ActionState {
  return { ok: true, message };
}

/** Reads a string field from FormData, tolerating absent or non-string values. */
export function formString(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}
