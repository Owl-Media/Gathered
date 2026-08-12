import "server-only";
import sharp from "sharp";
import { randomToken } from "@/lib/crypto/tokens";
import { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_BYTES } from "@/lib/image-constants";

/**
 * Image upload validation and processing (Spec 4.3, 8.6).
 *
 * Defence in depth, in order:
 *  1. Size is checked before anything is decoded.
 *  2. The declared MIME type and file extension must both be in the allow-list.
 *  3. sharp parses the bytes; this is the real check. A file claiming to be a
 *     PNG but containing something else fails here, which also covers the
 *     "basic image integrity" requirement.
 *  4. The image is re-encoded to WebP. The bytes finally written are produced
 *     by this server, not supplied by the uploader, so no polyglot file,
 *     embedded script or EXIF payload survives.
 *  5. The stored filename is generated here; the uploader's filename is
 *     discarded entirely.
 */

export { MAX_IMAGE_BYTES } from "@/lib/image-constants";

const ALLOWED_MIME_TYPES = new Set<string>(ALLOWED_IMAGE_MIME_TYPES);
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
/** Formats sharp is permitted to have detected in the decoded bytes. */
const ALLOWED_SHARP_FORMATS = new Set(["jpeg", "png", "webp"]);

export type ImageKind = "header" | "profile";

const TARGETS: Record<ImageKind, { width: number; height: number }> = {
  // 8:3 banner, sized for a 2x retina display at typical page widths.
  header: { width: 1600, height: 600 },
  profile: { width: 800, height: 800 },
};

export interface ProcessedImage {
  key: string;
  body: Buffer;
  contentType: string;
  byteSize: number;
  width: number;
  height: number;
}

export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageValidationError";
  }
}

function extensionOf(filename: string): string {
  const index = filename.lastIndexOf(".");
  return index === -1 ? "" : filename.slice(index + 1).toLowerCase();
}

/**
 * Validates and normalises an uploaded image, returning the bytes to store.
 * Throws {@link ImageValidationError} with a message safe to show the
 * organiser (Spec 9.5).
 */
export async function processUploadedImage(
  file: File,
  kind: ImageKind,
  eventId: string,
): Promise<ProcessedImage> {
  if (file.size === 0) {
    throw new ImageValidationError("That file is empty. Please choose an image.");
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new ImageValidationError(
      `That image is ${(file.size / 1024 / 1024).toFixed(1)}MB. Please choose one under 5MB.`,
    );
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new ImageValidationError("Please upload a JPG, PNG or WebP image.");
  }

  if (!ALLOWED_EXTENSIONS.has(extensionOf(file.name))) {
    throw new ImageValidationError("Please upload a file ending in .jpg, .png or .webp.");
  }

  const input = Buffer.from(await file.arrayBuffer());

  // Recheck after reading: `file.size` is a claim, `input.length` is the truth.
  if (input.length > MAX_IMAGE_BYTES) {
    throw new ImageValidationError("That image is too large. Please choose one under 5MB.");
  }

  const target = TARGETS[kind];

  let output: Buffer;
  let width: number;
  let height: number;

  try {
    // `failOn: "error"` makes sharp reject truncated or malformed images
    // instead of quietly rendering what it can.
    const pipeline = sharp(input, { failOn: "error" });
    const metadata = await pipeline.metadata();

    if (!metadata.format || !ALLOWED_SHARP_FORMATS.has(metadata.format)) {
      throw new ImageValidationError("That file is not a valid JPG, PNG or WebP image.");
    }
    if (!metadata.width || !metadata.height) {
      throw new ImageValidationError("That image appears to be damaged. Please try another.");
    }

    const resized = await pipeline
      .rotate() // Honour EXIF orientation before the metadata is dropped.
      .resize({
        width: target.width,
        height: target.height,
        fit: "cover",
        position: "attention",
        // Never upscale a small image into a blurry large one.
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });

    output = resized.data;
    width = resized.info.width;
    height = resized.info.height;
  } catch (error) {
    if (error instanceof ImageValidationError) throw error;
    throw new ImageValidationError(
      "We couldn't read that image. Please try a different JPG, PNG or WebP file.",
    );
  }

  return {
    // Filename is entirely server-generated; the random component stops one
    // upload from guessing or overwriting another.
    key: `events/${eventId}/${kind}-${randomToken(16)}.webp`,
    body: output,
    contentType: "image/webp",
    byteSize: output.length,
    width,
    height,
  };
}
