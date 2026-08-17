# Audit Log

A running record of what has happened on the installation.

> The most recent recorded actions. Sensitive guest content is never written to this log.

## What an entry looks like

Each row shows:

- The **event type**, as a short code such as `guest.added` or `rsvp.submitted`.
- **Who did it** — the organiser's or administrator's name where there is an account behind it, otherwise the actor type. Guests have no account, so guest actions are recorded as coming from a guest, without identifying which one.
- The **entity** affected — its type, and a shortened identifier.
- **When**, to the minute.
- A line of **metadata**, where there is any.

Entries are listed newest first.

## Actor types

| Actor | Meaning |
| --- | --- |
| `organiser` | An organiser acting on their own event |
| `superadmin` | An administrator |
| `guest` | Someone replying to an invitation |
| `system` | The application itself, for example a failed sign-in with no known account |

## Recorded events

**Accounts and sessions**

`organiser.registered` · `login.succeeded` · `login.failed` · `password_reset.requested` · `password_reset.completed` · `organiser_account.disabled` · `organiser_account.enabled`

**Events and menu**

`event.created` · `event.updated` · `menu_course.archived` · `menu_option.archived` · `image.uploaded` · `image.upload_failed`

**Guests and invitations**

`guest.added` · `guest.removed` · `guest.payment_recorded` · `invitation_email.sent` · `invitation_email.failed`

**Replies**

`rsvp.submitted` · `rsvp.updated` · `rsvp.edited_by_organiser`

**Exports and operations**

`export.generated` · `test_email.sent` · `test_email.failed`

## What is never written to it

Sensitive fields are stripped **as records are written**, not filtered when they are displayed. Nothing in the database's audit table has ever contained:

- Dietary requirements
- Guest messages
- Organiser private notes
- Invitation links or tokens

So `rsvp.submitted` records that a guest replied and whether they accepted or declined. It does not record what they chose to eat, what they cannot eat, or what they wrote. `export.generated` records which export was produced, whether private notes were included, and how many guests were in it — never the contents.

This is what makes the log safe for an administrator to read at all, given they are barred from guest data everywhere else.

## Retention

The page shows the most recent entries. Older records remain in the database and are covered by the installation's backup policy; the operator's documentation in the repository covers backup and retention.
