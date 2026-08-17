# Changelog

## [0.2.0](https://github.com/Owl-Media/Gathered/compare/v0.1.0...v0.2.0) (2026-08-17)


### Features

* **legal:** add privacy notice, terms and dietary data consent ([a172853](https://github.com/Owl-Media/Gathered/commit/a172853ca7e8fe502b326d017569f1a0b3282c41))
* **legal:** add privacy notice, terms and dietary data consent ([aa0f05a](https://github.com/Owl-Media/Gathered/commit/aa0f05a2361c73eb6b2b57bc605063cc5d4df9c7))

## [0.1.0](https://github.com/Owl-Media/Gathered/releases/tag/v0.1.0) (2026-08-12)

The first release. Gathered is a self-hosted RSVP platform for small events,
built to [`specification/specification.md`](./specification/specification.md),
which remains the source of truth for how it behaves.

### Features

* **Per-guest private links.** Every guest gets their own link. There is no
  shared RSVP URL and no way to enumerate the guest list. A link on its own is
  not enough — the guest must also enter the email address the invitation was
  issued to, and that check runs on the server.
* **Menu selection per course**, snapshotted at the moment the guest chooses, so
  renaming or archiving an option afterwards does not rewrite what the exports
  say was picked.
* **A public event page** carrying the details and menu only — `noindex`, no
  attendee list, no guest data.
* **Exports.** CSV and an operational PDF for planning and caterers, plus a
  keepsake PDF of the guest messages. Private organiser notes are opt-in, so a
  shared export cannot leak them by accident.
* **Deadlines in the event's timezone.** Each event carries an IANA zone and the
  RSVP deadline is stored as an exact instant derived from it, so whether the
  deadline has passed never depends on server configuration.
* **Contribution tracking.** An optional deposit and full amount per event, with
  the organiser marking guests off as money arrives. No payments are taken, no
  card details are handled, and no money moves through the platform.
* **A superadmin role that structurally cannot read guest data** — no dietary
  requirements, no messages, no RSVP tokens, and no impersonation path.
* **Pluggable email and storage.** Console, SMTP or Resend; local disk or any
  S3-compatible bucket. Selected with an environment variable rather than a code
  change.

### Security

* RSVP tokens are stored twice: a SHA-256 lookup hash resolves incoming links,
  and an AES-256-GCM sealed copy lets the organiser re-display a link later. A
  leaked database yields no usable invitations.
* Organiser ownership is enforced in the `WHERE` clause of every query, so no
  code path fetches a record and then decides whether you were allowed it. "Not
  found" and "not yours" are indistinguishable, and cannot be used to probe
  which ids exist.
* Passwords are hashed with Argon2id and sessions are opaque and server-side, so
  disabling an account takes effect on the next request.
* Configuration is validated once at startup and the app refuses to boot on a
  bad combination, rather than failing at the first request.

### Deployment

* Multi-architecture images (`linux/amd64`, `linux/arm64`) published to
  `ghcr.io/owl-media/gathered`, with a signed build provenance attestation.
* Requires PostgreSQL 17 and Node 24. See
  [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) for the full deployment guide and
  [`docs/BACKUP_RESTORE.md`](./docs/BACKUP_RESTORE.md) for backups.

> [!WARNING]
> Rotating `SESSION_SECRET` makes previously issued RSVP links undisplayable to
> the organiser. Existing links keep working for guests; the organiser simply
> cannot re-read them from the dashboard. This is the cost of sealing tokens at
> rest.
