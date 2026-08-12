import type { ReactNode } from "react";

/**
 * Form field primitives. Each control is wired to its label, hint and error via
 * `id`/`aria-describedby` so screen readers announce the error with the field
 * rather than leaving it visually adjacent but semantically orphaned.
 */

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (props: {
    id: string;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
  }) => ReactNode;
}

export function Field({ id, label, hint, error, required, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
        {required ? (
          <span className="text-blush-600" aria-hidden="true">
            {" "}
            *
          </span>
        ) : (
          <span className="text-ink-400 font-normal"> (optional)</span>
        )}
      </label>

      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })}

      {hint && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

/** Form-level error, e.g. "Those details do not match." */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="notice notice-error" role="alert">
      {message}
    </div>
  );
}

/** Live character counter for the length-limited free-text fields (Spec 4.6). */
export function CharacterCount({ value, max }: { value: string; max: number }) {
  const remaining = max - value.length;
  const isTight = remaining <= max * 0.1;
  return (
    <p
      className={`field-hint text-right tabular-nums ${isTight ? "text-clay-700" : ""}`}
      aria-live="polite"
    >
      {remaining.toLocaleString("en-GB")} characters remaining
    </p>
  );
}
