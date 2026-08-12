/**
 * Wordmark and decorative motifs.
 *
 * Everything is inline SVG: it scales cleanly, inherits `currentColor`, needs no
 * network request, and keeps the pastel look consistent without shipping binary
 * assets (Spec 13).
 */

export function BrandMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      role="img"
      aria-label="Gathered"
    >
      {/* A soft cloud with a falling heart, gentle, not literal. */}
      <path
        d="M8.5 20a4.5 4.5 0 0 1 .53-8.97 6 6 0 0 1 11.42-1.6A5 5 0 0 1 22.5 20z"
        fill="var(--color-blush-200)"
      />
      <path
        d="M16 22.2c1.6-1.5 3.2-2.6 3.2-4.2a1.8 1.8 0 0 0-3.2-1.13A1.8 1.8 0 0 0 12.8 18c0 1.6 1.6 2.7 3.2 4.2"
        fill="var(--color-blush-500)"
      />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark className="size-7 shrink-0" />
      <span className="font-display text-ink-900 text-lg font-semibold tracking-tight">
        Gathered
      </span>
    </span>
  );
}

/**
 * Faint decorative arc used behind page headers. Purely ornamental, so it is
 * hidden from assistive technology.
 */
export function SoftBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 overflow-hidden"
    >
      <svg viewBox="0 0 1200 300" preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id="softBackdrop" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-blush-100)" />
            <stop offset="55%" stopColor="var(--color-cream-200)" />
            <stop offset="100%" stopColor="var(--color-sky-50)" />
          </linearGradient>
        </defs>
        <path d="M0 0h1200v170c-300 90-900 90-1200 0z" fill="url(#softBackdrop)" />
      </svg>
    </div>
  );
}
