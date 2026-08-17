# System

A read-only view of the configuration this deployment is actually running with, plus a way to check that email really works.

> The configuration this deployment is actually running with. Secrets are never shown, only whether one is set.

## Application

| Row | What it tells you |
| --- | --- |
| **Environment** | Development or production |
| **Base URL** | The address used to build public and invitation links. If this is wrong, links in emails point somewhere useless |
| **Default timezone** | Applied to newly created events; organisers can change it per event |
| **Default currency** | Used to format [contribution](/contributions/index) amounts across the installation |

## Email

Shows the configured **driver** and **from address**, then whatever else that driver needs:

- **console** — *"Logged to the server console, nothing is actually sent."* Useful in development; invitations and reset links are printed to the server output instead of being delivered.
- **smtp** — host, port, whether TLS is on, the username, and whether a password is set.
- **resend** — whether an API key is set.

Secrets themselves are never displayed. A password or key shows only as a **set** or **not set** badge.

### Sending a test email

Below the configuration is a form to send yourself a test message, pre-filled with your own address.

The test email states which driver delivered it and when. It is the quickest way to tell a mail configuration problem from an address problem when an organiser reports that [invitations are not arriving](/invitations/emails#when-an-email-fails).

Test sends are rate limited to ten in fifteen minutes, and both successes and failures are recorded in the [audit log](/admin/audit-log) as `test_email.sent` and `test_email.failed`.

::: info Guests are never involved
The test email goes to the address you type on this page. It is the only email an administrator can trigger, and it cannot be sent to a guest or on an organiser's behalf.
:::

## Storage

Shows which storage driver is in use for uploaded [images](/events/images):

- **local** — and the path on disk. In production this must be a persistent volume, or uploads disappear on redeploy.
- **s3** — endpoint, region, bucket, path-style setting, public URL, and whether the access key and secret are set. Works with AWS, MinIO, Cloudflare R2, Backblaze B2 and similar.

Again, credentials show only as **set** or **not set**.

## Changing any of this

Nothing on this page is editable. Configuration comes from environment variables, set wherever the application is deployed, and the application validates the whole set once at startup — a bad combination stops it booting rather than failing at the first request.

Deployment, environment variables and backups are covered by the operator documentation in the repository, alongside the code.
