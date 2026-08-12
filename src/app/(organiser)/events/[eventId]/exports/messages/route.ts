import { exportFilename } from "@/lib/exports/csv";
import { handleExport } from "@/lib/exports/handler";
import { renderMessagesPdf } from "@/lib/exports/messages-pdf";

/**
 * Keepsake messages PDF (Spec Addendum).
 *
 * Separate from the operational RSVP PDF: only guests who left a message, and
 * styled for keeping and printing rather than for planning.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;

  return handleExport(request, eventId, "messages_pdf", async ({ dataset }) => ({
    body: await renderMessagesPdf(dataset),
    contentType: "application/pdf",
    filename: exportFilename(dataset.event.name, "messages", "pdf"),
  }));
}
