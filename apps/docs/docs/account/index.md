# Your Account

Organiser accounts are deliberately simple. There is no profile page, no settings screen and nothing to configure — an account is a name, an email address and a password.

## Signing in and out

Sign in at `/login` with your email address and password.

Every failure gives the same message, whatever went wrong:

> Those details do not match an active account.

That single wording covers a wrong password, an address that has never registered, and an account that has been disabled — so the page cannot be used to work out who has an account here. Repeated attempts are rate limited to ten in fifteen minutes.

**Sign out** is in the top right of every organiser page. It ends that session only; you stay signed in on your other devices.

A session lasts 30 days and is extended automatically when you use the app after the halfway point.

## Forgotten password

1. From the sign-in page, follow **Forgotten your password?**
2. Enter your email address and press **Send reset link**.
3. You will always see the same confirmation:

   > If that email address has an account, we've sent a link to reset the password. Please check your inbox.

   The wording never changes, whether or not the address is registered — the page cannot be used to discover who has an account.

4. Open the link in the email and choose a new password. At least 10 characters, entered twice.

The reset link **expires after 60 minutes** and can be used **once**. An expired or already-used link gives *"That reset link is invalid or has expired. Please request a new one."*

Reset requests are limited to five an hour.

::: warning Resetting signs you out everywhere
Completing a password reset ends every session on every device, including the one you are using. Sign in again with the new password.

This is the intended way to lock out a device you no longer have.
:::

There is no way to change your password while signed in — use the reset flow, which does the same job and safely revokes old sessions with it.

## What you cannot change

- **Your email address.** It is the account identifier and cannot be edited. If you need a different one, register a new account; events do not transfer between accounts.
- **Your name.** It appears in the invitation emails you send, and is set at registration.

## Disabled accounts

An administrator can disable an organiser account. When that happens:

- You can no longer sign in. The sign-in page gives the same generic failure message as any other, without saying that the account was disabled.
- Your existing sessions stop working on the next request.
- Your event pages — public and invitation alike — show *"This event is currently unavailable."* to anyone who opens them, with no explanation of why.
- Password reset does not work, and requesting one still shows the same confirmation as always.

**No data is deleted.** Re-enabling the account restores everything exactly as it was: the events, the guests, the replies, and the invitation links, which start working again immediately.

If you believe your account has been disabled in error, contact whoever runs your installation. See the [admin section](/admin/index) for what they can do.

## Deleting your account

There is no self-service account deletion. Contact whoever runs your installation.
