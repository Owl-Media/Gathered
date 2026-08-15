import type { EmailMessage } from "./types";
import { formatEventDate, formatWallTime } from "@/lib/time";
import { GRADIENTS, isPlaceholderTheme, type PlaceholderTheme } from "@/components/placeholder-art";

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

/**
 * `bannerHtml`, when given, renders full-bleed above the padded heading —
 * the email equivalent of `EventHero`'s header image/placeholder strip, so
 * the invitation reads as belonging to the same event page (Spec 13).
 */
function shell(heading: string, bodyHtml: string, bannerHtml?: string): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#fdf8f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fdf8f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:20px;border:1px solid #f0e2da;overflow:hidden;">
        ${bannerHtml ? `<tr><td>${bannerHtml}</td></tr>` : ""}
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

function button(href: string, label: string, accent = "#bd616c"): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td style="border-radius:999px;background-color:${accent};">
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

/**
 * Per-theme accent colour for the button, pulled from the same design tokens
 * as `globals.css` (`@/app/globals.css`) rather than introducing new colours.
 * Distinct from `GRADIENTS`, which is the pastel *background* pair — this is
 * the stronger shade a white-on-colour button needs to stay legible.
 */
const THEME_ACCENTS: Record<PlaceholderTheme, string> = {
  clouds: "#47708b", // sky-700
  moon: "#8f7530", // butter-700
  botanical: "#4d7053", // sage-700
  rainbow: "#bd616c", // blush-600
  balloons: "#9e4d57", // blush-700
  confetti: "#c9a94f", // butter-500
};

const THEME_EMOJI: Record<PlaceholderTheme, string> = {
  clouds: "☁️",
  moon: "🌙",
  botanical: "🌿",
  rainbow: "🌈",
  balloons: "🎈",
  confetti: "🎉",
};

/**
 * Full-bleed themed banner matching the event's chosen placeholder artwork
 * (`@/components/placeholder-art`). Reusing an illustrated SVG here isn't an
 * option — most email clients strip or ignore SVG — so the theme reads
 * through as its gradient plus a single emoji instead, which every client
 * renders somehow.
 */
function themedBanner(rawTheme: string): string {
  const theme: PlaceholderTheme = isPlaceholderTheme(rawTheme) ? rawTheme : "clouds";
  const [from, to] = GRADIENTS[theme];

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" bgcolor="${from}" style="background-color:${from};background-image:linear-gradient(135deg,${from},${to});padding:36px 0;font-size:40px;line-height:1;">
        ${THEME_EMOJI[theme]}
      </td>
    </tr>
  </table>`;
}

/**
 * Full-bleed banner using the organiser's own uploaded header photo, in place
 * of the themed placeholder. Header uploads are always processed to exactly
 * 1600x600 (`src/lib/images.ts` `TARGETS.header`), an 8:3 ratio, so fixed
 * `width`/`height` attributes can be set here without distorting or cropping
 * the image — and give clients that block remote images by default a
 * correctly-sized empty box rather than a layout jump.
 */
function imageBanner(url: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="line-height:0;">
        <img src="${escapeHtml(url)}" width="560" height="210" alt="" style="display:block;width:100%;max-width:560px;height:auto;aspect-ratio:8/3;">
      </td>
    </tr>
  </table>`;
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
  /** The event's chosen placeholder artwork (`events.placeholderTheme`). */
  placeholderTheme: string;
  /**
   * Absolute URL of the organiser's own uploaded header photo, if any
   * (`resolveEventImages` + `absoluteUrl`, see the call site). Takes the
   * place of the themed placeholder banner when present, the same
   * photo-over-placeholder precedence `EventHero` uses everywhere else.
   */
  headerImageUrl?: string | null;
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
  const theme: PlaceholderTheme = isPlaceholderTheme(input.placeholderTheme)
    ? input.placeholderTheme
    : "clouds";

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

    ${button(input.rsvpUrl, "Reply to your invitation", THEME_ACCENTS[theme])}

    <p style="margin:0 0 8px 0;font-size:14px;color:#806f74;">
      Or copy this link into your browser:<br>
      <span style="word-break:break-all;color:${THEME_ACCENTS[theme]};">${escapeHtml(input.rsvpUrl)}</span>
    </p>
    <p style="margin:16px 0 0 0;font-size:13px;color:#9c8c90;">
      This link is just for you, so please do not forward it. You'll be asked to
      confirm your email address before responding.
    </p>
  `,
    input.headerImageUrl ? imageBanner(input.headerImageUrl) : themedBanner(theme),
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

/* -------------------------------------------------------------------------- */
/* Test email (superadmin "System" page)                                      */
/* -------------------------------------------------------------------------- */

/**
 * Sent only when a superadmin explicitly presses "send test email" to verify
 * the deployed email configuration. Never triggered by guest or organiser
 * activity.
 */
export function testEmail(input: { to: string; driver: string }): EmailMessage {
  const subject = "Gathered test email";
  const sentAt = new Date().toISOString();

  const text = [
    "This is a test email from Gathered's superadmin System page.",
    "",
    `Delivered via the "${input.driver}" driver at ${sentAt}.`,
    "If you weren't expecting this, an operator triggered it while checking the deployed email configuration.",
  ].join("\n");

  const html = shell(
    "Test email",
    `
    <p style="margin:0 0 16px 0;">This is a test email from Gathered's superadmin System page.</p>
    <p style="margin:0 0 16px 0;">Delivered via the <strong>${escapeHtml(input.driver)}</strong> driver at ${escapeHtml(sentAt)}.</p>
    <p style="margin:0;font-size:13px;color:#9c8c90;">
      If you weren't expecting this, an operator triggered it while checking the deployed email
      configuration.
    </p>
  `,
  );

  return { to: input.to, subject, text, html };
}
