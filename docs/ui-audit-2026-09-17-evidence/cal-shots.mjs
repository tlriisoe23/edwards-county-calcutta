import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
const { chromium } = await import("/home/tanner/development/ecgc-leaderboard/node_modules/playwright/index.mjs");
const AXE = "/home/tanner/development/ecgc-leaderboard/node_modules/axe-core/axe.min.js";
const OUT = "/tmp/claude-1000/-home-tanner-development/d29a903d-eed4-47f0-a1f9-4f340a1c5cef/scratchpad/audit/shots";
const CAL = "http://localhost:5273";
const log = (...a) => console.log(...a);
const prev = JSON.parse(readFileSync(OUT + "/../inventory.json", "utf8")); const notes = prev.notes, errors = prev.errors;
const browser = await chromium.launch({ headless: true });
const ctx = (w, h) => browser.newContext({ viewport: { width: w, height: h } });
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
      wordCount: (document.body.innerText || "").split(/\s+/).filter(Boolean).length,
      scrollHeight: document.documentElement.scrollHeight,
      minFont: Math.min(...[...document.querySelectorAll("body *")].filter(vis).filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())).map((e) => parseFloat(getComputedStyle(e).fontSize))),
    };
  });
  notes[name] = inv; return inv;
}
async function axe(page, name) { try { await page.addScriptTag({ path: AXE }); const v = await page.evaluate(async () => (await window.axe.run()).violations.map((x) => ({ id: x.id, impact: x.impact, n: x.nodes.length, sample: x.nodes[0]?.target }))); notes[name + "#axe"] = v; log("axe", name, JSON.stringify(v)); } catch (e) { log("axe fail", name, e.message); } }
function track(page, name) { errors[name] = []; page.on("pageerror", (e) => errors[name].push(String(e))); page.on("console", (m) => { if (m.type() === "error") errors[name].push(m.text()); }); }

const c = await ctx(1440, 900); const page = await c.newPage(); track(page, "cal2");
await page.goto(`${CAL}/signin-with-chatgpt?return_to=%2Fadmin`); await page.waitForTimeout(1500);
const list = await (await c.request.get(`${CAL}/api/admin`)).json(); log("list keys", Object.keys(list), JSON.stringify(list.events || list.data?.events || []).slice(0, 300));
const events = list.events || list.data?.events || [];
const demoId = events.find((e) => e.demo)?.id; log("demoId", demoId);
const post = async (action, payload = {}, eventId, revision) => (await c.request.post(`${CAL}/api/admin`, { headers: { origin: CAL }, data: { action, payload, eventId, revision, requestId: crypto.randomUUID() } })).json();
const read = async (eventId) => (await (await c.request.get(`${CAL}/api/admin?event=${eventId}`)).json()).data;
let data = await read(demoId); log("demo event", data.event.status, "rev", data.event.revision, "bid", data.state.bid, "team", data.state.teamId);

