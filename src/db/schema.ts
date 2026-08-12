import { sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/* Enums                                                                      */
/* -------------------------------------------------------------------------- */

export const userRoleEnum = pgEnum("user_role", ["organiser", "superadmin"]);

/** Spec 4.6 / 8.3, the only valid RSVP statuses. */
export const rsvpStatusEnum = pgEnum("rsvp_status", ["not_responded", "accepted", "declined"]);

/** Spec 5.5, "Response source values". */
export const responseSourceEnum = pgEnum("response_source", [
  "not_responded",
  "guest_submitted",
  "organiser_edited",
]);

/** Spec 10.7, audit actor types. */
export const actorTypeEnum = pgEnum("actor_type", ["guest", "organiser", "superadmin", "system"]);

/* -------------------------------------------------------------------------- */
/* Users / accounts (Spec 10.1)                                               */
/* -------------------------------------------------------------------------- */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    /** Always stored normalised to lowercase so matching is unambiguous. */
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("organiser"),
    /** Non-null means the account is disabled and cannot log in (Spec 6.9). */
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    disabledByUserId: uuid("disabled_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email)],
);

/**
 * Opaque server-side sessions. The cookie holds a random token; only its
 * SHA-256 hash is stored, so a database leak does not yield usable sessions.
 * Server-side storage also lets a superadmin's "disable account" take effect
 * immediately, which a stateless JWT could not guarantee.
 */
export const sessions = pgTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/** Spec 4.1.Password reset requires a secure reset token. */
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("password_reset_user_idx").on(t.userId)],
);

/* -------------------------------------------------------------------------- */
/* Uploaded image metadata (Spec 8.7, metadata lives in PostgreSQL)          */
/* -------------------------------------------------------------------------- */

export const uploads = pgTable(
  "uploads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Driver-relative key, e.g. "events/<uuid>/header-<random>.webp". */
    storageKey: text("storage_key").notNull(),
    storageDriver: text("storage_driver").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("uploads_owner_idx").on(t.ownerUserId)],
);

/* -------------------------------------------------------------------------- */
/* Events (Spec 10.2)                                                         */
/* -------------------------------------------------------------------------- */

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organiserId: uuid("organiser_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Human-readable slug + random suffix, e.g. "amelias-baby-shower-k7m2p9qx". */
    publicSlug: text("public_slug").notNull(),

    name: text("name").notNull(),
    /** Wall-clock calendar date in the event's own timezone. */
    eventDate: date("event_date").notNull(),
    /** Wall-clock times in the event's own timezone. */
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    /** IANA identifier, e.g. "Europe/London" (Spec 6.8). */
    timezone: text("timezone").notNull(),

    locationName: text("location_name").notNull(),
    locationAddress: text("location_address").notNull(),
    /** Plain text only; rendered escaped with newlines preserved (Spec 4.2). */
    description: text("description"),

    /**
     * Exact instant the RSVP window closes, derived from the organiser's
     * wall-clock deadline interpreted in `timezone`. Stored as an instant so
     * comparisons never depend on the server's timezone (Spec 6.8).
     */
    rsvpDeadlineAt: timestamp("rsvp_deadline_at", { withTimezone: true }).notNull(),

    headerImageId: uuid("header_image_id").references(() => uploads.id, { onDelete: "set null" }),
    profileImageId: uuid("profile_image_id").references(() => uploads.id, { onDelete: "set null" }),
    /** Which placeholder illustration to use when no image is uploaded (Spec 17 Q7). */
    placeholderTheme: text("placeholder_theme").notNull().default("clouds"),

    /**
     * Optional contribution amounts, held as integer minor units (pence), never
     * as a decimal type or a float. Both are null on events that do not ask
     * guests for money, and the whole payment feature stays hidden in that case.
     *
     * `totalAmountMinor` is inclusive of `depositAmountMinor`, so the balance
     * still to pay is the difference between them.
     *
     * Approved deviation from Spec 16, which lists paid events as a non-goal.
     * This records payments taken offline; no money moves through the platform.
     */
    depositAmountMinor: integer("deposit_amount_minor"),
    totalAmountMinor: integer("total_amount_minor"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    /**
     * Reserved so deleted events can be excluded from the dashboard as Spec 5.1
     * requires. No delete UI ships in the MVP; event deletion is not an
     * organiser capability under Spec 3.1.
     */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("events_public_slug_unique").on(t.publicSlug),
    index("events_organiser_idx").on(t.organiserId),
  ],
);

/* -------------------------------------------------------------------------- */
/* Menu (Spec 10.3, 10.4)                                                     */
/* -------------------------------------------------------------------------- */

export const menuCourses = pgTable(
  "menu_courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    /** Archive rather than delete when responses reference it (Spec 8.4). */
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("menu_courses_event_idx").on(t.eventId, t.displayOrder)],
);

export const menuOptions = pgTable(
  "menu_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => menuCourses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    /** e.g. "Vegetarian", "Vegan", "Gluten free". */
    dietaryLabel: text("dietary_label"),
    displayOrder: integer("display_order").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("menu_options_course_idx").on(t.courseId, t.displayOrder)],
);

/* -------------------------------------------------------------------------- */
/* Guests (Spec 10.5)                                                         */
/* -------------------------------------------------------------------------- */

