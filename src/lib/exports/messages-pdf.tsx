import "server-only";
import {
  Document,
  Page,
  StyleSheet,
  Svg,
  Path,
  Circle,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { formatEventDate, formatExportTimestamp } from "@/lib/time";
import { guestsWithMessages, type ExportDataset } from "./data";

/**
 * Keepsake messages PDF (Spec Addendum).
 *
 * Deliberately not a data table: this is meant to be printed, kept, or tucked
 * into a memory book. Card-style message blocks, generous spacing, a serif
 * face for warmth, and soft decorative motifs.
 *
 * Only guests who actually left a message appear. Removed guests are already
 * excluded upstream by the shared export dataset. No RSVP counts appear here
 * (Addendum."No operational RSVP counts unless explicitly requested").
 */

const palette = {
  ink: "#3a2f33",
  inkSoft: "#574a4e",
  inkFaint: "#8b7a7e",
  blush: "#9e4d57",
  blushSoft: "#f5cdd1",
  blushPale: "#fdf2f3",
  cream: "#fdf8f5",
  line: "#f0e2da",
  sage: "#a3c6a8",
  butter: "#f3e2ad",
  sky: "#c2d9e8",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 52,
    paddingBottom: 60,
    paddingHorizontal: 54,
    fontFamily: "Times-Roman",
    fontSize: 11,
    color: palette.ink,
    lineHeight: 1.6,
    backgroundColor: palette.cream,
  },

  coverWrap: { alignItems: "center", marginBottom: 30 },
  eyebrow: {
    fontFamily: "Helvetica",
    fontSize: 8,
    letterSpacing: 2.2,
    color: palette.blush,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  title: {
    fontFamily: "Times-Bold",
    fontSize: 27,
    textAlign: "center",
    marginBottom: 8,
    color: palette.ink,
  },
  eventName: {
    fontFamily: "Times-Italic",
    fontSize: 15,
    textAlign: "center",
    color: palette.blush,
  },
  eventDate: {
    fontFamily: "Helvetica",
    fontSize: 9.5,
    textAlign: "center",
    color: palette.inkFaint,
    marginTop: 6,
  },

  card: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 22,
    marginBottom: 16,
  },
  /**
   * Decorative opening quote. It sits on its own line with a tight line height
   *.Pulling it down over the text with a negative margin overlapped the first
   * word of every message.
   */
  quoteMark: {
    fontFamily: "Times-Bold",
    fontSize: 26,
    lineHeight: 0.9,
    color: palette.blushSoft,
    marginBottom: 2,
  },
  message: {
    fontSize: 11.5,
    lineHeight: 1.7,
    color: palette.inkSoft,
  },
  attribution: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12,
  },
  rule: { height: 1, width: 26, backgroundColor: palette.blushSoft },
  guestName: {
    fontFamily: "Times-Italic",
    fontSize: 11.5,
    color: palette.blush,
  },
  statusNote: {
    fontFamily: "Helvetica",
    fontSize: 7.5,
    color: palette.inkFaint,
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyText: {
    fontFamily: "Times-Italic",
    fontSize: 12,
    color: palette.inkFaint,
    textAlign: "center",
  },

  footer: {
    position: "absolute",
    bottom: 30,
    left: 54,
    right: 54,
    textAlign: "center",
    fontFamily: "Helvetica",
    fontSize: 7.5,
    color: palette.inkFaint,
  },
});

/** Soft botanical flourish used under the title and at the very end. */
function Flourish({ width = 150 }: { width?: number }) {
  return (
    <Svg width={width} height={22} viewBox="0 0 150 22">
      <Path
        d="M8 11 H58"
        stroke={palette.blushSoft}
        strokeWidth={1}
        strokeLinecap="round"
      />
      <Path
        d="M92 11 H142"
        stroke={palette.blushSoft}
        strokeWidth={1}
        strokeLinecap="round"
      />
      <Path
        d="M75 4 C70 8, 66 11, 63 11 C66 11, 70 14, 75 18 C80 14, 84 11, 87 11 C84 11, 80 8, 75 4 Z"
        fill={palette.blush}
      />
      <Circle cx={63} cy={11} r={1.6} fill={palette.sage} />
      <Circle cx={87} cy={11} r={1.6} fill={palette.sky} />
      <Circle cx={52} cy={11} r={1.3} fill={palette.butter} />
      <Circle cx={98} cy={11} r={1.3} fill={palette.butter} />
    </Svg>
  );
}

function MessagesDocument({ dataset }: { dataset: ExportDataset }) {
  const { event, generatedAt } = dataset;
  const messages = guestsWithMessages(dataset.guests);

  return (
    <Document
      title={`${event.name}: Messages from your guests`}
      author="Gathered"
      creator="Gathered"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.coverWrap}>
          <Text style={styles.eyebrow}>With love from everyone</Text>
          <Text style={styles.title}>Messages from Your Guests</Text>
          <Flourish />
          <Text style={styles.eventName}>{event.name}</Text>
          <Text style={styles.eventDate}>{formatEventDate(event.eventDate)}</Text>
        </View>

        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No messages have been left yet.{"\n"}They'll appear here as your guests reply.
            </Text>
          </View>
        ) : (
          messages.map((guest) => (
            // `wrap={false}` keeps each message whole rather than splitting a
            // card across a page break.
            <View key={guest.id} style={styles.card} wrap={false}>
              <Text style={styles.quoteMark}>&ldquo;</Text>
              <Text style={styles.message}>{guest.guestMessage}</Text>

              <View style={styles.attribution}>
                {/* Spec Addendum.RSVP status per message, "if useful". */}
                {guest.status === "declined" && (
                  <Text style={styles.statusNote}>sent their apologies</Text>
                )}
                <View style={styles.rule} />
                <Text style={styles.guestName}>{guest.fullName}</Text>
              </View>
            </View>
          ))
        )}

        {messages.length > 0 && (
          <View style={{ alignItems: "center", marginTop: 10 }}>
            <Flourish width={110} />
          </View>
        )}

        <Text style={styles.footer} fixed>
          {messages.length > 0
            ? `${messages.length} ${messages.length === 1 ? "message" : "messages"} · `
            : ""}
          Created {formatExportTimestamp(generatedAt, event.timezone)}
        </Text>
      </Page>
    </Document>
  );
}

export function renderMessagesPdf(dataset: ExportDataset): Promise<Buffer> {
  return renderToBuffer(<MessagesDocument dataset={dataset} />);
}
