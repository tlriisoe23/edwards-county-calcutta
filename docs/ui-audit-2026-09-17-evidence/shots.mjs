// Read-only audit capture against the two ISOLATED scratch dev servers.
import { mkdirSync, writeFileSync } from "node:fs";
const { chromium } = await import("/home/tanner/development/ecgc-leaderboard/node_modules/playwright/index.mjs");
const AXE = "/home/tanner/development/ecgc-leaderboard/node_modules/axe-core/axe.min.js";
const OUT = "/tmp/claude-1000/-home-tanner-development/d29a903d-eed4-47f0-a1f9-4f340a1c5cef/scratchpad/audit/shots";
mkdirSync(OUT, { recursive: true });
const LB = "http://localhost:5291", CAL = "http://localhost:5273";
const log = (...a) => console.log(...a);
const notes = {};
const browser = await chromium.launch({ headless: true });

async function ctx(w, h) { return browser.newContext({ viewport: { width: w, height: h }, reducedMotion: "no-preference" }); }
async function shot(page, name, full = true) { await page.waitForTimeout(700); await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full }); log("shot", name); }
async function inventory(page, name) {
  const inv = await page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
    const txt = (el) => (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80);
    return {
      title: document.title,
      headings: [...document.querySelectorAll("h1,h2,h3,h4")].filter(vis).map((h) => h.tagName + " " + txt(h)),
      landmarks: [...document.querySelectorAll("header,nav,main,aside,footer,[role=region],[role=tablist],[role=dialog],[role=status],[aria-live]")].filter(vis).map((l) => l.tagName.toLowerCase() + (l.getAttribute("role") ? "[" + l.getAttribute("role") + "]" : "") + (l.getAttribute("aria-live") ? "[live=" + l.getAttribute("aria-live") + "]" : "") + " " + txt(l).slice(0, 40)),
      buttons: [...document.querySelectorAll("button,a[href],[role=button],[role=tab],input[type=submit]")].filter(vis).map((b) => { const r = b.getBoundingClientRect(); return `${b.tagName.toLowerCase()}${b.getAttribute("role") ? "[" + b.getAttribute("role") + "]" : ""} "${txt(b)}" ${Math.round(r.width)}x${Math.round(r.height)}${b.disabled ? " disabled" : ""}`; }),
      inputs: [...document.querySelectorAll("input,select,textarea")].filter(vis).map((i) => { const id = i.id; const lab = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : i.closest("label"); return `${i.tagName.toLowerCase()}[${i.type || ""}] label="${lab ? txt(lab) : (i.getAttribute("aria-label") || "")}" ph="${i.placeholder || ""}"`; }),
      helperTextLength: [...document.querySelectorAll("p,small,.hint,.help,.muted,[class*=hint],[class*=help],[class*=muted]")].filter(vis).reduce((n, p) => n + (p.textContent || "").trim().length, 0),
      wordCount: (document.body.innerText || "").split(/\s+/).filter(Boolean).length,
      scrollHeight: document.documentElement.scrollHeight,
      minFont: Math.min(...[...document.querySelectorAll("body *")].filter(vis).filter((e) => e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())).map((e) => parseFloat(getComputedStyle(e).fontSize))),
    };
  });
  notes[name] = inv; return inv;
}
async function axe(page, name) {
  try { await page.addScriptTag({ path: AXE }); const v = await page.evaluate(async () => (await window.axe.run()).violations.map((x) => ({ id: x.id, impact: x.impact, n: x.nodes.length, sample: x.nodes[0]?.target }))); notes[name + "#axe"] = v; log("axe", name, JSON.stringify(v)); } catch (e) { log("axe fail", name, e.message); }
}
const errors = {};
function trackErrors(page, name) { errors[name] = []; page.on("pageerror", (e) => errors[name].push(String(e))); page.on("console", (m) => { if (m.type() === "error") errors[name].push(m.text()); }); }

