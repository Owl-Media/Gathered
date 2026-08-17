# Guests

The Guests tab is your guest list. Every person on it has their own private invitation link.

> 📷 **Screenshot needed:** *Guests tab* (`/images/events/guests.png`)

## Adding a guest

At the top of the tab:

> **Add a guest.** Each guest gets their own private link. They'll confirm this email address before they can reply, so make sure it's right.

Three fields, all required:

- **Forename** — up to 80 characters.
- **Surname** — up to 80 characters.
- **Email address** — the address the guest will have to type to prove the invitation is theirs.

Press **Add guest**. The guest appears on the list immediately with a status of **Waiting**, and a private link generated just for them.

::: warning Get the email address right
The email address is not just where the invitation is sent — it is the key to the invitation. A guest who cannot type the exact address you entered cannot reply, no matter how many times they open the link.

If you get it wrong, the fix is to remove that guest and add them again. This issues a fresh link; the old one stops working.
:::

Each email address may appear once on an event's active guest list. Adding a duplicate gives you *"That email address is already on the guest list."* The same person can, of course, be a guest on several different events.

There is no bulk import and no paste-a-list box. Guests are added one at a time, on purpose.

## The guest list

Each guest is a card showing:

- **Name** and **email address**.
- A **status pill** — Waiting, Accepted or Declined.
- A **payment pill**, if the event asks for [contributions](/contributions/index).
- Their **private link**, with a **Copy link** button.
- **Send invitation** (or **Send again**, once one has been sent).
- **Remove**.

Once you have more than four guests, a **Search by name or email** box appears above the list and filters as you type.

## Sharing the link

Two ways to get an invitation to someone, and they are equally valid:

1. **Send invitation** — Gathered emails that one guest their own link. See [Invitation Emails](/invitations/emails).
2. **Copy link** — put their link on your clipboard and send it yourself, by text, WhatsApp, or written inside a paper card.

After a successful send, the card shows *"Invitation sent 3 Aug 2026"*. Press **Send again** to resend at any time — it is the same link, not a new one.

::: danger One link, one guest
A private link belongs to one named person. Never post one in a group chat, and never forward one guest's link to another — anyone who opens it sees that guest's name on the confirmation prompt, and if they also know that guest's email address they can submit a reply as them.

Each guest needs their own link. That is the entire point of the design.
:::

If the email fails, you are told so and the reason is shown on the guest's card, in red:

> The last invitation email failed: *reason*. Their private link below still works, so you can share it yourself.

The guest stays on your list, the link stays valid, and the invitation is **not** marked as sent.

## Removing a guest

Press **Remove**, and confirm: *"Remove Radia? Their link will stop working."*

Removing a guest:

- takes them off your guest list and out of the [Responses](/events/responses) tab,
- **invalidates their private link immediately** — anyone opening it sees *"This invitation link is no longer valid."*,
- excludes them from all three [exports](/events/exports),
- removes them from your dashboard counts.

The record is retained internally for the [audit log](/admin/audit-log), but it is gone from everything you use day to day. There is no undo and no restore: if you remove someone by mistake, add them again. They get a new link, and their previous reply does not come back.

## Contributions

If the event has a deposit or full amount set, two extra things appear on this tab.

A **Contributions** summary card at the top, showing the amounts per guest and a running count of **Paid in full**, **Deposit only** and **Nothing yet**.

And on each guest card, a **Payment** row with two buttons: **Mark deposit paid** and **Mark paid in full**. Both toggle, so a mistake is one press to undo, and the date each was settled is shown beside them.

Marking someone paid in full settles their deposit at the same time, and disables the deposit button — you cannot have someone owing a deposit they have already covered.

Full details in [Contributions](/contributions/index).

## If a private link cannot be shown

Very occasionally a guest card shows:

> This guest's private link can't be shown. Remove them and add them again to issue a new one.

This means the installation's secret has been rotated since that guest was added. Their existing link still works for *them* — but Gathered can no longer read it back to show you. Follow the instruction: remove and re-add, which issues a fresh link you can share.
