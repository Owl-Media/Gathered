import "server-only";
import { env } from "@/lib/env";

/**
 * The facts behind `/privacy` and `/terms`.
 *
 * Gathered is self-hosted, so two things that a privacy notice must state are
 * unknowable at build time: who the data controller is, and which third parties
 * actually see the data. The controller comes from the environment, and the
 * recipients are derived from how *this* deployment is configured, so the notice
 * describes the install it is served from rather than a hypothetical one
 * (GDPR Art. 13(1)(a) and 13(1)(e)).
 *
 * Kept out of the page components so the derivation can be unit tested without
 * rendering, and so there is one place to look when a new driver is added.
 */

/** Bumped by hand when the wording of either notice changes materially. */
export const LEGAL_LAST_UPDATED = "2026-08-17";

export const operator = {
  name: env.LEGAL_ENTITY_NAME,
  contactEmail: env.LEGAL_CONTACT_EMAIL,
  postalAddress: env.LEGAL_POSTAL_ADDRESS,
  jurisdiction: env.LEGAL_JURISDICTION,
} as const;

/**
 * Whether the deployer has supplied enough to make the notices lawful. A
 * controller with no reachable contact cannot honour a data subject request, so
 * both are required before the pages stop warning.
 */
export const operatorConfigured = operator.name !== "" && operator.contactEmail !== "";

export interface RecipientCategory {
  category: string;
  purpose: string;
}

/**
 * Categories of recipient, which is what Art. 13(1)(e) asks for. Deliberately
 * categories and not hostnames: naming the configured SMTP host or S3 endpoint
 * on a public page would publish this deployment's infrastructure for no legal
 * gain. Resend is named because it is the recipient, not a category.
 */
export function recipientCategories(): RecipientCategory[] {
  const recipients: RecipientCategory[] = [
    {
      category: "Hosting provider",
      purpose: "Operates the servers and database this application runs on.",
    },
  ];

  if (env.EMAIL_DRIVER === "resend") {
    recipients.push({
      category: "Resend (email delivery)",
      purpose:
        "Delivers invitation and password reset emails. Receives the recipient's name, email address and the private invitation link.",
    });
  } else if (env.EMAIL_DRIVER === "smtp") {
    recipients.push({
      category: "Email delivery provider",
      purpose:
        "Delivers invitation and password reset emails. Receives the recipient's name, email address and the private invitation link.",
    });
  }

  if (env.STORAGE_DRIVER === "s3") {
    recipients.push({
      category: "Object storage provider",
      purpose: "Stores the event images an organiser uploads. Holds no guest data.",
    });
  }

  return recipients;
}

/**
 * Retention. The honest default matters here: Gathered has no scheduled
 * deletion, so the notice must not imply data disappears on a timer unless the
 * deployer has said it does and means it.
 */
export function retentionStatement(): string {
  return (
    env.LEGAL_RETENTION_STATEMENT ||
    "Event and guest records are kept for as long as the organiser keeps the event. " +
      "They are not deleted automatically. You can ask for your data to be erased at any time using the contact details above."
  );
}
