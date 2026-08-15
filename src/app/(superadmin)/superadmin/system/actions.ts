"use server";

import { AuthorisationError, requireSuperadminForAction } from "@/lib/auth/guards";
import { AUDIT_EVENT, recordAudit } from "@/lib/audit";
import { clientIdentifier, consumeRateLimit } from "@/lib/rate-limit";
import { getMailer } from "@/lib/email";
import { testEmail } from "@/lib/email/templates";
import { type ActionState, failure, formString, success } from "@/lib/forms";
import { emailField } from "@/lib/validation";

/**
 * Sends a one-off test email so a superadmin can verify the deployed email
 * configuration (driver, credentials, from address) without needing an event
 * or guest to exist. Not part of Spec 6.9's listed superadmin capabilities —
 * added as a deliberate extension for operational visibility. Does not touch
 * guest data and cannot send on an organiser's behalf.
 */
export async function sendTestEmailAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let superadminId: string;
  try {
    superadminId = (await requireSuperadminForAction()).id;
  } catch (error) {
    return failure(error instanceof AuthorisationError ? error.message : "Something went wrong.");
  }

  const parsed = emailField.safeParse(formString(formData, "to"));
  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Enter a valid email address.");
  }
  const to = parsed.data;

  const limit = await consumeRateLimit("testEmail", await clientIdentifier());
  if (!limit.allowed) {
    return failure("You've sent a few test emails just now. Please wait a moment.");
  }

  const mailer = getMailer();

  try {
    await mailer.send(testEmail({ to, driver: mailer.name }));
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";

    await recordAudit({
      actorType: "superadmin",
      actorId: superadminId,
      eventType: AUDIT_EVENT.TEST_EMAIL_FAILED,
      metadata: { driver: mailer.name, reason },
    });

    return failure(`Sending failed: ${reason}`);
  }

  await recordAudit({
    actorType: "superadmin",
    actorId: superadminId,
    eventType: AUDIT_EVENT.TEST_EMAIL_SENT,
    metadata: { driver: mailer.name },
  });

  return success(`Test email sent to ${to} via the "${mailer.name}" driver.`);
}
