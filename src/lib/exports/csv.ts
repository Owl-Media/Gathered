import type { ExportDataset } from "./data";

/**
 * CSV export (Spec 5.6).
 *
 * Two separate escaping concerns are handled here:
 *
 *  1. *CSV syntax*.Quoting fields that contain a comma, quote or newline, and
 *     doubling embedded quotes, so the file parses correctly (Spec 5.6).
 *
 *  2. *Formula injection*, a value starting with `=`, `+`, `-`, `@`, tab or
 *     carriage return is executed as a formula by Excel, Google Sheets and
 *     LibreOffice when the file is opened. Since guests supply free text
 *     (dietary requirements, messages), a crafted entry could otherwise run in
 *     the organiser's spreadsheet. Such values are prefixed with an apostrophe,
 *     which those tools treat as "this is text".
 */

/** Characters that make a spreadsheet treat a cell as a formula. */
const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

/**
 * UTF-8 byte order mark (U+FEFF). Written via `fromCharCode` rather than as a
 * literal because the character is invisible in an editor and trivially lost.
 * Without it, Excel on Windows renders accented names as mojibake.
 */
const UTF8_BOM = String.fromCharCode(0xfeff);

function escapeCell(value: string): string {
  let cell = value;

  if (cell.length > 0 && FORMULA_PREFIXES.some((prefix) => cell.startsWith(prefix))) {
    cell = `'${cell}`;
  }

  if (/[",\n\r]/.test(cell)) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

function toRow(cells: string[]): string {
  return cells.map(escapeCell).join(",");
}

export interface CsvOptions {
  /**
   * Spec 17 Q4.Internal organiser notes stay out of exports by default and
   * are only included when the organiser explicitly opts in.
   */
  includeOrganiserNotes: boolean;
}

export function buildRsvpCsv(dataset: ExportDataset, options: CsvOptions): string {
  const { event, guests, courseColumns } = dataset;

  /**
   * Two courses could share a name (or an archived course could share a name
   * with its replacement), which would produce duplicate headers. Disambiguate
   * so every column heading is distinct.
   */
  const seenNames = new Map<string, number>();
  const courseHeaders = courseColumns.map((course) => {
    const base = course.archived ? `${course.name} (archived)` : course.name;
    const seen = seenNames.get(base) ?? 0;
    seenNames.set(base, seen + 1);
    return seen === 0 ? base : `${base} ${seen + 1}`;
  });

  const header = [
    "Event name",
    "Event date",
    "Forename",
    "Surname",
    "Email",
    "RSVP status",
    ...courseHeaders,
    "Menu choices",
    "Dietary requirements",
    "Message",
    "Last response (UTC)",
    "Response source",
    // Present only when the event asks guests to contribute.
    ...(dataset.payment ? ["Payment", "Deposit paid (UTC)", "Paid in full (UTC)"] : []),
    ...(options.includeOrganiserNotes ? ["Internal note"] : []),
  ];

  const rows = guests.map((guest) =>
    toRow([
      event.name,
      event.eventDate,
      guest.forename,
      guest.surname,
      guest.email,
      guest.statusLabel,
      // One column per course (Spec 5.6 recommended MVP decision).
      ...courseColumns.map((course) => guest.selectionByCourse[course.id] ?? ""),
      // A combined column as well, which stays readable when courses change.
      guest.selections.map((selection) => `${selection.course}: ${selection.option}`).join("; "),
      guest.dietaryRequirements,
      guest.guestMessage,
      guest.lastResponseLabel,
      guest.responseSource,
      ...(dataset.payment
        ? [
            guest.paymentLabel,
            guest.depositPaidAt?.toISOString() ?? "",
            guest.paidInFullAt?.toISOString() ?? "",
          ]
        : []),
      ...(options.includeOrganiserNotes ? [guest.organiserNote] : []),
    ]),
  );

  // CRLF line endings and a leading BOM, for maximum spreadsheet compatibility
  // (Spec 5.6, "compatible with common spreadsheet tools").
  return `${UTF8_BOM}${[toRow(header), ...rows].join("\r\n")}\r\n`;
}

/** Filename-safe slug for the download, e.g. "amelias-baby-shower-rsvps.csv". */
export function exportFilename(eventName: string, suffix: string, extension: string): string {
  const base =
    eventName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "event";
  return `${base}-${suffix}.${extension}`;
}
