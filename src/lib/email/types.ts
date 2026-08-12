/**
 * Transactional email abstraction (Spec 12.4).
 *
 * The provider is deliberately not baked in (Spec 19, "Couple email sending to
 * one provider with no abstraction"). Everything downstream depends only on
 * this interface; swapping providers is an environment variable change.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  /** Plain-text body. Always populated, some clients prefer or require it. */
  text: string;
  html: string;
}

export interface Mailer {
  /** Identifier used in logs and audit metadata, e.g. "resend". */
  readonly name: string;
  /**
   * Sends a message. MUST reject on failure rather than swallowing the error:
   * Spec 9.7 requires failures to reach the organiser and never be recorded as
   * a successful send.
   */
  send(message: EmailMessage): Promise<void>;
}

export class EmailDeliveryError extends Error {
  constructor(
    message: string,
    readonly provider: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}
