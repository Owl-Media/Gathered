# AGENTS.md

Instructions for AI coding agents working on Gathered. This is the canonical
brief — [`CLAUDE.md`](./CLAUDE.md) and any other tool-specific file defer to it.

Human contributors should read [`CONTRIBUTING.md`](./CONTRIBUTING.md) instead;
this file is the same material, compressed and made explicit for agents.

---

## What this project is

A self-hosted RSVP platform for small private events. An organiser creates an
event and adds guests individually; each guest gets a private link, confirms
their email address, answers, picks from the menu, and can leave a message. The
organiser gets CSV/PDF exports.

**The behaviour is specified.** `specification/specification.md` (~50KB) defines
what the app does. The code implements it. Sections are referenced throughout
the codebase as "Spec 8.2", "Spec 12.4" and so on — those references are real
and worth following.

**Do not change specified behaviour without saying so.** If a task requires
behaviour the specification does not describe, or contradicts, stop and say so
in your response rather than quietly implementing your interpretation.

---

## Commands

```bash
npm run dev              # dev server on :3000
npm run build            # production build
npm run typecheck        # tsc --noEmit  — run this
npm test                 # vitest run    — run this
npm run test:watch
npm run db:generate      # generate a migration after editing src/db/schema.ts
npm run db:migrate       # apply pending migrations
npm run db:studio
npm run db:seed-superadmin
npm run db:seed-demo     # demo organiser, event, menu, guests and replies
```

`db:seed-demo` is the fastest way to get a populated app to look at, and it is
the dataset the README screenshots come from. It prints the demo login and every
private guest link. All of its data is fictional, and it must stay that way —
its output is published.

**Before claiming a change is done, run `npm run typecheck` and `npm test`.**
Both are fast. `npm run build` is worth running for changes to routes, layouts
or anything touching Server Component boundaries.

There is **no lint script**. `next lint` was removed in Next.js 16 and has not
been replaced. Do not add a `lint` invocation to instructions or CI expecting it
to work. Match the style of the file you are editing.

### Test database

Integration tests need a real PostgreSQL. If `npm test` fails with connection
errors, this has not been set up:

```bash
docker compose -f docker-compose.dev.yml up -d
docker exec gathered-postgres-dev psql -U postgres -c "CREATE DATABASE gathered_test"
DATABASE_URL=postgres://postgres:postgres@localhost:5432/gathered_test npm run db:migrate
```

Test files run serially (`fileParallelism: false`) because they share that
database and truncate between tests. Do not "fix" that by enabling parallelism.

---

## Layout

```
specification/specification.md   the source of truth for behaviour
src/
  app/
    (auth)/          register, login, forgot/reset password
    (organiser)/     dashboard, event management (six tabbed sections)
    (superadmin)/    organiser accounts, event summaries, audit log
    e/[slug]/        public event page — details only, noindex
    rsvp/[token]/    private guest RSVP page — email gate, then the form
    uploads/         serves uploaded images under a locked-down CSP
    api/health/      liveness probe; deliberately does not touch the database
  components/        shared UI; components/ui/ is the primitive layer
  db/                schema.ts, index.ts (client), migrate.ts (runner)
  lib/
    auth/            guards.ts (requireOrganiser, requireSuperadmin), session.ts
    crypto/          password.ts (Argon2id), tokens.ts (generate/hash),
                     token-cipher.ts (AES-256-GCM seal/open)
    data/            all queries — events, guests, menu, uploads, superadmin
    email/           mailer interface + console/smtp/resend drivers
    exports/         shared dataset, CSV, operational PDF, keepsake PDF
    storage/         storage interface + local/s3 drivers
    env.ts           Zod-parsed environment, validated once at startup
    forms.ts         ActionState, failure/success helpers for Server Actions
    rsvp.ts          the RSVP rules, shared by guests and organisers
    time.ts          wall-clock ↔ instant conversion in the event's timezone
    audit.ts         recordAudit + the AUDIT_EVENT catalogue
    rate-limit.ts    RATE_LIMITS + consumeRateLimit
drizzle/             generated SQL migrations — committed, reviewable
docs/                DEPLOYMENT.md, BACKUP_RESTORE.md
test/helpers/db.ts   integration fixtures (createOrganiser, createEvent, ...)
```

