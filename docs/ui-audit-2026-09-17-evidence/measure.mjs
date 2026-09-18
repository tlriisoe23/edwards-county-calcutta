const { chromium } = await import("/home/tanner/development/ecgc-leaderboard/node_modules/playwright/index.mjs");
const LB = "http://localhost:5291", CAL = "http://localhost:5273";
const browser = await chromium.launch({ headless: true });
const box = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { top: Math.round(r.top + scrollY), h: Math.round(r.height), w: Math.round(r.width) }; }, sel);
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const c = await browser.newContext({ viewport: { width: w, height: h } }); const p = await c.newPage();
  await p.goto(`${LB}/signin-with-chatgpt?return_to=%2Fadmin`); await p.waitForTimeout(3500);
  const m = {};
  for (const [k, s] of Object.entries({ tablist: "[role=tablist]", sheetWrap: ".sheet-wrap", thead: ".sheet-wrap thead", firstFlightBanner: ".sheet-wrap tbody tr", firstInput: ".sheet-wrap tbody input", saveStatus: "[class*=save-status]", helper: ".sheet-wrap" })) m[k] = await box(p, s);
  m.stickyTop = await p.evaluate(() => { const th = document.querySelector(".sheet-wrap thead"); return th ? { position: getComputedStyle(th).position, top: getComputedStyle(th).top, cssVar: getComputedStyle(document.documentElement).getPropertyValue("--save-status-height") } : null; });
  m.blankBand = await p.evaluate(() => { const wrap = document.querySelector(".sheet-wrap"); const th = document.querySelector(".sheet-wrap thead"); if (!wrap || !th) return null; return { wrapTop: Math.round(wrap.getBoundingClientRect().top + scrollY), theadTop: Math.round(th.getBoundingClientRect().top + scrollY), tableTop: Math.round(wrap.querySelector("table").getBoundingClientRect().top + scrollY) }; });
  m.smallTargets = await p.evaluate(() => [...document.querySelectorAll("button,a[href],input,select,[role=tab]")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 32 || r.width < 32); }).map((e) => `${e.tagName} "${(e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 30)}" ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`).slice(0, 25));
  console.log(`LB admin ${w}x${h}`, JSON.stringify(m, null, 0));
  await p.goto(`${LB}/`); await p.waitForTimeout(2500);
  console.log(`LB public ${w}: table top`, JSON.stringify(await box(p, "table")), "first row", JSON.stringify(await box(p, "tbody tr")), "small targets", JSON.stringify(await p.evaluate(() => [...document.querySelectorAll("button,a[href],input,select,[role=tab],summary")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 32); }).map((e) => `${e.tagName} "${(e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 30)}" ${Math.round(e.getBoundingClientRect().height)}`).slice(0, 12))));
  await c.close();
}
{
  const c = await browser.newContext({ viewport: { width: 1920, height: 1080 } }); const p = await c.newPage();
  await p.goto(`${LB}/tv?event=edwards-county-invitational-demo`); await p.waitForTimeout(4000);
  console.log("LB TV 1080p", JSON.stringify(await p.evaluate(() => { const rows = [...document.querySelectorAll("tbody tr")]; const last = rows.at(-1)?.getBoundingClientRect(); const foot = document.querySelector("footer, .tv-footer, [class*=footer]")?.getBoundingClientRect(); return { rows: rows.length, rowH: Math.round(rows[0]?.getBoundingClientRect().height), lastBottom: Math.round(last?.bottom), footerTop: Math.round(foot?.top), footerSel: document.querySelector("footer, .tv-footer, [class*=footer]")?.className }; })));
  await c.close();
}
{
  const c = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p = await c.newPage();
  await p.goto(`${CAL}/signin-with-chatgpt?return_to=%2Fadmin`); await p.waitForTimeout(3500);
  const events = (await (await c.request.get(`${CAL}/api/admin`)).json()).events; const demo = events.find((e) => e.demo).id;
  await p.goto(`${CAL}/admin?event=${demo}`); await p.waitForTimeout(3000);
  console.log("CAL live compact: bid input top", JSON.stringify(await box(p, "input[inputmode], input[type=number], input[type=text]")), "hammer", JSON.stringify(await p.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /hammer/i.test(x.textContent)); const r = b?.getBoundingClientRect(); return r && { top: Math.round(r.top), bottom: Math.round(r.bottom) }; })), "pool line", await p.evaluate(() => [...document.querySelectorAll("*")].map((e) => e.childNodes.length === 1 && e.firstChild.nodeType === 3 ? e.textContent.trim() : "").find((t) => /current pool/i.test(t))));
  await c.close();
}
await browser.close();
