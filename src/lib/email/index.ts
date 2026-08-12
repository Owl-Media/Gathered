import "server-only";
import { env } from "@/lib/env";
import type { Mailer } from "./types";
import { ConsoleMailer } from "./console-mailer";
import { ResendMailer } from "./resend-mailer";
import { SmtpMailer } from "./smtp-mailer";

export type { EmailMessage, Mailer } from "./types";
export { EmailDeliveryError } from "./types";

let cached: Mailer | null = null;

/**
 * Resolves the configured mailer (Spec 12.4). Instantiated lazily so that
 * provider SDKs are only loaded when actually configured.
 */
export function getMailer(): Mailer {
  if (cached) return cached;

  switch (env.EMAIL_DRIVER) {
    case "resend":
      cached = new ResendMailer(env.RESEND_API_KEY!, env.EMAIL_FROM);
      break;
    case "smtp":
      cached = new SmtpMailer(
        {
          host: env.SMTP_HOST!,
          port: env.SMTP_PORT,
          secure: env.SMTP_SECURE,
          user: env.SMTP_USER,
          password: env.SMTP_PASSWORD,
        },
        env.EMAIL_FROM,
      );
      break;
    case "console":
    default:
      cached = new ConsoleMailer(env.EMAIL_FROM);
      break;
  }

  return cached;
}

/** Test seam. Forces the next getMailer() call to re-read configuration. */
export function resetMailerCache(): void {
  cached = null;
}
