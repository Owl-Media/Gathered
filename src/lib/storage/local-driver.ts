import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { StorageError, type StorageDriver, type StoredObject } from "./types";

/**
 * Local filesystem driver (Spec 8.7, 12.5).
 *
 * The root must point at a persistent volume in production, otherwise uploads
 * vanish on the next deploy (Spec 19). It also sits outside the application
 * source directory so uploaded files are never inside anything the server would
 * treat as code (Spec 4.3).
 */
export class LocalStorageDriver implements StorageDriver {
  readonly name = "local";
  private readonly root: string;

  constructor(rootPath: string) {
    this.root = path.resolve(rootPath);
  }

  /**
   * Resolves a key to an absolute path and refuses anything that escapes the
   * root, a key containing "../" must never reach outside the upload
   * directory.
   */
  private resolveKey(key: string): string {
    const target = path.resolve(this.root, key);
    const rootWithSep = this.root.endsWith(path.sep) ? this.root : this.root + path.sep;

    if (target !== this.root && !target.startsWith(rootWithSep)) {
      throw new StorageError("Invalid storage key");
    }
    return target;
  }

  async put(key: string, body: Buffer, _contentType: string): Promise<void> {
    const target = this.resolveKey(key);
    try {
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, body);
    } catch (error) {
      throw new StorageError(`Could not write ${key}`, error);
    }
  }

  async get(key: string): Promise<StoredObject | null> {
    try {
      const body = await readFile(this.resolveKey(key));
      return { body, contentType: contentTypeFromKey(key) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return null;
      throw new StorageError(`Could not read ${key}`, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.resolveKey(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return;
      throw new StorageError(`Could not delete ${key}`, error);
    }
  }

  /** Local files are always streamed through the app, never served directly. */
  publicUrl(): string | null {
    return null;
  }
}

/**
 * Content type inferred from the extension. Safe because only extensions this
 * app itself wrote are ever present. Uploads are re-encoded and renamed on the
 * way in (see lib/images.ts), so a client-supplied filename never reaches here.
 */
function contentTypeFromKey(key: string): string {
  const extension = path.extname(key).toLowerCase();
  switch (extension) {
    case ".webp":
      return "image/webp";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    default:
      return "application/octet-stream";
  }
}
