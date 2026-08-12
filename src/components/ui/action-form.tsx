"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/forms";
import { EMPTY_ACTION_STATE } from "@/lib/forms";

export type FormAction = (previous: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Thin wrapper around `useActionState` for the many small forms in the
 * organiser UI. The render prop hands back the current state so each form can
 * place its own field errors, while the shared feedback banner keeps success
 * and failure messaging consistent.
 */
export function ActionForm({
  action,
  className,
  children,
  showFeedback = true,
}: {
  action: FormAction;
  className?: string;
  children: (state: ActionState) => React.ReactNode;
  showFeedback?: boolean;
}) {
  const [state, formAction] = useActionState(action, EMPTY_ACTION_STATE);

  return (
    <form action={formAction} className={className} noValidate>
      {showFeedback && state.message && (
        <div
          className={`notice ${state.ok ? "notice-success" : "notice-error"} mb-3`}
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </div>
      )}
      {children(state)}
    </form>
  );
}
