import { z } from "zod";
import { isRealCalendarDate, isValidTimeZone, isValidWallTime } from "@/lib/time";
import { normaliseEmail, normaliseMultiLine, normaliseSingleLine } from "@/lib/text";
import { parseMoney } from "@/lib/money";

/**
 * Server-side validation schemas (Spec 11, "Server-side validation").
 *
 * Every Server Action parses its input through one of these. Browser-side
 * constraints are a convenience only; nothing trusts them (Spec 8.1).
 */

/* -------------------------------------------------------------------------- */
/* Limits                                                                     */
/* -------------------------------------------------------------------------- */

export const LIMITS = {
  /** Spec 4.6 recommended MVP limits. */
  dietaryRequirements: 1000,
  guestMessage: 1000,
  organiserNote: 1000,

  eventName: 120,
  eventDescription: 4000,
  locationName: 160,
  locationAddress: 400,

  personName: 80,
  accountName: 120,
  email: 254, // RFC 5321 maximum
  courseName: 80,
  optionName: 120,
  optionDescription: 240,
  dietaryLabel: 40,

  passwordMin: 10,
  passwordMax: 200,
} as const;

/* -------------------------------------------------------------------------- */
/* Shared field schemas                                                       */
/* -------------------------------------------------------------------------- */

const requiredText = (max: number, label: string) =>
  z
    .string()
    .transform(normaliseSingleLine)
    .pipe(
      z
        .string()
        .min(1, `${label} is required.`)
        .max(max, `${label} must be ${max} characters or fewer.`),
    );

const optionalText = (max: number, label: string) =>
  z
    .string()
    .transform(normaliseSingleLine)
    .pipe(z.string().max(max, `${label} must be ${max} characters or fewer.`))
    .transform((value) => (value === "" ? null : value));

/** Required, but line breaks are preserved, addresses are written multi-line. */
const requiredParagraph = (max: number, label: string) =>
  z
    .string()
    .transform(normaliseMultiLine)
    .pipe(
      z
        .string()
        .min(1, `${label} is required.`)
        .max(max, `${label} must be ${max} characters or fewer.`),
    );

const optionalParagraph = (max: number, label: string) =>
  z
    .string()
    .transform(normaliseMultiLine)
    .pipe(z.string().max(max, `${label} must be ${max} characters or fewer.`))
    .transform((value) => (value === "" ? null : value));

export const emailField = z
  .string()
  .transform(normaliseEmail)
  .pipe(
    z
      .email("Enter a valid email address.")
      .max(LIMITS.email, "That email address is too long."),
  );

const wallDateField = (label: string) =>
  z.string().refine(isRealCalendarDate, `${label} must be a valid date.`);

const wallTimeField = (label: string) =>
  z.string().refine(isValidWallTime, `${label} must be a valid time.`);

const timeZoneField = z
  .string()
  .refine(isValidTimeZone, "Choose a valid timezone.");

/**
 * Optional money field, parsed to integer minor units. Blank means "not set",
 * which is distinct from zero: a free event has no amounts at all, whereas
 * zero would be an explicit charge of nothing.
 */
const moneyField = (label: string) =>
  z
    .string()
    // An absent field means "no amount", never a validation failure.
    .default("")
    .transform((raw, ctx) => {
      const parsed = parseMoney(raw);

      if (!parsed.ok) {
        ctx.addIssue({ code: "custom", message: `${label}: ${parsed.error}` });
        return z.NEVER;
      }
      return parsed.minorUnits ?? null;
    });

/* -------------------------------------------------------------------------- */
/* Account schemas (Spec 4.1)                                                 */
/* -------------------------------------------------------------------------- */

const passwordField = z
  .string()
  .min(LIMITS.passwordMin, `Password must be at least ${LIMITS.passwordMin} characters.`)
  .max(LIMITS.passwordMax, `Password must be ${LIMITS.passwordMax} characters or fewer.`);

export const registerSchema = z.object({
  name: requiredText(LIMITS.accountName, "Name"),
  email: emailField,
  password: passwordField,
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password."),
});

