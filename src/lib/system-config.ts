import "server-only";
import { env } from "@/lib/env";

/**
 * Redacted view of the running configuration, for the superadmin "System"
 * page. Never includes a secret's value — only whether one is set — so this
 * is safe to render even though the superadmin role otherwise sees very
 * little (Spec 3.3, 6.9).
 */

export interface RuntimeConfigSummary {
  app: {
    environment: string;
    baseUrl: string;
    defaultTimezone: string;
    defaultCurrency: string;
  };
  email:
    | { driver: "console"; from: string }
    | {
        driver: "resend";
        from: string;
        apiKeySet: boolean;
      }
    | {
        driver: "smtp";
        from: string;
        host: string | null;
        port: number;
        secure: boolean;
        user: string | null;
        passwordSet: boolean;
      };
  storage:
    | { driver: "local"; path: string }
    | {
        driver: "s3";
        endpoint: string | null;
        region: string;
        bucket: string | null;
        forcePathStyle: boolean;
        publicUrl: string | null;
        accessKeyIdSet: boolean;
        secretAccessKeySet: boolean;
      };
}

export function getRuntimeConfigSummary(): RuntimeConfigSummary {
  return {
    app: {
      environment: env.NODE_ENV,
      baseUrl: env.APP_BASE_URL,
      defaultTimezone: env.DEFAULT_TIMEZONE,
      defaultCurrency: env.DEFAULT_CURRENCY,
    },
    email:
      env.EMAIL_DRIVER === "resend"
        ? { driver: "resend", from: env.EMAIL_FROM, apiKeySet: Boolean(env.RESEND_API_KEY) }
        : env.EMAIL_DRIVER === "smtp"
          ? {
              driver: "smtp",
              from: env.EMAIL_FROM,
              host: env.SMTP_HOST ?? null,
              port: env.SMTP_PORT,
              secure: env.SMTP_SECURE,
              user: env.SMTP_USER ?? null,
              passwordSet: Boolean(env.SMTP_PASSWORD),
            }
          : { driver: "console", from: env.EMAIL_FROM },
    storage:
      env.STORAGE_DRIVER === "s3"
        ? {
            driver: "s3",
            endpoint: env.S3_ENDPOINT ?? null,
            region: env.S3_REGION,
            bucket: env.S3_BUCKET ?? null,
            forcePathStyle: env.S3_FORCE_PATH_STYLE,
            publicUrl: env.S3_PUBLIC_URL ?? null,
            accessKeyIdSet: Boolean(env.S3_ACCESS_KEY_ID),
            secretAccessKeySet: Boolean(env.S3_SECRET_ACCESS_KEY),
          }
        : { driver: "local", path: env.LOCAL_STORAGE_PATH },
  };
}
