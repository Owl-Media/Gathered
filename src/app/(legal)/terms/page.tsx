import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_LAST_UPDATED, operator } from "@/lib/legal";
import {
  LegalTitle,
  OperatorDetails,
  OperatorNotConfigured,
  Section,
} from "@/components/legal-prose";

/**
 * Terms and conditions for this installation.
 *
 * Written for what the app actually does. Two points are load-bearing and
 * should not be softened without checking the code: no money moves through this
 * platform, and an organiser is responsible for the guest details they upload.
 */
export const metadata: Metadata = {
  title: "Terms",
  description: "The terms for using this site.",
};

/** Reads the runtime environment, so it must not be prerendered. See /privacy. */
export const dynamic = "force-dynamic";

export default function TermsPage() {
  return (
    <article className="card card-padded">
      <LegalTitle title="Terms and conditions" lastUpdated={LEGAL_LAST_UPDATED} />

      <OperatorNotConfigured />

      <Section heading="Who these terms are with">
        <p>
          These terms govern your use of this site. They are an agreement between you and:
        </p>
        <OperatorDetails />
        <p>
          By creating an account, or by replying to an invitation, you accept these terms. If you do
          not accept them, please do not use the site.
        </p>
      </Section>

      <Section heading="What this service is">
        <p>
          Gathered is a private invitation and RSVP tool for small events. An organiser creates an
          event, invites guests individually, and collects their replies, menu choices and messages.
          There is no public directory, and events are not listed or searchable anywhere.
        </p>
      </Section>

      <Section heading="Organiser accounts">
        <ul className="ml-5 list-disc space-y-1">
          <li>Give accurate account details and keep your password to yourself.</li>
          <li>You are responsible for everything done through your account.</li>
          <li>
            You are responsible for the guest details you enter. Only add someone's name and email
            address if you have a proper reason to hold them and they would reasonably expect an
            invitation from you.
          </li>
          <li>
            Treat what your guests tell you with care, particularly allergies and dietary
            requirements. Use it to plan the event, and not for anything else.
          </li>
          <li>
            Only upload images you have the right to use, and nothing unlawful, offensive or
            harmful.
          </li>
        </ul>
      </Section>

      <Section heading="Guests">
        <p>
          Your invitation link is personal to you. Please do not forward or publish it — anyone with
          the link and your email address can reply on your behalf. Replying is voluntary, and the
          dietary and message boxes are optional.
        </p>
      </Section>

      <Section heading="Things you must not do">
        <ul className="ml-5 list-disc space-y-1">
          <li>Try to reach another organiser's events, or another guest's invitation or replies.</li>
          <li>Guess, collect or share invitation links that are not yours.</li>
          <li>Probe, scan or overload the service, or work around its security or rate limits.</li>
          <li>Use the service to send unsolicited or bulk email.</li>
          <li>Use it for anything unlawful.</li>
        </ul>
      </Section>

      <Section heading="Money">
        <p>
          <strong>No payment is taken through this site.</strong> Where an event asks for a
          contribution, the amount is shown for information and the organiser records whether it has
          been received. Any money changes hands directly between you and the organiser, by
          whatever means you agree between yourselves.
        </p>
        <p>
          The operator is not a party to that arrangement, does not hold any funds, and cannot help
          with refunds or disputes about them. Take those up with your organiser.
        </p>
      </Section>

      <Section heading="Availability">
        <p>
          The service is provided as it is, without any guarantee that it will always be available
          or free of faults. It may be interrupted for maintenance, upgrades or reasons outside the
          operator's control. Please keep your own copy of anything you cannot afford to lose — the
          export tools are there for exactly that.
        </p>
      </Section>

      <Section heading="Suspension">
        <p>
          An account may be suspended or removed if these terms are broken, or where necessary to
          protect the service or other people using it. When an account is suspended, its event
          pages and invitation links stop working. You may close your account at any time by asking
          the operator.
        </p>
      </Section>

      <Section heading="Liability">
        <p>
          Nothing in these terms limits liability for death or personal injury caused by negligence,
          for fraud, or for anything else that cannot be limited by law. Your statutory rights as a
          consumer are not affected.
        </p>
        <p>
          Subject to that, the operator is not liable for indirect or consequential loss, for lost
          profits, or for events that do not go to plan — including invitations that are not
          delivered, replies that are not received, and catering arranged on the strength of them.
          Check your guest list before you rely on it.
        </p>
      </Section>

      <Section heading="The software">
        <p>
          Gathered is open source software published under the MIT licence. That licence covers the
          software itself; these terms cover your use of this particular installation of it, which
          is run by the operator named above.
        </p>
      </Section>

      <Section heading="Changes and governing law">
        <p>
          These terms may be updated, and the date at the top changes when they are. Continuing to
          use the service means accepting the current version.
        </p>
        <p>
          {operator.jurisdiction
            ? `These terms are governed by the law of ${operator.jurisdiction}, and its courts have jurisdiction.`
            : "These terms are governed by the law of the country in which the operator is established."}{" "}
          If you are a consumer, you keep the protection of the mandatory laws of the country you
          live in.
        </p>
        <p>
          See also the{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            privacy notice
          </Link>
          .
        </p>
      </Section>
    </article>
  );
}
