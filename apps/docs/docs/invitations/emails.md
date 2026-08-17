# Invitation Emails

Gathered sends a guest an email in exactly one circumstance: you pressed **Send invitation** on their card. There is nothing else that emails a guest, ever.

## Sending

On the [Guests](/events/guests) tab, press **Send invitation** on a guest's card. Once it has been sent the button becomes **Send again**, and the card shows the date it went out.

Sending again sends the same link, not a new one. Use it when a guest says the first one never arrived.

## What is in the email

- A **banner** — your uploaded [header image](/events/images) if you have one, otherwise a coloured band matching your chosen artwork theme.
- The subject line **You're invited: *event name***.
- A greeting with the guest's forename.
- Your name as the organiser: *"Alex Morgan has invited you to Amelia's Baby Shower."*
- **When** — the date and start time.
- **Where** — the venue name and address.
- The first few lines of your description, if you wrote one.
- A **Reply to your invitation** button, and the same link written out for anyone whose mail client hides buttons.
- A closing note: *"This link is just for you, so please do not forward it. You'll be asked to confirm your email address before responding."*

Both an HTML version and a plain-text version are sent, so it renders in any mail client.

## What is never in it

- Any other guest's name or email address
- Any other guest's private link
- How many people have been invited, or have replied
- Anyone's dietary requirements or messages

Each invitation contains one guest's details and one guest's link.

## When an email fails

You are told immediately, and the reason is shown on the guest's card in red:

> The last invitation email failed: *reason*. Their private link below still works, so you can share it yourself.

When a send fails:

- The guest **stays** on your list.
- Their private link **stays valid**.
- The invitation is **not** marked as sent, so you can tell at a glance who still needs one.
- The failure is recorded in the [audit log](/admin/audit-log).

The fallback is always available: press **Copy link** and send it yourself.

Common causes are a mistyped address, a full mailbox, or an email configuration problem on the installation. An administrator can check the configuration and send themselves a test message from the [System](/admin/system) page.

Sending is rate limited to 100 invitations an hour across your account. Going over gives you *"You've sent a lot of invitations just now. Please wait a moment."*

## Emails Gathered does not send

Deliberate omissions, all of them:

- **No reminder emails.** Chasing a guest is your job, not the software's.
- **No confirmation email after a guest replies.** They get a confirmation on screen, and can revisit their link any time to check.
- **No notification when you change the event.** If you move the date or the venue after invitations have gone out, tell your guests yourself. The pages update silently.
- **No marketing of any kind.**

The only other email Gathered ever sends is a [password reset](/account/index#forgotten-password) to an organiser, and a test message an administrator triggers on themselves.
