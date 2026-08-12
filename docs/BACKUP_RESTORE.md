# Backup and restore

Covers Spec 8.8, 12.6 and acceptance criteria 15.14.

**Requirements this document satisfies**

- [x] Automated daily PostgreSQL backups
- [x] Backups retained for at least 14 days
- [x] Restore process documented
- [x] Uploaded images included in backup planning
- [x] Object storage retention/backup policy documented
- [x] Backup failure visible to the operator
- [ ] **A test restore performed before production launch**: this one is a task
      for whoever deploys; see [§5](#5-test-restore-required-before-launch).

---

## 1. What has to be backed up

| Data | Where it lives | Lost if not backed up |
| --- | --- | --- |
| Organisers, events, menus, guests, RSVPs, messages, audit log | PostgreSQL | Everything. This is the system of record. |
| Uploaded header/profile images | Local volume **or** S3 bucket | Event artwork. Recoverable in principle by re-uploading. |
| `SESSION_SECRET` | Coolify environment | See the warning below. |

> **Back up `SESSION_SECRET` alongside the database.** Guest RSVP tokens are
> encrypted at rest with a key derived from it. A database restore paired with a
> *different* `SESSION_SECRET` leaves organisers unable to display or copy
> existing invitation links. Links already in guests' inboxes keep working, but
> the organiser cannot retrieve them. Store the secret in your password manager
> with a note that it belongs to this database.

Image *metadata* (dimensions, MIME type, storage key) lives in PostgreSQL, so a
database restore without the corresponding files leaves rows pointing at missing
objects. The app degrades gracefully: the upload route returns 404 and the
event falls back to its placeholder artwork, but the two should be restored
together.

---

## 2. PostgreSQL backups

### Using Coolify's scheduled backups (recommended)

Coolify → your PostgreSQL resource → **Backups**:

1. Enable **Scheduled Backups**.
2. Set the frequency to **daily**, at a quiet hour: `0 3 * * *`.
3. Set **retention to at least 14 days** (Spec 8.8).
4. Configure an **S3 destination** if available. A backup stored only on the
   same server does not survive that server failing.

Coolify uses `pg_dump` internally and stores compressed dumps.

### Manual / self-managed alternative

If you are not using Coolify's backup feature, this cron entry is equivalent:

```bash
0 3 * * * docker exec <postgres-container> \
  pg_dump -U postgres -Fc gathered \
  > /backups/gathered-$(date +\%F).dump 2>>/backups/backup.log \
  && find /backups -name 'gathered-*.dump' -mtime +14 -delete
```

`-Fc` (custom format) is what makes `pg_restore` usable for selective and
parallel restores later.

---

## 3. Uploaded image backups

### If `STORAGE_DRIVER=local`

The volume mounted at `/app/storage` must be included in your file-level
backups. Coolify does **not** back up application volumes as part of a database
backup.

```bash
30 3 * * * tar -czf /backups/uploads-$(date +\%F).tar.gz \
  -C /var/lib/docker/volumes/<volume-name>/_data . 2>>/backups/backup.log \
  && find /backups -name 'uploads-*.tar.gz' -mtime +14 -delete
```

Adjust the volume path to match what Coolify created.

### If `STORAGE_DRIVER=s3`

Record the provider's durability and retention policy here when you configure
it, and enable **object versioning** so an accidental delete or overwrite is
recoverable:

| Setting | Value (fill in at deploy time) |
| --- | --- |
| Provider / region | |
| Bucket | |
| Versioning enabled | |
| Lifecycle / retention rule | |
| Cross-region replication | |

Versioning is the practical equivalent of a backup for object storage: the app
overwrites nothing (every upload gets a fresh random key) but a bucket-level
mistake is still possible.

---

## 4. Restoring

### 4.1 Restore the database

```bash
# 1. Stop the application so nothing writes during the restore.
#    In Coolify: Application → Stop.

# 2. Copy the dump into the database container.
docker cp gathered-2026-08-11.dump <postgres-container>:/tmp/restore.dump

# 3. Recreate the database. --clean --if-exists drops existing objects first,
#    so this is a full replacement, not a merge.
docker exec -i <postgres-container> \
  pg_restore -U postgres -d gathered --clean --if-exists --no-owner \
  /tmp/restore.dump

# 4. Apply any migrations newer than the dump.
npm run db:migrate

# 5. Start the application again.
```

Restoring into a **fresh, empty** database instead:

```bash
docker exec -i <postgres-container> createdb -U postgres gathered
docker exec -i <postgres-container> \
  pg_restore -U postgres -d gathered --no-owner /tmp/restore.dump
```

No manual SQL surgery is required in either case (Spec 8.8).

### 4.2 Restore uploaded images

Local driver:

```bash
tar -xzf /backups/uploads-2026-08-11.tar.gz \
  -C /var/lib/docker/volumes/<volume-name>/_data
```

S3: restore the object versions, or re-sync from your replica bucket.

### 4.3 Confirm the restore worked

1. Sign in as an organiser; the dashboard lists their events with correct counts.
2. Open an event → **Responses**; replies, dietary notes and messages are present.
3. Open **Guests** and confirm a private invitation link is displayed. If links
   show "can't be shown", the `SESSION_SECRET` does not match the one in use
   when those guests were created; see §1.
4. Open an event's public page and confirm images load (or that placeholders
   appear, if images were not restored).
