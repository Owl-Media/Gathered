"use client";

import { useState } from "react";

/**
 * Exports (Spec 5.5, 5.6, 9.6, Addendum).
 *
 * Three downloads: the operational RSVP PDF, the CSV, and the keepsake
 * messages PDF.
 *
 * Internal organiser notes are excluded by default and only travel with an
 * export when the organiser deliberately ticks the box (Spec 17 Q4), so an
 * export shared with a helper or the venue does not leak private notes by
 * accident. The keepsake PDF never carries notes at all.
 */
export function ExportPanel({
  eventId,
  guestCount,
  acceptedCount,
  messageCount,
  noteCount,
}: {
  eventId: string;
  guestCount: number;
  acceptedCount: number;
  messageCount: number;
  noteCount: number;
}) {
  const [includeNotes, setIncludeNotes] = useState(false);
  const notesQuery = includeNotes ? "?notes=1" : "";

  return (
    <div className="flex flex-col gap-5">
      <section className="card card-padded">
        <h2 className="text-lg">Planning exports</h2>
        <p className="text-ink-500 mt-1 text-sm">
          Both include all {guestCount} guest{guestCount === 1 ? "" : "s"} currently on your list,
          grouped by reply, with menu choices and dietary requirements. Guests you've removed are
          left out.
        </p>

        {noteCount > 0 && (
          <label className="choice mt-5">
            <input
              type="checkbox"
              checked={includeNotes}
              onChange={(fieldEvent) => setIncludeNotes(fieldEvent.target.checked)}
              className="accent-blush-600 mt-0.5 size-5 shrink-0"
            />
            <span>
              <span className="text-ink-900 block font-medium">
                Include my private notes ({noteCount})
              </span>
              <span className="text-ink-500 block text-sm">
                Off by default, so a shared export never reveals them by accident.
              </span>
            </span>
          </label>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <a
            href={`/events/${eventId}/exports/pdf${notesQuery}`}
            className="btn btn-primary"
            download
          >
            Download PDF
          </a>
          <a
            href={`/events/${eventId}/exports/csv${notesQuery}`}
            className="btn btn-secondary"
            download
          >
            Download CSV
          </a>
        </div>

        <p className="text-ink-400 mt-4 text-xs">
          The CSV has one column per menu course, and opens cleanly in Excel, Numbers and Google
          Sheets.
        </p>
      </section>

      <section className="card card-padded">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg">Keepsake: messages from your guests</h2>
            <p className="text-ink-500 mt-1 max-w-lg text-sm">
              A printable booklet of every message your guests left, designed to be kept rather than
              filed. Only guests who wrote something are included, and no RSVP counts appear.
            </p>
          </div>
          <span className="pill pill-info shrink-0">
            {messageCount} message{messageCount === 1 ? "" : "s"}
          </span>
        </div>

        <div className="mt-5">
          {messageCount === 0 ? (
            <p className="notice notice-info">
              No messages yet. As guests reply and leave a note, they'll appear here.
            </p>
          ) : (
            <a
              href={`/events/${eventId}/exports/messages`}
              className="btn btn-primary"
              download
            >
              Download keepsake PDF
            </a>
          )}
        </div>
      </section>

      {acceptedCount === 0 && guestCount > 0 && (
        <p className="notice notice-info">
          Nobody has accepted yet, but your exports will still list everyone invited, showing them as
          waiting to reply.
        </p>
      )}
    </div>
  );
}
