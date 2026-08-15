import type { Metadata } from "next";
import { requireSuperadmin } from "@/lib/auth/guards";
import { getRuntimeConfigSummary } from "@/lib/system-config";
import { TestEmailForm } from "./test-email-form";

export const metadata: Metadata = { title: "System" };

/**
 * Read-only view of the deployed configuration, plus a way to verify the
 * email driver actually delivers. Secrets are never shown — only whether one
 * is configured — so this stays safe even though superadmins otherwise see
 * very little (Spec 3.3, 6.9). Not a listed Spec 6.9 capability; added as a
 * deliberate extension for operational visibility, see CLAUDE.md.
 */
export default async function SystemPage() {
  const superadmin = await requireSuperadmin();
  const config = getRuntimeConfigSummary();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl">System</h1>
        <p className="text-ink-500 mt-1 text-sm">
          The configuration this deployment is actually running with. Secrets are never shown,
          only whether one is set.
        </p>
      </div>

      <section className="card card-padded flex flex-col gap-3">
        <h2 className="text-ink-900 text-lg font-medium">Application</h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Row label="Environment" value={config.app.environment} />
          <Row label="Base URL" value={config.app.baseUrl} />
          <Row label="Default timezone" value={config.app.defaultTimezone} />
          <Row label="Default currency" value={config.app.defaultCurrency} />
        </dl>
      </section>

      <section className="card card-padded flex flex-col gap-3">
        <h2 className="text-ink-900 text-lg font-medium">Email</h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Row label="Driver" value={config.email.driver} />
          <Row label="From address" value={config.email.from} />
          {config.email.driver === "smtp" && (
            <>
              <Row label="Host" value={config.email.host ?? "not set"} />
              <Row label="Port" value={String(config.email.port)} />
              <Row label="Secure (TLS)" value={config.email.secure ? "yes" : "no"} />
              <Row label="User" value={config.email.user ?? "not set"} />
              <Row label="Password" value={<SetPill set={config.email.passwordSet} />} />
            </>
          )}
          {config.email.driver === "resend" && (
            <Row label="API key" value={<SetPill set={config.email.apiKeySet} />} />
          )}
          {config.email.driver === "console" && (
            <Row label="Delivery" value="Logged to the server console, nothing is actually sent." />
          )}
        </dl>

        <div className="border-cream-200 mt-1 border-t pt-4">
          <TestEmailForm defaultEmail={superadmin.email} />
        </div>
      </section>

      <section className="card card-padded flex flex-col gap-3">
        <h2 className="text-ink-900 text-lg font-medium">Storage</h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Row label="Driver" value={config.storage.driver} />
          {config.storage.driver === "local" && <Row label="Path" value={config.storage.path} />}
          {config.storage.driver === "s3" && (
            <>
              <Row label="Endpoint" value={config.storage.endpoint ?? "not set"} />
              <Row label="Region" value={config.storage.region} />
              <Row label="Bucket" value={config.storage.bucket ?? "not set"} />
              <Row label="Force path style" value={config.storage.forcePathStyle ? "yes" : "no"} />
              <Row label="Public URL" value={config.storage.publicUrl ?? "not set"} />
              <Row label="Access key ID" value={<SetPill set={config.storage.accessKeyIdSet} />} />
              <Row
                label="Secret access key"
                value={<SetPill set={config.storage.secretAccessKeySet} />}
              />
            </>
          )}
        </dl>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 sm:justify-start">
      <dt className="text-ink-500 shrink-0">{label}</dt>
      <dd className="text-ink-900 truncate text-right font-medium sm:text-left">{value}</dd>
    </div>
  );
}

function SetPill({ set }: { set: boolean }) {
  return (
    <span className={`pill ${set ? "pill-accepted" : "pill-declined"}`}>
      {set ? "set" : "not set"}
    </span>
  );
}
