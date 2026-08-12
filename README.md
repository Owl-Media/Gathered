<div align="center">

# Gathered

**A deliberately private RSVP platform for small events.**

Every guest gets their own link. Nobody gets a list of who else was invited.

[![CI](https://github.com/owl-media/gathered/actions/workflows/ci.yml/badge.svg)](https://github.com/owl-media/gathered/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/owl-media/gathered?sort=semver)](https://github.com/owl-media/gathered/releases)
[![Licence: MIT](https://img.shields.io/badge/licence-MIT-blue.svg)](./LICENSE)
[![Container image](https://img.shields.io/badge/ghcr.io-owl--media%2Fgathered-blue?logo=docker&logoColor=white)](https://github.com/owl-media/gathered/pkgs/container/gathered)

[Quick start](#quick-start) ·
[Configuration](#configuration) ·
[How it fits together](#how-it-fits-together) ·
[Deployment](./docs/DEPLOYMENT.md) ·
[Contributing](./CONTRIBUTING.md)

</div>

---

## What it is

An organiser creates an event, adds guests one at a time, and each guest gets
their own private link. Guests confirm their email address, say whether they're
coming, choose from the menu, and can leave a message for the host. The organiser
gets planning exports and a keepsake PDF of the messages.

It is self-hosted, single-tenant-ish, and small on purpose. If you want
ticketing, seating plans, plus-ones or a public attendee list, this is the wrong
project — see [Deliberately not built](#deliberately-not-built).

Built to [`specification/specification.md`](./specification/specification.md),
which remains the source of truth for how it behaves.

### What it does

- **Per-guest private links.** No shared RSVP URL, no guest list leakage. A link
  alone is not enough — the guest must also enter the email address the
  invitation was issued to.
- **Menu selection per course**, with choices snapshotted at the moment the guest
  picks, so renaming an option later doesn't rewrite the exports.
- **A public event page** with the details and nothing else. `noindex`, no
  attendee list, no guest data.
- **Exports** — CSV and an operational PDF for caterers and planning, plus a
  keepsake PDF of the guest messages.
- **Deadlines that respect the event's timezone**, not the server's.
- **A superadmin role that structurally cannot read guest data** — no dietary
  requirements, no messages, no RSVP tokens, and no impersonation.
- **Pluggable email and storage.** Console, SMTP or Resend. Local disk or any
  S3-compatible bucket. Chosen with an environment variable, not a code change.

---

## What it looks like

<div align="center">
  <img src="./docs/screenshots/public-event-page.png" alt="The public event page: a pastel illustrated header, the date, time and venue, the description, and the full menu grouped by course with vegetarian and vegan labels. A note at the bottom reads &quot;Been invited? Open the private link you were sent to reply.&quot;" width="800">
  <p><em>The public event page. Details and menu only — no attendee list, no guest data, <code>noindex</code>.</em></p>
</div>

<div align="center">
  <img src="./docs/screenshots/rsvp-email-gate.png" alt="A card reading &quot;Hello Radia — Please confirm the email address this invitation was sent to, so we know it's you&quot;, with an email field and a Continue button." width="620">
  <p><em>Holding the private link is not enough. The guest must also enter the address the
  invitation was issued to, and the check runs on the server.</em></p>
</div>

<div align="center">
  <img src="./docs/screenshots/rsvp-form.png" alt="The guest RSVP form showing the event details, a yes/no choice, radio buttons for each menu course, an allergies field marked &quot;only the organiser sees this&quot;, and an optional message to the parent-to-be." width="800">
  <p><em>Past the gate: reply, pick a dish from each course, add anything the kitchen needs to
  know, and leave a message.</em></p>
</div>

<div align="center">
  <img src="./docs/screenshots/organiser-responses.png" alt="The organiser's responses tab: counts for invited, accepted, declined and not responded, then a filterable list of guests showing each reply, their menu choices, dietary requirements highlighted in yellow, their message, and the organiser's own private note in blue." width="800">
  <p><em>The organiser's planning view — replies, choices, dietary requirements, messages, and
  private notes only they can see.</em></p>
</div>

<details>
<summary>More screens — dashboard, menu builder, exports</summary>

<div align="center">
  <img src="./docs/screenshots/organiser-dashboard.png" alt="The organiser dashboard listing one event with counts for invited, yes, no and waiting, and buttons to manage, view guests, export, or open the public page." width="800">
  <p><em>Dashboard.</em></p>
  <img src="./docs/screenshots/organiser-menu.png" alt="The menu builder with Starter, Main and Pudding courses, each listing options with dietary labels and controls to reorder, edit or remove them." width="800">
  <p><em>Menu builder. Options a guest has already chosen are archived rather than deleted.</em></p>
  <img src="./docs/screenshots/organiser-exports.png" alt="The exports tab offering a planning PDF and CSV with an opt-in checkbox for private notes, and a separate keepsake PDF of guest messages." width="800">
  <p><em>Exports. Private notes are opt-in, so a shared export never leaks them by accident.</em></p>
</div>

</details>

> [!NOTE]
> Every name, address and message above is fictional, generated by
> [`npm run db:seed-demo`](./scripts/seed-demo.ts). Run it yourself to get the same
> data, then regenerate these images with
> [`scripts/capture-screenshots.mjs`](./scripts/capture-screenshots.mjs).

---

## Quick start

### Try it with Docker

```bash
docker run --rm -p 3000:3000 \
  -e DATABASE_URL=postgres://postgres:postgres@host.docker.internal:5432/gathered \
  -e SESSION_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")" \
  ghcr.io/owl-media/gathered:latest
```

You need a PostgreSQL 17 database reachable at that URL, and migrations applied
once — see [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) for the real version of
this, including persistent storage for uploads.

### Run it locally for development

Requires **Node 24** ([`.nvmrc`](./.nvmrc)), **npm 11+** and **Docker**.

```bash
git clone https://github.com/owl-media/gathered.git
cd gathered
npm install

cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
# paste that into SESSION_SECRET in .env

docker compose -f docker-compose.dev.yml up -d
npm run db:migrate
npm run dev
```

Open <http://localhost:3000> and register at `/register`.

An empty dashboard is a poor introduction, so there is a demo event — the one in
the screenshots above:

```bash
npm run db:seed-demo
```

It prints a login, a public event link, and a private link for each guest. Every
name in it is fictional.

`EMAIL_DRIVER` defaults to `console`, so invitations and password resets are
printed to the terminal rather than sent — **including the private RSVP link**.
That is how you get a guest link for an event you created yourself.

To create a superadmin:

```bash
SUPERADMIN_EMAIL=ops@example.com \
SUPERADMIN_PASSWORD='a long unique passphrase' \
npm run db:seed-superadmin
```

---

## Configuration

Full annotated list in [`.env.example`](./.env.example). The ones that matter:

| Variable | Default | Notes |
| --- | --- | --- |
| `APP_BASE_URL` | `http://localhost:3000` | Absolute, no trailing slash. Used to build public and private links in emails. Must be HTTPS in production. |
| `DATABASE_URL` | local dev database | PostgreSQL connection string. Required in production. |
| `SESSION_SECRET` | insecure dev default | 32+ characters in production. Also seals RSVP tokens — see the note below before rotating it. |
| `DEFAULT_TIMEZONE` | `Europe/London` | IANA zone applied to new events; organisers can override per event. |
| `EMAIL_DRIVER` | `console` | `console`, `smtp` or `resend`. |
| `EMAIL_FROM` | — | Sender for invitations and password resets. |
| `STORAGE_DRIVER` | `local` | `local` or `s3`. Local **must** be a persistent volume in production, or uploads vanish on redeploy. |
| `LOCAL_STORAGE_PATH` | `./storage/uploads` | Used when `STORAGE_DRIVER=local`. |
| `S3_*` | — | Endpoint, bucket and credentials. Works with AWS, MinIO, R2, B2, Hetzner. |

The app validates its configuration once at startup and refuses to boot on a bad
combination, rather than failing at the first request.

> [!WARNING]
> **Rotating `SESSION_SECRET` makes previously issued RSVP links undisplayable
> to the organiser.** Existing links keep working for guests; the organiser just
> can't re-read them from the dashboard. This is the cost of sealing tokens at
> rest. See [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).

---

## Stack

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router, Server Actions) | Single full-stack app, as specified |
| Database | PostgreSQL 17 + Drizzle ORM | SQL-first; migrations are reviewable SQL files |
| Auth | Custom Argon2id + opaque server-side sessions | Disabling an account takes effect on the next request |
| Styling | Tailwind CSS v4 | Pastel design system in `src/app/globals.css` |
| PDFs | `@react-pdf/renderer` | No headless browser in the image |
| Email | Resend / SMTP / console, behind one interface | Provider is an env var, not a code change |
| Storage | S3-compatible or local disk, behind one interface | Same |
| Tests | Vitest, including integration tests against real Postgres | Partial indexes and cascades are actually exercised |

---

## Commands

```bash
npm run dev              # development server
npm run build            # production build
npm run typecheck        # tsc --noEmit
npm test                 # full test suite
npm run test:watch       # watch mode
npm run db:generate      # generate a migration after editing src/db/schema.ts
npm run db:migrate       # apply pending migrations
npm run db:studio        # browse the database
npm run db:seed-demo     # populate a demo event with fictional guests
```

Integration tests need a database, created once:

```bash
docker compose -f docker-compose.dev.yml up -d
docker exec gathered-postgres-dev psql -U postgres -c "CREATE DATABASE gathered_test"
DATABASE_URL=postgres://postgres:postgres@localhost:5432/gathered_test npm run db:migrate
npm test
```

Test files run serially because they share that database. The reasoning is in
[`vitest.config.ts`](./vitest.config.ts).

---

## How it fits together

```
src/
  app/
    (auth)/          register, login, password reset
    (organiser)/     dashboard and event management (six tabbed sections)
    (superadmin)/    organiser accounts, platform event summaries, audit log
    e/[slug]/        public event page, event details only, noindex
    rsvp/[token]/    private guest RSVP page, email gate then the form
    uploads/         serves uploaded images with a locked-down CSP
  components/        shared UI, placeholder artwork, the RSVP form
  db/                Drizzle schema and migration runner
  lib/
    auth/            sessions and route guards
    crypto/          password hashing, token generation, token encryption
    data/            queries; ownership is enforced in the WHERE clause
    email/           mailer interface + three drivers
    exports/         shared dataset, CSV, operational PDF, keepsake PDF
    storage/         storage interface + two drivers
    rsvp.ts          the RSVP rules, shared by guests and organisers
```

### The parts worth knowing about

**Ownership is a query condition, not an afterthought.** `getEventForOrganiser`
and friends take the organiser id and put it in the `WHERE` clause, so there is
no code path that fetches an event and *then* decides whether you were allowed
to. "Not found" and "not yours" return the same error, so responses can't be
used to probe which ids exist.

**Guests need two things, not one.** A private link alone cannot submit an RSVP.
The guest must also enter the email address the invitation was issued to, and
that check runs on the server. The mismatch message never reveals the correct
address, and never confirms whether the token itself was valid.

**RSVP tokens are stored twice.** A SHA-256 lookup hash resolves incoming links;
an AES-256-GCM sealed copy lets the organiser re-display the link later. A
leaked database yields no usable invitations. The cost is the `SESSION_SECRET`
rotation trade-off noted above.

**Menu choices are snapshotted.** Each selection stores the course and option
names as they were when the guest chose. Rename or archive an option afterwards
and the exports still show what was actually picked. Anything a guest has chosen
is archived rather than deleted.

**Times belong to the event, not the server.** Each event carries an IANA
timezone. Wall-clock values are stored as typed; the RSVP deadline is stored as
an exact instant derived from them, so "has the deadline passed?" never depends
on server configuration.

**Superadmins are structurally limited.** Their queries select explicit column
lists that exclude dietary requirements, guest messages and RSVP tokens, and
audit metadata is scrubbed at write time. There is no impersonation code path
because none was written.

---

## Documentation

| Document | For |
| --- | --- |
| [`specification/specification.md`](./specification/specification.md) | The source of truth for behaviour |
| [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) | Running it in production |
| [`docs/BACKUP_RESTORE.md`](./docs/BACKUP_RESTORE.md) | Backups, and proving they restore |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Setup, conventions, PR and release process |
| [`SECURITY.md`](./SECURITY.md) | Reporting a vulnerability |
| [`AGENTS.md`](./AGENTS.md) | Working on this codebase with an AI coding agent |

---

## Contributing

Contributions are welcome. Start with [`CONTRIBUTING.md`](./CONTRIBUTING.md) —
it covers the test database setup, the conventional-commit convention that
drives releases, and the handful of invariants a change must not break.

Found a security issue? Do not open an issue. Follow
[`SECURITY.md`](./SECURITY.md).

---

## Approved deviations from the specification

**Contribution tracking.** Spec 16 lists paid events as a non-goal and Spec 19
forbids adding payment features without approval. Recording contributions was
subsequently requested and approved.

What it does: an event may carry an optional deposit and full amount, and the
organiser can tick each guest off as their money arrives. What it deliberately
does not do: take payments. No card details, no payment provider, no money
moves through the platform. It is a ledger for cash and bank transfers handled
elsewhere.

- Amounts are integer minor units (pence), never floats.
- The full amount is inclusive of the deposit, so the balance is the difference.
- Marking a guest paid in full also settles their deposit.
- Payment columns appear in the CSV and operational PDF, never in the keepsake.
- Guests cannot mark themselves paid, and superadmins cannot see payment data.
- Leaving both amounts blank hides the feature everywhere.

The two ideas are kept apart, because they have different audiences:

| | What it is | Where it appears |
| --- | --- | --- |
| **Cost to attend** (`EventCost`) | A property of the event, like the date or venue. Mentions no guest. | Public event page **and** the private RSVP page |
| **Your payment** (`GuestPaymentStatus`) | What one guest owes and has paid. | Private RSVP page only, after email verification |

Both pages take their figures from the same component, so the price shown to a
guest can never drift from the price shown publicly. Note the consequence:
anyone holding the public link can see what the event costs.

---

## Deliberately not built

Per specification section 16, and not to be added without a decision recorded in
an issue: multiple organisers per event, group invitations, plus-ones,
ticketing, seating plans, QR check-in, calendar sync, SMS/WhatsApp invites,
reminder emails, guest RSVP confirmation emails, guest accounts, public attendee
lists, a public event directory, analytics, superadmin impersonation, superadmin
editing of guest RSVP data, native apps, address autocomplete, and map
integration.

Most of these are absent because they either leak the guest list, require guests
to have accounts, or turn a small tool into a product. If you want one of them,
open an issue and make the argument — the answer isn't automatically no, but it
isn't automatically yes either.

---

## Licence

[MIT](./LICENSE) © Owl Media
