import { operator, operatorConfigured } from "@/lib/legal";

/**
 * Shared furniture for the privacy notice and the terms, so the two pages stay
 * visually identical and only their words differ.
 */

export function LegalTitle({ title, lastUpdated }: { title: string; lastUpdated: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl leading-tight sm:text-4xl">{title}</h1>
      <p className="text-ink-500 mt-2 text-sm">Last updated {formatLegalDate(lastUpdated)}</p>
    </div>
  );
}

export function Section({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-xl">{heading}</h2>
      <div className="text-ink-700 mt-3 flex flex-col gap-3 leading-relaxed">{children}</div>
    </section>
  );
}

/**
 * Shown when the deployer has not filled in who they are.
 *
 * Loud on purpose. An unconfigured notice is not merely incomplete, it is a
 * notice that fails to name a controller or a way to reach them, which is the
 * part the law is least flexible about. Better that the operator sees this than
 * that a guest reads a policy signed by nobody.
 */
export function OperatorNotConfigured() {
  if (operatorConfigured) return null;

  return (
    <div className="notice notice-warning" role="alert">
      <p className="font-semibold">This deployment has not been configured.</p>
      <p className="mt-1 text-sm">
        Whoever runs this site has not yet set their organisation name and contact address, so this
        notice is incomplete and cannot be relied on. Administrators: set{" "}
        <code>LEGAL_ENTITY_NAME</code> and <code>LEGAL_CONTACT_EMAIL</code> in the environment. See{" "}
        <code>docs/DEPLOYMENT.md</code>.
      </p>
    </div>
  );
}

/** The controller block, repeated at the top of both notices. */
export function OperatorDetails() {
  return (
    <dl className="text-ink-700 mt-3 flex flex-col gap-2 text-sm">
      <div className="flex flex-wrap gap-x-2">
        <dt className="text-ink-500">Operator:</dt>
        <dd>{operator.name || "Not configured"}</dd>
      </div>
      <div className="flex flex-wrap gap-x-2">
        <dt className="text-ink-500">Contact:</dt>
        <dd>
          {operator.contactEmail ? (
            <a
              href={`mailto:${operator.contactEmail}`}
              className="underline underline-offset-2"
            >
              {operator.contactEmail}
            </a>
          ) : (
            "Not configured"
          )}
        </dd>
      </div>
      {operator.postalAddress && (
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-ink-500">Address:</dt>
          <dd className="whitespace-pre-line">{operator.postalAddress}</dd>
        </div>
      )}
      {operator.jurisdiction && (
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-ink-500">Country:</dt>
          <dd>{operator.jurisdiction}</dd>
        </div>
      )}
    </dl>
  );
}

/** "2026-08-17" -> "17 August 2026". British English, to match the rest of the UI. */
function formatLegalDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}
