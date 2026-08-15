"use client";

import { ActionForm } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { sendTestEmailAction } from "./actions";

export function TestEmailForm({ defaultEmail }: { defaultEmail: string }) {
  return (
    <ActionForm action={sendTestEmailAction} className="flex flex-col gap-3">
      {(state) => (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Field id="to" label="Send a test email to" error={state.errors?.to} required>
                {(props) => (
                  <input
                    {...props}
                    type="email"
                    name="to"
                    defaultValue={state.values?.to ?? defaultEmail}
                    required
                    className="input"
                  />
                )}
              </Field>
            </div>
            <SubmitButton pendingLabel="Sending…" className="btn btn-secondary">
              Send test email
            </SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}