5. Download the CSV export.

---

## 5. Test restore (required before launch)

Spec 15.14 requires a test restore **before** production launch. Do it against a
throwaway database so nothing live is at risk:

```bash
# Restore yesterday's dump into a scratch database.
docker exec -i <postgres-container> createdb -U postgres gathered_restoretest
docker exec -i <postgres-container> \
  pg_restore -U postgres -d gathered_restoretest --no-owner /tmp/restore.dump

# Sanity-check the row counts.
docker exec -i <postgres-container> psql -U postgres -d gathered_restoretest \
  -c "select
        (select count(*) from users)  as users,
        (select count(*) from events) as events,
        (select count(*) from guests) as guests,
        (select count(*) from menu_selections) as selections;"

# Point a local app instance at it and click through, then clean up.
docker exec -i <postgres-container> dropdb -U postgres gathered_restoretest
```

Record the date of the successful test restore here:

| Date | Performed by | Dump tested | Result |
| --- | --- | --- | --- |
| | | | |

---

## 6. Making failures visible

A backup nobody checks is not a backup (Spec 8.8, 12.6).

- **Coolify notifications**: Settings → Notifications. Connect email, Discord,
  Slack or Telegram, and enable **backup failure** alerts. This is the minimum.
- **Watch for silence as well as errors.** A cron job that stops running emits
  no error. Use a dead-man's-switch (Healthchecks.io, Cronitor, or an
  equivalent) that alerts when a daily ping *fails to arrive*:

  ```bash
  0 3 * * * pg_dump ... && curl -fsS -m 10 https://hc-ping.com/<uuid>
  ```

- **Check the backup is non-trivial in size.** A dump that succeeds but produces
  a few hundred bytes usually means it dumped the wrong database:

  ```bash
  find /backups -name 'gathered-*.dump' -mtime -1 -size -10k \
    -exec echo "SUSPICIOUSLY SMALL BACKUP: {}" \;
  ```

---

## 7. Retention summary

| Item | Frequency | Retention | Off-server copy |
| --- | --- | --- | --- |
| PostgreSQL dump | Daily | ≥ 14 days | Strongly recommended |
| Uploads (local driver) | Daily | ≥ 14 days | Strongly recommended |
| Uploads (S3) | Continuous (versioning) | Per lifecycle rule | Provider-dependent |
| `SESSION_SECRET` | On change | Indefinite | Password manager |
