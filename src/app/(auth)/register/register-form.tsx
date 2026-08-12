"use client";

import { useActionState } from "react";
import { registerAction } from "../actions";
import { EMPTY_ACTION_STATE } from "@/lib/forms";
import { LIMITS } from "@/lib/validation";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, EMPTY_ACTION_STATE);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormError message={state.message} />

      <Field id="name" label="Your name" error={state.errors?.name} required>
        {(props) => (
          <input
            {...props}
            name="name"
            type="text"
            autoComplete="name"
            autoFocus
            className="input"
            placeholder="Alex Morgan"
          />
        )}
      </Field>

      <Field id="email" label="Email address" error={state.errors?.email} required>
        {(props) => (
          <input
            {...props}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            className="input"
            placeholder="you@example.com"
          />
        )}
      </Field>

      <Field
        id="password"
        label="Password"
        hint={`At least ${LIMITS.passwordMin} characters. A memorable phrase works well.`}
        error={state.errors?.password}
        required
      >
        {(props) => (
          <input
            {...props}
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={LIMITS.passwordMin}
            className="input"
          />
        )}
      </Field>

      <SubmitButton className="btn btn-primary btn-lg btn-block" pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
