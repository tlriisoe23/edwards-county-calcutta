// The operator desk, signed in, on the production image, against a copy of
// the live database (OC-2).
//
// Production sits behind Google sign-in, so until now every operator-side claim
// in this repository's validation log was local evidence, and every deploy
// record said the console was not exercised signed in. This is the port of the
// leaderboard's `tests/console-rehearsal.mjs`, and it matters more here: this
// product holds the settlement records.
//
// What it does, and does not do:
//
//  * Runs the image named by REHEARSAL_IMAGE (default `ecgc-calcutta:candidate`,
//    which `npm run test:console` builds from the working tree first) in a
//    throwaway container on a random loopback port, against a **copy** of the
//    newest backup — or of the file named on the command line, which is how a
//    restore is rehearsed from an off-host copy (O-14). The live container,
//    its volume and its route are never touched; the copy is deleted at the end.
//  * Signs in with a password generated for this run alone, seeded into the
//    copy and never written down. ADMIN_EMAILS is set to that synthetic address
//    only, so the owner's own credentials cannot be used against the copy.
//  * Writes to the copy freely — a buyer is added — because that is the point.
//  * Leaves its screenshots in `outputs/`, which is gitignored. They can hold
//    real buyers and real prices and must never be committed.
//
// It cannot cover the Cloudflare route, the real domain, or Google sign-in
// itself. Those stay the owner's to check. `playwright` is not a dependency
// here (OC-3): point UI3_PLAYWRIGHT_MODULE at an installed copy.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { mkdtempSync, mkdirSync, copyFileSync, readdirSync, statSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir, homedir } from "node:os";
import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { SQLiteDatabase } from "../portable/sqlite.mjs";
import { passwordHash } from "../portable/sessions.mjs";

const image = process.env.REHEARSAL_IMAGE || "ecgc-calcutta:candidate";
const directory = "outputs/console-rehearsal";
await mkdir(directory, { recursive: true });
let checks = 0;
const check = (value, label) => { assert.ok(value, label); checks++; };
const docker = (...args) => {
  const result = spawnSync("docker", args, { encoding: "utf8" });
  if (result.status !== 0) throw Error(result.stderr || result.stdout);
  return result.stdout.trim();
};
function newestBackup() {
  const folder = process.env.CALCUTTA_BACKUP_DIR || join(homedir(), "backups/ecgc-calcutta");
  const files = readdirSync(folder)
    .filter((f) => /^calcutta-.*\.sqlite$/.test(f))
    .map((f) => ({ path: join(folder, f), at: statSync(join(folder, f)).mtimeMs }))
    .sort((a, b) => b.at - a.at);
  if (!files.length) throw Error(`No backup in ${folder}. Run scripts/backup-scheduled.sh first.`);
  return files[0].path;
}
const source = process.argv[2] || newestBackup();
assert.ok(!source.includes("/var/lib/docker/"), "refusing to read the live volume directly");

const work = mkdtempSync(join(tmpdir(), "calcutta-console-"));
const data = join(work, "data");
mkdirSync(data);
copyFileSync(source, join(data, "calcutta.sqlite"));

const probe = createServer();
await new Promise((r) => probe.listen(0, "127.0.0.1", r));
const port = probe.address().port;
await new Promise((r) => probe.close(r));
const base = `http://127.0.0.1:${port}`;
const email = "rehearsal@localhost.test";
const password = randomBytes(32).toString("hex");

// A deploy runs `portable/migrate.mjs` in the rebuilt container before it
// serves anything (every entry in VM-DEPLOYMENT.md records the result), so the
// rehearsal applies the same migration to the copy with the same image. Without
// this a change that carries a schema change is rehearsed against the schema it
// replaces — which is how the first run of the local-login work failed here.
const migrated = spawnSync("docker", ["run", "--rm", "-v", `${data}:/data`, image, "node", "portable/migrate.mjs"], { encoding: "utf8" });
if (migrated.status !== 0) throw Error("migrate.mjs on the copy: " + (migrated.stderr || migrated.stdout));
console.log(`  migrate.mjs on the copy: ${migrated.stdout.trim()}`);
for (const side of ["-wal", "-shm"]) rmSync(join(data, "calcutta.sqlite" + side), { force: true });

