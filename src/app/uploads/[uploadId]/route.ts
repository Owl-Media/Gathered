import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { uploads } from "@/db/schema";
import { getStorage } from "@/lib/storage";

/**
 * Serves an uploaded image (Spec 8.6).
 *
 * Bytes are streamed through the app rather than exposing storage paths. The
 * response is locked down so a stored file can never be interpreted as
 * anything executable:
 *   - Content-Type comes from our own database record, not the request.
 *   - `X-Content-Type-Options: nosniff` stops the browser second-guessing it.
 *   - A `sandbox` CSP with `default-src 'none'` neutralises any active content.
 *
 * Event images are shown on public event pages, so this route is intentionally
 * unauthenticated. Ids are random UUIDs and are not enumerable.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uploadId: string }> },
) {
  const { uploadId } = await params;

  // Reject anything that isn't a UUID before touching the database.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uploadId)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const rows = await db
    .select({ storageKey: uploads.storageKey, mimeType: uploads.mimeType })
    .from(uploads)
    .where(eq(uploads.id, uploadId))
    .limit(1);

  const record = rows[0];
  if (!record) return new NextResponse("Not found", { status: 404 });

  try {
    const object = await getStorage().get(record.storageKey);
    if (!object) return new NextResponse("Not found", { status: 404 });

    return new NextResponse(new Uint8Array(object.body), {
      status: 200,
      headers: {
        "Content-Type": record.mimeType,
        "Content-Length": String(object.body.length),
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        // Content at a given id never changes, a new upload gets a new id.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("[uploads] failed to serve image", { uploadId, error });
    return new NextResponse("Unavailable", { status: 502 });
  }
}
