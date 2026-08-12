/**
 * Seeds a complete demo event: one organiser, a three-course menu, eight
 * guests, and a realistic spread of replies.
 *
 * Two reasons this exists:
 *
 *   - A fresh install is an empty dashboard, which tells a new contributor
 *     nothing about what the app does. This gets you to a populated screen in
 *     one command.
 *   - The README screenshots are taken from it, so they can be regenerated
 *     rather than becoming stale marketing artefacts nobody can reproduce.
 *
 *   npm run db:seed-demo
 *
 * Re-running deletes the previous demo organiser and everything cascading from
 * it, then rebuilds. Only the demo account is touched; other data is left
 * alone.
 *
 * Every name here is fictional and every address is @example.com, because the
 * output of this script ends up in a public repository.
 *
 * Unlike seed-superadmin.ts, this reuses the real token, slug and timezone
 * helpers rather than reimplementing them, so demo data is built exactly the
 * way the app builds it — a hand-rolled copy of the token sealing would drift
 * and produce links the organiser could no longer open. Those modules are
 * marked `server-only`, which is why the npm script runs tsx against
 * tsconfig.scripts.json; see the comment in that file.
 */
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hash } from "@node-rs/argon2";
import { events, guests, menuCourses, menuOptions, menuSelections, users } from "../src/db/schema";
import { generateRsvpToken, hashToken } from "../src/lib/crypto/tokens";
import { sealToken } from "../src/lib/crypto/token-cipher";
import { buildPublicSlug } from "../src/lib/slug";
import { wallClockToInstant } from "../src/lib/time";

const DEMO_EMAIL = "demo@example.com";
const DEMO_PASSWORD = "demo-password-not-for-production";
const TIMEZONE = "Europe/London";

function fail(message: string): never {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) fail("DATABASE_URL is not set.");

/**
 * This account has a published password. Creating it on a production database
 * would be handing out an organiser login, so refuse unless the operator has
 * very explicitly said otherwise.
 */
if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "yes") {
  fail(
    "Refusing to seed demo data with NODE_ENV=production.\n" +
      "  This creates an account whose password is published in this repository.\n" +
      "  Set ALLOW_DEMO_SEED=yes only if you are certain this is a throwaway database.",
  );
}

const client = postgres(databaseUrl, { max: 1 });
const db = drizzle(client);

/** The event is always ~7 months out, so the demo never shows a passed deadline. */
function futureDate(monthsAhead: number, day: number): string {
  const now = new Date();
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthsAhead, day));
  return target.toISOString().slice(0, 10);
}

