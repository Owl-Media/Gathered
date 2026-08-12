import nodemailer, { type Transporter } from "nodemailer";
import { EmailDeliveryError, type EmailMessage, type Mailer } from "./types";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
}

/**
 * Generic SMTP mailer. Works with Postmark, SES, Mailgun, Fastmail, a
 * self-hosted relay, or anything else that speaks SMTP.
 */
export class SmtpMailer implements Mailer {
  readonly name = "smtp";
  private transporter: Transporter | null = null;

  constructor(
    private readonly config: SmtpConfig,
    private readonly from: string,
  ) {}

  private getTransporter(): Transporter {
    this.transporter ??= nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth:
        this.config.user && this.config.password
          ? { user: this.config.user, pass: this.config.password }
          : undefined,
    });
    return this.transporter;
  }

  async send(message: EmailMessage): Promise<void> {
    try {
      await this.getTransporter().sendMail({
        from: this.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
    } catch (error) {
      throw new EmailDeliveryError(
        error instanceof Error ? error.message : "SMTP delivery failed",
        this.name,
        error,
      );
    }
  }
}
