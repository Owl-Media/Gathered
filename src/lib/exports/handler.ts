import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getEventForOrganiser } from "@/lib/data/events";
import { buildExportDataset, type ExportDataset } from "./data";
import { AUDIT_EVENT, recordAudit } from "@/lib/audit";
import { clientIdentifier, consumeRateLimit } from "@/lib/rate-limit";

/**
 * Shared plumbing for the three export routes (Spec 5.5, 5.6, 9.6).
 *
 * Ownership is enforced here for every export: an organiser can only export
 * their own events (Spec 15.11, 15.12). The whole file is built in memory
 * before any bytes are sent, so a failure part-way through cannot produce a
 * truncated or corrupt download (Spec 9.6).
 */

export interface ExportContext {
  dataset: ExportDataset;
  includeOrganiserNotes: boolean;
}

export async function handleExport(
  request: Request,
  eventId: string,
  exportKind: string,
  produce: (context: ExportContext) => Promise<{
    body: Buffer | string;
    contentType: string;
    filename: string;
  }>,
): Promise<Response> {
  const user = await getCurrentUser();

  // Superadmins are excluded too: exporting is an organiser capability over
  // their own events only (Spec 7 permissions matrix).
  if (!user || user.role !== "organiser") {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  const event = await getEventForOrganiser(eventId, user.id);
  if (!event) {
    // Same response whether the event is missing or someone else's (Spec 8.1).
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const limit = await consumeRateLimit("export", await clientIdentifier());
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many exports. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  /**
   * Spec 17 Q4.Internal organiser notes are excluded by default and only
   * included when the organiser explicitly ticks the box, which arrives here as
   * `?notes=1`.
   */
  const includeOrganiserNotes = new URL(request.url).searchParams.get("notes") === "1";

  try {
    const dataset = await buildExportDataset(event);
    const { body, contentType, filename } = await produce({ dataset, includeOrganiserNotes });

    await recordAudit({
      actorType: "organiser",
      actorId: user.id,
      eventType: AUDIT_EVENT.EXPORT_GENERATED,
      entityType: "event",
      entityId: event.id,
      metadata: { exportKind, includeOrganiserNotes, guestCount: dataset.guests.length },
    });

    const bytes = typeof body === "string" ? Buffer.from(body, "utf8") : body;

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(bytes.length),
        "Content-Disposition": `attachment; filename="${filename}"`,
        // Exports contain personal data; never let a proxy or the browser
        // cache them.
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    // Spec 9.6.Log internally, tell the organiser clearly, allow a retry.
    console.error("[exports] generation failed", {
      exportKind,
      eventId: event.id,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "We couldn't generate that file. Please try again." },
      { status: 500 },
    );
  }
}