export const guests = pgTable(
  "guests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    forename: text("forename").notNull(),
    surname: text("surname").notNull(),
    /** Normalised lowercase, used for RSVP email verification (Spec 4.5). */
    email: text("email").notNull(),

    /**
     * SHA-256 of the RSVP token. Indexed, so an incoming link is resolved by
     * hashing what was presented, the plaintext token is never queried.
     */
    rsvpTokenLookup: text("rsvp_token_lookup").notNull(),
    /**
     * The same token sealed with AES-256-GCM so the organiser can still copy
     * the invitation link later (Spec 15.6) without the database holding a
     * directly usable secret. See src/lib/crypto/token-cipher.ts.
     */
    rsvpTokenSealed: text("rsvp_token_sealed").notNull(),

    rsvpStatus: rsvpStatusEnum("rsvp_status").notNull().default("not_responded"),
    responseSource: responseSourceEnum("response_source").notNull().default("not_responded"),
    /** Sensitive personal information (Spec 8.2). */
    dietaryRequirements: text("dietary_requirements"),
    /** Guest-authored note to the organiser / parent-to-be (Addendum). */
    guestMessage: text("guest_message"),
    /** Organiser-only, never guest-visible (Spec 6.7). */
    organiserNote: text("organiser_note"),
    lastResponseAt: timestamp("last_response_at", { withTimezone: true }),
    lastEditedByUserId: uuid("last_edited_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    /** Soft deletion: removal invalidates the link but retains audit data. */
    removedAt: timestamp("removed_at", { withTimezone: true }),

    /** Invitation email state (Spec 9.7, failures must not look like sends). */
    invitationSentAt: timestamp("invitation_sent_at", { withTimezone: true }),
    invitationLastError: text("invitation_last_error"),

    /**
     * Payments recorded by the organiser for money taken offline. Timestamps
     * rather than booleans, so the guest list can show when each was settled.
     *
     * Paying in full supersedes the deposit, so `paidInFullAt` alone means the
     * guest owes nothing; `depositPaidAt` need not also be set.
     *
     * Organiser-only. Guests cannot set these, and they are never shown to a
     * superadmin.
     */
    depositPaidAt: timestamp("deposit_paid_at", { withTimezone: true }),
    paidInFullAt: timestamp("paid_in_full_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("guests_rsvp_token_lookup_unique").on(t.rsvpTokenLookup),
    /** One active guest per email per event (Spec 4.5 recommended decision). */
    uniqueIndex("guests_event_email_active_unique")
      .on(t.eventId, t.email)
      .where(sql`${t.removedAt} is null`),
    index("guests_event_idx").on(t.eventId),
  ],
);

/* -------------------------------------------------------------------------- */
/* Menu selections (Spec 10.6)                                                */
/* -------------------------------------------------------------------------- */

export const menuSelections = pgTable(
  "menu_selections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    guestId: uuid("guest_id")
      .notNull()
      .references(() => guests.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => menuCourses.id, { onDelete: "restrict" }),
    optionId: uuid("option_id")
      .notNull()
      .references(() => menuOptions.id, { onDelete: "restrict" }),

    /**
     * Names captured at the moment of selection. Exports read these, so an
     * option renamed or archived later still shows what the guest chose
     * (Spec 8.4 "Required hardening", 15.4).
     */
    courseNameSnapshot: text("course_name_snapshot").notNull(),
    optionNameSnapshot: text("option_name_snapshot").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    /** Exactly one selection per course per guest (Spec 8.4). */
    uniqueIndex("menu_selections_guest_course_unique").on(t.guestId, t.courseId),
    index("menu_selections_option_idx").on(t.optionId),
  ],
);

/* -------------------------------------------------------------------------- */
/* Audit log (Spec 10.7)                                                      */
/* -------------------------------------------------------------------------- */

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorType: actorTypeEnum("actor_type").notNull(),
    /** Null for guest/system actors that have no account. */
    actorId: uuid("actor_id"),
    eventType: text("event_type").notNull(),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    /**
     * Free-form context. Must never contain RSVP tokens, dietary requirements
     * or guest messages. Audit records are readable by superadmins, who are
     * barred from that data (Spec 3.3).
     */
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_events_occurred_idx").on(t.occurredAt),
    index("audit_events_entity_idx").on(t.entityType, t.entityId),
  ],
);

/* -------------------------------------------------------------------------- */
/* Rate limiting (Spec 11)                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Fixed-window counters kept in Postgres rather than Redis: the MVP runs as a
 * single Coolify service and this avoids another piece of infrastructure to
 * deploy, back up and monitor.
 */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* Inferred types                                                             */
/* -------------------------------------------------------------------------- */

export type User = typeof users.$inferSelect;
export type Event = typeof events.$inferSelect;
export type MenuCourse = typeof menuCourses.$inferSelect;
export type MenuOption = typeof menuOptions.$inferSelect;
export type Guest = typeof guests.$inferSelect;
export type MenuSelection = typeof menuSelections.$inferSelect;
export type Upload = typeof uploads.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;

export type RsvpStatus = (typeof rsvpStatusEnum.enumValues)[number];
export type ResponseSource = (typeof responseSourceEnum.enumValues)[number];
export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type ActorType = (typeof actorTypeEnum.enumValues)[number];
