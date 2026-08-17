# Create Your First Event

From your dashboard, press **Create event**. Everything on this page can be changed later from the [Details](/events/details) tab, so it is worth getting the date and deadline right and treating the rest as a starting point.

> 📷 **Screenshot needed:** *The new event form* (`/images/getting-started/new-event.png`)

## The basics

**Event name** — up to 120 characters. This appears as the heading on the public page, on every guest's invitation page, in the subject line of the invitation email ("You're invited: …") and on both PDF exports.

**Date** — the calendar date of the event.

**Starts** and **Ends** — the times shown to guests. The end time must be after the start time.

**Timezone** — every time on the event is interpreted in this zone. It defaults to the timezone the installation is configured with, and you can change it per event. This matters most for the RSVP deadline: "midnight on the 3rd" means midnight where the event is, regardless of where you or your guests happen to be.

## Where

**Venue name** — up to 160 characters, for example *The Garden Room*.

**Address** — up to 400 characters, and multi-line. Write it the way you would on an envelope; the line breaks are preserved everywhere it is shown.

There is no map, no pin and no address autocomplete. The address is plain text.

## Details

**Description** — optional, up to 4,000 characters. Anything your guests should know: parking, dress code, gift preferences, who to ask for on the door.

The description is plain text. Line breaks are kept, but formatting, links and HTML are not — anything that looks like markup is shown as the characters you typed, never rendered. This is what keeps a copied-and-pasted block from someone else's email from doing anything unexpected on your guests' phones.

## RSVP deadline

Two fields, **Replies close on** and **At**, together set the exact moment the RSVP window shuts — interpreted in the event's timezone.

The deadline must be on or before the event date.

After that moment guests can still open their link and see the event and their own saved reply, but the form is gone. They see:

> The RSVP deadline has passed. Please contact the organiser if you need to change your response.

You can extend the deadline at any time, including after it has passed, and guests can reply again immediately. You can also [edit any guest's reply yourself](/events/responses#editing-a-reply) after the deadline without moving it.

## Contributions

Optional, and only relevant if guests are chipping in for the venue or the meal.

- **Deposit** — what each guest pays up front.
- **Full amount** — the total per guest, *including* the deposit. The balance is the difference between the two.

Leave both blank and nothing about money appears anywhere — not on the public page, not on invitation pages, and not on the Guests tab.

A deposit on its own is rejected: without a full amount a guest has no idea what they finally owe. The deposit also cannot exceed the full amount, since the full amount includes it.

Amounts accept `40`, `40.50`, `£40.50` or `1,250`. Negatives, and anything with more than two decimal places, are rejected rather than quietly rounded.

See [Contributions](/contributions/index) for how payments are then recorded.

::: warning The cost is visible publicly
The cost to attend is a property of the event, like the date, so it appears on the **public event page** as well as on invitation pages. It says nothing about any individual guest — but anyone holding the public link can see what the event costs. What each guest has actually paid is private and shown only on their own page, after they verify their email.
:::

## Artwork

Six built-in illustrated themes: **Clouds**, **Moon & stars**, **Botanical**, **Rainbow**, **Balloons** and **Confetti**.

Your chosen theme is used anywhere you have not uploaded your own image — as the banner and the round profile image on the event pages, and as the coloured header of the invitation email. Pick one now and upload photos later from the [Images](/events/images) tab, or never upload anything at all; an event with no photos still looks finished.

## Saving

Press **Create event**. Gathered saves the event, generates its unique public link, and drops you on the Details tab with:

> Your event has been created. Next, add your menu and guest list.

### If something is rejected

Validation runs on the server, so nothing depends on your browser behaving. The rules that catch people out:

- The end time must be after the start time.
- The RSVP deadline must be on or before the event date.
- The event name, venue name and address cannot be empty.
- If you set a deposit, you must also set a full amount.

Errors appear next to the field concerned, and everything else you typed is kept.
