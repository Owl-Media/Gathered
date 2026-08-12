"use client";

import { useFormStatus } from "react-dom";

/**
 * Submit button that disables itself while its form is in flight, preventing
 * double submissions (a duplicate RSVP or duplicate invitation email).
 * Must be rendered inside the <form> it submits.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className = "btn btn-primary",
  disabled,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className={className} disabled={pending || disabled}>
      {pending && (
        <span
          className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {pending ? (pendingLabel ?? children) : children}
    </button>
  );
}
