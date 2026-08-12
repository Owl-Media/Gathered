"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "../actions";
import { EMPTY_ACTION_STATE } from "@/lib/forms";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function LoginForm() {
  const [state, action] = useActionState(loginAction, EMPTY_ACTION_STATE);

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

      <Field id="password" label="Password" error={state.errors?.password} required>
        {(props) => (
          <input
            {...props}
            name="password"
            type="password"
            autoComplete="current-password"
            className="input"
          />
        )}
      </Field>

      <SubmitButton className="btn btn-primary btn-lg btn-block" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>

      <div className="text-center">
        <Link href="/forgot-password" className="text-blush-700 text-sm font-medium hover:underline">
          Forgotten your password?
        </Link>
      </div>
    </form>
  );
}
