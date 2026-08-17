# Admin

The admin area is for whoever runs the installation. It exists to keep the service healthy, not to look at anybody's event.

Administrator accounts are created by the operator when the installation is set up; you cannot register as one, and no organiser can be promoted from within the app. Signing in with an administrator account lands you here rather than on an organiser dashboard.

Four sections, along the top:

- **Organisers** — this page, listing accounts and letting you disable or re-enable them.
- [Events](/admin/events) — reply totals across the platform.
- [Audit Log](/admin/audit-log) — the most recent recorded actions.
- [System](/admin/system) — the configuration this deployment is running with.

## What administrators deliberately cannot do

This is the important part, and it is structural rather than a matter of which buttons were drawn:

- **Cannot read guest data.** No dietary requirements, no guest messages, no organiser private notes. The queries behind the admin screens do not select those columns.
- **Cannot see guest names**, anywhere.
- **Cannot see invitation links**, in any form.
- **Cannot see payment data.**
- **Cannot impersonate an organiser.** There is no "sign in as" anywhere in Gathered, because none was built.
- **Cannot edit an event, a guest or a reply.**
- **Cannot download exports.** Exporting is an organiser capability over their own events only.
- **Cannot send invitation emails** on an organiser's behalf.

The only actions available are disabling and re-enabling accounts, and sending a test email to yourself.

## Organiser accounts

> View accounts and disable access. Guest replies, dietary requirements and messages are not visible from here.

Four totals across the top: **Organisers**, **Disabled**, **Events** and **Guests** — counts only.

Below them, every account as a card showing the name, the email address, a **Superadmin** badge where applicable, a **Disabled** badge where applicable, the number of events, and the date they joined.

### Disabling an account

Press **Disable account**, then confirm:

> They'll be signed out and their event pages will show as unavailable. No data is deleted.

Disabling takes effect immediately, because sessions live on the server rather than in a token that has to expire:

- The organiser cannot sign in. They see the same generic failure as any other sign-in problem, with no indication that the account was disabled.
- Their existing sessions stop working on the next request.
- Their public event pages and every guest's invitation page show *"This event is currently unavailable."* — nothing about who, why, or whether the event ever existed.
- Password reset stops working for them, and requesting one gives the same confirmation it always does.

Nothing is deleted. Events, guests, replies, messages and invitation links are all retained untouched.

### Re-enabling

A disabled account shows a **Re-enable** button. Pressing it restores everything at once: the organiser can sign in again, and every event page starts working exactly as before, including invitation links guests already hold.

### Accounts you cannot disable

- **Your own.** The card reads *"This is you"* instead.
- **Other administrators.** *"Superadmin accounts can't be disabled here."*

Both are guardrails against locking everybody out of the installation. Removing an administrator is an operator task on the server, not an in-app action.

Disabling and re-enabling are both recorded in the [audit log](/admin/audit-log).
