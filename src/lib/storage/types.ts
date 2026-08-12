/**
 * Object storage abstraction (Spec 8.7, 12.5).
 *
 * Two drivers ship: S3-compatible (preferred) and local disk (fallback and
 * development). The driver is chosen by environment variable, so switching does
 * not require a code change.
 */

export interface StoredObject {
  body: Buffer;
  contentType: string;
}

export interface StorageDriver {
  readonly name: "local" | "s3";

  /** Writes an object at `key`, overwriting any existing object. */
  put(key: string, body: Buffer, contentType: string): Promise<void>;

  /** Reads an object, or null when it does not exist. */
  get(key: string): Promise<StoredObject | null>;

  /** Deletes an object. Succeeds silently when the key is already absent. */
  delete(key: string): Promise<void>;

  /**
   * A directly fetchable URL when the driver has one (e.g. a CDN in front of
   * the bucket). Null means the app must stream the bytes itself.
   */
  publicUrl(key: string): string | null;
}

export class StorageError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "StorageError";
  }
}
