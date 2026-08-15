"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { href: "/superadmin", label: "Organisers" },
  { href: "/superadmin/events", label: "Events" },
  { href: "/superadmin/audit", label: "Audit log" },
  { href: "/superadmin/system", label: "System" },
] as const;

export function SuperadminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="table-scroll -mx-5 mt-2 px-5 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max items-center gap-1">
        {SECTIONS.map((section) => {
          const isCurrent =
            section.href === "/superadmin"
              ? pathname === "/superadmin"
              : pathname.startsWith(section.href);

          return (
            <li key={section.href}>
              <Link
                href={section.href}
                className="tab"
                aria-current={isCurrent ? "page" : undefined}
              >
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