export const requestPasswordResetSchema = z.object({
  email: emailField,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

/* -------------------------------------------------------------------------- */
/* Event schemas (Spec 4.2)                                                   */
/* -------------------------------------------------------------------------- */

export const eventSchema = z
  .object({
    name: requiredText(LIMITS.eventName, "Event name"),
    eventDate: wallDateField("Event date"),
    startTime: wallTimeField("Start time"),
    endTime: wallTimeField("End time"),
    timezone: timeZoneField,
    locationName: requiredText(LIMITS.locationName, "Location name"),
    locationAddress: requiredParagraph(LIMITS.locationAddress, "Location address"),
    description: optionalParagraph(LIMITS.eventDescription, "Description"),
    rsvpDeadlineDate: wallDateField("RSVP deadline"),
    rsvpDeadlineTime: wallTimeField("RSVP deadline time"),
    placeholderTheme: z.string().max(40).default("clouds"),
    /** Optional contribution amounts, parsed to integer minor units. */
    depositAmount: moneyField("Deposit"),
    totalAmount: moneyField("Full amount"),
  })
  .superRefine((value, ctx) => {
    // Spec 4.2: "Start time must be before end time."
    if (value.startTime >= value.endTime) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "End time must be after the start time.",
      });
    }

    // Spec 4.2: "RSVP deadline must be before or on the event date."
    // Both are ISO wall dates, so lexicographic comparison is date comparison.
    if (value.rsvpDeadlineDate > value.eventDate) {
      ctx.addIssue({
        code: "custom",
        path: ["rsvpDeadlineDate"],
        message: "The RSVP deadline must be on or before the event date.",
      });
    }

    /**
     * The full amount is inclusive of the deposit, so a deposit larger than the
     * total would leave a nonsensical negative balance.
     */
    if (
      value.depositAmount !== null &&
      value.totalAmount !== null &&
      value.depositAmount > value.totalAmount
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["depositAmount"],
        message:
          "The deposit cannot be more than the full amount, since the full amount includes it.",
      });
    }

    // A deposit with no total gives the guest no idea what they finally owe.
    if (value.depositAmount !== null && value.totalAmount === null) {
      ctx.addIssue({
        code: "custom",
        path: ["totalAmount"],
        message: "Set the full amount too, so guests know what they owe in total.",
      });
    }
  });

export type EventInput = z.infer<typeof eventSchema>;

/* -------------------------------------------------------------------------- */
/* Menu schemas (Spec 4.4)                                                    */
/* -------------------------------------------------------------------------- */

export const menuCourseSchema = z.object({
  name: requiredText(LIMITS.courseName, "Course name"),
});

export const menuOptionSchema = z.object({
  name: requiredText(LIMITS.optionName, "Option name"),
  description: optionalText(LIMITS.optionDescription, "Description"),
  dietaryLabel: optionalText(LIMITS.dietaryLabel, "Dietary label"),
});

export const reorderSchema = z.object({
  /** Ids in their new display order. */
  ids: z.array(z.uuid()).min(1),
});

/* -------------------------------------------------------------------------- */
/* Guest schemas (Spec 4.5)                                                   */
/* -------------------------------------------------------------------------- */

export const guestSchema = z.object({
  forename: requiredText(LIMITS.personName, "Forename"),
  surname: requiredText(LIMITS.personName, "Surname"),
  email: emailField,
});

export type GuestInput = z.infer<typeof guestSchema>;

/* -------------------------------------------------------------------------- */
/* RSVP schemas (Spec 4.6)                                                    */
/* -------------------------------------------------------------------------- */

export const guestEmailVerificationSchema = z.object({
  email: emailField,
});

/**
 * The RSVP submission itself. Menu selections arrive as courseId -> optionId
 * and are validated against the event's live courses in the action, since the
 * required set depends on database state (Spec 6.6 step 11).
 */
export const rsvpSubmissionSchema = z
  .object({
    status: z.enum(["accepted", "declined"], {
      message: "Choose whether you can make it.",
    }),
    dietaryRequirements: optionalParagraph(
      LIMITS.dietaryRequirements,
      "Dietary requirements",
    ),
    /**
     * The Art. 9 consent tick. An HTML checkbox sends "on" or nothing at all,
     * and anything else is treated as not consenting.
     */
    dietaryConsent: z
      .string()
      .default("")
      .transform((value) => value === "on"),
    guestMessage: optionalParagraph(LIMITS.guestMessage, "Message"),
    selections: z.record(z.uuid(), z.uuid()).default({}),
  })
  .superRefine((value, ctx) => {
    /**
     * Dietary notes can reveal health or belief, so they need explicit consent
     * rather than consent implied by typing (GDPR Art. 9(2)(a)). Enforced here
     * so the rule holds for a crafted POST as much as for the rendered form.
     *
     * Only when accepting: a declining guest's dietary text is discarded before
     * it is ever stored, so there is nothing to consent to.
     */
    if (
      value.status === "accepted" &&
      value.dietaryRequirements !== null &&
      !value.dietaryConsent
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["dietaryConsent"],
        message:
          "Please tick the box to confirm we can store your dietary requirements, or clear the box above.",
      });
    }
  });

export type RsvpSubmission = z.infer<typeof rsvpSubmissionSchema>;

/** Organiser manual edit (Spec 6.7), adding status reset and the internal note. */
export const organiserRsvpEditSchema = z.object({
  status: z.enum(["not_responded", "accepted", "declined"]),
  dietaryRequirements: optionalParagraph(
    LIMITS.dietaryRequirements,
    "Dietary requirements",
  ),
  guestMessage: optionalParagraph(LIMITS.guestMessage, "Message"),
  organiserNote: optionalParagraph(LIMITS.organiserNote, "Internal note"),
  selections: z.record(z.uuid(), z.uuid()).default({}),
});

export type OrganiserRsvpEdit = z.infer<typeof organiserRsvpEditSchema>;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

export type FieldErrors = Record<string, string>;

/** Flattens a ZodError into `{ fieldName: firstMessage }` for form rendering. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    errors[key] ??= issue.message;
  }
  return errors;
}
