/**
 * Regenerates the README screenshots in docs/screenshots/.
 *
 * They are captured from the demo dataset rather than staged by hand, so they
 * can be reproduced when the UI changes instead of slowly drifting out of date.
 *
 * Playwright is not a dependency of this project — it exists only for this, and
 * pulling a browser engine into everyone's install to take seven pictures is a
 * poor trade. Install it for the run:
 *
 *   npm run db:seed-demo          # prints the slug and the guest links
 *   npm run dev                   # in another terminal
 *   npm install --no-save playwright && npx playwright install chromium
 *   SLUG=<public slug> TOKEN_UNANSWERED=<a not-responded guest token> \
 *     node scripts/capture-screenshots.mjs
 *
 * Then compress the output — the raw 2x PNGs are around five times larger than
 * they need to be:
 *
 *   node -e "const s=require('sharp'),f=require('fs'),d='docs/screenshots';\
 *   for(const n of f.readdirSync(d).filter(n=>n.endsWith('.png')))\
 *   s(d+'/'+n).resize({width:1600,withoutEnlargement:true})\
 *   .png({compressionLevel:9,palette:true}).toBuffer()\
 *   .then(b=>f.writeFileSync(d+'/'+n,b));"
 *
 * The guest list tab is deliberately not captured: it displays live RSVP links,
 * and those do not belong in a public repository even from throwaway data.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = process.env.OUT ?? resolve(repoRoot, "docs/screenshots");
const SLUG = process.env.SLUG;
const TOKEN_UNANSWERED = process.env.TOKEN_UNANSWERED;

if (!SLUG || !TOKEN_UNANSWERED) {
  console.error(
    "\n  SLUG and TOKEN_UNANSWERED are required.\n" +
      "  Run 'npm run db:seed-demo' first — it prints both.\n",
  );
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1400, height: 900 },
  deviceScaleFactor: 2,
  colorScheme: "light",
  reducedMotion: "reduce",
});
const page = await context.newPage();

const shots = [];

// The Next.js dev-tools bubble and error overlay are injected into a
// <nextjs-portal> custom element. Neither belongs in a product screenshot.
const HIDE_DEV_OVERLAY = "nextjs-portal { display: none !important; }";

async function shot(name, { fullPage = false, around = null, pad = 0 } = {}) {
  // A dev overlay means the page actually failed to render. Catch it here
  // rather than shipping a screenshot of a stack trace.
  const broken = await page.evaluate(() => {
    const portal = document.querySelector("nextjs-portal");
    return Boolean(portal?.shadowRoot?.querySelector("[data-nextjs-dialog], .nextjs-container-errors-header"));
  });
  if (broken) throw new Error(`${name}: page rendered a Next.js error overlay`);

  await page.addStyleTag({ content: HIDE_DEV_OVERLAY });
  // Let fonts settle so text doesn't render mid-swap.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const path = `${OUT}/${name}.png`;

  if (around) {
    // Scroll to the top first: with fullPage the clip rectangle is in document
    // coordinates, and boundingBox() reports viewport-relative values, so the
    // two only agree at scroll position zero.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(150);

    const box = await page.locator(around).first().boundingBox();
    if (!box) throw new Error(`${name}: no element matched ${around}`);
    const doc = await page.evaluate(() => ({
      w: document.documentElement.scrollWidth,
      h: document.documentElement.scrollHeight,
    }));

    const x = Math.max(0, box.x - pad);
    const y = Math.max(0, box.y - pad);
    await page.screenshot({
      path,
      fullPage: true,
      clip: {
        x,
        y,
        width: Math.min(box.width + pad * 2, doc.w - x),
        height: Math.min(box.height + pad * 2, doc.h - y),
      },
    });
  } else {
    await page.screenshot({ path, fullPage });
  }
  shots.push(name);
  console.log("captured:", name, fullPage ? "(full page)" : "");
}

async function go(path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
}

// ---------------------------------------------------------------------------
// 1. Public event page — what a guest sees before they have a link.
// ---------------------------------------------------------------------------
await go(`/e/${SLUG}`);
await shot("public-event-page", { fullPage: true });

// ---------------------------------------------------------------------------
// 2. The RSVP email gate — a link alone is not enough.
// ---------------------------------------------------------------------------
await go(`/rsvp/${TOKEN_UNANSWERED}`);
// A viewport shot of this page lands mid-scroll on the menu. The gate itself is
// the point, so frame it: its card, plus breathing room around it.
await shot("rsvp-email-gate", { around: 'form:has(input[name="email"])', pad: 48 });

// ---------------------------------------------------------------------------
// 3. The RSVP form itself, past the gate.
// ---------------------------------------------------------------------------
await page.fill('input[name="email"]', "radia@example.com");
await page.click('button[type="submit"]');
await page.waitForLoadState("networkidle");
// The menu appears only once the guest says yes, which is the more interesting
// state and the one the README should show.
await page.click('input[name="status"][value="accepted"]');
await page.waitForTimeout(400);
await shot("rsvp-form", { fullPage: true });

// ---------------------------------------------------------------------------
// 4. Organiser dashboard.
// ---------------------------------------------------------------------------
await go("/login");
await page.fill('input[name="email"]', "demo@example.com");
await page.fill('input[name="password"]', "demo-password-not-for-production");
await page.click('button[type="submit"]');
await page.waitForLoadState("networkidle");
await shot("organiser-dashboard");

// Find the event id from the dashboard link. "Create event" also lives under
// /events/, so exclude it rather than taking the first match.
const hrefs = await page.$$eval('a[href^="/events/"]', (as) => as.map((a) => a.getAttribute("href")));
const eventHref = hrefs.find((h) => h !== "/events/new" && /^\/events\/[0-9a-f-]{36}$/.test(h));
if (!eventHref) throw new Error(`No event link found on the dashboard. Saw: ${JSON.stringify(hrefs)}`);
const eventId = eventHref.split("/")[2];
console.log("event id:", eventId);

// ---------------------------------------------------------------------------
// 5. Responses — the planning view.
// ---------------------------------------------------------------------------
await go(`/events/${eventId}/responses`);
await shot("organiser-responses", { fullPage: true });

// ---------------------------------------------------------------------------
// 6. Menu builder.
// ---------------------------------------------------------------------------
await go(`/events/${eventId}/menu`);
await shot("organiser-menu", { fullPage: true });

// ---------------------------------------------------------------------------
// 7. Exports.
// ---------------------------------------------------------------------------
await go(`/events/${eventId}/exports`);
await shot("organiser-exports");

await browser.close();
console.log("\nDone:", shots.length, "screenshots in", OUT);
