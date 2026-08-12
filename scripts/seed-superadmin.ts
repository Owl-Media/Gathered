/**
 * Creates or updates the superadmin account.
 *
 * Spec 7 lists superadmin registration as "No / seeded separately".There is
 * deliberately no sign-up route that can create one. Run this once per
 * deployment:
 *
 *   SUPERADMIN_EMAIL=ops@example.com \
 *   SUPERADMIN_PASSWORD='a long passphrase' \
 *   SUPERADMIN_NAME='Ops' \
 *   npm run db:seed-superadmin
 *
 * Re-running with the same email resets that account's password, which is the
 * supported recovery path if superadmin access is ever lost.
 */
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hash } from "@node-rs/argon2";
import { users } from "../src/db/schema";

const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.SUPERADMIN_PASSWORD;
const name = process.env.SUPERADMIN_NAME?.trim() || "Superadmin";
const databaseUrl = process.env.DATABASE_URL;

function fail(message: string): never {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

if (!databaseUrl) fail("DATABASE_URL is not set.");
if (!email) fail("SUPERADMIN_EMAIL is not set.");
if (!password) fail("SUPERADMIN_PASSWORD is not set.");
if (password.length < 12) {
  fail("SUPERADMIN_PASSWORD must be at least 12 characters, because this account can disable organisers.");
}

const client = postgres(databaseUrl, { max: 1 });
const db = drizzle(client);

try {
  const passwordHash = await hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const existing = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const found = existing[0];

  if (found) {
    if (found.role !== "superadmin") {
      fail(
        `${email} already exists as an organiser account. Use a different address, because ` +
          "promoting an organiser would give them platform-wide access to their own data.",
      );
    }

    await db
      .update(users)
      .set({ name, passwordHash, disabledAt: null, updatedAt: new Date() })
      .where(eq(users.id, found.id));

    console.log(`\n  Superadmin ${email} updated (password reset).\n`);
  } else {
    await db.insert(users).values({ name, email, passwordHash, role: "superadmin" });
    console.log(`\n  Superadmin ${email} created.\n`);
  }
} catch (error) {
  console.error("Failed to seed superadmin:", error);
  process.exit(1);
} finally {
  await client.end();
}
