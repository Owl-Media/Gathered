"use client";

import { useActionState } from "react";
import { requestPasswordResetAction } from "../actions";
import { EMPTY_ACTION_STATE } from "@/lib/forms";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordResetAction, EMPTY_ACTION_STATE);

  // The confirmation is deliberately identical whether or not the address is
  // registered, so this page cannot be used to discover who has an account.
  if (state.ok) {
    return (
      <div className="notice notice-success" role="status">
        {state.message}
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormError message={state.message} />

      <Field id="email" label="Email address" error={state.errors?.email} required>
        {(props) => (
          <input
            {...props}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            autoFocus
            className="input"
            placeholder="you@example.com"
          />
        )}
      </Field>

      <SubmitButton className="btn btn-primary btn-lg btn-block" pendingLabel="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}
