/**
 * Image constants shared by the server-side processor and the upload UI.
 *
 * Kept out of `lib/images.ts` because that module is `server-only` (it pulls in
 * sharp), while the client form needs these values to give immediate feedback.
 * The authoritative checks still run on the server (Spec 8.1).
 */

/** Spec 4.3, 5MB per image. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** For the file input's `accept` attribute. */
export const IMAGE_ACCEPT_ATTRIBUTE = ALLOWED_IMAGE_MIME_TYPES.join(",");
