import type { Event, MenuCourse, MenuOption } from "@/db/schema";
import { formatEventDate, formatInstant, formatWallTime } from "@/lib/time";
import { PlaceholderHeader, PlaceholderProfile } from "@/components/placeholder-art";

/**
 * Shared presentation of an event's public-facing details.
 *
 * Used by the public event page, the private guest RSVP page and the
 * organiser's preview, so all three always show identical information. It
 * renders *only* event information, never guest names, counts, choices,
 * dietary requirements or messages (Spec 5.3, 8.2).
 */

interface CourseWithOptions extends MenuCourse {
  options: MenuOption[];
}

export function EventHero({
  event,
  headerUrl,
  profileUrl,
}: {
  event: Event;
  headerUrl: string | null;
  profileUrl: string | null;
}) {
  return (
    <div>
      <div className="bg-cream-200 relative h-44 w-full overflow-hidden rounded-3xl sm:h-64">
        {headerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- the source is
          // our own upload route or a configured CDN, already resized on upload.
          <img
            src={headerUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="eager"
            decoding="async"
          />
        ) : (
          <PlaceholderHeader theme={event.placeholderTheme} className="h-full w-full" />
        )}
      </div>

      <div className="-mt-11 flex justify-center sm:-mt-14">
        <div className="bg-cream-200 size-22 overflow-hidden rounded-full border-4 border-white shadow-md sm:size-28">
          {profileUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profileUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="eager"
              decoding="async"
            />
          ) : (
            <PlaceholderProfile theme={event.placeholderTheme} className="h-full w-full" />
          )}
        </div>
      </div>
    </div>
  );
}

export function EventFacts({ event }: { event: Event }) {
  return (
    <dl className="flex flex-col gap-5">
      <div>
        <dt className="text-ink-500 text-xs font-semibold tracking-wide uppercase">When</dt>
        <dd className="text-ink-900 mt-1 text-base">
          {formatEventDate(event.eventDate)}
          <br />
          <span className="text-ink-700">
            {formatWallTime(event.startTime.slice(0, 5))} –{" "}
            {formatWallTime(event.endTime.slice(0, 5))}
          </span>
        </dd>
      </div>

      <div>
        <dt className="text-ink-500 text-xs font-semibold tracking-wide uppercase">Where</dt>
        <dd className="text-ink-900 mt-1 text-base">
          {event.locationName}
          <br />
          <span className="prose-plain text-ink-700 text-sm">{event.locationAddress}</span>
        </dd>
      </div>
    </dl>
  );
}

export function EventDescription({ description }: { description: string | null }) {
  if (!description) return null;
  return (
    <div>
      <h2 className="mb-2 text-lg">Details</h2>
      {/* Plain text rendered with line breaks preserved, never parsed as HTML. */}
      <p className="prose-plain">{description}</p>
    </div>
  );
}

export interface EventCostLabels {
  depositLabel: string | null;
  totalLabel: string | null;
  balanceLabel: string | null;
}

/**
 * What the event costs to attend.
 *
 * This is event information, in the same category as the date and the venue,
 * and it says nothing about any individual guest. That is what makes it safe
 * for the public event page as well as the private RSVP page, and it is the
 * single source of these figures for both, so the two cannot drift apart.
 */
export function EventCost({ depositLabel, totalLabel, balanceLabel }: EventCostLabels) {
  if (!totalLabel && !depositLabel) return null;

  return (
    <div>
      <h2 className="mb-2 text-lg">Cost to attend</h2>

      <dl className="border-cream-300 divide-cream-300 divide-y rounded-xl border">
        {totalLabel && (
          <div className="flex items-center justify-between gap-4 px-4 py-2.5">
            <dt className="text-ink-700 text-sm">Per guest</dt>
            <dd className="text-ink-900 font-medium tabular-nums">{totalLabel}</dd>
          </div>
        )}
        {depositLabel && (
          <div className="flex items-center justify-between gap-4 px-4 py-2.5">
            <dt className="text-ink-700 text-sm">Deposit up front</dt>
            <dd className="text-ink-900 font-medium tabular-nums">{depositLabel}</dd>
          </div>
        )}
        {balanceLabel && (
          <div className="flex items-center justify-between gap-4 px-4 py-2.5">
            <dt className="text-ink-700 text-sm">Balance after the deposit</dt>
            <dd className="text-ink-900 font-medium tabular-nums">{balanceLabel}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

/**
 * What this particular guest still owes, and what they have already paid.
 *
 * Personal to one guest, so unlike {@link EventCost} this is shown only on the
 * private RSVP page and only after email verification. It never appears on the
 * public event page.
 */
export function GuestPaymentStatus({
  balanceLabel,
  paid,
}: {
  balanceLabel: string | null;
  paid: "paid_in_full" | "deposit_paid" | "unpaid";
}) {
  return (
    <div>
      <h2 className="mb-2 text-lg">Your payment</h2>

      {paid === "paid_in_full" && (
        <p className="notice notice-success text-sm" role="status">
          Thank you, your contribution is settled in full.
        </p>
      )}
      {paid === "deposit_paid" && (
        <p className="notice notice-info text-sm" role="status">
          Your deposit has been received{balanceLabel ? `, with ${balanceLabel} to follow` : ""}.
        </p>
      )}
      {paid === "unpaid" && (
        <p className="text-ink-500 text-sm">
          Nothing recorded yet. The organiser will let you know how to pay, and will update this
          once it arrives.
        </p>
      )}
    </div>
  );
}

/**
 * The menu shown for information (Spec 5.3, "Menu information, if
 * appropriate"). This is the menu itself, never anyone's selections.
 */
export function EventMenuSummary({ courses }: { courses: CourseWithOptions[] }) {
  if (courses.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 text-lg">On the menu</h2>
      <div className="flex flex-col gap-4">
        {courses.map((course) => (
          <div key={course.id}>
            <h3 className="text-ink-500 text-xs font-semibold tracking-wide uppercase">
              {course.name}
            </h3>
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {course.options.map((option) => (
                <li key={option.id} className="text-ink-700 text-sm">
                  <span className="text-ink-900">{option.name}</span>
                  {option.dietaryLabel && (
                    <span className="pill pill-info ml-2 align-middle text-xs">
                      {option.dietaryLabel}
                    </span>
                  )}
                  {option.description && (
                    <span className="text-ink-500 block text-sm">{option.description}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Spec 6.3.Guest-facing pages show a visible last updated notice. */
export function LastUpdatedNotice({ event }: { event: Event }) {
  // Only meaningful once the event has actually been edited after creation.
  if (event.updatedAt.getTime() - event.createdAt.getTime() < 1000) return null;

  return (
    <p className="text-ink-400 text-xs">
      These details were last updated on {formatInstant(event.updatedAt, event.timezone)}.
    </p>
  );
}
