/**
 * Default image placeholders (Spec 4.3, 8.6, 17 Q7).
 *
 * A small preset library the organiser picks from when they have no photo of
 * their own. Pure inline SVG: no binary assets, no upload required, scales to
 * any size, and prints cleanly in the keepsake PDF's sibling styling.
 */

export const PLACEHOLDER_THEMES = [
  { id: "clouds", label: "Clouds" },
  { id: "moon", label: "Moon & stars" },
  { id: "botanical", label: "Botanical" },
  { id: "rainbow", label: "Rainbow" },
  { id: "balloons", label: "Balloons" },
  { id: "confetti", label: "Confetti" },
] as const;

export type PlaceholderTheme = (typeof PLACEHOLDER_THEMES)[number]["id"];

export function isPlaceholderTheme(value: string): value is PlaceholderTheme {
  return PLACEHOLDER_THEMES.some((theme) => theme.id === value);
}

/**
 * Per-theme gradient stops, kept in the pastel range of the design system.
 * Exported so the invitation email can reuse the exact same backgrounds
 * (`@/lib/email/templates`), rather than drifting out of sync with a second
 * copy.
 */
export const GRADIENTS: Record<PlaceholderTheme, [string, string]> = {
  clouds: ["#dfebf3", "#fae4e6"],
  moon: ["#e6e3f2", "#dfebf3"],
  botanical: ["#e2eee3", "#faf1d6"],
  rainbow: ["#fae4e6", "#faf1d6"],
  balloons: ["#fdf2f3", "#e2eee3"],
  confetti: ["#faf1d6", "#dfebf3"],
};

function Motifs({ theme }: { theme: PlaceholderTheme }) {
  switch (theme) {
    case "clouds":
      return (
        <g fill="#ffffff" opacity="0.85">
          <ellipse cx="90" cy="105" rx="52" ry="26" />
          <ellipse cx="128" cy="94" rx="36" ry="30" />
          <ellipse cx="300" cy="70" rx="40" ry="20" />
          <ellipse cx="328" cy="61" rx="28" ry="23" />
          <ellipse cx="210" cy="150" rx="34" ry="17" />
        </g>
      );

    case "moon":
      return (
        <g>
          <path
            d="M330 52a44 44 0 1 0 34 70 52 52 0 0 1-34-70z"
            fill="#faf1d6"
            opacity="0.95"
          />
          <g fill="#ffffff" opacity="0.9">
            <Star cx={110} cy={70} r={7} />
            <Star cx={180} cy={128} r={5} />
            <Star cx={248} cy={58} r={5.5} />
            <Star cx={78} cy={140} r={4.5} />
            <Star cx={296} cy={148} r={4} />
          </g>
        </g>
      );

    case "botanical":
      return (
        <g stroke="#a3c6a8" strokeWidth="3" fill="none" opacity="0.9" strokeLinecap="round">
          <path d="M70 175c0-40 18-66 44-80" />
          <path d="M114 95c-18 2-30 12-34 28M114 95c2 16-4 30-16 40" />
          <path d="M330 175c0-34-14-58-36-72" />
          <path d="M294 103c14 4 24 14 27 28M294 103c-3 14 2 26 12 35" />
          <circle cx="200" cy="150" r="4" fill="#f3e2ad" stroke="none" />
          <circle cx="228" cy="132" r="3" fill="#f3e2ad" stroke="none" />
          <circle cx="176" cy="128" r="3" fill="#f3e2ad" stroke="none" />
        </g>
      );

    case "rainbow":
      return (
        <g fill="none" strokeLinecap="round" strokeWidth="14">
          <path d="M110 180a90 90 0 0 1 180 0" stroke="#f5cdd1" />
          <path d="M134 180a66 66 0 0 1 132 0" stroke="#f3e2ad" />
          <path d="M158 180a42 42 0 0 1 84 0" stroke="#c6ddc9" />
          <path d="M182 180a18 18 0 0 1 36 0" stroke="#c2d9e8" />
        </g>
      );

    case "balloons":
      return (
        <g>
          <g stroke="#d0757f" strokeWidth="1.5" fill="none" opacity="0.6">
            <path d="M132 108c6 22-4 40-4 62" />
            <path d="M212 92c-6 24 4 44 4 66" />
            <path d="M286 116c8 20 0 36 0 54" />
          </g>
          <ellipse cx="132" cy="92" rx="26" ry="31" fill="#f5cdd1" />
          <ellipse cx="212" cy="76" rx="29" ry="34" fill="#c2d9e8" />
          <ellipse cx="286" cy="100" rx="24" ry="28" fill="#c6ddc9" />
        </g>
      );

    case "confetti":
      return (
        <g opacity="0.85">
          <rect x="86" y="70" width="12" height="6" rx="3" fill="#f5cdd1" transform="rotate(-24 86 70)" />
          <rect x="152" y="118" width="12" height="6" rx="3" fill="#c2d9e8" transform="rotate(35 152 118)" />
          <rect x="212" y="62" width="12" height="6" rx="3" fill="#c6ddc9" transform="rotate(-12 212 62)" />
          <rect x="268" y="132" width="12" height="6" rx="3" fill="#f3e2ad" transform="rotate(48 268 132)" />
          <rect x="322" y="82" width="12" height="6" rx="3" fill="#f5cdd1" transform="rotate(-38 322 82)" />
          <circle cx="118" cy="146" r="5" fill="#f3e2ad" />
          <circle cx="248" cy="104" r="4.5" fill="#f5cdd1" />
          <circle cx="188" cy="160" r="4" fill="#c2d9e8" />
          <circle cx="332" cy="150" r="5" fill="#c6ddc9" />
        </g>
      );
  }
}

function Star({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  // Four-point sparkle, softer than a five-point star.
  return (
    <path
      d={`M${cx} ${cy - r}q${r * 0.25} ${r * 0.75} ${r} ${r}q-${r * 0.75} ${r * 0.25} -${r} ${r}q-${r * 0.25} -${r * 0.75} -${r} -${r}q${r * 0.75} -${r * 0.25} ${r} -${r}z`}
    />
  );
}

/**
 * Wide header placeholder. `viewBox` is 400x200 and the SVG is stretched by CSS,
 * so it fills whatever aspect ratio the layout gives it.
 */
export function PlaceholderHeader({
  theme,
  className = "",
}: {
  theme: string;
  className?: string;
}) {
  const resolved: PlaceholderTheme = isPlaceholderTheme(theme) ? theme : "clouds";
  const [from, to] = GRADIENTS[resolved];
  const gradientId = `ph-header-${resolved}`;

  return (
    <svg
      viewBox="0 0 400 200"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="presentation"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="400" height="200" fill={`url(#${gradientId})`} />
      <Motifs theme={resolved} />
    </svg>
  );
}

/** Square placeholder for the event profile image, rendered inside a circle. */
export function PlaceholderProfile({
  theme,
  className = "",
}: {
  theme: string;
  className?: string;
}) {
  const resolved: PlaceholderTheme = isPlaceholderTheme(theme) ? theme : "clouds";
  const [from, to] = GRADIENTS[resolved];
  const gradientId = `ph-profile-${resolved}`;

  return (
    <svg
      viewBox="60 40 280 140"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="presentation"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <rect x="60" y="40" width="280" height="140" fill={`url(#${gradientId})`} />
      <Motifs theme={resolved} />
    </svg>
  );
}
