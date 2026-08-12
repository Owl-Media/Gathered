import { env } from "@/lib/env";

/** Public event page, safe to share with anyone (Spec 5.3). */
export function publicEventUrl(publicSlug: string): string {
  return `${env.APP_BASE_URL}/e/${publicSlug}`;
}

/**
 * Private guest RSVP link (Spec 5.4).
 *
 * Only ever shown to the organiser who owns the event, or sent to the one guest
 * it belongs to. It must never appear on a public page, in another guest's
 * email, or in a log line (Spec 8.1, 11).
 */
export function guestRsvpUrl(rsvpToken: string): string {
  return `${env.APP_BASE_URL}/rsvp/${rsvpToken}`;
}
