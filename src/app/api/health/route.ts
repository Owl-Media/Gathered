import { NextResponse } from "next/server";

/**
 * Liveness probe for Coolify and any external monitor.
 *
 * Deliberately does not touch the database: this answers "is the web process
 * up?", and a healthy app that is briefly unable to reach Postgres should not
 * be killed and restarted by the orchestrator. Database health belongs in the
 * backup monitoring described in docs/BACKUP_RESTORE.md.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok", time: new Date().toISOString() });
}
