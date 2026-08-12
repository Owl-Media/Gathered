"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPasswordAction } from "../actions";
import { EMPTY_ACTION_STATE } from "@/lib/forms";
import { LIMITS } from "@/lib/validation";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, EMPTY_ACTION_STATE);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="token" value={token} />

      <FormError message={state.message} />

      <Field
        id="password"
        label="New password"
        hint={`At least ${LIMITS.passwordMin} characters.`}
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
            autoFocus
            className="input"
          />
        )}
      </Field>

      <Field
        id="confirmPassword"
        label="Confirm new password"
        error={state.errors?.confirmPassword}
        required
      >
        {(props) => (
          <input
            {...props}
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            className="input"
          />
        )}
      </Field>

      <SubmitButton className="btn btn-primary btn-lg btn-block" pendingLabel="Saving…">
        Save new password
      </SubmitButton>

      {state.message && (
        <p className="text-center text-sm">
          <Link href="/forgot-password" className="text-blush-700 font-medium hover:underline">
            Request a new reset link
          </Link>
        </p>
      )}
    </form>
  );
}
