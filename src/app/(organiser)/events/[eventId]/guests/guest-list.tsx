"use client";

import { useMemo, useState } from "react";
import type { RsvpStatus } from "@/db/schema";
import { LIMITS } from "@/lib/validation";
import { ActionForm } from "@/components/ui/action-form";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { SubmitButton } from "@/components/ui/submit-button";
import { PaymentPill, type PaymentState } from "@/components/ui/payment-pill";
import {
  addGuestAction,
  removeGuestAction,
  sendInvitationAction,
  setGuestPaymentAction,
} from "./actions";

export interface GuestRow {
  id: string;
  forename: string;
  surname: string;
  email: string;
  rsvpStatus: RsvpStatus;
  /** Null only if the link could not be unsealed, see the guests page. */
  rsvpUrl: string | null;
  invitationSentAt: string | null;
  invitationLastError: string | null;
  payment: PaymentState;
  depositPaidAt: string | null;
  paidInFullAt: string | null;
}

/** Present only when the event asks guests to contribute. */
export interface PaymentContext {
  depositLabel: string | null;
  totalLabel: string | null;
  balanceLabel: string | null;
}

/**
 * Guest list (Spec 5.2, 6.4, 15.5, 15.6).
 *
 * Laid out as cards rather than a dense table so it stays usable on a phone
 * (Spec 13, 14). Each row carries the guest's own private link and its own
 * send/remove controls.
 */
