# Contributions

Some events ask guests to chip in — for the venue, for the meal, for the whole thing. Gathered can show guests what they owe and let you tick each one off as their money arrives.

::: danger No money moves through Gathered
This is a ledger, not a checkout. Gathered takes no card details, has no payment provider, and processes no payments. Guests pay you by cash, bank transfer or whatever you have agreed between you, and you record it here afterwards.
:::

The feature is entirely optional. Leave both amounts blank and nothing about money appears anywhere in the app.

## Setting the amounts

On the [Details](/events/details) tab, under **Contributions**:

- **Deposit** — what each guest pays up front.
- **Full amount** — the total per guest, **including** the deposit.

The balance is the difference between the two. If the full amount is £40 and the deposit is £10, the balance after the deposit is £30.

Two rules are enforced when you save:

- The deposit cannot exceed the full amount, because the full amount includes it.
- A deposit on its own is rejected: *"Set the full amount too, so guests know what they owe in total."*

Amounts accept `40`, `40.50`, `£40.50` or `1,250`. Negatives and anything with more than two decimal places are rejected rather than rounded, so a typo becomes an error rather than a charge. Whole amounts display without decimals — £40, not £40.00.

The currency is set once for the whole installation and is the same on every event.

## Recording a payment

On the [Guests](/events/guests) tab, each guest card gains a **Payment** row with two buttons:

- **Mark deposit paid**
- **Mark paid in full**

Both toggle — press again to clear a mistake — and the date each was settled appears beside them: *"Deposit 3 Aug"*, *"Settled 21 Aug"*.

**Marking someone paid in full settles their deposit at the same time**, and disables the deposit button while it stands. Somebody who has paid everything cannot also owe a deposit.

Payments are never gated on the RSVP deadline, since the money usually turns up long after replies close.

## Keeping track

A **Contributions** card at the top of the Guests tab shows the amounts per guest and three running counts:

| Count | Meaning |
| --- | --- |
| **Paid in full** | Nothing left to pay |
| **Deposit only** | Deposit received, balance outstanding |
| **Nothing yet** | No payment recorded |

The same three figures appear in the planning PDF, and each guest's payment state gets its own columns in the CSV — the state, the date the deposit was recorded, and the date the full payment was recorded. See [Exports](/events/exports).

The keepsake PDF never mentions money.

## What guests see

Two separate things, and the distinction matters.

**Cost to attend** is a property of the event, like the date or the venue. It mentions no guest, so it appears on the **public event page** as well as every invitation page — both taking their figures from the same place, so the price a guest sees can never drift from the price shown publicly.

> Anyone holding the public link can therefore see what the event costs. If that is not what you want, leave the amounts blank and tell guests the figure another way.

**Your payment** is personal to one guest, so it appears only on their own invitation page, and only after they have [confirmed their email address](/guests/index#confirming-it-is-them):

- *"Thank you, your contribution is settled in full."*
- *"Your deposit has been received, with £30.00 to follow."*
- *"Nothing recorded yet. The organiser will let you know how to pay, and will update this once it arrives."*

Guests cannot mark themselves as paid, and cannot see anyone else's payment state. Administrators cannot see payment data at all.

## Turning it off

Clear both amounts on the Details tab. The cost disappears from the public and invitation pages, the payment controls disappear from the Guests tab, and the payment columns disappear from the exports.

Any payments already recorded are retained, so restoring the amounts later brings the ticks back with them.
