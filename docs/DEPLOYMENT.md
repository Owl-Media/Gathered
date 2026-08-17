# Deployment (Coolify)

Covers Spec 12.3 and 12.5. Backups are documented separately in
[BACKUP_RESTORE.md](./BACKUP_RESTORE.md).

---

## 1. What you need first

- A Coolify server with HTTPS (Let's Encrypt) available for your domain.
- A PostgreSQL 16+ database. Coolify's own Postgres service is fine.
- A transactional email account, if you want the platform to send invitations
  (see [Email](#4-email)). Without one the app still works. Organisers copy
  each guest's private link and share it themselves.
- Optionally, S3-compatible object storage for uploaded images.

---

## 2. Create the application

1. **New Resource → Application → Dockerfile**, pointing at this repository.
   The provided `Dockerfile` is a multi-stage build producing a standalone
   Next.js server; no build command needs configuring.
2. Set the **port** to `3000`.
3. Set the **health check path** to `/api/health`. It deliberately does not
   touch the database, so a brief database blip will not cause Coolify to
   restart a healthy web process.
4. Attach your domain and enable **HTTPS**. The app refuses to start in
   production unless `APP_BASE_URL` uses `https://` (Spec 11).

---

## 3. Environment variables

Set these in Coolify's **Environment Variables** panel. Never commit them
(Spec 19). `.env.example` lists every variable with inline notes.

### Required

| Variable | Notes |
| --- | --- |
| `APP_BASE_URL` | Public URL, no trailing slash, e.g. `https://rsvp.example.com`. Used to build the links inside invitation and password-reset emails, so it must be the address guests can actually reach. Must be HTTPS in production. |
| `DATABASE_URL` | `postgres://user:password@host:5432/dbname`. Use Coolify's internal hostname when the database is on the same server. |
| `SESSION_SECRET` | At least 32 characters. Generate with:<br>`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `DEFAULT_TIMEZONE` | IANA zone applied to new events, e.g. `Europe/London`. Organisers can override it per event. |

> **⚠️ `SESSION_SECRET` rotation.** Two things are derived from this secret via
> HKDF: session integrity, and the key that encrypts guest RSVP tokens at rest.
> Rotating it signs everyone out (expected) **and makes existing sealed tokens
> undecryptable**, which means organisers can no longer *display or copy*
> invitation links issued before the rotation. Links already sent to guests keep
> working, because incoming links are matched on a separate SHA-256 lookup hash.
> To reissue a broken link, remove the guest and re-add them. Only rotate this
> secret if you believe it has been exposed.

### Email (Spec 12.4)

| Variable | Notes |
| --- | --- |
| `EMAIL_DRIVER` | `console`, `smtp` or `resend`. |
| `EMAIL_FROM` | e.g. `Gathered <no-reply@example.com>`. |
| `RESEND_API_KEY` | Required when `EMAIL_DRIVER=resend`. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASSWORD` | Required when `EMAIL_DRIVER=smtp`. |

### Legal / operator identity

Gathered serves a privacy notice at `/privacy` and terms at `/terms`. Because
the app is self-hosted, **you are the data controller** — not the authors of the
software — so those pages read your identity from the environment rather than
having someone else's baked in.

| Variable | Notes |
| --- | --- |
| `LEGAL_ENTITY_NAME` | The organisation or person operating this instance. Named on both pages as the controller. |
| `LEGAL_CONTACT_EMAIL` | Where data protection requests go. Must be real and monitored — this is how someone exercises their GDPR rights. Validated at startup. |
| `LEGAL_POSTAL_ADDRESS` | Optional but expected of a controller. Multi-line is fine. |
| `LEGAL_JURISDICTION` | Country whose supervisory authority and courts apply, e.g. `Ireland`. Sets the governing-law line in the terms. |
| `LEGAL_RETENTION_STATEMENT` | Optional. Replaces the retention paragraph in the privacy notice. |

Until `LEGAL_ENTITY_NAME` and `LEGAL_CONTACT_EMAIL` are both set, `/privacy` and
`/terms` render a visible warning saying the deployment is unconfigured. They are
optional at startup on purpose, so that upgrading an existing deployment does not
fail to boot over a legal notice — but a public instance should not run without
them.

> **Do not set `LEGAL_RETENTION_STATEMENT` to a period you do not enforce.**
> Gathered deletes nothing on a timer. The default wording says exactly that,
> and it is accurate. Replacing it with "we delete after 12 months" makes the
> notice a false statement unless you are deleting the data yourself.

Two further points worth knowing before you go live:

- The notice describes the recipients derived from *your* configuration.
  Switching `EMAIL_DRIVER` to `resend` or `STORAGE_DRIVER` to `s3` adds that
  provider to the list on the page automatically.
- Guests are asked for explicit consent before dietary requirements are stored,
  because free text there can reveal health or religious belief (GDPR Art. 9).
  Guests who entered dietary notes *before* this was added have no consent on
  record, and will be asked to confirm the next time they edit their reply.

### Storage (Spec 12.5)

| Variable | Notes |
| --- | --- |
| `STORAGE_DRIVER` | `local` or `s3`. |
| `LOCAL_STORAGE_PATH` | Used when `STORAGE_DRIVER=local`. Default `./storage/uploads`. **Must be a persistent volume**; see below. |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Required when `STORAGE_DRIVER=s3`. |
| `S3_FORCE_PATH_STYLE` | Leave `true` for MinIO, R2, B2 and most non-AWS providers. |
| `S3_PUBLIC_URL` | Optional. If the bucket sits behind a CDN, images are served from there instead of streaming through the app. |

The app validates all of this at startup and refuses to boot with a clear
message if something required is missing, rather than failing on the first
request.

---

## 4. Email

The provider is pluggable (Spec 12.4). Three drivers ship:

- **`console`** logs the message instead of sending. The default, and the
  right choice for a first deploy where you only intend to share links manually.
- **`smtp`** works with Postmark, SES, Mailgun, Fastmail, or a self-hosted
  relay.
- **`resend`** uses Resend's API.

Only two emails are ever sent, and only when explicitly triggered: the
invitation (organiser presses "Send invitation") and the password reset. Nothing
is sent to guests automatically (Spec 6.5).

Whichever provider you pick, set SPF and DKIM for your sending domain or
invitations will land in spam.

---

## 5. Persistent storage for uploads

**If `STORAGE_DRIVER=local`, you must mount a volume**, or every uploaded image
is destroyed on the next deploy (Spec 19).

In Coolify → your application → **Storages**, add a persistent volume:

- **Mount path:** `/app/storage`
- **Name:** anything, e.g. `gathered-uploads`

The `Dockerfile` declares `VOLUME ["/app/storage"]` and creates the directory
owned by the app user, so no further permission work is needed.

If you use `STORAGE_DRIVER=s3` no volume is required, and image durability
becomes your object-storage provider's problem. Document its retention policy
as described in [BACKUP_RESTORE.md](./BACKUP_RESTORE.md).

---

## 6. First deploy

Run these once, in Coolify's terminal for the application container.

```bash
npm run db:migrate
```

Then create the superadmin account. There is deliberately no sign-up route that
can create one (Spec 7):

```bash
SUPERADMIN_EMAIL=ops@example.com \
SUPERADMIN_PASSWORD='a long unique passphrase' \
SUPERADMIN_NAME='Platform Ops' \
npm run db:seed-superadmin
```

Re-running that command with the same email resets the password; that is the
supported recovery path if superadmin access is lost.

Organisers then register themselves at `/register`.

---

## 7. Every subsequent deploy

Run migrations **before** the new version starts serving:

```bash
npm run db:migrate
```

Set this as a **pre-deployment command** in Coolify so it cannot be forgotten.
Migrations are additive and safe to re-run; applying an already-applied
migration is a no-op.

---

## 8. Verifying a deploy

1. `GET /api/health` returns `{"status":"ok"}`.
2. `GET /robots.txt` disallows everything. Event pages must never be indexed
   (Spec 15.10).
3. Sign in as an organiser and open an event's **Exports** tab; download the
   CSV. This exercises the database, the export path and authorisation in one go.
4. Open a guest's private link in a private browser window and confirm the email
   verification gate appears before any RSVP form.

---

## 9. Security checklist (Spec 11)

The application handles these itself; the deployment must not undermine them.

- [ ] HTTPS enforced at the proxy; `APP_BASE_URL` is `https://`.
- [ ] `SESSION_SECRET` is unique to this deployment and at least 32 characters.
- [ ] Database is not exposed to the public internet.
- [ ] Secrets live only in Coolify's environment panel, never in the repository.
- [ ] Uploads volume mounted (local driver) or S3 credentials scoped to one bucket.
- [ ] Backups running and a test restore completed (see BACKUP_RESTORE.md).

Passwords are hashed with Argon2id, sessions are opaque server-side tokens,
guest RSVP tokens are 160-bit random values stored as a lookup hash plus an
encrypted copy, and all access control is enforced server-side.

---

## 10. Known operational notes

- **`npm audit`** reports moderate advisories against `esbuild` reached through
  `drizzle-kit`. These are development-only dependencies, are not present in the
  runtime image, and the advisory concerns esbuild's dev server. `npm audit fix
  --force` would downgrade `drizzle-kit` to 0.18 and break migrations, so it is
  deliberately not applied.
- **Rate limiting** is stored in PostgreSQL rather than Redis, so no extra
  service is needed. It assumes a single application instance; if you scale to
  several, the limits become per-instance and should be moved to a shared store.
