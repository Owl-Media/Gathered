# Exports

Three downloads: two for planning, one to keep.

![The exports tab, offering a planning PDF and CSV with an opt-in checkbox for private notes, and a separate keepsake PDF of guest messages.](/images/events/exports.png)

## Planning exports

The **PDF** and the **CSV** cover the same ground and are built from the same data, so they can never disagree with each other. Both include every guest currently on your list, grouped by reply, with their menu choices and dietary requirements. Guests you have removed are left out.

Downloads are generated fresh each time you press the button, so they always reflect the replies as they stand right now.

### The planning PDF

Designed to be printed and handed to a caterer or a venue. It contains:

- The **event name**, date, times, venue, address and RSVP deadline.
- The four **counts** — invited, accepted, declined, not responded.
- A **contributions summary**, if the event asks for money: the amount per guest, and how many have paid in full, paid a deposit only, or paid nothing.
- Every guest, **grouped by reply** — accepted first, then declined, then not responded.

For each guest: name, email, response source, the time of their last reply, their menu choices, their dietary requirements, their message, their payment state, and your private note if you opted to include it.

The footer carries the generation timestamp, in the event's timezone.

### The CSV

For spreadsheets. One row per guest, with these columns:

| Column | Notes |
| --- | --- |
| Event name, Event date | Repeated on every row |
| Forename, Surname, Email | |
| RSVP status | Accepted, Declined or Not responded |
| *One column per course* | Headed with the course name |
| Menu choices | All choices combined into one readable cell |
| Dietary requirements | |
| Message | |
| Last response (UTC) | ISO timestamp |
| Response source | Guest submitted / Organiser edited / Not responded |
| Payment, Deposit paid, Paid in full | Only when the event asks for contributions |
| Internal note | Only when you tick the box |

A few details that matter in practice:

- **One column per course** makes a headcount per dish a single spreadsheet formula. Courses you have archived still get a column if any guest chose from them.
- Files open cleanly in **Excel, Numbers and Google Sheets**, with accented names intact.
- Values that a spreadsheet would otherwise try to run as a formula are neutralised, so a guest writing `=SUM(...)` in their message cannot execute anything in your spreadsheet.

## Private notes

If you have written any [private notes](/events/responses#your-private-notes), a checkbox appears:

> **Include my private notes (3)** — Off by default, so a shared export never reveals them by accident.

Tick it and the notes travel with the PDF and CSV you download next. It resets each time you open the tab, so the safe behaviour is the default rather than something you have to remember.

The keepsake PDF never contains private notes, whether the box is ticked or not.

## Keepsake: messages from your guests

A separate download, designed to be kept rather than filed.

> A printable booklet of every message your guests left, designed to be kept rather than filed. Only guests who wrote something are included, and no RSVP counts appear.

It opens with *"With love from everyone"* and the title **Messages from Your Guests**, followed by the event name and date. Each message sits in its own card with the guest's name beneath it, and a guest who sent apologies is marked as such — so a warm note from someone who could not come still belongs in the book.

Guests who left no message are not included. Guests you removed are not included. There are no counts, no dietary requirements, no email addresses and no private notes anywhere in it.

The tab shows a running count of how many messages you have. With none yet, the download is replaced by:

> No messages yet. As guests reply and leave a note, they'll appear here.

## If an export fails

You get a clear error and can simply try again. Files are built completely in memory before any of the download starts, so a failure part-way through can never leave you with a truncated or corrupt file.

Exports are rate limited to 30 in fifteen minutes.

## Who can export

Only the organiser who owns the event. Administrators cannot export, and an attempt to export somebody else's event returns the same "not found" as an event that does not exist.

Every export is recorded in the [audit log](/admin/audit-log) — which export, whether notes were included, and how many guests were in it. The contents are never logged.
