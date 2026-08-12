export type PaymentState = "paid_in_full" | "deposit_paid" | "unpaid";

/**
 * Payment status shown beside a guest's RSVP status.
 *
 * Paying in full supersedes the deposit, so a guest marked as fully paid shows
 * a single "Paid in full" pill rather than two.
 */
export function paymentStateOf(
  depositPaidAt: Date | string | null,
  paidInFullAt: Date | string | null,
): PaymentState {
  if (paidInFullAt) return "paid_in_full";
  if (depositPaidAt) return "deposit_paid";
  return "unpaid";
}

const PRESENTATION: Record<
  Exclude<PaymentState, "unpaid">,
  { className: string; label: string; dot: string }
> = {
  paid_in_full: {
    className: "pill-accepted",
    label: "Paid in full",
    dot: "bg-sage-500",
  },
  deposit_paid: {
    className: "pill-info",
    label: "Deposit paid",
    dot: "bg-sky-500",
  },
};

export function PaymentPill({ state }: { state: PaymentState }) {
  // Nothing paid yet is the default, and a pill for it would be noise on every
  // row before anyone has settled up.
  if (state === "unpaid") return null;

  const { className, label, dot } = PRESENTATION[state];
  return (
    <span className={`pill ${className}`}>
      <span className={`size-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}

/** Wording used in exports, where "Not paid" needs to be explicit. */
export function paymentLabel(state: PaymentState): string {
  switch (state) {
    case "paid_in_full":
      return "Paid in full";
    case "deposit_paid":
      return "Deposit paid";
    case "unpaid":
      return "Not paid";
  }
}