const db = new SQLiteDatabase(join(data, "calcutta.sqlite"));
await db.prepare("DELETE FROM portable_credentials").run();
await db.prepare("DELETE FROM portable_sessions").run();
await db.prepare("INSERT INTO portable_credentials VALUES (?,?)").bind(email, passwordHash(password)).run();
const counts = {};
for (const t of ["events", "teams", "sales", "ownership", "buyers", "audit"])
  counts[t] = (await db.prepare(`SELECT count(*) n FROM ${t}`).first()).n;
db.close();
for (const side of ["-wal", "-shm"]) rmSync(join(data, "calcutta.sqlite" + side), { force: true });
const built = spawnSync("docker", ["image", "inspect", "-f", "{{.Created}}", image], { encoding: "utf8" }).stdout.trim();
console.log(`rehearsing ${image} (built ${built.slice(0, 19).replace("T", " ")}) against a copy of ${source}`);
console.log(`  ${Object.entries(counts).map(([t, n]) => `${t}=${n}`).join(" ")}`);

let container;
const stop = () => { if (container) { docker("rm", "-f", container); container = undefined; } };
process.on("exit", () => { stop(); rmSync(work, { recursive: true, force: true }); });

container = docker(
  "run", "-d", "--memory=512m", "--cpus=1",
  "-p", `127.0.0.1:${port}:3000`,
  "-v", `${data}:/data`,
  "-e", `PUBLIC_ORIGIN=${base}`,
  "-e", `ADMIN_EMAILS=${email}`,
  image,
);
for (let i = 0; ; i++) {
  try { if ((await fetch(base + "/api/public")).ok) break; } catch {}
  if (i > 120) throw Error(docker("logs", container));
  await new Promise((r) => setTimeout(r, 500));
}

// Anonymous first: the desk must be shut before it is opened.
check((await fetch(base + "/api/admin")).status === 403, "anonymous /api/admin is refused");
check((await fetch(base + "/admin", { redirect: "manual" })).status === 307, "anonymous /admin is sent to sign-in");

const signin = await fetch(base + "/signin-with-chatgpt");
const csrfCookie = signin.headers.get("set-cookie").split(";")[0];
const signed = await fetch(base + "/api/auth/local", {
  method: "POST", redirect: "manual",
  headers: { cookie: csrfCookie, origin: base, "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ csrf: csrfCookie.split("=")[1], email, password }),
});
assert.equal(signed.status, 303, "signed in against the copy");
checks++;
const [name, value] = signed.headers.get("set-cookie").split(";")[0].split("=");
const cookie = `${name}=${value}`;

// The event the public board serves, not merely the newest row.
const served = (await (await fetch(base + "/api/public")).json()).event;
assert.ok(served?.id, "the public board serves an event");
const read = async () => (await (await fetch(`${base}/api/admin?event=${served.id}`, { headers: { cookie } })).json()).data;
const before = await read();
console.log(`  event: ${before.event.name} — ${before.event.status}, ${before.flights.length} flights, ${before.teams.length} teams, ${(before.sales ?? []).length} sales`);

let chromium;
try { ({ chromium } = await import(process.env.UI3_PLAYWRIGHT_MODULE || "playwright")); }
catch { throw Error("playwright is not a dependency here (OC-3): set UI3_PLAYWRIGHT_MODULE to an installed copy, e.g. ../ecgc-leaderboard/node_modules/playwright/index.mjs"); }
const browser = await chromium.launch({ headless: true });
const violations = [];
// OC-5 is fixed: the sideways-scrolling table wrappers are focusable named
// regions, so the carve-out that used to carry scrollable-region-focusable is
// gone and this rehearsal fails again if it comes back.
const axe = async (page, label) => {
  await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
  const found = await page.evaluate(async () => (await window.axe.run()).violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target.join(" ")) })));
  for (const v of found) violations.push({ label, ...v });
};
const shot = (page, label) => page.screenshot({ path: `${directory}/${label.toLowerCase().replace(/\W+/g, "-")}.png`, fullPage: true });
const steps = [/^Event & rules/, /^Teams & flights/, /^Buyers/, /^TV \/ Display Settings/];