const admin = async (p, id) => { await p.goto(`${CAL}/admin?event=${id}`); await p.waitForSelector("[role=tab], [data-slot=tabs-trigger], h2", { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(2500); };

// LIVE console
for (const [w, h, tag] of [[1440, 900, "desk"], [1366, 768, "laptop"], [390, 844, "phone"]]) {
  const cc = await ctx(w, h); const p = await cc.newPage(); track(p, "cal-live-" + tag);
  await p.goto(`${CAL}/signin-with-chatgpt?return_to=%2Fadmin`); await p.waitForTimeout(800); await admin(p, demoId);
  await shot(p, `cal-admin-live-${tag}-fold`, false); await shot(p, `cal-admin-live-${tag}`); await inventory(p, `cal-admin-live-${tag}`);
  const sw = p.getByRole("switch", { name: /compact/i }).first();
  if (await sw.count()) { const on = await sw.getAttribute("aria-checked"); log(tag, "compact initially", on); await sw.click(); await p.waitForTimeout(800); await shot(p, `cal-admin-live-${tag}-compact-${on === "true" ? "off" : "on"}-fold`, false); await inventory(p, `cal-admin-live-${tag}-toggled`); await sw.click(); await p.waitForTimeout(500); }
  if (tag === "desk") {
    await axe(p, "cal-admin-live-desk");
    const tabs = await p.getByRole("tab").allInnerTexts(); log("tabs", tabs);
    for (const t of tabs) { await p.getByRole("tab", { name: t, exact: true }).first().click().catch((e) => log("tab fail", t)); await p.waitForTimeout(1200); const k = "cal-admin-live-" + t.toLowerCase().replace(/\W+/g, "-"); await shot(p, k); await inventory(p, k); await axe(p, k); }
    await p.getByRole("tab", { name: tabs[0], exact: true }).first().click(); await p.waitForTimeout(800);
    const tools = p.getByRole("button", { name: /tools/i }).first(); if (await tools.count()) { await tools.click(); await p.waitForTimeout(600); await shot(p, "cal-admin-tools-open", false); await inventory(p, "cal-admin-tools-open"); await p.keyboard.press("Escape"); }
    const sold = p.getByRole("button", { name: /^sold/i }).first(); if (await sold.count()) { await sold.click(); await p.waitForTimeout(800); await shot(p, "cal-admin-sold-dialog", false); await inventory(p, "cal-admin-sold-dialog"); await p.keyboard.press("Escape"); await p.waitForTimeout(300); await p.keyboard.press("Escape"); }
    const undo = p.getByRole("button", { name: /^undo/i }).first(); if (await undo.count()) { await undo.click(); await p.waitForTimeout(800); await shot(p, "cal-admin-undo-confirm", false); await inventory(p, "cal-admin-undo-confirm"); await p.keyboard.press("Escape"); }
    // Tools menu items: open each (Access, Help, Activity, Local users, Theme)
    if (await tools.count()) { await tools.click(); await p.waitForTimeout(500); const items = await p.getByRole("menuitem").allInnerTexts(); log("tools items", items); await p.keyboard.press("Escape");
      for (const it of items) { await tools.click(); await p.waitForTimeout(400); await p.getByRole("menuitem", { name: it, exact: true }).first().click().catch(() => {}); await p.waitForTimeout(1200); const k = "cal-admin-tools-" + it.toLowerCase().replace(/\W+/g, "-"); await shot(p, k); await inventory(p, k); await p.keyboard.press("Escape"); } }
  }
  await cc.close();
}
// Fresh event: prepare steps
const cr = await post("create_event", { name: "Audit prep event", course: "Edwards County Golf Course", dates: "Sept 2026" }); log("create", cr.error || cr.eventId);
const newId = cr.eventId;
if (newId) {
  const cc = await ctx(1440, 900); const p = await cc.newPage(); track(p, "cal-prep");
  await p.goto(`${CAL}/signin-with-chatgpt?return_to=%2Fadmin`); await p.waitForTimeout(800); await admin(p, newId);
  await shot(p, "cal-admin-prep-fold", false); await shot(p, "cal-admin-prep"); await inventory(p, "cal-admin-prep"); await axe(p, "cal-admin-prep");
  const btns = await p.getByRole("button").allInnerTexts(); log("prep buttons", btns.slice(0, 50));
  for (const step of [/event.*rules/i, /^2|teams/i, /^3|buyers/i, /tv|display/i, /start auction/i]) {
    const l = p.getByRole("button", { name: step }).first(); if (await l.count()) { await l.click().catch(() => {}); await p.waitForTimeout(1200); const k = "cal-admin-prep-" + String(step).replace(/\W+/g, "-").slice(0, 20); await shot(p, k); await inventory(p, k); }
  }
  const pc = await ctx(390, 844); const pp = await pc.newPage(); await pp.goto(`${CAL}/signin-with-chatgpt?return_to=%2Fadmin`); await pp.waitForTimeout(800); await admin(pp, newId); await shot(pp, "cal-admin-prep-phone"); await pc.close();
  await cc.close();
}
await c.close();
writeFileSync(`${OUT}/../inventory.json`, JSON.stringify({ notes, errors }, null, 1));
log("ERRORS", JSON.stringify(Object.fromEntries(Object.entries(errors).filter(([k, v]) => v.length))));
await browser.close();
