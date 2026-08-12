"use client";

import { useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { disableOrganiserAction, enableOrganiserAction } from "./actions";

export interface OrganiserRow {
  id: string;
  name: string;
  email: string;
  role: "organiser" | "superadmin";
  disabled: boolean;
  eventCount: number;
  createdAtLabel: string;
}

/**
 * Organiser accounts (Spec 6.9, 15.13).
 *
 * The only control offered is enable/disable. There is no "sign in as",
 * no way to open the organiser's events, and no guest data anywhere on this
 * page. Spec 6.9 forbids impersonation and guest-data access in the MVP.
 */
export function OrganiserTable({
  organisers,
  currentUserId,
}: {
  organisers: OrganiserRow[];
  currentUserId: string;
}) {
  if (organisers.length === 0) {
    return (
      <div className="card">
        <EmptyState title="No accounts yet" description="Nobody has registered yet." />
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {organisers.map((organiser) => (
        <OrganiserCard
          key={organiser.id}
          organiser={organiser}
          isSelf={organiser.id === currentUserId}
        />
      ))}
    </ul>
  );
}

function OrganiserCard({ organiser, isSelf }: { organiser: OrganiserRow; isSelf: boolean }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <li className="card card-padded">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-ink-900 font-medium">{organiser.name}</p>
            {organiser.role === "superadmin" && <span className="pill pill-info">Superadmin</span>}
            {organiser.disabled && <span className="pill pill-declined">Disabled</span>}
          </div>
          <p className="text-ink-500 truncate text-sm">{organiser.email}</p>
          <p className="text-ink-400 mt-1 text-xs">
            {organiser.eventCount} event{organiser.eventCount === 1 ? "" : "s"} · joined{" "}
            {organiser.createdAtLabel}
          </p>
        </div>

        <div className="shrink-0">
          {organiser.role === "superadmin" || isSelf ? (
            <span className="text-ink-400 text-xs">
              {isSelf ? "This is you" : "Superadmin accounts can't be disabled here"}
            </span>
          ) : organiser.disabled ? (
            <ActionForm action={enableOrganiserAction} showFeedback={false}>
              {(state) => (
                <div>
                  <input type="hidden" name="userId" value={organiser.id} />
                  <SubmitButton className="btn btn-secondary btn-sm">Re-enable</SubmitButton>
                  {state.message && (
                    <p className="text-ink-500 mt-1 text-xs" role="status">
                      {state.message}
                    </p>
                  )}
                </div>
              )}
            </ActionForm>
          ) : confirming ? (
            <ActionForm action={disableOrganiserAction} showFeedback={false}>
              {() => (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <input type="hidden" name="userId" value={organiser.id} />
                  <span className="text-ink-700 max-w-56 text-right text-xs">
                    They'll be signed out and their event pages will show as unavailable. No data
                    is deleted.
                  </span>
                  <SubmitButton className="btn btn-danger btn-sm">Disable</SubmitButton>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="btn btn-ghost btn-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </ActionForm>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="btn btn-ghost btn-sm text-clay-700"
            >
              Disable account
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