export function GuestList({
  eventId,
  guests,
  payment,
}: {
  eventId: string;
  guests: GuestRow[];
  payment: PaymentContext | null;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return guests;
    return guests.filter((guest) =>
      `${guest.forename} ${guest.surname} ${guest.email}`.toLowerCase().includes(needle),
    );
  }, [guests, query]);

  const paidInFull = guests.filter((guest) => guest.payment === "paid_in_full").length;
  const depositOnly = guests.filter((guest) => guest.payment === "deposit_paid").length;

  return (
    <div className="flex flex-col gap-5">
      <AddGuestCard eventId={eventId} />

      {payment && (
        <section className="card card-padded">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg">Contributions</h2>
              <p className="text-ink-500 mt-1 text-sm">
                {payment.depositLabel && payment.totalLabel ? (
                  <>
                    {payment.depositLabel} deposit, {payment.totalLabel} in total
                    {payment.balanceLabel && <> ({payment.balanceLabel} balance)</>} per guest.
                  </>
                ) : (
                  <>{payment.totalLabel} per guest.</>
                )}{" "}
                Tick each guest off as their money arrives.
              </p>
            </div>

            <dl className="flex gap-5 text-center">
              <div>
                <dt className="text-ink-500 text-xs">Paid in full</dt>
                <dd className="text-sage-700 text-xl font-semibold tabular-nums">
                  {paidInFull}
                </dd>
              </div>
              <div>
                <dt className="text-ink-500 text-xs">Deposit only</dt>
                <dd className="text-sky-700 text-xl font-semibold tabular-nums">
                  {depositOnly}
                </dd>
              </div>
              <div>
                <dt className="text-ink-500 text-xs">Nothing yet</dt>
                <dd className="text-ink-900 text-xl font-semibold tabular-nums">
                  {guests.length - paidInFull - depositOnly}
                </dd>
              </div>
            </dl>
          </div>
        </section>
      )}

      <section className="card card-padded">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg">
            Guest list{" "}
            <span className="text-ink-500 text-base font-normal">({guests.length})</span>
          </h2>

          {guests.length > 4 && (
            <div className="min-w-56 flex-1 sm:max-w-xs">
              <label htmlFor="guest-search" className="visually-hidden">
                Search guests
              </label>
              <input
                id="guest-search"
                type="search"
                value={query}
                onChange={(fieldEvent) => setQuery(fieldEvent.target.value)}
                placeholder="Search by name or email"
                className="input"
              />
            </div>
          )}
        </div>

        {guests.length === 0 ? (
          <EmptyState
            title="No guests yet"
            description="Add your first guest above. Each one gets their own private invitation link."
          />
        ) : filtered.length === 0 ? (
          <EmptyState title="No matches" description="No guest matches that search." />
        ) : (
          <ul className="flex flex-col gap-3">
            {filtered.map((guest) => (
              <GuestCard key={guest.id} guest={guest} showPayment={payment !== null} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Deposit / full payment toggles for one guest.
 *
 * Each toggle is its own form so the two can be set independently, and each
 * posts the state it wants rather than "flip it", which keeps a double-click
 * from racing itself into the wrong value.
 */
function PaymentControls({ guest }: { guest: GuestRow }) {
  const depositPaid = guest.depositPaidAt !== null;
  const fullPaid = guest.paidInFullAt !== null;

  const paidOn = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : null;

  return (
    <div className="border-cream-300 bg-cream-50 mt-3 flex flex-wrap items-center gap-2 rounded-xl border p-2.5">
      <span className="text-ink-500 mr-1 text-xs font-semibold tracking-wide uppercase">
        Payment
      </span>

      <ActionForm action={setGuestPaymentAction} showFeedback={false}>
        {() => (
          <>
            <input type="hidden" name="guestId" value={guest.id} />
            <input type="hidden" name="field" value="deposit" />
            <input type="hidden" name="paid" value={depositPaid ? "false" : "true"} />
            <SubmitButton
              className={`btn btn-sm ${depositPaid ? "btn-secondary" : "btn-ghost"}`}
              // Paying in full already covers the deposit, so leave it alone.
              disabled={fullPaid}
            >
              {depositPaid ? "✓ Deposit" : "Mark deposit paid"}
            </SubmitButton>
          </>
        )}
      </ActionForm>

      <ActionForm action={setGuestPaymentAction} showFeedback={false}>
        {() => (
          <>
            <input type="hidden" name="guestId" value={guest.id} />
            <input type="hidden" name="field" value="full" />
            <input type="hidden" name="paid" value={fullPaid ? "false" : "true"} />
            <SubmitButton className={`btn btn-sm ${fullPaid ? "btn-secondary" : "btn-ghost"}`}>
              {fullPaid ? "✓ Paid in full" : "Mark paid in full"}
            </SubmitButton>
          </>
        )}
      </ActionForm>

      {(depositPaid || fullPaid) && (
        <span className="text-ink-400 ml-auto text-xs">
          {fullPaid
            ? `Settled ${paidOn(guest.paidInFullAt)}`
            : `Deposit ${paidOn(guest.depositPaidAt)}`}
        </span>
      )}
    </div>
  );
}

function GuestCard({ guest, showPayment }: { guest: GuestRow; showPayment: boolean }) {
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);

  return (
    <li className="border-cream-300 rounded-2xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-ink-900 font-medium">
            {guest.forename} {guest.surname}
          </p>
          <p className="text-ink-500 truncate text-sm">{guest.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={guest.rsvpStatus} />
          <PaymentPill state={guest.payment} />
        </div>
      </div>

      {showPayment && <PaymentControls guest={guest} />}

      {guest.invitationLastError && (
        <p className="notice notice-error mt-3 text-sm">
          The last invitation email failed: {guest.invitationLastError}. Their private link below
          still works, so you can share it yourself.
        </p>
      )}

      {guest.invitationSentAt && !guest.invitationLastError && (
        <p className="text-ink-400 mt-2 text-xs">
          Invitation sent {new Date(guest.invitationSentAt).toLocaleDateString("en-GB")}
        </p>
      )}

      {guest.rsvpUrl ? (
        <div className="bg-cream-50 border-cream-300 mt-3 flex flex-wrap items-center gap-2 rounded-xl border p-2.5">
          <code className="text-ink-500 min-w-0 flex-1 truncate text-xs">{guest.rsvpUrl}</code>
          <CopyButton value={guest.rsvpUrl} label="Copy link" />
        </div>
      ) : (
        <p className="notice notice-warning mt-3 text-sm">
          This guest's private link can't be shown. Remove them and add them again to issue a new
          one.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ActionForm action={sendInvitationAction} showFeedback={false}>
          {(state) => (
            <div>
              <input type="hidden" name="guestId" value={guest.id} />
              <SubmitButton className="btn btn-secondary btn-sm" pendingLabel="Sending…">
                {guest.invitationSentAt ? "Send again" : "Send invitation"}
              </SubmitButton>
              {state.message && (
                <p
                  className={`mt-1.5 text-sm ${state.ok ? "text-sage-700" : "text-clay-700"}`}
                  role={state.ok ? "status" : "alert"}
                >
                  {state.message}
                </p>
              )}
            </div>
          )}
        </ActionForm>

        {confirmingRemoval ? (
          <ActionForm action={removeGuestAction} showFeedback={false}>
            {() => (
              <div className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="guestId" value={guest.id} />
                <span className="text-ink-700 text-sm">
                  Remove {guest.forename}? Their link will stop working.
                </span>
                <SubmitButton className="btn btn-danger btn-sm">Yes, remove</SubmitButton>
                <button
                  type="button"
                  onClick={() => setConfirmingRemoval(false)}
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
            onClick={() => setConfirmingRemoval(true)}
            className="btn btn-ghost btn-sm text-clay-700"
          >
            Remove
          </button>
        )}
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */

function AddGuestCard({ eventId }: { eventId: string }) {
  return (
    <section className="card card-padded">
      <h2 className="text-lg">Add a guest</h2>
      <p className="text-ink-500 mt-1 mb-4 text-sm">
        Each guest gets their own private link. They'll confirm this email address before they can
        reply, so make sure it's right.
      </p>

      <ActionForm action={addGuestAction}>
        {(state) => (
          <div className="flex flex-col gap-4">
            <input type="hidden" name="eventId" value={eventId} />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="forename" className="field-label">
                  Forename
                </label>
                <input
                  id="forename"
                  name="forename"
                  maxLength={LIMITS.personName}
                  autoComplete="off"
                  className="input"
                  aria-invalid={state.errors?.forename ? true : undefined}
                />
                {state.errors?.forename && <p className="field-error">{state.errors.forename}</p>}
              </div>

              <div>
                <label htmlFor="surname" className="field-label">
                  Surname
                </label>
                <input
                  id="surname"
                  name="surname"
                  maxLength={LIMITS.personName}
                  autoComplete="off"
                  className="input"
                  aria-invalid={state.errors?.surname ? true : undefined}
                />
                {state.errors?.surname && <p className="field-error">{state.errors.surname}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="guest-email" className="field-label">
                Email address
              </label>
              <input
                id="guest-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="off"
                className="input"
                aria-invalid={state.errors?.email ? true : undefined}
              />
              {state.errors?.email && <p className="field-error">{state.errors.email}</p>}
            </div>

            <div>
              <SubmitButton className="btn btn-primary" pendingLabel="Adding…">
                Add guest
              </SubmitButton>
            </div>
          </div>
        )}
      </ActionForm>
    </section>
  );
}