// ---------------- LEADERBOARD ----------------
{
  const c = await ctx(1440, 900); const page = await c.newPage(); trackErrors(page, "lb");
  await page.goto(`${LB}/signin-with-chatgpt?return_to=%2Fadmin`); await page.waitForTimeout(1500);
  const demo = await (await c.request.post(`${LB}/api/board`, { data: { action: "demo" } })).json();
  log("LB demo keys", Object.keys(demo), demo.event?.id, demo.event?.slug, demo.error);
  const id = demo.event?.id, slug = demo.event?.slug;
  const ver = async () => (await (await c.request.get(`${LB}/api/board?admin=1&event=${id}`)).json()).version;
  const act = await (await c.request.post(`${LB}/api/board`, { data: { action: "activate", id, version: await ver() } })).json(); log("LB activate", act.error || "ok");
  // turn the calcutta board on for this event so /calcutta has content
  const st = await (await c.request.get(`${LB}/api/board?admin=1&event=${id}`)).json();
  log("LB settings keys", Object.keys(st.event?.settings || {}), "flights", st.event?.settings?.flights, "competitors", st.event?.competitors?.length, "status", st.event?.settings?.status);
  const s2 = await (await c.request.post(`${LB}/api/board`, { data: { action: "settings", id, version: await ver(), settings: { calcutta: true } } })).json(); log("LB calcutta on", s2.error || "ok");

  for (const [w, h, tag] of [[1440, 900, "desk"], [390, 844, "phone"]]) {
    const cc = await ctx(w, h); const p = await cc.newPage(); trackErrors(p, "lb-public-" + tag);
    await p.goto(`${LB}/`); await p.waitForTimeout(2500); await shot(p, `lb-public-${tag}`); await inventory(p, `lb-public-${tag}`); await axe(p, `lb-public-${tag}`);
    if (tag === "phone") { const det = p.locator("details, [aria-expanded]").first(); if (await det.count()) { await det.click().catch(() => {}); await shot(p, "lb-public-phone-expanded"); } }
    await p.goto(`${LB}/calcutta`); await p.waitForTimeout(2500); await shot(p, `lb-calcutta-${tag}`); await inventory(p, `lb-calcutta-${tag}`); await axe(p, `lb-calcutta-${tag}`);
    await cc.close();
  }
  for (const [w, h] of [[1920, 1080], [1280, 720]]) {
    const cc = await ctx(w, h); const p = await cc.newPage(); trackErrors(p, `lb-tv-${w}`);
    await p.goto(`${LB}/tv?event=${slug}`); await p.waitForTimeout(4000); await shot(p, `lb-tv-${w}`, false); await inventory(p, `lb-tv-${w}`);
    await p.mouse.move(600, 600); await p.waitForTimeout(500); await shot(p, `lb-tv-${w}-controls`, false);
    await cc.close();
  }
  // operator console
  await page.goto(`${LB}/admin?event=${id}`); await page.waitForTimeout(3000);
  const tabs = await page.getByRole("tab").allInnerTexts(); log("LB tabs", tabs);
  for (const t of tabs) {
    await page.getByRole("tab", { name: t, exact: true }).click().catch((e) => log("tab fail", t, e.message)); await page.waitForTimeout(1200);
    const k = "lb-admin-" + t.toLowerCase().replace(/\W+/g, "-"); await shot(page, k); await inventory(page, k); await axe(page, k);
  }
  await page.getByRole("tab", { name: tabs[0], exact: true }).click(); await page.waitForTimeout(800); await shot(page, "lb-admin-standings-fold", false);
  const pc = await ctx(390, 844); const pp = await pc.newPage(); trackErrors(pp, "lb-admin-phone");
  await pp.goto(`${LB}/admin?event=${id}`); await pp.waitForTimeout(3000); await shot(pp, "lb-admin-phone"); await inventory(pp, "lb-admin-phone");
  await pp.goto(`${LB}/admin?event=${id}&tab=tab-event-setup`); await pp.waitForTimeout(2000); await shot(pp, "lb-admin-phone-setup");
  await pc.close();
  // Which events exist / event picker screenshot
  await page.goto(`${LB}/admin`); await page.waitForTimeout(2500); await shot(page, "lb-admin-landing", false); await inventory(page, "lb-admin-landing");
  await c.close();
}