Import from `src/` with the `@/` alias.

---

## Invariants

These are the things the specification actually guarantees. **Breaking one is a
security bug, not a style disagreement.** If a task appears to require breaking
one, say so instead of doing it.

### 1. Ownership lives in the `WHERE` clause

Every query in `src/lib/data/` that returns organiser-scoped data takes the
organiser id and filters on it in SQL. There is no fetch-then-check pattern
anywhere, and adding one is a regression.

```ts
// Correct — the database enforces it
export async function getEventForOrganiser(eventId: string, organiserId: string) { ... }

// Wrong — never write this
const event = await getEvent(eventId);
if (event.organiserId !== user.id) throw new AuthorisationError();
```

"Not found" and "not yours" must be indistinguishable, so responses cannot be
used to probe which ids exist. `requireEventForOrganiser` throws the same
`AuthorisationError` either way.

### 2. A private link is not authentication

`/rsvp/[token]` requires the token **and** the email address the invitation was
issued to, checked server-side (`src/lib/rsvp-access.ts`). The failure message
must not reveal the correct address and must not confirm whether the token was
valid. Do not add a "resend my link" flow that takes an email and emails a link
— that turns the app into a guest-list oracle.

### 3. RSVP tokens are never plaintext at rest

`src/lib/crypto/tokens.ts` and `token-cipher.ts`. Stored twice: a SHA-256
lookup hash to resolve incoming links, and an AES-256-GCM sealed copy so the
organiser can re-display the link. Never log a token, never put one in an
export, never add a column that stores one raw.

### 4. Superadmins cannot read guest data — by construction

`src/lib/data/superadmin.ts` selects **explicit column lists** that exclude
dietary requirements, guest messages and RSVP tokens. Audit metadata is scrubbed
at write time (`scrubMetadata` in `src/lib/audit.ts`). A `select *` here is a
privacy bug. There is no impersonation code path; do not add one.

### 5. Menu choices are snapshotted

Each selection stores the course and option names as they were when the guest
chose. Renaming or archiving an option later must not change historical exports.
Anything a guest has chosen is **archived, never deleted**.

### 6. Time belongs to the event

Each event carries an IANA timezone. Wall-clock values are stored as typed; the
RSVP deadline is stored as an exact instant derived from them. Never use
`new Date()` in the server's local zone to decide whether a deadline passed. Use
`wallClockToInstant` and the rest of `src/lib/time.ts`.

### 7. Errors do not leak existence

A wrong guest email, an unknown token, a removed guest and another organiser's
event id all produce the same class of response. See `src/app/rsvp/[token]/` and
specification sections 9.1–9.3.

---

## Conventions

- **TypeScript, strict.** Avoid `any`. Prefer inference over annotation where it
  reads better.
- **Server-first.** Server Components and Server Actions do the work. Add a
  Client Component only for genuine interactivity, and keep it small.
- **Validate at every boundary with Zod.** Server Actions parse their `FormData`
  before doing anything. `src/lib/validation.ts` holds the shared schemas.
- **Server Actions return `ActionState`** from `src/lib/forms.ts` — use
  `failure`, `fieldFailure`, `success` and `withValues` rather than inventing a
  new shape. They pair with `components/ui/action-form.tsx`.
- **Guard actions with `requireOrganiserForAction` / `requireSuperadminForAction`**
  from `src/lib/auth/guards.ts`, and pages with `requireOrganiser` /
  `requireSuperadmin`.
