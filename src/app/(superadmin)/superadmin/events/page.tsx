import type { Metadata } from "next";
import { requireSuperadmin } from "@/lib/auth/guards";
import { listPlatformEvents } from "@/lib/data/superadmin";
import { formatEventDateShort } from "@/lib/time";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Events" };

/**
 * Platform-wide event list with RSVP summaries (Spec 6.9, 15.13).
 *
 * Counts only. No guest names, no menu selections, no dietary requirements, no
 * messages, and no links into the organiser's own event management pages.
 * Superadmins may view summaries but never edit or impersonate (Spec 6.9).
 */
export default async function SuperadminEventsPage() {
  await requireSuperadmin();
  const events = await listPlatformEvents();

  if (events.length === 0) {
    return (
      <div className="card">
        <EmptyState title="No events yet" description="No organiser has created an event." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl">Events</h1>
        <p className="text-ink-500 mt-1 text-sm">
          Reply totals across the platform. Guest details are not shown.
        </p>
      </div>

      <div className="card table-scroll">
        <table className="w-full min-w-3xl border-collapse text-sm">
          <thead>
            <tr className="border-cream-300 border-b text-left">
              <Th>Event</Th>
              <Th>Organiser</Th>
              <Th>Date</Th>
              <Th align="right">Invited</Th>
              <Th align="right">Accepted</Th>
              <Th align="right">Declined</Th>
              <Th align="right">Waiting</Th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-cream-300 border-b last:border-0">
                <Td>
                  <span className="text-ink-900 font-medium">{event.name}</span>
                </Td>
                <Td>
                  <span className="text-ink-700">{event.organiserName}</span>
                  {event.organiserDisabled && (
                    <span className="pill pill-declined ml-2">Disabled</span>
                  )}
                </Td>
                <Td>{formatEventDateShort(event.eventDate)}</Td>
                <Td align="right">{event.invited}</Td>
                <Td align="right" className="text-sage-700">
                  {event.accepted}
                </Td>
                <Td align="right" className="text-clay-700">
                  {event.declined}
                </Td>
                <Td align="right">{event.notResponded}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={`text-ink-500 px-4 py-3 text-xs font-semibold tracking-wide uppercase ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  className = "",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td
      className={`text-ink-700 px-4 py-3 tabular-nums ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </td>
  );
}
