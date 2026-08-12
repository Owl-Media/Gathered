import { generateSlugSuffix } from "@/lib/crypto/tokens";

/**
 * Public event links: a readable slug plus a random suffix (Spec 17 Q5).
 *
 * The suffix carries 12 characters from a 32-symbol alphabet.60 bits of
 * entropy, so the link is unguessable even though the readable part is
 * derived from the event name. The readable part is cosmetic only; nothing
 * about access control depends on it.
 */

const MAX_READABLE_LENGTH = 60;

/**
 * "Amelia's Baby Shower!" -> "amelias-baby-shower"
 *
 * NFKD splits an accented letter into a base letter plus a combining mark. The
 * marks must be *removed* before the separator pass, or `[^a-z0-9]` would turn
 * each one into a hyphen and "Renée" would become "rene-e" instead of "renee".
 */
export function slugifyEventName(name: string): string {
  const readable = name
    .normalize("NFKD")
    .toLowerCase()
    // \p{M} covers every combining mark, not just the Latin-1 range.
    .replace(/\p{M}/gu, "")
    // Drop apostrophes with no separator so "Amelia's" -> "amelias".
    .replace(/['‘’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_READABLE_LENGTH)
    .replace(/-+$/g, "");

  // Names of only emoji or non-Latin script leave nothing readable behind;
  // the random suffix still makes a perfectly good link.
  return readable || "event";
}

export function buildPublicSlug(eventName: string): string {
  return `${slugifyEventName(eventName)}-${generateSlugSuffix()}`;
}
