import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_LAST_UPDATED, operator, recipientCategories, retentionStatement } from "@/lib/legal";
import {
  LegalTitle,
  OperatorDetails,
  OperatorNotConfigured,
  Section,
} from "@/components/legal-prose";

/**
 * Privacy notice (GDPR Art. 13).
 *
 * The wording describes what this codebase actually does, not a generic
 * template: the cookie list, the recipients and the retention line are all
 * derived from the running configuration. If you change how data is collected,
 * change this page in the same commit.
 */
export const metadata: Metadata = {
  title: "Privacy",
  description: "How this site handles personal data.",
};

/**
 * Rendered per request rather than prerendered.
 *
 * Nothing here changes between requests, so this page would happily be static —
 * but `next build` runs without the real environment (see the note in
 * `lib/env.ts`), and Coolify injects it when the container starts. Prerendering
 * would therefore freeze the build-time values into the page, and every
 * deployment would serve a privacy notice permanently reading "not configured"
 * no matter what the operator had set.
 */
export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  const recipients = recipientCategories();

  return (
    <article className="card card-padded">
      <LegalTitle title="Privacy notice" lastUpdated={LEGAL_LAST_UPDATED} />

      <OperatorNotConfigured />

      <Section heading="Who is responsible for your data">
        <p>
          This site runs Gathered, a private RSVP platform for small events. It is operated by:
        </p>
        <OperatorDetails />
        <p>
          Two different people handle your information. The <strong>organiser</strong> who invited
          you decides who to invite and what to ask them. The <strong>operator</strong> named above
          runs the software and the servers it sits on. If you want something changed or deleted,
          either can help, and the contact address above always works.
        </p>
      </Section>

      <Section heading="If you are a guest">
        <p>The organiser gives us your name and email address so they can send you an invitation.</p>
        <p>When you reply, we store what you tell us:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>whether you are coming;</li>
          <li>your menu choices, if the event has a menu;</li>
          <li>any allergies or dietary requirements you enter, which are optional;</li>
          <li>any message you leave for the organiser, which is optional;</li>
          <li>when you last replied.</li>
        </ul>
        <p>
          The organiser may also record a private note about you, and whether you have paid towards
          the cost of the event, if the event asks for a contribution.
        </p>
        <p>
          Other guests never see any of this. They cannot see your name, whether you are coming,
          what you chose to eat, your dietary requirements, your message, or your invitation link.
          Nor can they see how many people are coming.
        </p>
      </Section>

      <Section heading="Allergies and dietary requirements">
        <p>
          What you write in the dietary requirements box can reveal something about your health or
          your beliefs — a food allergy, a medical condition, or a religious diet. Data protection
          law treats that as a special category of information that needs stronger protection, so we
          ask for your explicit consent before storing it, and the box is always optional.
        </p>
        <p>
          You can withdraw that consent whenever you like: open your invitation link before the RSVP
          deadline, clear the box and save. That erases what you wrote. After the deadline, ask the
          organiser or the operator instead.
        </p>
        <p>
          It is only ever used to plan the catering. It is shown to your organiser and included in
          the catering lists they export. It is never shown to other guests, and administrators of
          this site cannot read it.
        </p>
      </Section>

      <Section heading="If you are an organiser">
        <p>
          We store your name, your email address and a cryptographic hash of your password — never
          the password itself. We also keep a record of your sign-ins and of significant actions on
          your account, so that suspicious activity can be investigated.
        </p>
        <p>
          Everything you enter about your event and your guests is yours. Administrators of this
          site can see that your event exists and how many guests it has, but deliberately cannot
          read your guests' dietary requirements, their messages, or their invitation links. There
          is no way for an administrator to sign in as you.
        </p>
      </Section>

      <Section heading="Why we are allowed to hold it">
        <ul className="ml-5 list-disc space-y-1">
          <li>
            <strong>Your consent</strong>, for allergies and dietary requirements, and for the
            message you choose to leave.
          </li>
          <li>
            <strong>Legitimate interests</strong>, for running the guest list itself: you were
            invited to an event and the organiser needs to know who is coming. This is the ordinary
            business of organising a party, and it is what you would expect an invitation to
            involve.
          </li>
          <li>
            <strong>Performance of a contract</strong>, for organiser accounts — we cannot provide
            an account without account details.
          </li>
          <li>
            <strong>Legitimate interests</strong>, for security records such as rate limiting and
            the audit log, to keep the platform from being abused.
          </li>
        </ul>
      </Section>

      <Section heading="Cookies">
        <p>
          This site sets two cookies. Both are strictly necessary to make it work, so there is no
          cookie banner to click through — there is nothing optional to consent to.
        </p>
        <div className="overflow-x-auto">
          <table className="mt-1 w-full text-left text-sm">
            <thead>
              <tr className="text-ink-500 border-cream-300 border-b">
                <th className="py-2 pr-4 font-medium">Cookie</th>
                <th className="py-2 pr-4 font-medium">Purpose</th>
                <th className="py-2 font-medium">Expires</th>
              </tr>
            </thead>
            <tbody className="text-ink-700">
              <tr className="border-cream-200 border-b">
                <td className="py-2 pr-4 align-top">
                  <code>gathered_session</code>
                </td>
                <td className="py-2 pr-4 align-top">Keeps an organiser signed in.</td>
                <td className="py-2 align-top">30 days</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 align-top">
                  <code>gathered_rsvp_access</code>
                </td>
                <td className="py-2 pr-4 align-top">
                  Remembers that you confirmed your email address, so you are not asked again on
                  every page.
                </td>
                <td className="py-2 align-top">2 hours</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          There is no analytics, no advertising, and no third-party tracking of any kind on this
          site. Fonts are served from this site rather than from an external provider, so simply
          opening a page does not tell anyone else that you were here.
        </p>
      </Section>

      <Section heading="Who else sees your data">
        <p>
          Your data is not sold, and it is not shared for marketing. These are the categories of
          provider involved in running the service:
        </p>
        <ul className="ml-5 list-disc space-y-1">
          {recipients.map((recipient) => (
            <li key={recipient.category}>
              <strong>{recipient.category}</strong> — {recipient.purpose}
            </li>
          ))}
        </ul>
      </Section>

      <Section heading="How long it is kept">
        <p>{retentionStatement()}</p>
        <p>
          Security records are shorter-lived: rate limiting counters are discarded within a day, and
          they hold a one-way hash of your IP address rather than the address itself.
        </p>
      </Section>

      <Section heading="Your rights">
        <p>
          Under the UK and EU GDPR you can ask for a copy of your data, ask for it to be corrected
          or erased, object to how it is used, ask for its use to be restricted, and withdraw any
          consent you have given. Withdrawing consent does not undo anything done before you
          withdrew it.
        </p>
        <p>
          To exercise any of these, contact the operator at{" "}
          {operator.contactEmail ? (
            <a href={`mailto:${operator.contactEmail}`} className="underline underline-offset-2">
              {operator.contactEmail}
            </a>
          ) : (
            "the address above"
          )}
          , or speak to the organiser who invited you. We will respond within one month.
        </p>
        <p className="text-ink-500 text-sm">
          Guests: there is deliberately no page where you can type an email address and see what we
          hold. Such a page would let anyone check whether a person had been invited to an event,
          which would harm the privacy of every other guest. Requests go through a person instead.
        </p>
      </Section>

      <Section heading="How it is protected">
        <p>
          Connections are encrypted. Passwords are hashed with Argon2id. Invitation links are long
          random tokens that are never stored in a directly usable form, and they stop working as
          soon as a guest is removed from an event. Pages on this site are not indexed by search
          engines, and there is no public directory of events or attendees.
        </p>
      </Section>

      <Section heading="Complaints">
        <p>
          If you are unhappy with how your data has been handled, please tell the operator first. You
          also have the right to complain to your data protection supervisory authority
          {operator.jurisdiction ? ` in ${operator.jurisdiction}` : ""} — in the UK that is the
          Information Commissioner's Office, and in the EU it is the authority for the country you
          live in.
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          If this notice changes materially, the date at the top changes with it. Please see also
          the <Link href="/terms" className="underline underline-offset-2">terms and conditions</Link>.
        </p>
      </Section>
    </article>
  );
}
