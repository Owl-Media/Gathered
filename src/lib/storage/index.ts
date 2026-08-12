import "server-only";
import { env } from "@/lib/env";
import type { StorageDriver } from "./types";
import { LocalStorageDriver } from "./local-driver";
import { S3StorageDriver } from "./s3-driver";

export type { StorageDriver, StoredObject } from "./types";
export { StorageError } from "./types";

let cached: StorageDriver | null = null;

/** Resolves the configured storage driver (Spec 8.7, 12.5). */
export function getStorage(): StorageDriver {
  if (cached) return cached;

  if (env.STORAGE_DRIVER === "s3") {
    cached = new S3StorageDriver({
      endpoint: env.S3_ENDPOINT || undefined,
      region: env.S3_REGION,
      bucket: env.S3_BUCKET!,
      accessKeyId: env.S3_ACCESS_KEY_ID!,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      publicUrlBase: env.S3_PUBLIC_URL || undefined,
    });
  } else {
    cached = new LocalStorageDriver(env.LOCAL_STORAGE_PATH);
  }

  return cached;
}

export function resetStorageCache(): void {
  cached = null;
}
