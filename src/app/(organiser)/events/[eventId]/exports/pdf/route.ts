import { exportFilename } from "@/lib/exports/csv";
import { handleExport } from "@/lib/exports/handler";
import { renderRsvpPdf } from "@/lib/exports/rsvp-pdf";

/** Operational RSVP PDF for event planning (Spec 5.5, 15.11). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;

  return handleExport(request, eventId, "rsvp_pdf", async ({ dataset, includeOrganiserNotes }) => ({
    body: await renderRsvpPdf(dataset, { includeOrganiserNotes }),
    contentType: "application/pdf",
    filename: exportFilename(dataset.event.name, "rsvps", "pdf"),
  }));
}
