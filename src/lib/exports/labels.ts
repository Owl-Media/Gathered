import type { RsvpStatus } from "@/db/schema";

/**
 * Status labels for exports.
 *
 * Kept separate from the React `StatusPill` component so the PDF and CSV
 * generators, which run outside the DOM.Can use the same wording without
 * importing UI code.
 */
export function statusLabelFor(status: RsvpStatus): string {
  switch (status) {
    case "accepted":
      return "Accepted";
    case "declined":
      return "Declined";
    case "not_responded":
      return "Not responded";
  }
}
