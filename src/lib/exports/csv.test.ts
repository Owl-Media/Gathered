import { describe, expect, it } from "vitest";
import { buildRsvpCsv, exportFilename } from "./csv";
import type { ExportDataset, ExportGuest } from "./data";
import type { Event } from "@/db/schema";

/**
 * CSV export tests (Spec 5.6, 15.12).
 */

const event = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Amelia's Baby Shower",
  eventDate: "2026-03-14",
  startTime: "14:00:00",
  endTime: "17:00:00",
  timezone: "Europe/London",
  locationName: "The Garden Room",
  locationAddress: "12 Rose Lane\nBath",
  rsvpDeadlineAt: new Date("2026-03-01T23:59:00Z"),
} as unknown as Event;

function guest(overrides: Partial<ExportGuest> = {}): ExportGuest {
  return {
    id: "guest-1",
    forename: "Ada",
    surname: "Lovelace",
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    status: "accepted",
    statusLabel: "Accepted",
    responseSource: "Guest submitted",
    lastResponseAt: new Date("2026-02-01T10:00:00Z"),
    lastResponseLabel: "2026-02-01T10:00:00.000Z",
    dietaryRequirements: "",
    guestMessage: "",
    organiserNote: "",
    paymentLabel: "",
    depositPaidAt: null,
    paidInFullAt: null,
    selections: [],
    selectionByCourse: {},
    ...overrides,
  };
}

function dataset(
  guests: ExportGuest[],
  courseColumns: ExportDataset["courseColumns"] = [],
  payment: ExportDataset["payment"] = null,
) {
  return {
    event,
    counts: { invited: guests.length, accepted: 0, declined: 0, notResponded: 0 },
    guests,
    courseColumns,
    payment,
    generatedAt: new Date("2026-02-10T09:00:00Z"),
  } satisfies ExportDataset;
}

/** Contribution totals for an event that asks guests for money. */
const paymentTotals: ExportDataset["payment"] = {
  depositLabel: "£10",
  totalLabel: "£40",
  paidInFull: 1,
  depositOnly: 0,
  unpaid: 0,
};

function rows(csv: string): string[] {
  // Strip the BOM, then split on CRLF.
  return csv.replace(String.fromCharCode(0xfeff), "").trimEnd().split("\r\n");
}

describe("CSV escaping", () => {
  it("quotes fields containing commas and doubles embedded quotes", () => {
    const csv = buildRsvpCsv(
      dataset([guest({ guestMessage: 'She said "hello", warmly' })]),
      { includeOrganiserNotes: false },
    );

    expect(csv).toContain('"She said ""hello"", warmly"');
  });

  it("quotes fields containing newlines so the row does not break", () => {
    const csv = buildRsvpCsv(
      dataset([guest({ dietaryRequirements: "No nuts\nNo shellfish" })]),
      { includeOrganiserNotes: false },
    );

    expect(csv).toContain('"No nuts\nNo shellfish"');
    // Header + exactly one data row, despite the embedded newline.
    expect(rows(csv).filter((row) => row.startsWith("Amelia"))).toHaveLength(1);
  });
});

describe("CSV formula injection", () => {
  // Guests supply free text, which lands in a file the organiser opens in
  // Excel or Sheets. A leading =, +, - or @ would otherwise execute.
  it.each([
    ["=1+1", "'=1+1"],
    ["+1234567", "'+1234567"],
    ["-1+1", "'-1+1"],
    ["@SUM(A1)", "'@SUM(A1)"],
    ['=HYPERLINK("http://evil.test","clickme")', "'=HYPERLINK"],
  ])("neutralises %s", (input, expectedPrefix) => {
    const csv = buildRsvpCsv(dataset([guest({ guestMessage: input })]), {
      includeOrganiserNotes: false,
    });

    expect(csv).toContain(expectedPrefix);
  });

  it("leaves ordinary text untouched", () => {
    const csv = buildRsvpCsv(dataset([guest({ guestMessage: "Congratulations!" })]), {
      includeOrganiserNotes: false,
    });

    expect(csv).toContain("Congratulations!");
    expect(csv).not.toContain("'Congratulations!");
  });
});

