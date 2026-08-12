"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The six sections Spec 5.2 requires.
 *
 * These are real routes rather than client-side panels, so each section is
 * linkable, survives a refresh, and renders its own data on the server.
 */
const SECTIONS = [
  { segment: "", label: "Details" },
  { segment: "images", label: "Images" },
  { segment: "menu", label: "Menu" },
  { segment: "guests", label: "Guests" },
  { segment: "responses", label: "Responses" },
  { segment: "exports", label: "Exports" },
] as const;

export function EventTabs({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const base = `/events/${eventId}`;

  return (
    // Scrolls horizontally on narrow screens instead of wrapping into a
    // cramped two-line block (Spec 14).
    <nav aria-label="Event sections" className="table-scroll -mx-5 px-5 sm:mx-0 sm:px-0">
      <ul className="border-cream-300 flex min-w-max items-center gap-1 border-b pb-2">
        {SECTIONS.map((section) => {
          const href = section.segment ? `${base}/${section.segment}` : base;
          const isCurrent = section.segment
            ? pathname.startsWith(href)
            : pathname === base || pathname === `${base}/`;

          return (
            <li key={section.segment || "details"}>
              <Link href={href} className="tab" aria-current={isCurrent ? "page" : undefined}>
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