- **Record audit events** for state changes that matter, using the
  `AUDIT_EVENT` catalogue in `src/lib/audit.ts`. Add new types to the catalogue
  rather than passing loose strings.
- **Comments explain *why*.** The existing comments are load-bearing: they
  record decisions and trade-offs. Match that density. Do not add comments that
  restate the code, and do not delete existing ones while refactoring.
- **British English in user-facing copy** — "organiser", "personalise",
  "apologise".
- **Tailwind v4.** The design tokens are in `src/app/globals.css`. Use existing
  classes and the primitives in `components/ui/` before adding new ones.

---

## Database changes

```bash
# 1. edit src/db/schema.ts
npm run db:generate     # 2. generates SQL into drizzle/
# 3. READ the generated SQL
npm run db:migrate      # 4. apply locally
DATABASE_URL=postgres://postgres:postgres@localhost:5432/gathered_test npm run db:migrate
# 5. commit schema.ts AND everything generated under drizzle/
```

CI fails if `schema.ts` changed without a matching generated migration.

**Never edit a migration that has been released.** Write a new one.

---

## Writing tests

- Unit tests sit next to the code: `src/lib/rsvp.test.ts`.
- Integration tests use `test/helpers/db.ts` — `resetDatabase`,
  `createOrganiser`, `createEvent`, `createGuest`, `createCourse`,
  `createOption`. Call `resetDatabase()` in `beforeEach`.
- `createGuest` returns `{ guest, token }` where `token` is the plaintext RSVP
  token. **Production code never returns that** — it exists only so tests can
  drive the guest flow.
- Access-control tests belong in `src/lib/data/access-control.test.ts`. Any new
  organiser-scoped query should gain a "does not return another organiser's X"
  case there.
- A bug fix needs a test that fails before the fix.

---

## Commits and PRs

The repository squash-merges, and releases are generated from commit messages by
release-please. **PR titles must be conventional commits** or CI fails:

```
feat(rsvp): let guests change their answer before the deadline
fix(exports): escape quotes in the CSV guest name column
docs: explain the SESSION_SECRET rotation trade-off
```

`feat` → minor bump, `fix`/`perf`/`docs`/`refactor`/`build` → patch,
`test`/`ci`/`style`/`chore` → no release. Full table in
[`CONTRIBUTING.md`](./CONTRIBUTING.md).

---

## Out of scope

The specification lists features that were considered and deliberately excluded.
**Do not implement any of these on your own initiative**, and flag it if a task
implies one:

multiple organisers per event · group invitations · plus-ones · ticketing ·
seating plans · QR check-in · calendar sync · SMS/WhatsApp invites · reminder
emails · guest RSVP confirmation emails · guest accounts · public attendee
lists · a public event directory · analytics · superadmin impersonation ·
superadmin editing of guest RSVP data · native apps · address autocomplete ·
map integration

---

## Things agents get wrong here

- **Adding a fetch-then-authorise check** because it reads more explicitly. It
  doesn't; it adds a code path that can be forgotten. See invariant 1.
- **Improving an error message** so it distinguishes "no such guest" from "wrong
  email". That is the leak the design exists to prevent.
- **Running `npm run lint`.** It is broken. See Commands.
- **Editing files under `drizzle/` by hand** instead of regenerating.
- **Deleting the explanatory comments** while refactoring. They are the record
  of why the code looks the way it does.
- **Enabling test parallelism** to speed up the suite. It shares one database.
- **Assuming `.env` exists.** It is gitignored. `.env.example` is the reference.
- **Editing `.next/`, `node_modules/`, `package-lock.json` by hand, or
  `tsconfig.tsbuildinfo`.** All generated.

---

## Reporting back

When you finish, say plainly:

- what changed, by file;
- whether `npm run typecheck` and `npm test` passed, with the actual result — if
  the test database was unavailable, say that rather than implying the suite ran;
- anything you left out, and why;
- any invariant above that the task pushed against.
