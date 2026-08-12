import { Resend } from "resend";
import { EmailDeliveryError, type EmailMessage, type Mailer } from "./types";

export class ResendMailer implements Mailer {
  readonly name = "resend";
  private client: Resend | null = null;

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  private getClient(): Resend {
    this.client ??= new Resend(this.apiKey);
    return this.client;
  }

  async send(message: EmailMessage): Promise<void> {
    try {
      const result = await this.getClient().emails.send({
        from: this.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });

      // Resend reports delivery problems in the response body rather than by
      // throwing, so a returned error must be promoted to a real failure.
      // Otherwise Spec 9.7's "do not mark the invite as sent" would be violated.
      if (result.error) {
        throw new EmailDeliveryError(result.error.message, this.name, result.error);
      }
    } catch (error) {
      if (error instanceof EmailDeliveryError) throw error;
      throw new EmailDeliveryError(
        error instanceof Error ? error.message : "Resend delivery failed",
        this.name,
        error,
      );
    }
  }
}
