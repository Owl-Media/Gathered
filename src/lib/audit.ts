import "server-only";
import { db } from "@/db";
import { auditEvents } from "@/db/schema";
import type { ActorType } from "@/db/schema";

/**
 * Audit logging (Spec 10.7).
 *
 * Superadmins can read audit records (Spec 6.9) but are barred from guest
 * dietary requirements, guest messages and RSVP tokens (Spec 3.3, 6.9). The
 * metadata scrubber below enforces that boundary at the write site, so a
 * careless caller cannot leak that data into a surface superadmins can see.
 */

export const AUDIT_EVENT = {
  EVENT_CREATED: "event.created",
  EVENT_UPDATED: "event.updated",
  GUEST_ADDED: "guest.added",
  GUEST_REMOVED: "guest.removed",
  GUEST_PAYMENT_RECORDED: "guest.payment_recorded",
  INVITATION_EMAIL_SENT: "invitation_email.sent",
  INVITATION_EMAIL_FAILED: "invitation_email.failed",
  RSVP_SUBMITTED: "rsvp.submitted",
  RSVP_UPDATED: "rsvp.updated",
  RSVP_EDITED_BY_ORGANISER: "rsvp.edited_by_organiser",
  ORGANISER_ACCOUNT_DISABLED: "organiser_account.disabled",
  ORGANISER_ACCOUNT_ENABLED: "organiser_account.enabled",
  EXPORT_GENERATED: "export.generated",
  PASSWORD_RESET_REQUESTED: "password_reset.requested",
  PASSWORD_RESET_COMPLETED: "password_reset.completed",
  ORGANISER_REGISTERED: "organiser.registered",
  LOGIN_SUCCEEDED: "login.succeeded",
  LOGIN_FAILED: "login.failed",
  MENU_COURSE_ARCHIVED: "menu_course.archived",
  MENU_OPTION_ARCHIVED: "menu_option.archived",
  IMAGE_UPLOADED: "image.uploaded",
  IMAGE_UPLOAD_FAILED: "image.upload_failed",
} as const;

export type AuditEventType = (typeof AUDIT_EVENT)[keyof typeof AUDIT_EVENT];

/**
 * Keys that must never reach the audit log. Matched case-insensitively as a
 * substring, so `guestMessage`, `dietary_requirements` and `rsvpToken` are all
 * caught.
 */
const FORBIDDEN_METADATA_KEYS = [
  "token",
  "dietary",
  "message",
  "note",
  "password",
  "secret",
  "email",
];

function scrubMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    const lowered = key.toLowerCase();
    const isSensitiveKey = FORBIDDEN_METADATA_KEYS.some((forbidden) =>
      lowered.includes(forbidden),
    );

    /**
     * Booleans and numbers cannot carry personal content, so a flag such as
     * `includeOrganiserNotes: true` is kept even though its name matches
     * "note". Recording whether an export included private notes is exactly
     * the kind of fact the audit log exists for; redacting it would lose
     * information while protecting nothing.
     */
    const canCarryContent = typeof value !== "boolean" && typeof value !== "number";

    safe[key] = isSensitiveKey && canCarryContent ? "[redacted]" : value;
  }

  return safe;
}

export interface AuditInput {
  actorType: ActorType;
  actorId?: string | null;
  eventType: AuditEventType;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Writes an audit record. Never throws: an audit failure must not roll back or
 * mask the user-facing operation that succeeded.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await db.insert(auditEvents).values({
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      eventType: input.eventType,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      metadata: input.metadata ? scrubMetadata(input.metadata) : null,
    });
  } catch (error) {
    console.error("[audit] failed to record event", {
      eventType: input.eventType,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Exported for unit testing the redaction rules. */
export const __testing = { scrubMetadata };
