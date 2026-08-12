import type { Metadata } from "next";
import { requireSuperadmin } from "@/lib/auth/guards";
import { listRecentAuditEvents } from "@/lib/data/superadmin";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Audit log" };

/**
 * Basic audit information (Spec 6.9, 10.7).
 *
 * Metadata is scrubbed of sensitive keys at write time (see lib/audit.ts), so
 * nothing displayed here can contain guest dietary requirements, guest
 * messages, organiser notes or RSVP tokens.
 */
export default async function AuditPage() {
  await requireSuperadmin();
  const entries = await listRecentAuditEvents();

  if (entries.length === 0) {
    return (
      <div className="card">
        <EmptyState title="Nothing recorded yet" description="Activity will appear here." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl">Audit log</h1>
        <p className="text-ink-500 mt-1 text-sm">
          The {entries.length} most recent recorded actions. Sensitive guest content is never
          written to this log.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {entries.map((entry) => (
          <li key={entry.id} className="card flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3">
            <code className="text-blush-700 text-sm font-medium">{entry.eventType}</code>

            <span className="text-ink-500 text-sm">
              by {entry.actorName ?? entry.actorType}
              {entry.actorName && entry.actorType !== "organiser" && ` (${entry.actorType})`}
            </span>

            {entry.entityType && (
              <span className="text-ink-400 text-xs">
                {entry.entityType}
                {entry.entityId ? ` ${entry.entityId.slice(0, 8)}…` : ""}
              </span>
            )}

            <span className="text-ink-400 ml-auto text-xs whitespace-nowrap">
              {entry.occurredAt.toLocaleString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>

            {entry.metadata && Object.keys(entry.metadata).length > 0 && (
              <span className="text-ink-400 w-full font-mono text-xs">
                {Object.entries(entry.metadata)
                  .map(([key, value]) => `${key}=${String(value)}`)
                  .join("  ")}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
