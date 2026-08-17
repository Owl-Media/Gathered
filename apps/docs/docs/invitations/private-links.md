# Private Guest Links

Every guest you add gets one link of their own, at an address like `/rsvp/<token>`. It is the only way to reply to an event.

## How they are made

When you add a guest, Gathered generates a long, cryptographically random token for them. Tokens are never sequential, never derived from a name or an email address, and never contain a database identifier — so knowing one guest's link tells you nothing about anybody else's.

The link is created once and does not change. Sending it again sends the same link.

## Two things, not one

Holding the link is not enough to reply. When a guest opens it they see the event details, and then a prompt:

> **Hello Radia** — Please confirm the email address this invitation was sent to, so we know it's you.

The address they type must match the one you entered on the [Guests](/events/guests) tab. That check runs on the server, and the error never reveals the correct address:

> The email address does not match this invitation.

The same message appears whether the address was wrong or the link itself was invalid, so a wrong guess never confirms that a link is real. Repeated attempts are rate limited to ten in fifteen minutes, scoped so that one person guessing cannot lock out an unrelated guest on the same network.

Once confirmed, that device stays verified for **two hours**. After that, or on another device, the guest confirms again. The window is deliberately short — a phone gets handed round at a party.

## Copying a link

On the [Guests](/events/guests) tab, each guest card shows their link with a **Copy link** button. Use it when you would rather send the invitation yourself: by text, by WhatsApp, or written inside a paper card.

::: danger Never share one guest's link with another guest
The link opens a page with that guest's forename on it, and anyone who also knows their email address can submit a reply as them.

Do not post a private link in a group chat. Do not forward one guest's link to their partner. Add each person separately, and each gets their own.
:::

## What a guest can see with their link

Only their own invitation. Their name, their reply, their menu choices, their dietary note, their message, and — if the event asks for contributions — what they have paid.

They cannot see any other guest's name, whether anyone else has replied, how many people are coming, or anyone else's link. There is no page in Gathered that shows a guest anything about another guest.

## Making a link stop working

[Remove the guest](/events/guests#removing-a-guest). Their link is invalidated immediately, and anyone opening it afterwards sees:

> This invitation link is no longer valid.

That message is used for every failure — an invalid link, a removed guest, an unknown token. Nobody can tell which applies to them.

To reissue, add the guest again. They get a fresh link, and their previous reply does not come back.

## When you cannot see a link

A guest card may occasionally show:

> This guest's private link can't be shown. Remove them and add them again to issue a new one.

Links are stored encrypted, so a copy of the database on its own yields no usable invitations. If the installation's secret has been rotated since the guest was added, Gathered can no longer decrypt the link to display it back to you. The guest's own copy still works — but if you need to resend it, follow the instruction and reissue.
