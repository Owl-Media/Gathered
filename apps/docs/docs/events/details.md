# Details

The Details tab holds the public event link and the full event form. It is the first section you land on when you open an event.

> 📷 **Screenshot needed:** *Details tab* (`/images/events/details.png`)

## Public event page

At the top is a card with your event's public address, something like:

```
https://your-gathered-site/e/amelias-baby-shower-k7m2p9qx
```

The slug is a readable version of the event name plus a random suffix, so the address is neither guessable nor a sequential number.

- **Copy** puts the link on your clipboard.
- **Open** opens it in a new tab.

This link is safe to share with anyone: a group chat, a WhatsApp message, a printed invitation. It shows event details and the menu, and **no guest information whatsoever** — no names, no counts, no dietary notes, no messages, no private links. See [The Public Event Page](/invitations/public-event-page).

Below the link is a shortcut to **Preview the RSVP journey**, which shows you what a guest sees after they confirm their email address. See [Preview the Guest Journey](/invitations/preview).

## Event details

The form is the same one you filled in when creating the event, pre-filled with the current values. Every field is editable:

| Field | Notes |
| --- | --- |
| Event name | Up to 120 characters |
| Date | The calendar date, in the event's timezone |
| Starts / Ends | The end must be after the start |
| Timezone | All times and the deadline are interpreted here |
| Venue name | Up to 160 characters |
| Address | Multi-line, up to 400 characters |
| Description | Optional, plain text, up to 4,000 characters |
| Replies close on / At | Must be on or before the event date |
| Deposit / Full amount | Optional — see [Contributions](/contributions/index) |
| Artwork | Six built-in themes |

Each field is described in full in [Create Your First Event](/getting-started/create-your-first-event).

Press **Save changes**. Validation runs on the server; if something is rejected the error appears against the field and nothing else you typed is lost.

## What happens when you save

Changes are live immediately. There is nothing to publish and no cache to wait for.

- The [public event page](/invitations/public-event-page) shows the new details on the next load.
- Every guest's [invitation page](/guests/index) shows them too, whether or not that guest has already replied.
- A **last updated notice** appears at the bottom of both pages: *"These details were last updated on…"*, with the date and time in the event's timezone.

The notice appears only once an event has actually been edited after creation, so a brand new event does not carry a pointless "updated" line.

::: warning Guests are not told about changes
Editing an event does not email anybody. If you move the date or change the venue after invitations have gone out, the pages update silently — you will need to tell your guests yourself. This is deliberate: Gathered sends a guest an email only when you explicitly press **Send invitation**.
:::

## Changing the RSVP deadline

Moving the deadline is the one edit with an immediate behavioural effect:

- **Bringing it forward** past the current moment closes replies at once. Guests keep access to the event details and their own saved reply, but the form disappears.
- **Pushing it back**, including reopening a deadline that has already passed, restores the form for every guest immediately.

You never need to move the deadline just to correct one reply — you can [edit any guest's reply yourself](/events/responses#editing-a-reply) at any time, before or after it closes.

## What you cannot change

- **The public link.** The slug is generated once, when the event is created, and never changes. A link you have shared keeps working.
- **The event's existence.** There is no delete. See [Your Dashboard](/getting-started/dashboard#deleting-an-event).
