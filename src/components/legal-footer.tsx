import Link from "next/link";

/**
 * Links to the privacy notice and the terms.
 *
 * Rendered on every surface a person can reach without signing in, plus the
 * organiser shell. GDPR Art. 13 requires the notice to be given at the point
 * data is collected, so it has to be reachable from the RSVP form itself, not
 * only from the marketing page.
 */
export function LegalFooter({ className = "" }: { className?: string }) {
  return (
    <nav
      aria-label="Legal"
      className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs ${className}`}
    >
      <Link href="/privacy" className="text-ink-500 hover:text-ink-700 underline underline-offset-2">
        Privacy
      </Link>
      <Link href="/terms" className="text-ink-500 hover:text-ink-700 underline underline-offset-2">
        Terms
      </Link>
    </nav>
  );
}
