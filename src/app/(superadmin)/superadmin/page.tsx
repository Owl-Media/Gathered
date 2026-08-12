import type { Metadata } from "next";
import { requireSuperadmin } from "@/lib/auth/guards";
import { getPlatformTotals, listOrganisers } from "@/lib/data/superadmin";
import { OrganiserTable } from "./organiser-table";

export const metadata: Metadata = { title: "Organisers" };

export default async function SuperadminHomePage() {
  const superadmin = await requireSuperadmin();
  const [organisers, totals] = await Promise.all([listOrganisers(), getPlatformTotals()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl">Organiser accounts</h1>
        <p className="text-ink-500 mt-1 text-sm">
          View accounts and disable access. Guest replies, dietary requirements and messages are
          not visible from here.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Totals label="Organisers" value={totals.organisers} />
        <Totals label="Disabled" value={totals.disabledOrganisers} />
        <Totals label="Events" value={totals.events} />
        <Totals label="Guests" value={totals.guests} />
      </dl>

      <OrganiserTable
        currentUserId={superadmin.id}
        organisers={organisers.map((organiser) => ({
          id: organiser.id,
          name: organiser.name,
          email: organiser.email,
          role: organiser.role,
          disabled: organiser.disabledAt !== null,
          eventCount: organiser.eventCount,
          createdAtLabel: organiser.createdAt.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
        }))}
      />
    </div>
  );
}

function Totals({ label, value }: { label: string; value: number }) {
  return (
    <div className="card px-4 py-3.5">
      <dt className="text-ink-500 text-xs">{label}</dt>
      <dd className="text-ink-900 mt-0.5 text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
