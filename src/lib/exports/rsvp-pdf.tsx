import "server-only";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { formatEventDate, formatExportTimestamp, formatInstant, formatWallTime } from "@/lib/time";
import { groupByStatus, type ExportDataset, type ExportGuest } from "./data";

/**
 * Operational RSVP PDF (Spec 5.5).
 *
 * A working document for planning and printing: every active invited guest,
 * grouped by RSVP status, with their choices, dietary requirements, message,
 * response time and response source.
 *
 * Uses the built-in Helvetica family so no font files need shipping or
 * downloading at render time.
 */

const palette = {
  ink: "#3a2f33",
  inkSoft: "#574a4e",
  inkFaint: "#806f74",
  line: "#e6dcd6",
  blush: "#9e4d57",
  sage: "#4d7053",
  clay: "#9a5140",
  cream: "#fdf8f5",
  butterBg: "#fdf9ed",
  butterLine: "#f3e2ad",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: palette.ink,
    lineHeight: 1.45,
  },

  // lineHeight keeps a descender in the event name clear of the subtitle.
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", lineHeight: 1.25, marginBottom: 2 },
  subtitle: { fontSize: 10, color: palette.inkFaint, marginBottom: 16 },

  factGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: palette.line,
    paddingVertical: 10,
    marginBottom: 16,
  },
  fact: { width: "50%", paddingRight: 12, marginBottom: 6 },
  factLabel: {
    fontSize: 7.5,
    color: palette.inkFaint,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  factValue: { fontSize: 10 },

  countRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  countBox: {
    flex: 1,
    backgroundColor: palette.cream,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 6,
    padding: 8,
  },
  countLabel: { fontSize: 7.5, color: palette.inkFaint },
  countValue: { fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 1 },

  groupHeading: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginTop: 12,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1.5,
    borderColor: palette.line,
  },

  guest: {
    borderBottomWidth: 1,
    borderColor: palette.line,
    paddingVertical: 7,
  },
  guestTopRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  guestName: { fontFamily: "Helvetica-Bold", fontSize: 10.5 },
  guestEmail: { color: palette.inkFaint, fontSize: 8.5 },
  guestMeta: { color: palette.inkFaint, fontSize: 7.5, textAlign: "right" },

  detailLine: { flexDirection: "row", marginTop: 3, gap: 4 },
  detailLabel: { fontSize: 8, color: palette.inkFaint, width: 78 },
  detailValue: { fontSize: 9, flex: 1 },

  dietaryBox: {
    backgroundColor: palette.butterBg,
    borderWidth: 1,
    borderColor: palette.butterLine,
    borderRadius: 4,
    padding: 5,
    marginTop: 4,
  },

  empty: { color: palette.inkFaint, fontStyle: "italic", paddingVertical: 6 },

  footer: {
    position: "absolute",
    bottom: 26,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: palette.inkFaint,
    borderTopWidth: 1,
    borderColor: palette.line,
    paddingTop: 6,
  },
});

const STATUS_COLOUR: Record<string, string> = {
  Accepted: palette.sage,
  Declined: palette.clay,
  "Not responded": palette.inkFaint,
};

export interface RsvpPdfOptions {
  /** Spec 17 Q4.Off unless the organiser explicitly asks for them. */
  includeOrganiserNotes: boolean;
}

function GuestBlock({
  guest,
  timezone,
  includeOrganiserNotes,
}: {
  guest: ExportGuest;
  timezone: string;
  includeOrganiserNotes: boolean;
}) {
  return (
    <View style={styles.guest} wrap={false}>
      <View style={styles.guestTopRow}>
        <View>
          <Text style={styles.guestName}>{guest.fullName}</Text>
          <Text style={styles.guestEmail}>{guest.email}</Text>
        </View>
        <View>
          <Text style={styles.guestMeta}>{guest.responseSource}</Text>
          {guest.lastResponseAt && (
            <Text style={styles.guestMeta}>{formatInstant(guest.lastResponseAt, timezone)}</Text>
          )}
        </View>
      </View>

      {guest.selections.length > 0 && (
        <View style={styles.detailLine}>
          <Text style={styles.detailLabel}>Menu</Text>
          <Text style={styles.detailValue}>
            {guest.selections
              .map((selection) => `${selection.course}: ${selection.option}`)
              .join("   ·   ")}
          </Text>
        </View>
      )}

      {guest.dietaryRequirements && (
        <View style={styles.dietaryBox}>
          <Text style={{ fontSize: 7.5, color: palette.inkFaint, fontFamily: "Helvetica-Bold" }}>
            DIETARY REQUIREMENTS
          </Text>
          <Text style={{ fontSize: 9, marginTop: 1 }}>{guest.dietaryRequirements}</Text>
        </View>
      )}

      {/* Spec Addendum, the operational PDF keeps messages for planning
          reference; the keepsake PDF is the presentation version. */}
      {guest.guestMessage && (
        <View style={styles.detailLine}>
          <Text style={styles.detailLabel}>Message</Text>
          <Text style={styles.detailValue}>{guest.guestMessage}</Text>
        </View>
      )}

      {includeOrganiserNotes && guest.organiserNote && (
        <View style={styles.detailLine}>
          <Text style={styles.detailLabel}>Internal note</Text>
          <Text style={[styles.detailValue, { color: palette.inkSoft }]}>
            {guest.organiserNote}
          </Text>
        </View>
      )}

      {/* Blank unless the event asks guests to contribute. */}
      {guest.paymentLabel && (
        <View style={styles.detailLine}>
          <Text style={styles.detailLabel}>Payment</Text>
          <Text
            style={[
              styles.detailValue,
              {
                color:
                  guest.paidInFullAt !== null
                    ? palette.sage
                    : guest.depositPaidAt !== null
                      ? palette.inkSoft
                      : palette.clay,
              },
            ]}
          >
            {guest.paymentLabel}
          </Text>
        </View>
      )}
    </View>
  );
}

