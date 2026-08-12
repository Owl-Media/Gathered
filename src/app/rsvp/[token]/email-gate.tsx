"use client";

import { useActionState } from "react";
import { EMPTY_ACTION_STATE } from "@/lib/forms";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { verifyGuestEmailAction } from "./actions";

/**
 * Email verification gate (Spec 5.4, 6.6, 9.1).
 *
 * Holding the private link is not enough to reply, the guest must also enter
 * the address the invitation was issued to. The check happens server-side, and
 * the error never reveals the correct address or whether the token was valid.
 */
export function EmailGate({ token, guestForename }: { token: string; guestForename: string }) {
  const [state, action] = useActionState(verifyGuestEmailAction, EMPTY_ACTION_STATE);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="token" value={token} />

      <div>
        <h2 className="text-xl">Hello {guestForename}</h2>
        <p className="text-ink-500 mt-1.5 text-sm">
          Please confirm the email address this invitation was sent to, so we know it's you.
        </p>
      </div>

      <FormError message={state.message} />

      <Field id="rsvp-email" label="Your email address" error={state.errors?.email} required>
        {(props) => (
          <input
            {...props}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            className="input"
            placeholder="you@example.com"
          />
        )}
      </Field>

      <SubmitButton className="btn btn-primary btn-lg btn-block" pendingLabel="Checking…">
        Continue
      </SubmitButton>
    </form>
  );
}
