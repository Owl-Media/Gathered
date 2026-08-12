"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { events, uploads } from "@/db/schema";
import { AuthorisationError, requireOrganiserForAction } from "@/lib/auth/guards";
import { requireEventForOrganiser } from "@/lib/data/events";
import { ImageValidationError, processUploadedImage, type ImageKind } from "@/lib/images";
import { getStorage } from "@/lib/storage";
import { AUDIT_EVENT, recordAudit } from "@/lib/audit";
import { clientIdentifier, consumeRateLimit } from "@/lib/rate-limit";
import { type ActionState, failure, formString, success } from "@/lib/forms";

/**
 * Event image uploads (Spec 4.3, 8.6, 9.5).
 */

const idSchema = z.uuid();
const kindSchema = z.enum(["header", "profile"]);

function refresh(eventId: string) {
  revalidatePath(`/events/${eventId}/images`);
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/e", "layout");
  revalidatePath("/rsvp", "layout");
}

export async function uploadEventImageAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let organiserId: string;
  try {
    organiserId = (await requireOrganiserForAction()).id;
  } catch (error) {
    return failure(error instanceof AuthorisationError ? error.message : "Something went wrong.");
  }

  const eventIdResult = idSchema.safeParse(formString(formData, "eventId"));
  const kindResult = kindSchema.safeParse(formString(formData, "kind"));
  if (!eventIdResult.success || !kindResult.success) {
    return failure("That upload could not be processed.");
  }

  const eventId = eventIdResult.data;
  const kind: ImageKind = kindResult.data;

  try {
    await requireEventForOrganiser(eventId, organiserId);
  } catch {
    return failure("That event could not be found.");
  }

  const limit = await consumeRateLimit("imageUpload", await clientIdentifier());
  if (!limit.allowed) {
    return failure("Too many uploads just now. Please wait a moment and try again.");
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return failure("Please choose an image to upload.");
  }

  let processed;
  try {
    // Validates type, size and integrity, then re-encodes (Spec 4.3, 8.6).
    processed = await processUploadedImage(file, kind, eventId);
  } catch (error) {
    if (error instanceof ImageValidationError) {
      await recordAudit({
        actorType: "organiser",
        actorId: organiserId,
        eventType: AUDIT_EVENT.IMAGE_UPLOAD_FAILED,
        entityType: "event",
        entityId: eventId,
        metadata: { kind, reason: error.message },
      });
      return failure(error.message);
    }
    console.error("[images] processing failed", error);
    return failure("We couldn't process that image. Please try another.");
  }

  const storage = getStorage();

  try {
    await storage.put(processed.key, processed.body, processed.contentType);
  } catch (error) {
    // Spec 9.5: a storage outage must not crash, and must read clearly.
    console.error("[images] storage write failed", error);
    return failure(
      "We couldn't save that image right now. Your other details are unchanged, so please try again shortly.",
    );
  }

  const previousUploadId = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(uploads)
      .values({
        ownerUserId: organiserId,
        storageKey: processed.key,
        storageDriver: storage.name,
        mimeType: processed.contentType,
        byteSize: processed.byteSize,
        width: processed.width,
        height: processed.height,
      })
      .returning({ id: uploads.id });

    const uploadId = inserted[0]?.id;
    if (!uploadId) throw new Error("Upload row was not created");

    const existing = await tx
      .select({
        headerImageId: events.headerImageId,
        profileImageId: events.profileImageId,
      })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    const replaced =
      kind === "header" ? existing[0]?.headerImageId : existing[0]?.profileImageId;

    await tx
      .update(events)
      .set(
        kind === "header"
          ? { headerImageId: uploadId, updatedAt: new Date() }
          : { profileImageId: uploadId, updatedAt: new Date() },
      )
      .where(eq(events.id, eventId));

    return replaced ?? null;
  });

  // Clean up whatever this replaced. Done after the transaction commits so a
  // failure here can never orphan the new image or leave the event pointing at
  // a deleted file.
  if (previousUploadId) {
    await deleteUploadQuietly(previousUploadId);
  }

  await recordAudit({
    actorType: "organiser",
    actorId: organiserId,
    eventType: AUDIT_EVENT.IMAGE_UPLOADED,
    entityType: "event",
    entityId: eventId,
    metadata: { kind, byteSize: processed.byteSize },
  });

  refresh(eventId);
  return success(kind === "header" ? "Header image updated." : "Profile image updated.");
}

export async function removeEventImageAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let organiserId: string;
  try {
    organiserId = (await requireOrganiserForAction()).id;
  } catch (error) {
    return failure(error instanceof AuthorisationError ? error.message : "Something went wrong.");
  }

  const eventIdResult = idSchema.safeParse(formString(formData, "eventId"));
  const kindResult = kindSchema.safeParse(formString(formData, "kind"));
  if (!eventIdResult.success || !kindResult.success) {
    return failure("That image could not be found.");
  }

  const eventId = eventIdResult.data;
  const kind = kindResult.data;

  let event;
  try {
    event = await requireEventForOrganiser(eventId, organiserId);
  } catch {
    return failure("That event could not be found.");
  }

  const uploadId = kind === "header" ? event.headerImageId : event.profileImageId;
  if (!uploadId) return success();

  await db
    .update(events)
    .set(
      kind === "header"
        ? { headerImageId: null, updatedAt: new Date() }
        : { profileImageId: null, updatedAt: new Date() },
    )
    .where(eq(events.id, eventId));

  await deleteUploadQuietly(uploadId);

  refresh(eventId);
  // Spec 4.3 / 8.6, with no image, the placeholder artwork takes over.
  return success("Image removed. Your chosen artwork will be shown instead.");
}

/**
 * Deletes an upload's bytes and its metadata row.
 *
 * Never throws: the event has already stopped pointing at this image, so a
 * storage hiccup should leave an orphaned object to be cleaned up later rather
 * than fail an operation the organiser has effectively completed.
 */
async function deleteUploadQuietly(uploadId: string): Promise<void> {
  try {
    const rows = await db
      .select({ storageKey: uploads.storageKey })
      .from(uploads)
      .where(eq(uploads.id, uploadId))
      .limit(1);

    const storageKey = rows[0]?.storageKey;
    if (storageKey) await getStorage().delete(storageKey);

    await db.delete(uploads).where(eq(uploads.id, uploadId));
  } catch (error) {
    console.error("[images] failed to clean up replaced upload", { uploadId, error });
  }
}
