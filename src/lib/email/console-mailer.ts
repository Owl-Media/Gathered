import type { EmailMessage, Mailer } from "./types";

/**
 * Development mailer: prints the message instead of sending it.
 *
 * This is the default driver so a fresh checkout works with no provider
 * account, and so nothing is ever accidentally delivered to a real guest while
 * testing. The private RSVP link is printed in full on purpose. Locally it is
 * the only way to follow the invitation.
 */
export class ConsoleMailer implements Mailer {
  readonly name = "console";

  constructor(private readonly from: string) {}

  async send(message: EmailMessage): Promise<void> {
    const divider = "─".repeat(72);
    console.log(
      [
        "",
        divider,
        `📧  EMAIL (console driver, not actually sent)`,
        divider,
        `From:    ${this.from}`,
        `To:      ${message.to}`,
        `Subject: ${message.subject}`,
        divider,
        message.text,
        divider,
        "",
      ].join("\n"),
    );
  }
}