describe("CSV columns", () => {
  it("writes one column per menu course, headed by the course name", () => {
    const courses = [
      { id: "course-main", name: "Main", archived: false },
      { id: "course-pud", name: "Dessert", archived: false },
    ];

    const csv = buildRsvpCsv(
      dataset(
        [
          guest({
            selections: [
              { courseId: "course-main", course: "Main", option: "Roast chicken" },
              { courseId: "course-pud", course: "Dessert", option: "Lemon tart" },
            ],
            selectionByCourse: {
              "course-main": "Roast chicken",
              "course-pud": "Lemon tart",
            },
          }),
        ],
        courses,
      ),
      { includeOrganiserNotes: false },
    );

    const [header, row] = rows(csv) as [string, string];
    expect(header).toContain("Main");
    expect(header).toContain("Dessert");
    expect(row).toContain("Roast chicken");
    expect(row).toContain("Lemon tart");
  });

  it("marks archived course columns and keeps their historical selections", () => {
    const csv = buildRsvpCsv(
      dataset(
        [
          guest({
            selections: [{ courseId: "course-old", course: "Canapés", option: "Blini" }],
            selectionByCourse: { "course-old": "Blini" },
          }),
        ],
        [{ id: "course-old", name: "Canapés", archived: true }],
      ),
      { includeOrganiserNotes: false },
    );

    expect(csv).toContain("Canapés (archived)");
    expect(csv).toContain("Blini");
  });

  it("disambiguates duplicate course names so headers stay unique", () => {
    const csv = buildRsvpCsv(
      dataset(
        [guest()],
        [
          { id: "a", name: "Main", archived: false },
          { id: "b", name: "Main", archived: false },
        ],
      ),
      { includeOrganiserNotes: false },
    );

    const header = rows(csv)[0] as string;
    expect(header).toContain("Main");
    expect(header).toContain("Main 2");
  });

  it("omits menu columns entirely when the event has no courses", () => {
    const csv = buildRsvpCsv(dataset([guest()]), { includeOrganiserNotes: false });
    const header = rows(csv)[0] as string;

    // The combined "Menu choices" column remains; no per-course columns exist.
    expect(header.split(",").filter((cell) => cell === "Menu choices")).toHaveLength(1);
  });
});

describe("internal organiser notes (Spec 17 Q4)", () => {
  const withNote = [guest({ organiserNote: "Sat with the grandparents" })];

  it("are excluded by default", () => {
    const csv = buildRsvpCsv(dataset(withNote), { includeOrganiserNotes: false });
    expect(csv).not.toContain("Internal note");
    expect(csv).not.toContain("Sat with the grandparents");
  });

  it("are included only when explicitly requested", () => {
    const csv = buildRsvpCsv(dataset(withNote), { includeOrganiserNotes: true });
    expect(csv).toContain("Internal note");
    expect(csv).toContain("Sat with the grandparents");
  });
});

describe("payment columns", () => {
  it("are omitted entirely when the event asks guests for nothing", () => {
    const csv = buildRsvpCsv(dataset([guest()]), { includeOrganiserNotes: false });
    const header = rows(csv)[0] as string;

    expect(header).not.toContain("Payment");
    expect(header).not.toContain("Deposit paid");
  });

  it("appear when the event has contribution amounts", () => {
    const csv = buildRsvpCsv(
      dataset(
        [
          guest({
            paymentLabel: "Paid in full",
            depositPaidAt: new Date("2026-02-02T09:00:00Z"),
            paidInFullAt: new Date("2026-02-09T17:30:00Z"),
          }),
        ],
        [],
        paymentTotals,
      ),
      { includeOrganiserNotes: false },
    );

    const [header, row] = rows(csv) as [string, string];
    expect(header).toContain("Payment");
    expect(header).toContain("Deposit paid (UTC)");
    expect(header).toContain("Paid in full (UTC)");
    expect(row).toContain("Paid in full");
    expect(row).toContain("2026-02-09T17:30:00.000Z");
  });

  it("leaves the payment dates blank for a guest who has not paid", () => {
    const csv = buildRsvpCsv(
      dataset([guest({ paymentLabel: "Not paid" })], [], paymentTotals),
      { includeOrganiserNotes: false },
    );

    const row = rows(csv)[1] as string;
    expect(row).toContain("Not paid");
    // Trailing empty cells for the two date columns.
    expect(row.endsWith(",,")).toBe(true);
  });
});

describe("spreadsheet compatibility", () => {
  it("starts with a UTF-8 BOM and uses CRLF line endings", () => {
    const csv = buildRsvpCsv(dataset([guest({ forename: "Renée" })]), {
      includeOrganiserNotes: false,
    });

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("\r\n");
    expect(csv).toContain("Renée");
  });
});

describe("exportFilename", () => {
  it("builds a safe filename from the event name", () => {
    expect(exportFilename("Amelia's Baby Shower", "rsvps", "csv")).toBe(
      "amelia-s-baby-shower-rsvps.csv",
    );
  });

  it("falls back when the name has no usable characters", () => {
    expect(exportFilename("🎉🎈", "messages", "pdf")).toBe("event-messages.pdf");
  });
});
