# Security policy

Gathered stores personal data about people who never signed up for it: guest
names, email addresses, dietary requirements and private messages. Guests have
no account and no way to check on it themselves. That asymmetry is the reason
this file exists.

## Reporting a vulnerability

**Do not open a public issue.**

Use GitHub's private reporting: **Security → Advisories → Report a
vulnerability** on this repository. If that is unavailable to you, email
<support@owl-media.co.uk>.

Please include:

- What the issue is, and which files or endpoints are involved.
- The steps to reproduce it, ideally against a local install.
- What an attacker gets out of it — read access to another organiser's guest
  list is very different from a cosmetic flaw.
- Any suggested fix, if you have one.

You will get an acknowledgement within **3 working days** and an assessment
within **10 working days**. If a fix is warranted we will agree a disclosure
date with you, and credit you in the release notes unless you would rather we
did not.

This is a volunteer-maintained project. There is no bug bounty.

## Supported versions

Only the latest released version receives security fixes. There are no
long-term support branches.

## What counts as a vulnerability here

The specification makes some deliberate guarantees. Breaking any of them is a
security bug, and these are the ones worth hunting:

- **Cross-organiser access.** Any route that returns an event, guest, menu or
  upload belonging to a different organiser. Ownership is meant to be enforced
  in the `WHERE` clause of every query in `src/lib/data/`, never in a check
  after the fetch.
- **RSVP link bypass.** Submitting an RSVP with a valid token but without the
  matching guest email address, or any response that reveals whether a given
  token or email is valid.
- **Guest enumeration.** Any way to learn which event slugs, guest ids or RSVP
  tokens exist by comparing responses, timings or error messages.
- **Superadmin overreach.** Superadmin queries select explicit column lists that
  exclude dietary requirements, guest messages and RSVP tokens. Anything that
  returns those to a superadmin is a bug, not a feature.
- **Token storage.** RSVP tokens are stored as a SHA-256 lookup hash plus an
  AES-256-GCM sealed copy. Anything that writes a usable plaintext token to the
  database, to a log, or to an export is a bug.
- **Session handling.** Sessions are opaque and server-side so that disabling an
  account takes effect on the next request. Anything that lets a disabled
  account keep working is a bug.
- **Upload handling.** Path traversal, serving uploads without the locked-down
  CSP, or storing a file outside the configured storage root.

## What does not count

- Findings that require an attacker to already hold the organiser's password or
  an unexpired session cookie.
- Missing hardening on a deployment you control yourself — TLS termination, rate
  limiting at the edge, database network exposure. See
  [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) for what the operator is expected
  to provide.
- Automated scanner output with no demonstrated impact.
- The known trade-off documented in the README: rotating `SESSION_SECRET` makes
  previously issued RSVP links undisplayable to the organiser. That is a
  consequence of sealing them, and it is intentional.

## Operator responsibilities

Gathered is self-hosted. Running it safely means, at minimum: serving it over
HTTPS, setting a unique 32+ character `SESSION_SECRET`, keeping the database off
the public internet, and taking the backups described in
[`docs/BACKUP_RESTORE.md`](./docs/BACKUP_RESTORE.md). None of that is something
the application can do on your behalf.
