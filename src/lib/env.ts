import "server-only";
import { z } from "zod";

/**
 * Environment configuration. Parsed once at startup so a misconfigured
 * deployment fails immediately and loudly rather than at the first request.
 *
 * Secrets are never hardcoded (Spec 19). Dev/test fall back to safe local
 * defaults; production requires the real values.
 */

/**
 * `next build` runs with NODE_ENV=production but without the real production
 * secrets. Those are injected by Coolify when the container starts. Applying
 * the production-only rules during the build would fail every deploy, so they
 * are enforced at runtime instead, which is where they actually matter.
 */
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
const isProduction = process.env.NODE_ENV === "production" && !isBuildPhase;

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    APP_BASE_URL: z
      .string()
      .url("APP_BASE_URL must be an absolute URL, e.g. https://rsvp.example.com")
      .transform((value) => value.replace(/\/+$/, ""))
      .default("http://localhost:3000"),

    DATABASE_URL: z
      .string()
      .min(1)
      .default("postgres://postgres:postgres@localhost:5432/gathered"),

    SESSION_SECRET: z.string().min(1).default("development-only-insecure-session-secret"),

    /** IANA timezone applied to new events (Spec 17 Q6). */
    DEFAULT_TIMEZONE: z.string().min(1).default("Europe/London"),

    /**
     * ISO 4217 code used to format deposit and balance amounts. Application
     * wide: an organiser cannot currently run events in mixed currencies.
     */
    DEFAULT_CURRENCY: z
      .string()
      .regex(/^[A-Z]{3}$/, "DEFAULT_CURRENCY must be a three-letter ISO code, e.g. GBP")
      .default("GBP"),

    // --- Email (Spec 12.4) -------------------------------------------------
    EMAIL_DRIVER: z.enum(["console", "smtp", "resend"]).default("console"),
    EMAIL_FROM: z.string().min(1).default("Gathered <no-reply@example.com>"),
    RESEND_API_KEY: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_SECURE: z
      .string()
      .optional()
      .transform((value) => value === "true"),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),

    // --- Storage (Spec 12.5) ----------------------------------------------
    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    LOCAL_STORAGE_PATH: z.string().default("./storage/uploads"),
    S3_ENDPOINT: z.string().optional(),
    S3_REGION: z.string().default("auto"),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_FORCE_PATH_STYLE: z
      .string()
      .optional()
      .transform((value) => value !== "false"),
    S3_PUBLIC_URL: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const require = (field: string, present: unknown, because: string) => {
      if (present === undefined || present === "") {
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: `${field} is required ${because}`,
        });
      }
    };

    if (value.EMAIL_DRIVER === "resend") {
      require("RESEND_API_KEY", value.RESEND_API_KEY, "when EMAIL_DRIVER=resend");
    }
    if (value.EMAIL_DRIVER === "smtp") {
      require("SMTP_HOST", value.SMTP_HOST, "when EMAIL_DRIVER=smtp");
    }
    if (value.STORAGE_DRIVER === "s3") {
      require("S3_BUCKET", value.S3_BUCKET, "when STORAGE_DRIVER=s3");
      require("S3_ACCESS_KEY_ID", value.S3_ACCESS_KEY_ID, "when STORAGE_DRIVER=s3");
      require("S3_SECRET_ACCESS_KEY", value.S3_SECRET_ACCESS_KEY, "when STORAGE_DRIVER=s3");
    }

    if (isProduction) {
      if (!process.env.APP_BASE_URL) {
        ctx.addIssue({ code: "custom", path: ["APP_BASE_URL"], message: "APP_BASE_URL is required in production" });
      }
      if (!process.env.DATABASE_URL) {
        ctx.addIssue({ code: "custom", path: ["DATABASE_URL"], message: "DATABASE_URL is required in production" });
      }
      if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
        ctx.addIssue({
          code: "custom",
          path: ["SESSION_SECRET"],
          message: "SESSION_SECRET must be set to at least 32 characters in production",
        });
      }
      if (!value.APP_BASE_URL.startsWith("https://")) {
        ctx.addIssue({
          code: "custom",
          path: ["APP_BASE_URL"],
          message: "APP_BASE_URL must use HTTPS in production (Spec 11)",
        });
      }
    }
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${details}`);
}

export const env = parsed.data;
export type Env = typeof env;