try {
  // ---------------------------------------------------------------------
  // Start clean. The cascade removes the event, menu, guests and selections.
  // ---------------------------------------------------------------------
  await db.delete(users).where(eq(users.email, DEMO_EMAIL));

  const [organiser] = await db
    .insert(users)
    .values({
      name: "Rowan Hale",
      email: DEMO_EMAIL,
      passwordHash: await hash(DEMO_PASSWORD, { memoryCost: 19456, timeCost: 2, parallelism: 1 }),
      role: "organiser",
    })
    .returning();

  const eventDate = futureDate(7, 12);
  const deadlineDate = futureDate(6, 29);
  const name = "Amelia's Baby Shower";

  const [event] = await db
    .insert(events)
    .values({
      organiserId: organiser!.id,
      publicSlug: buildPublicSlug(name),
      name,
      eventDate,
      startTime: "14:00:00",
      endTime: "17:00:00",
      timezone: TIMEZONE,
      locationName: "The Orangery at Bellhurst",
      locationAddress: "Bellhurst Gardens, 14 Prior's Lane, Bath BA1 2QR",
      description:
        "Afternoon tea in the glasshouse, then cake in the walled garden if the weather behaves.\n\n" +
        "No gifts please — just come and eat something with us.",
      rsvpDeadlineAt: wallClockToInstant(deadlineDate, "23:59", TIMEZONE),
      placeholderTheme: "clouds",
    })
    .returning();

  // ---------------------------------------------------------------------
  // Menu. Three courses, with a dietary label on the options that carry one.
  // ---------------------------------------------------------------------
  const menu = [
    {
      course: "Starter",
      options: [
        { name: "Heritage tomato and burrata", dietaryLabel: "Vegetarian" },
        { name: "Smoked trout with pickled cucumber", dietaryLabel: null },
        { name: "Roast squash and sage soup", dietaryLabel: "Vegan" },
      ],
    },
    {
      course: "Main",
      options: [
        { name: "Chicken, tarragon and leek pie", dietaryLabel: null },
        { name: "Wild mushroom and barley risotto", dietaryLabel: "Vegetarian" },
        { name: "Slow-roast aubergine with tahini", dietaryLabel: "Vegan" },
      ],
    },
    {
      course: "Pudding",
      options: [
        { name: "Lemon posset with shortbread", dietaryLabel: "Vegetarian" },
        { name: "Dark chocolate and pear tart", dietaryLabel: "Vegan" },
        { name: "Cheese and oatcakes", dietaryLabel: "Gluten free on request" },
      ],
    },
  ];

  const courses: { id: string; name: string; options: { id: string; name: string }[] }[] = [];

  for (const [courseIndex, entry] of menu.entries()) {
    const [course] = await db
      .insert(menuCourses)
      .values({ eventId: event!.id, name: entry.course, displayOrder: courseIndex })
      .returning();

    const options = [];
    for (const [optionIndex, option] of entry.options.entries()) {
      const [row] = await db
        .insert(menuOptions)
        .values({
          courseId: course!.id,
          name: option.name,
          dietaryLabel: option.dietaryLabel,
          displayOrder: optionIndex,
        })
        .returning();
      options.push({ id: row!.id, name: row!.name });
    }

    courses.push({ id: course!.id, name: course!.name, options });
  }

  // ---------------------------------------------------------------------
  // Guests. A deliberate mix: accepted with choices, accepted with a dietary
  // note, declined, and two who have not replied — so every state in the
  // dashboard and the exports has something in it.
  //
  // `choices` indexes into each course's option list, in course order.
  // ---------------------------------------------------------------------
  const roster: {
    forename: string;
    surname: string;
    status: "accepted" | "declined" | "not_responded";
    choices?: [number, number, number];
    dietaryRequirements?: string;
    guestMessage?: string;
    organiserNote?: string;
  }[] = [
    {
      forename: "Ada",
      surname: "Lovelace",
      status: "accepted",
      choices: [0, 1, 0],
      guestMessage:
        "Wouldn't miss it. I've been knitting something small and slightly lopsided — you have been warned.",
    },
    {
      forename: "Alan",
      surname: "Turing",
      status: "accepted",
      choices: [1, 0, 2],
      dietaryRequirements: "Severe nut allergy — no nuts in anything, including garnishes please.",
      guestMessage: "So pleased for you both. Save me a corner of the garden.",
    },
    {
      forename: "Grace",
      surname: "Hopper",
      status: "accepted",
      choices: [2, 2, 1],
      dietaryRequirements: "Vegan.",
      guestMessage: "Counting down. Tell Amelia her aunt is already spoiling her.",
    },
    {
      forename: "Barbara",
      surname: "Liskov",
      status: "accepted",
      choices: [0, 1, 0],
      guestMessage: "Lovely news. I'll bring the good lemonade.",
      organiserNote: "Arriving late — train from Bristol gets in about 2:30.",
    },
    {
      forename: "Katherine",
      surname: "Johnson",
      status: "declined",
      guestMessage:
        "So sorry to miss it — we're away that fortnight. Sending love and a parcel ahead of time.",
    },
    {
      forename: "Edsger",
      surname: "Dijkstra",
      status: "declined",
      guestMessage: "Away with work that weekend, sadly. Have a wonderful afternoon.",
    },
    { forename: "Radia", surname: "Perlman", status: "not_responded" },
    { forename: "Margaret", surname: "Hamilton", status: "not_responded" },
  ];

  const links: string[] = [];

  for (const person of roster) {
    const token = generateRsvpToken();
    const responded = person.status !== "not_responded";

    const [guest] = await db
      .insert(guests)
      .values({
        eventId: event!.id,
        forename: person.forename,
        surname: person.surname,
        email: `${person.forename.toLowerCase()}@example.com`,
        rsvpTokenLookup: hashToken(token),
        rsvpTokenSealed: sealToken(token),
        rsvpStatus: person.status,
        responseSource: responded ? "guest_submitted" : "not_responded",
        dietaryRequirements: person.dietaryRequirements ?? null,
        guestMessage: person.guestMessage ?? null,
        organiserNote: person.organiserNote ?? null,
        lastResponseAt: responded ? new Date() : null,
        invitationSentAt: new Date(),
      })
      .returning();

    if (person.choices) {
      for (const [courseIndex, optionIndex] of person.choices.entries()) {
        const course = courses[courseIndex]!;
        const option = course.options[optionIndex]!;
        await db.insert(menuSelections).values({
          guestId: guest!.id,
          courseId: course.id,
          optionId: option.id,
          courseNameSnapshot: course.name,
          optionNameSnapshot: option.name,
        });
      }
    }

    links.push(`  ${person.forename} ${person.surname} (${person.status}): /rsvp/${token}`);
  }

  const baseUrl = process.env.APP_BASE_URL?.replace(/\/+$/, "") ?? "http://localhost:3000";

  console.log(`
  Demo data seeded.

  Sign in at ${baseUrl}/login
    email:    ${DEMO_EMAIL}
    password: ${DEMO_PASSWORD}

  Public event page:
    ${baseUrl}/e/${event!.publicSlug}

  Private guest links (these are the only copies printed):
${links.map((line) => `  ${baseUrl}${line.split(": ")[1]!}  — ${line.trim().split(" (")[0]}`).join("\n")}
`);
} catch (error) {
  console.error("\n  Demo seed failed:\n");
  console.error(error);
  process.exit(1);
} finally {
  await client.end();
}
