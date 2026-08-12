import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/lib/env";

/**
 * Next.js dev mode re-evaluates modules on every hot reload, which would open a
 * new pool each time. Cache the client on globalThis so we keep exactly one.
 */
const globalForDb = globalThis as unknown as {
  __babyShowerSql?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__babyShowerSql ??
  postgres(env.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__babyShowerSql = client;
}

export const db = drizzle(client, { schema });
export { schema };
export type Db = typeof db;
