# Contributing to Gathered

Thanks for being here. This document covers how to get the project running, what
a good change looks like, and how releases work.

Two things are worth knowing before you start:

1. **This project has a written specification.** Behaviour is defined in
   [`specification/specification.md`](./specification/specification.md), and the
   code is meant to follow it. Changing behaviour means changing the
   specification too, deliberately, in the same PR.
2. **A deliberately short feature list is the point.** The README ends with a
   list of things that were considered and left out. Proposing something on that
   list is welcome, but it needs an argument rather than only a use case.

---

## Table of contents

- [Contributing to Gathered](#contributing-to-gathered)
  - [Table of contents](#table-of-contents)
  - [Getting set up](#getting-set-up)
  - [Running the tests](#running-the-tests)
  - [Making a change](#making-a-change)
  - [Commit and PR conventions](#commit-and-pr-conventions)
  - [What CI checks](#what-ci-checks)
  - [Code conventions](#code-conventions)
  - [Working on the database](#working-on-the-database)
  - [Things that are easy to get wrong](#things-that-are-easy-to-get-wrong)
  - [How releases work](#how-releases-work)
  - [Reporting security issues](#reporting-security-issues)
  - [Licence](#licence)

---

## Getting set up

You need **Node 24** (see [`.nvmrc`](./.nvmrc)), **npm 11+**, and **Docker** for
a local PostgreSQL.

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

Then populate it, so you are looking at something:

```bash
npm run db:seed-demo
```

That creates a demo organiser, a three-course menu, eight fictional guests and a
spread of replies, and prints the login plus every private guest link. It is the
dataset the README screenshots are taken from. Re-running rebuilds it and leaves
other accounts alone.

`EMAIL_DRIVER` defaults to `console`, so invitations and password resets are
printed to the terminal instead of sent — **including the private RSVP link**.
That is how you get a guest link for an event you created yourself.

To create a superadmin:

```bash
SUPERADMIN_EMAIL=ops@example.com \
SUPERADMIN_PASSWORD='a long unique passphrase' \
npm run db:seed-superadmin
```

---

## Running the tests

The suite is Vitest. Unit tests need nothing. The integration tests run against
a **real PostgreSQL database**, on purpose — partial unique indexes, foreign
keys and cascade rules enforce several of the specification's guarantees, and a
fake would not exercise any of them.

Create the test database once:

```bash
docker compose -f docker-compose.dev.yml up -d
docker exec gathered-postgres-dev psql -U postgres -c "CREATE DATABASE gathered_test"
DATABASE_URL=postgres://postgres:postgres@localhost:5432/gathered_test npm run db:migrate
```

Then:

```bash
npm test          # once
npm run test:watch
```

Test files run **serially**. They share that one database and truncate it
between tests, so parallel files would wipe each other's fixtures mid-run. The
reasoning is in [`vitest.config.ts`](./vitest.config.ts).

If you add a migration, re-run `db:migrate` against the test database too, or
the integration tests will fail against a stale schema.

---

## Making a change

1. **Open an issue first** for anything beyond a small fix. It is cheaper to
   disagree about scope in an issue than in a finished PR.
2. **Branch from `main`.** Name it however you like; the branch name is not
   used for anything.
3. **Write the test.** For a bug fix, write the test that fails first. For new
   behaviour, the test should read like the specification clause it implements.
4. **Keep the diff about one thing.** Drive-by refactors in a feature PR make
   the review about the refactor.
5. **Run the checks locally** before pushing:

   ```bash
   npm run typecheck
   npm test
   npm run build
   ```

6. **Open the PR.** Fill in the template. Say what a reviewer should push back
   on — the parts you were least sure about are the parts most worth reading.

Small, well-tested PRs get reviewed quickly. Large ones with no issue behind
them may sit for a while, or get asked to be split.

---

## Commit and PR conventions

This repository squash-merges, and releases are generated from commit messages.
**Your PR title becomes the commit message and the changelog entry**, so it must
be a [Conventional Commit](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <subject>
```

Examples:

```
feat(rsvp): let guests change their answer before the deadline
fix(exports): escape quotes in the CSV guest name column
docs: explain the SESSION_SECRET rotation trade-off
feat(auth)!: require a 12 character minimum password
```

| Type | What it means | Version bump | In the changelog |
| --- | --- | --- | --- |
| `feat` | New behaviour | minor | Features |
| `fix` | Corrected behaviour | patch | Bug fixes |
| `perf` | Faster, same behaviour | patch | Performance |
| `revert` | Undoes an earlier commit | patch | Reverts |
| `docs` | Documentation only | patch | Documentation |
| `refactor` | Restructuring, no behaviour change | patch | Refactoring |
| `build` | Dependencies, Dockerfile, build config | patch | Build and dependencies |
| `test` | Tests only | none | hidden |
| `ci` | Workflow changes | none | hidden |
| `style` | Formatting only | none | hidden |
| `chore` | Everything else | none | hidden |

A `!` after the type, or a `BREAKING CHANGE:` footer, marks a breaking change.
Until 1.0.0 that produces a minor bump, not a major one, and the changelog calls
it out prominently. Breaking here means an operator has to do something during
an upgrade — a required new environment variable, a manual migration step, a
changed export format.

CI rejects PR titles that do not match. The commits inside your branch are not
checked, because squash-merging discards them.

---

## What CI checks

Every pull request runs [`.github/workflows/ci.yml`](./.github/workflows/ci.yml):

| Job | What it does |
| --- | --- |
| **PR title** | The title is a valid conventional commit |
| **Typecheck and test** | `tsc --noEmit`, then the full suite against PostgreSQL 17 |
| **Migrations match the schema** | Regenerates migrations and fails if anything new appears |
| **Build** | `next build` with no secrets present |
| **Docker image builds** | Builds the production image; never pushes on a PR |
| **Dependency audit** | `npm audit --audit-level=high` |

[`codeql.yml`](./.github/workflows/codeql.yml) also runs static analysis on PRs
and weekly; results land under the repository's Security tab.

The **Migrations match the schema** job is the one people hit unexpectedly. It
means you changed `src/db/schema.ts` without running `npm run db:generate`. Run
it locally and commit what it produces.

There is currently **no linter or formatter** in CI. `next lint` was removed in
Next.js 16 and has not been replaced yet, so match the style of the file you are
editing. See [issue tracker] if you would like to set that up — it is a good
first contribution.

[issue tracker]: https://github.com/owl-media/gathered/issues

---

## Code conventions

Read a neighbouring file before writing a new one. Beyond that:

- **TypeScript, strict.** No `any` that a reviewer has to argue you out of. Use
  `@/` for imports from `src/`.
- **Server-side by default.** Server Components and Server Actions do the work.
  Reach for a Client Component only when there is genuine interactivity, and
  keep it small.
- **Validate at the boundary with Zod.** Every Server Action parses its input.
  Never trust a form field, a route param or an environment variable.
- **Comments explain why, not what.** The existing code has quite a few of
  these, and they are load-bearing — they record decisions, not mechanics.
  Match that: if you made a non-obvious trade-off, write it down next to the
  code that embodies it.
- **British English in user-facing copy** — "organiser", "personalise".
- **Errors do not leak.** A wrong guest email, an unknown RSVP token and a
  removed guest must be indistinguishable from the outside. See
  [Things that are easy to get wrong](#things-that-are-easy-to-get-wrong).

---

## Working on the database

The schema lives in `src/db/schema.ts`. Migrations are generated from it and
committed as reviewable SQL under `drizzle/`.

```bash
# 1. Edit src/db/schema.ts
# 2. Generate the migration
npm run db:generate
# 3. Read the SQL it produced. Really read it.
# 4. Apply it
npm run db:migrate
# 5. Apply it to the test database too
DATABASE_URL=postgres://postgres:postgres@localhost:5432/gathered_test npm run db:migrate
# 6. Commit both the schema change and the generated files
```

Rules:

- **Never edit a migration that has been released.** Someone has already run it.
  Write a new one.
- **Never hand-edit generated SQL to mean something different from the schema.**
  The CI drift check will catch it, but more importantly the next `generate`
  will fight you.
- **Data that a guest has touched is archived, not deleted.** Menu options a
  guest has chosen get archived so exports keep making sense. Follow that
  pattern for anything similar.
- `npm run db:studio` opens a browser UI over the local database.

---

## Things that are easy to get wrong

These are the invariants the specification actually cares about. A change that
breaks one of them will be asked to change, however good the rest of it is.

**Ownership belongs in the `WHERE` clause.** `getEventForOrganiser` and friends
take the organiser id and put it into the query. There is no code path that
fetches an event and *then* decides whether you were allowed to have it. If you
add a query in `src/lib/data/`, scope it the same way. "Not found" and "not
yours" must return the same error, so responses cannot be used to probe which
ids exist.

**A private link alone is not authentication.** A guest also has to enter the
email address the invitation was issued to, checked server-side. The mismatch
message must never reveal the correct address, and must never confirm whether
the token itself was valid.

**RSVP tokens never appear in plaintext at rest.** They are stored twice: a
SHA-256 lookup hash to resolve incoming links, and an AES-256-GCM sealed copy so
the organiser can re-display the link. Do not log them, do not put them in an
export, do not add a column that holds them raw.

**Superadmins are limited by construction, not by a flag.** Their queries select
explicit column lists that exclude dietary requirements, guest messages and RSVP
tokens, and audit metadata is scrubbed at write time. `select *` in
`src/lib/data/superadmin.ts` is a privacy bug. There is no impersonation code
path because none was written — do not add one.

**Menu choices are snapshotted.** Each selection stores the course and option
names as they were when the guest chose. Renaming an option later must not
rewrite history in the exports.

**Times belong to the event, not the server.** Each event carries an IANA
timezone. Wall-clock values are stored as typed; the RSVP deadline is stored as
an exact instant derived from them. Never use the server's local timezone to
decide whether a deadline has passed. Use the helpers in `src/lib/time.ts`.

---

## How releases work

Releases are automated with
[release-please](https://github.com/googleapis/release-please). You do not tag
anything by hand.

1. Conventional-commit PRs merge into `main`. **Nothing is published.**
2. release-please keeps one open PR titled `chore: release X.Y.Z`. It rewrites
   that PR on every merge, so the next release's version and changelog are
   always visible in advance.
3. A maintainer merges the release PR. That bumps `package.json`, writes
   `CHANGELOG.md`, tags the commit and creates the GitHub Release.
4. Only then does
   [`release.yml`](./.github/workflows/release.yml) build and push the container
   image to `ghcr.io/owl-media/gathered`, tagged `X.Y.Z`, `X.Y`, `X` and
   `latest`, for `linux/amd64` and `linux/arm64`, with a signed build provenance
   attestation.

Deployers who want to pin exactly use `X.Y.Z`. Those who want automatic patches
use `X.Y`. `latest` is for trying it out, not for production.

The project is pre-1.0. Minor versions may change behaviour; read the changelog
before upgrading.

---

## Reporting security issues

Do not open an issue. Follow [SECURITY.md](./SECURITY.md) — GitHub private
advisories, or <support@owl-media.co.uk>.

---

## Licence

By contributing you agree that your contributions are licensed under the
[MIT Licence](./LICENSE), the same terms as the project. There is no CLA.
