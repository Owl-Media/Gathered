import { buildRsvpCsv, exportFilename } from "@/lib/exports/csv";
import { handleExport } from "@/lib/exports/handler";

/** CSV export of all active invited guests (Spec 5.6, 15.12). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;

  return handleExport(request, eventId, "csv", async ({ dataset, includeOrganiserNotes }) => ({
    body: buildRsvpCsv(dataset, { includeOrganiserNotes }),
    contentType: "text/csv; charset=utf-8",
    filename: exportFilename(dataset.event.name, "rsvps", "csv"),
  }));
}