// ---------------- CALCUTTA ----------------
{
  const c = await ctx(1440, 900); const page = await c.newPage(); trackErrors(page, "cal");
  await page.goto(`${CAL}/signin-with-chatgpt?return_to=%2Fadmin`); await page.waitForTimeout(1500);
  const post = async (action, payload = {}, eventId, revision) => (await c.request.post(`${CAL}/api/admin`, { headers: { origin: CAL }, data: { action, payload, eventId, revision, requestId: crypto.randomUUID() } })).json();
  const read = async (eventId) => (await (await c.request.get(`${CAL}/api/admin` + (eventId ? "?event=" + eventId : ""))).json());
  const d = await post("load_demo"); log("CAL demo keys", Object.keys(d), d.error, d.data?.event?.id);
  const eventId = d.data?.event?.id; let data = (await read(eventId)).data; log("CAL event", data.event.status, "teams", data.teams.length, "flights", data.flights.length, "buyers", data.buyers.length, "state", JSON.stringify(data.state).slice(0, 200), "settings keys", Object.keys(data.settings || data.event.settings || {}).slice(0, 30));

  // SETUP-state operator console
  await page.goto(`${CAL}/admin?event=${eventId}`); await page.waitForTimeout(3000); await shot(page, "cal-admin-setup"); await inventory(page, "cal-admin-setup"); await axe(page, "cal-admin-setup");
  await shot(page, "cal-admin-setup-fold", false);
  const tabs = await page.getByRole("tab").allInnerTexts(); log("CAL tabs", tabs);
  const btns = await page.getByRole("button").allInnerTexts(); log("CAL buttons", btns.slice(0, 60));
  // prepare steps: try clicking anything that looks like a step
  for (const step of ["Event & rules", "Teams", "Buyers", "TV / Display Settings", "Start Auction", "Event and rules"]) {
    const l = page.getByRole("button", { name: new RegExp(step, "i") }).or(page.getByRole("tab", { name: new RegExp(step, "i") })).or(page.getByRole("link", { name: new RegExp(step, "i") })).first();
    if (await l.count()) { await l.click().catch(() => {}); await page.waitForTimeout(1000); const k = "cal-admin-prep-" + step.toLowerCase().replace(/\W+/g, "-"); await shot(page, k); await inventory(page, k); }
  }
  for (const t of tabs) {
    await page.getByRole("tab", { name: t, exact: true }).first().click().catch((e) => log("tab fail", t, e.message)); await page.waitForTimeout(1200);
    const k = "cal-admin-" + t.toLowerCase().replace(/\W+/g, "-"); await shot(page, k); await inventory(page, k); await axe(page, k);
  }
  // go LIVE, bid, sell one, bid on next
  data = (await read(eventId)).data;
  let r = await post("status", { status: "READY" }, eventId, data.event.revision); log("READY", r.error || "ok");
  data = (await read(eventId)).data; r = await post("status", { status: "LIVE" }, eventId, data.event.revision); log("LIVE", r.error || "ok");
  data = (await read(eventId)).data; const s = data.settings || data.event.settings || {}; log("minBid/increment", s.minBid, s.increment, "teamId", data.state.teamId);
  const amt = Math.max(s.minBid || 10000, 10000);
  r = await post("bid", { teamId: data.state.teamId, amount: amt }, eventId, data.event.revision); log("bid", r.error || "ok");
  data = (await read(eventId)).data; r = await post("sell", { teamId: data.state.teamId, amount: data.state.bid, buyerId: data.buyers[0].id }, eventId, data.event.revision); log("sell", r.error || "ok");
  data = (await read(eventId)).data; if (data.state.teamId) { r = await post("bid", { teamId: data.state.teamId, amount: amt + (s.increment || 500) * 3 }, eventId, data.event.revision); log("bid2", r.error || "ok"); }
  for (const [w, h, tag] of [[1440, 900, "desk"], [1366, 768, "laptop"], [390, 844, "phone"]]) {
    const cc = await ctx(w, h); const p = await cc.newPage(); trackErrors(p, "cal-live-" + tag);
    await p.goto(`${CAL}/signin-with-chatgpt?return_to=%2Fadmin%3Fevent%3D${eventId}`); await p.waitForTimeout(3500);
    await shot(p, `cal-admin-live-${tag}-fold`, false); await shot(p, `cal-admin-live-${tag}`); await inventory(p, `cal-admin-live-${tag}`); if (tag === "desk") await axe(p, `cal-admin-live-${tag}`);
    if (tag === "desk") { for (const t of ["View and Edit Sales", "Results", "Settlement", "Exports"]) { const tb = p.getByRole("tab", { name: t, exact: true }).first(); if (await tb.count()) { await tb.click(); await p.waitForTimeout(1000); const k = "cal-admin-live-" + t.toLowerCase().replace(/\W+/g, "-"); await shot(p, k); await inventory(p, k); } } }
    await cc.close();
  }
  for (const [w, h, tag] of [[1440, 900, "desk"], [390, 844, "phone"]]) {
    const cc = await ctx(w, h); const p = await cc.newPage(); trackErrors(p, "cal-public-" + tag);
    await p.goto(`${CAL}/`); await p.waitForTimeout(2500); await shot(p, `cal-public-${tag}`); await inventory(p, `cal-public-${tag}`); await axe(p, `cal-public-${tag}`);
    await cc.close();
  }
  for (const [w, h] of [[1920, 1080], [1366, 768]]) {
    const cc = await ctx(w, h); const p = await cc.newPage(); trackErrors(p, `cal-tv-${w}`);
    await p.goto(`${CAL}/tv`); await p.waitForTimeout(3500); await shot(p, `cal-tv-${w}`, false); await inventory(p, `cal-tv-${w}`);
    await cc.close();
  }
  await c.close();
}
writeFileSync(`${OUT}/../inventory.json`, JSON.stringify({ notes, errors }, null, 1));
log("ERRORS", JSON.stringify(errors));
await browser.close();
