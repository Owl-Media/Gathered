# Privacy

Privacy is the reason Gathered exists in this shape rather than a simpler one. This page sets out exactly who can see what.

## Who sees what

| | Anyone with the public link | A guest, on their own link | The organiser | An administrator |
| --- | :-: | :-: | :-: | :-: |
| Event name, date, times, venue | Yes | Yes | Yes | Name and date only |
| Description | Yes | Yes | Yes | No |
| Menu (the dishes on offer) | Yes | Yes | Yes | No |
| Cost to attend | Yes | Yes | Yes | No |
| Guest names | **No** | Own only | Yes | **No** |
| How many are coming | **No** | **No** | Yes | Totals only |
| Menu choices | **No** | Own only | Yes | **No** |
| Dietary requirements | **No** | Own only | Yes | **No** |
| Guest messages | **No** | Own only | Yes | **No** |
| Private invitation links | **No** | Own only | Yes | **No** |
| Payment state | **No** | Own only | Yes | **No** |
| Organiser's private notes | **No** | **No** | Yes | **No** |

## Guests see only themselves

There is no page in Gathered that shows one guest anything about another. Not a name, not a count, not a choice, not a message, not a link. A guest's invitation page is about their invitation and nothing else.

This also means guests cannot see how many people are coming. If they need to know, the organiser tells them.

## The public page reveals nothing about the guest list

The [public event page](/invitations/public-event-page) shows the event and the menu. No names, no counts, no dietary notes, no messages, no links.

The one thing it does reveal is the **cost to attend**, when the event asks for [contributions](/contributions/index) — a property of the event, not of any guest. Anyone holding the public link can see the price.

## A link alone is not enough

Holding a private invitation link does not let anyone reply. The email address the invitation was issued to must also be entered, and that check runs on the server every time.

Error messages are deliberately uninformative: *"The email address does not match this invitation"* never reveals the correct address, and never confirms whether the link itself is valid. *"This invitation link is no longer valid"* covers a wrong link, a removed guest and a deleted event alike, so nobody can tell which applies.

Repeated attempts are rate limited.

## Organisers see only their own events

Ownership is checked on the server for every page and every action. Another organiser's event returns exactly the same response as an event that does not exist, so the address bar cannot be used to discover what exists.

There is no way to add a co-organiser, and no way for one organiser to see another's dashboard, guests, replies or exports.

## Administrators cannot read guest data

The [admin area](/admin/index) exists to keep the installation running, not to look at events. It is structurally limited:

- **No dietary requirements, no guest messages, no private notes.** These are not merely hidden from the admin screens; the queries behind those screens do not select those columns.
- **No guest names.** The events list shows reply totals only.
- **No invitation links.** Not in any form, encrypted or otherwise.
- **No payment data.**
- **No impersonation.** There is no "sign in as" anywhere in Gathered.
- **No editing.** Administrators cannot change an event, a guest or a reply, and cannot download exports.

The [audit log](/admin/audit-log) records that things happened, never their contents — sensitive fields are stripped as records are written, not filtered when they are displayed.

## Sensitive information by design

**Dietary requirements** are treated as sensitive personal information throughout. They are shown to the guest who wrote them and to the organiser, they appear in the planning exports so the caterer can be told, and nowhere else. They are excluded from the keepsake PDF.

**Guest messages** are private to the organiser. They never appear on the public page, on another guest's page, in any email, or to an administrator.

**Private notes** are the organiser's own. Guests never see them, and they are left out of exports unless the organiser deliberately ticks the box each time.

## How things are stored

- **Passwords** are hashed with Argon2id and never stored in a readable form.
- **Invitation links** are stored twice: as a one-way hash used to resolve an incoming link, and as an encrypted copy so the organiser can be shown the link again. A copy of the database on its own yields no usable invitations.
- **Sessions** are stored on the server, so disabling an account takes effect on the next request rather than whenever a token happens to expire.
- **Guest removal** is a soft delete: the link is invalidated immediately and the guest disappears from every view and every export, while the record is retained for audit purposes.

## Search engines

Both the public event page and every invitation page instruct search engines not to index them, not to follow their links, and not to cache them. There is no sitemap and no directory of events — Gathered has no browsable list of anything. The only way to reach an event is with a link somebody gave you.
