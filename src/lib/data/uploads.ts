import "server-only";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { uploads } from "@/db/schema";
import type { Event } from "@/db/schema";
import { getStorage } from "@/lib/storage";

export interface EventImageUrls {
  headerUrl: string | null;
  profileUrl: string | null;
}

/**
 * Resolves an event's image URLs.
 *
 * When the storage driver exposes a directly fetchable URL (an S3 bucket behind
 * a CDN) that is used, so image bytes never pass through the app. Otherwise the
 * `/uploads/:id` route streams them.
 */
export async function resolveEventImages(event: Event): Promise<EventImageUrls> {
  const ids = [event.headerImageId, event.profileImageId].filter(
    (id): id is string => id !== null,
  );

  if (ids.length === 0) return { headerUrl: null, profileUrl: null };

  const rows = await db
    .select({ id: uploads.id, storageKey: uploads.storageKey })
    .from(uploads)
    .where(inArray(uploads.id, ids));

  const storage = getStorage();
  const urlById = new Map(
    rows.map((row) => [row.id, storage.publicUrl(row.storageKey) ?? `/uploads/${row.id}`]),
  );

  return {
    headerUrl: event.headerImageId ? (urlById.get(event.headerImageId) ?? null) : null,
    profileUrl: event.profileImageId ? (urlById.get(event.profileImageId) ?? null) : null,
  };
}
