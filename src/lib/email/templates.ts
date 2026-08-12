import type { EmailMessage } from "./types";
import { formatEventDate, formatWallTime } from "@/lib/time";

/**
 * Email templates (Spec 6.5, 12.4).
 *
 * Written with inline styles and a single-column table, which is what email
 * clients actually render reliably. Every interpolated value is HTML-escaped.
 * Event names and locations are organiser-supplied text.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function shell(heading: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#fdf8f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fdf8f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:20px;border:1px solid #f0e2da;overflow:hidden;">
        <tr><td style="padding:32px 32px 8px 32px;">
          <h1 style="margin:0 0 16px 0;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;color:#3a2f33;font-weight:600;">${escapeHtml(heading)}</h1>
        </td></tr>
        <tr><td style="padding:0 32px 32px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#574a4e;">
          ${bodyHtml}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td style="border-radius:999px;background-color:#bd616c;">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(label)}</a>
    </td></tr>
  </table>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 16px 6px 0;font-size:14px;color:#806f74;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:6px 0;font-size:15px;color:#3a2f33;font-weight:500;">${escapeHtml(value)}</td>
  </tr>`;
}

/* -------------------------------------------------------------------------- */
/* Invitation (Spec 6.5)                                                      */
/* -------------------------------------------------------------------------- */

export interface InvitationEmailInput {
  guestForename: string;
  guestEmail: string;
  eventName: string;
  eventDate: string;
  startTime: string;
  locationName: string;
  locationAddress: string;
  /** Optional (Spec 6.5 "may include". */
  organiserName?: string;
  description?: string | null;
  rsvpUrl: string;
}

/**
 * Builds the invitation email.
 *
 * Contains only this guest's own details and their own private link. No other
 * guest's information, no RSVP counts, and no other private links ever appear
 * here (Spec 6.5, 15.6).
 */
export function invitationEmail(input: InvitationEmailInput): EmailMessage {
  const dateLabel = formatEventDate(input.eventDate);
  const timeLabel = formatWallTime(input.startTime);
  const subject = `You're invited: ${input.eventName}`;

  const shortDescription = input.description
    ? input.description.split("\n").slice(0, 3).join(" ").slice(0, 240)
    : null;

  const text = [
    `Hello ${input.guestForename},`,
    "",
    input.organiserName
      ? `${input.organiserName} has invited you to ${input.eventName}.`
      : `You are invited to ${input.eventName}.`,
    "",
    `When:  ${dateLabel} at ${timeLabel}`,
    `Where: ${input.locationName}, ${input.locationAddress}`,
    ...(shortDescription ? ["", shortDescription] : []),
    "",
    "Please let us know if you can make it:",
    input.rsvpUrl,
    "",
    "This link is just for you, so please do not forward it.",
    "You'll be asked to confirm your email address before responding.",
  ].join("\n");

  const html = shell(
    `You're invited to ${input.eventName}`,
    `
    <p style="margin:0 0 16px 0;">Hello ${escapeHtml(input.guestForename)},</p>
    <p style="margin:0 0 20px 0;">${
      input.organiserName
        ? `${escapeHtml(input.organiserName)} has invited you to <strong>${escapeHtml(input.eventName)}</strong>.`
        : `You are invited to <strong>${escapeHtml(input.eventName)}</strong>.`
    }</p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 8px 0;">
      ${detailRow("When", `${dateLabel} at ${timeLabel}`)}
      ${detailRow("Where", `${input.locationName}, ${input.locationAddress}`)}
    </table>

    ${shortDescription ? `<p style="margin:16px 0 0 0;color:#574a4e;">${escapeHtml(shortDescription)}</p>` : ""}

    ${button(input.rsvpUrl, "Reply to your invitation")}

    <p style="margin:0 0 8px 0;font-size:14px;color:#806f74;">
      Or copy this link into your browser:<br>
      <span style="word-break:break-all;color:#9e4d57;">${escapeHtml(input.rsvpUrl)}</span>
    </p>
    <p style="margin:16px 0 0 0;font-size:13px;color:#9c8c90;">
      This link is just for you, so please do not forward it. You'll be asked to
      confirm your email address before responding.
    </p>
  `,
  );

  return { to: input.guestEmail, subject, text, html };
}

/* -------------------------------------------------------------------------- */
/* Password reset (Spec 4.1, 12.4)                                            */
/* -------------------------------------------------------------------------- */

export function passwordResetEmail(input: {
  to: string;
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
}): EmailMessage {
  const subject = "Reset your Gathered password";

  const text = [
    `Hello ${input.name},`,
    "",
    "We received a request to reset your password.",
    "",
    input.resetUrl,
    "",
    `This link expires in ${input.expiresInMinutes} minutes and can only be used once.`,
    "If you didn't ask for this, you can safely ignore this email and your password will not change.",
  ].join("\n");

  const html = shell(
    "Reset your password",
    `
    <p style="margin:0 0 16px 0;">Hello ${escapeHtml(input.name)},</p>
    <p style="margin:0 0 8px 0;">We received a request to reset your password.</p>
    ${button(input.resetUrl, "Choose a new password")}
    <p style="margin:0 0 8px 0;font-size:14px;color:#806f74;">
      Or copy this link into your browser:<br>
      <span style="word-break:break-all;color:#9e4d57;">${escapeHtml(input.resetUrl)}</span>
    </p>
    <p style="margin:16px 0 0 0;font-size:13px;color:#9c8c90;">
      This link expires in ${input.expiresInMinutes} minutes and can only be used once.
      If you didn't ask for this, you can safely ignore this email and your password will not change.
    </p>
  `,
  );

  return { to: input.to, subject, text, html };
}