function RsvpDocument({
  dataset,
  options,
}: {
  dataset: ExportDataset;
  options: RsvpPdfOptions;
}) {
  const { event, counts, guests, generatedAt } = dataset;
  const groups = groupByStatus(guests);

  return (
    <Document
      title={`${event.name}: RSVPs`}
      author="Gathered"
      creator="Gathered"
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{event.name}</Text>
        <Text style={styles.subtitle}>RSVP summary for event planning</Text>

        <View style={styles.factGrid}>
          <View style={styles.fact}>
            <Text style={styles.factLabel}>Date</Text>
            <Text style={styles.factValue}>{formatEventDate(event.eventDate)}</Text>
          </View>
          <View style={styles.fact}>
            <Text style={styles.factLabel}>Time</Text>
            <Text style={styles.factValue}>
              {formatWallTime(event.startTime.slice(0, 5))} –{" "}
              {formatWallTime(event.endTime.slice(0, 5))}
            </Text>
          </View>
          <View style={styles.fact}>
            <Text style={styles.factLabel}>Location</Text>
            <Text style={styles.factValue}>{event.locationName}</Text>
            <Text style={[styles.factValue, { fontSize: 8.5, color: palette.inkSoft }]}>
              {event.locationAddress.replace(/\n/g, ", ")}
            </Text>
          </View>
          <View style={styles.fact}>
            <Text style={styles.factLabel}>RSVP deadline</Text>
            <Text style={styles.factValue}>
              {formatInstant(event.rsvpDeadlineAt, event.timezone)}
            </Text>
          </View>
        </View>

        <View style={styles.countRow}>
          <View style={styles.countBox}>
            <Text style={styles.countLabel}>Invited</Text>
            <Text style={styles.countValue}>{counts.invited}</Text>
          </View>
          <View style={styles.countBox}>
            <Text style={styles.countLabel}>Accepted</Text>
            <Text style={[styles.countValue, { color: palette.sage }]}>{counts.accepted}</Text>
          </View>
          <View style={styles.countBox}>
            <Text style={styles.countLabel}>Declined</Text>
            <Text style={[styles.countValue, { color: palette.clay }]}>{counts.declined}</Text>
          </View>
          <View style={styles.countBox}>
            <Text style={styles.countLabel}>Not responded</Text>
            <Text style={styles.countValue}>{counts.notResponded}</Text>
          </View>
        </View>

        {/* Contribution totals, only for events that ask guests for money. */}
        {dataset.payment && (
          <View style={styles.countRow}>
            <View style={styles.countBox}>
              <Text style={styles.countLabel}>
                Per guest
                {dataset.payment.depositLabel
                  ? ` (${dataset.payment.depositLabel} deposit)`
                  : ""}
              </Text>
              <Text style={styles.countValue}>{dataset.payment.totalLabel ?? "—"}</Text>
            </View>
            <View style={styles.countBox}>
              <Text style={styles.countLabel}>Paid in full</Text>
              <Text style={[styles.countValue, { color: palette.sage }]}>
                {dataset.payment.paidInFull}
              </Text>
            </View>
            <View style={styles.countBox}>
              <Text style={styles.countLabel}>Deposit only</Text>
              <Text style={styles.countValue}>{dataset.payment.depositOnly}</Text>
            </View>
            <View style={styles.countBox}>
              <Text style={styles.countLabel}>Nothing paid</Text>
              <Text style={[styles.countValue, { color: palette.clay }]}>
                {dataset.payment.unpaid}
              </Text>
            </View>
          </View>
        )}

        {groups.map((group) => (
          <View key={group.status}>
            <Text style={[styles.groupHeading, { color: STATUS_COLOUR[group.label] }]}>
              {group.label} ({group.guests.length})
            </Text>

            {group.guests.length === 0 ? (
              <Text style={styles.empty}>No guests in this group.</Text>
            ) : (
              group.guests.map((guest) => (
                <GuestBlock
                  key={guest.id}
                  guest={guest}
                  timezone={event.timezone}
                  includeOrganiserNotes={options.includeOrganiserNotes}
                />
              ))
            )}
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text>Generated {formatExportTimestamp(generatedAt, event.timezone)}</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

export function renderRsvpPdf(
  dataset: ExportDataset,
  options: RsvpPdfOptions,
): Promise<Buffer> {
  return renderToBuffer(<RsvpDocument dataset={dataset} options={options} />);
}
