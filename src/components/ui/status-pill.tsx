import type { RsvpStatus } from "@/db/schema";

const PRESENTATION: Record<RsvpStatus, { className: string; label: string; dot: string }> = {
  accepted: { className: "pill-accepted", label: "Accepted", dot: "bg-sage-500" },
  declined: { className: "pill-declined", label: "Declined", dot: "bg-clay-500" },
  not_responded: { className: "pill-pending", label: "Not responded", dot: "bg-ink-400" },
};

export function StatusPill({ status }: { status: RsvpStatus }) {
  const { className, label, dot } = PRESENTATION[status];
  return (
    <span className={`pill ${className}`}>
      <span className={`size-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}

export function statusLabel(status: RsvpStatus): string {
  return PRESENTATION[status].label;
}