try {
  // The sign-in page, in the shared account shell the leaderboard uses (WC-1):
  // the same masthead, the same primary action, the same disclosure for the
  // local login — at desk and phone widths, with axe.
  for (const width of [1440, 390]) {
    const c = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } });
    const p = await c.newPage();
    await p.goto(`${base}/signin-with-chatgpt`);
    const text = await p.locator("body").innerText();
    check(/The Calcutta/.test(text) && /Continue with Google/.test(text) && /Local login/.test(text), `the sign-in page wears the shared shell at ${width}`);
    check(await p.getByRole("link", { name: "Continue with Google" }).isVisible() && await p.locator("details > summary").isVisible(), `its two ways in are on screen at ${width}`);
    // No axe here: the account pages ship `default-src 'none'`, which is the
    // point of them, and that refuses the injected script. Structure is
    // checked above; the shell's own accessibility is the leaderboard's.
    await p.screenshot({ path: `${directory}/sign-in-${width}.png`, fullPage: true });
    await c.close();
  }
  for (const width of [1600, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, reducedMotion: "reduce" });
    await context.addCookies([{ name, value, domain: "127.0.0.1", path: "/" }]);
    const page = await context.newPage();
    const errors = [], failed = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    // A failed request is reported by URL, not as the browser's bare "Failed to
    // load resource": the address says which section asked for what.
    page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
    // OC-7 is fixed: Teams & flights no longer probes the leaderboard when none
    // is configured, so the 400 this used to carry should not appear at all and
    // every failed response is a failure again.
    page.on("response", async (r) => {
      if (r.status() < 400) return;
      failed.push(`${r.status()} ${r.request().method()} ${r.url().replace(base, "")} ← ${(await r.text().catch(() => "")).slice(0, 120)}`);
    });

    await page.goto(`${base}/admin?event=${served.id}`);
    await page.getByRole("tab", { name: "Auction console" }).waitFor();
    check(true, `the operator desk opens signed in at ${width}`);

    // Every section the desk offers, on real data: the five tabs and the four
    // prepare steps, each rendered without a JavaScript error.
    for (const tab of await page.getByRole("tab").allInnerTexts()) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      await page.waitForTimeout(500);
      check((await page.getByRole("tab", { name: tab, exact: true }).getAttribute("aria-selected")) === "true", `${tab} renders at ${width}`);
      await axe(page, `${tab} at ${width}`);
      await shot(page, `${tab}-${width}`);
    }
    for (const step of steps) {
      const button = page.getByRole("button", { name: step }).first();
      if (!(await button.isVisible())) { await page.getByRole("button", { name: /show setup steps/i }).click().catch(() => {}); await page.waitForTimeout(300); }
      await button.click();
      await page.waitForTimeout(500);
      const label = String(step).replace(/[\/^$\\]/g, "").replace(/\s+/g, " ").trim();
      check(true, `prepare step "${label}" opens at ${width}`);
      await axe(page, `${label} at ${width}`);
      await shot(page, `step-${label}-${width}`);
    }
    check(errors.length === 0, `no JavaScript errors across every section at ${width}: ${errors.slice(0, 2).join(" | ")}`);
    check(failed.length === 0, `no request failed across every section at ${width}: ${failed.slice(0, 3).join(" | ")}`);
    await context.close();
  }

  // A write on the copy: a buyer, through the dialog a clerk would use.
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, reducedMotion: "reduce" });
  await context.addCookies([{ name, value, domain: "127.0.0.1", path: "/" }]);
  const page = await context.newPage();
  await page.goto(`${base}/admin?event=${served.id}`);
  await page.getByRole("tab", { name: "Auction console" }).waitFor();
  const buyers = page.getByRole("button", { name: /^Buyers/ }).first();
  if (!(await buyers.isVisible())) await page.getByRole("button", { name: /show setup steps/i }).click().catch(() => {});
  await buyers.click();
  await page.getByRole("button", { name: /Add buyer/ }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  const buyer = `Rehearsal buyer ${randomBytes(2).toString("hex")}`;
  await dialog.getByLabel("Buyer display name").fill(buyer);
  await dialog.getByLabel("Buyer display name").press("Enter");
  await page.waitForTimeout(1200);
  const after = await read();
  check(after.buyers.some((b) => b.name === buyer), `a buyer added through the dialog is saved on the copy (${after.buyers.length} buyers)`);
  check(after.event.revision > before.event.revision, "and the event's revision moved on");
  await axe(page, "buyers after adding one");
  await shot(page, "buyers-after-add");
  await context.close();

  // Local Users, through the dialog: the owner makes a login, and that login
  // reaches the desk — which until 2026-09-19 it could not, because nothing
  // granted a local account operator rights (WC-2).
  {
    const c = await browser.newContext({ viewport: { width: 1600, height: 1000 }, reducedMotion: "reduce" });
    await c.addCookies([{ name, value, domain: "127.0.0.1", path: "/" }]);
    const p = await c.newPage();
    await p.goto(`${base}/admin?event=${served.id}`);
    await p.getByRole("tab", { name: "Auction console" }).waitFor();
    await p.getByRole("button", { name: "Tools" }).click();
    await p.getByRole("menuitem", { name: /Local Users/ }).click();
    const dialog = p.getByRole("dialog");
    await dialog.waitFor();
    const username = "desk" + randomBytes(2).toString("hex"), password = randomBytes(12).toString("hex");
    await dialog.getByLabel("Username").fill(username);
    await dialog.getByLabel("Display name").fill("Rehearsal desk");
    await dialog.getByLabel("Password", { exact: true }).fill(password.slice(0, 8));
    check((await dialog.innerText()).includes("to go"), "a short password says how many characters are still needed");
    await dialog.getByLabel("Password", { exact: true }).fill(password);
    await dialog.getByLabel("Confirm password").fill(password);
    const create = dialog.getByRole("button", { name: "Create local login" });
    check(await create.isEnabled(), "the create button is live");
    await create.click();
    await p.waitForTimeout(1500);
    check((await dialog.innerText()).includes(username), `the new login is listed as ${username}`);
    await c.close();
    const again = await fetch(base + "/signin-with-chatgpt");
    const login = again.headers.get("set-cookie").split(";")[0];
    const asLocal = await fetch(base + "/api/auth/local", {
      method: "POST", redirect: "manual",
      headers: { cookie: login, origin: base, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrf: login.split("=")[1], login: username, password }),
    });
    check(asLocal.status === 303, `that person signs in through the real form (${asLocal.status})`);
    const session = asLocal.headers.get("set-cookie").split(";")[0];
    const desk = await fetch(`${base}/api/admin?event=${served.id}`, { headers: { cookie: session } });
    check(desk.status === 200, `and reaches the desk as an operator (${desk.status})`);
    const who = desk.status === 200 ? (await desk.json()).user : null;
    check(who && who.owner === false, "as an operator, never the owner");
  }

  // The public board and the TV, as the room sees them.
  for (const [path, width, height, label] of [["/", 1440, 1000, "public"], ["/", 390, 844, "public-phone"], [`/tv?event=${served.id}`, 1920, 1080, "tv"]]) {
    const c = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
    const p = await c.newPage();
    const errors = [];
    p.on("pageerror", (e) => errors.push(String(e)));
    await p.goto(base + path);
    await p.waitForTimeout(1500);
    check((await p.locator("body").innerText()).includes(served.name), `${label} at ${width} shows ${served.name}`);
    check(errors.length === 0, `${label} at ${width}: no JavaScript errors`);
    await axe(p, `${label} at ${width}`);
    await p.screenshot({ path: `${directory}/${label}-${width}.png`, fullPage: label !== "tv" });
    await c.close();
  }

  // Signed out, the desk is shut again.
  const anonymous = await fetch(`${base}/api/admin?event=${served.id}`);
  check(anonymous.status === 403, "without the session, the desk answers 403");
} finally {
  await browser.close();
  stop();
}
if (violations.length) {
  console.log("axe violations:");
  for (const v of violations) console.log(`  ${v.label}: ${v.id} (${v.impact}) — ${v.nodes.slice(0, 2).join(" ; ")}`);
}
check(violations.length === 0, `axe reports no violations across every surface (${violations.length} found)`);
console.log(`${checks} signed-in desk checks PASS against a copy of ${source}`);
console.log(`  screenshots in ${directory}/ — real buyers and prices, never commit them`);
