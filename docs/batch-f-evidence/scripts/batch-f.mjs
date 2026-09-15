// Batch F evidence: phone header controls (CAL-P2-004) and TV intermediate sizes (CAL-P2-005).
// Read-mostly against the local dev server; the only write is a temporary PAUSED/LIVE round trip on the
// synthetic AUDIT-E2 Live fixture, restored in `finally`. Usage: OUT=/abs/dir node batch-f.mjs [--shots]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
const base = 'http://localhost:5173';
if (!/^http:\/\/localhost:5173$/.test(base)) throw new Error('local only');
const out = process.env.OUT || path.resolve('out'); fs.mkdirSync(out, { recursive: true });
const shotsAll = process.argv.includes('--shots');
const F = JSON.parse(fs.readFileSync('/home/tanner/development/edwards-county-calcutta/docs/audit-e2-evidence/fixtures.json', 'utf8'));
const axeSource = fs.readFileSync('/home/tanner/development/edwards-county-calcutta/node_modules/axe-core/axe.min.js', 'utf8');
const rows = []; const write = () => fs.writeFileSync(path.join(out, 'batch-f.json'), JSON.stringify(rows, null, 2));
const L = { add(o) { rows.push({ at: new Date().toISOString(), ...o }); write(); console.log((o.result || 'INFO').padEnd(8), o.check || o.note || ''); if (o.detail !== undefined && o.result && o.result !== 'PASS') console.log('   ', JSON.stringify(o.detail).slice(0, 700)); } };
const shot = async (page, name) => { const file = path.join(out, name + '.png'); await page.screenshot({ path: file }); return name + '.png'; };
const settle = (page, ms = 900) => page.waitForTimeout(ms);

// ---- admin API helper (synthetic fixture only) ----
const login = await fetch(base + '/signin-with-chatgpt?return_to=%2Fadmin', { redirect: 'manual' });
const cookie = login.headers.get('set-cookie').split(';')[0];
async function readAdmin(eventId) { const r = await fetch(base + '/api/admin?event=' + eventId, { headers: { cookie } }); if (r.status !== 200) throw new Error('admin read ' + r.status); return (await r.json()).data; }
async function setStatus(eventId, status) { const d = await readAdmin(eventId); const r = await fetch(base + '/api/admin', { method: 'POST', headers: { cookie, origin: base, 'content-type': 'application/json' }, body: JSON.stringify({ action: 'status', payload: { status }, eventId, revision: d.event.revision, requestId: crypto.randomUUID() }) }); const b = await r.json(); if (r.status !== 200) throw new Error('status ' + status + ' ' + JSON.stringify(b)); return (await readAdmin(eventId)).event; }

const browser = await chromium.launch();
async function signIn(ctx) { const p = await ctx.newPage(); await p.goto(base + '/signin-with-chatgpt?return_to=%2Fadmin'); await p.close(); }
async function open(vp, route, { admin = false } = {}) {
  const ctx = await browser.newContext({ viewport: vp }); if (admin) await signIn(ctx);
  const page = await ctx.newPage(); page.on('pageerror', e => L.add({ note: 'pageerror ' + route, detail: String(e) }));
  await page.goto(base + route); await page.waitForSelector(admin ? '.admin-tabs' : route.includes(F.empty) ? '.empty-state' : '.live-grid', { timeout: 20000 }); await settle(page);
  return { ctx, page };
}
// Header control facts: size, accessible name, keyboard focus visibility.
async function headerControls(page) {
  return await page.evaluate(() => {
    const name = el => (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || '').replace(/\s+/g, ' ').trim();
    return [...document.querySelectorAll('.mast nav a, .mast nav button')].map(el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return { tag: el.tagName, name: name(el), href: el.getAttribute('href'), hasIcon: !!el.querySelector('svg'), w: Math.round(r.width), h: Math.round(r.height), fontSize: cs.fontSize, visibleText: [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim() && parseFloat(cs.fontSize) > 0) }; });
  });
}
async function focusAll(page, count) {
  const outRows = [];
  for (let i = 0; i < count + 2; i++) {
    await page.keyboard.press('Tab');
    const f = await page.evaluate(() => { const el = document.activeElement; if (!el || el === document.body) return null; const inNav = !!el.closest('.mast nav'); if (!inNav) return { skip: true }; const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return { name: (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim(), focusVisible: el.matches(':focus-visible'), outline: cs.outlineStyle + ' ' + cs.outlineWidth, w: Math.round(r.width), h: Math.round(r.height) }; });
    if (f && !f.skip) outRows.push(f);
  }
  return outRows;
}
const widths = [320, 390, 430, 700, 701];
// ---- CAL-P2-004: public and operator header at phone widths ----
for (const width of widths) {
  const vp = { width, height: 844 };
  for (const [route, admin, expected] of [['/?event=' + F.live, false, ['Auction board', 'TV mode', 'Operator']], ['/admin?event=' + F.live, true, ['Public board', 'Launch TV Display', 'Help', 'Sign out']]]) {
    const { ctx, page } = await open(vp, route, { admin });
    const controls = await headerControls(page);
    const missing = expected.filter(n => !controls.some(c => c.name === n));
    const zero = controls.filter(c => c.w < 24 || c.h < 24);
    const unnamed = controls.filter(c => !c.name);
    const focus = await focusAll(page, controls.length);
    const notFocusVisible = focus.filter(f => !f.focusVisible || f.outline.startsWith('none'));
    const label = (admin ? 'operator' : 'public') + ' header ' + width + 'px';
    L.add({ check: label + ' controls >= 24px, named, focus-visible', result: missing.length || zero.length || unnamed.length || notFocusVisible.length || focus.length < controls.length ? 'FAIL' : 'PASS', detail: { controls, focusOrder: focus, missing, zero, unnamed, notFocusVisible } });
    if (width === 390 || shotsAll) L.add({ note: 'screenshot', detail: await shot(page, (admin ? 'operator' : 'public') + '-header-' + width) });
    if (width === 390) {
      await page.addScriptTag({ content: axeSource });
      const v = await page.evaluate(async () => (await window.axe.run(document.querySelector('.mast'), { resultTypes: ['violations'] })).violations.map(v => ({ id: v.id, impact: v.impact, count: v.nodes.length, html: v.nodes.slice(0, 3).map(n => n.html.slice(0, 120)) })));
      L.add({ check: label + ' axe (header region)', result: v.some(x => ['serious', 'critical'].includes(x.impact)) ? 'FAIL' : v.length ? 'WARN' : 'PASS', detail: v });
    }
    await ctx.close();
  }
}
// Journeys at 390: keyboard to "Auction board" moves to the board; phone operator signs out to the same event's public board.
{
  const { ctx, page } = await open({ width: 390, height: 844 }, '/?event=' + F.live);
  const link = page.locator('.mast nav a[href="#board"]'); await link.focus(); await page.keyboard.press('Enter'); await settle(page, 1200);
  const r = await page.evaluate(() => { const b = document.getElementById('board').getBoundingClientRect(); return { hash: location.hash, boardTop: Math.round(b.top), scrollY: Math.round(scrollY), inView: b.top < innerHeight && b.bottom > 0 }; });
  L.add({ check: 'public 390 keyboard Enter on Auction board reaches #board', result: r.hash === '#board' && r.inView ? 'PASS' : 'FAIL', detail: r });
  await ctx.close();
}
{
  const { ctx, page } = await open({ width: 390, height: 844 }, '/admin?event=' + F.live, { admin: true });
  try {
    await page.locator('.mast nav a', { hasText: 'Sign out' }).click({ timeout: 8000 }); await page.waitForSelector('.live-grid', { timeout: 20000 }); await settle(page, 600);
    const url = page.url(); const signedOut = await page.evaluate(() => !!document.querySelector('.mast nav a[title="Operator area"], .mast nav a[href*="/admin"]'));
    L.add({ check: 'operator 390 tap Sign out lands on same-event public board', result: url.includes('/?event=' + F.live) && signedOut ? 'PASS' : 'FAIL', detail: { url, signedOut } });
  } catch (e) { L.add({ check: 'operator 390 tap Sign out lands on same-event public board', result: 'FAIL', detail: String(e).split('\n')[0] }); }
  await ctx.close();
}
// ---- CAL-P2-005: TV sizes and states ----
const tvSizes = [[960, 540], [1024, 768], [1093, 614], [1099, 618], [1100, 619], [1280, 720], [1366, 768], [1920, 1080]];
async function tvCheck(page, label, { shotName } = {}) {
  const g = await page.evaluate(() => {
    const vw = innerWidth, vh = innerHeight, de = document.documentElement;
    const rect = el => el.getBoundingClientRect();
    const sel = ['.big-bid', '.block h2', '.players', '.bidder h3', '.stats strong', '.stats p', '.sales-strip strong', '.sales-strip h3', '.sales-strip p', '.queue-row h3', '.queue-row p', '.page-head h1'];
    const bad = [];
    for (const s of sel) for (const el of document.querySelectorAll(s)) { const r = rect(el); if (!r.width && !r.height) continue; const p = rect(el.parentElement); const clipped = el.scrollWidth > el.clientWidth + 1; const outsideParent = r.right > p.right + 1 || r.left < p.left - 1; const outsideViewport = r.right > vw + 1 || r.left < -1 || r.bottom > vh + 1; if (clipped || outsideParent || outsideViewport) bad.push({ s, text: el.textContent.trim().slice(0, 50), clipped, outsideParent, outsideViewport, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] }); }
    // statistic cell containment + neighbour collisions (followup.mjs method)
    const cells = [...document.querySelectorAll('.stats>div')].map(d => ({ label: d.querySelector('p').textContent, value: d.querySelector('strong').textContent, r: rect(d.querySelector('strong')), cell: rect(d) }));
    const statOverlaps = [];
    for (let i = 0; i < cells.length; i++) { const a = cells[i]; if (a.r.right > a.cell.right + 1) statOverlaps.push({ value: a.label, spill: Math.round(a.r.right - a.cell.right) }); for (let j = i + 1; j < cells.length; j++) { const b = cells[j]; const x = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), y = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top); if (x > 1 && y > 1) statOverlaps.push({ a: a.label, b: b.label, overlap: [Math.round(x), Math.round(y)] }); } }
    // section intersections
    const secs = ['.tv>.mast', '.tv>.page-head', '.tv>.live-grid', '.tv>.stats', '.tv>.recent'].map(s => document.querySelector(s)).filter(Boolean).map(el => ({ s: el.className, r: rect(el) }));
    const sectionOverlaps = [];
    for (let i = 0; i < secs.length; i++) for (let j = i + 1; j < secs.length; j++) { const a = secs[i].r, b = secs[j].r; const x = Math.min(a.right, b.right) - Math.max(a.left, b.left), y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (x > 2 && y > 2) sectionOverlaps.push({ a: secs[i].s, b: secs[j].s, overlap: [Math.round(x), Math.round(y)] }); }
    // vertical containment of children inside the live block, queue, stats and recent containers
    const vertical = [];
    for (const [cs, child] of [['.tv .block', '.block-body, .block-top'], ['.tv .block-body', '*'], ['.tv .next', '.queue-row, .section-title, .fine'], ['.tv>.stats', 'div'], ['.tv .sales-strip', 'article']]) { const c = document.querySelector(cs); if (!c) continue; const cr = rect(c); for (const el of c.querySelectorAll(':scope > ' + child)) { const r = rect(el); if (r.bottom > cr.bottom + 1 || r.top < cr.top - 1) vertical.push({ container: cs, child: el.className || el.tagName, text: el.textContent.trim().slice(0, 40), bottomSpill: Math.round(r.bottom - cr.bottom) }); } }
    const stats = cells.map(c => ({ label: c.label, value: c.value, fontSize: getComputedStyle(document.querySelector('.stats strong')).fontSize }));
    return { scrollWidth: de.scrollWidth, scrollHeight: de.scrollHeight, innerWidth: vw, innerHeight: vh, singleScreen: de.scrollHeight <= vh + 1 && de.scrollWidth <= vw + 1, metrics: cells.length, statFontSize: stats[0]?.fontSize, bigBid: getComputedStyle(document.querySelector('.big-bid') || document.body).fontSize, bad, statOverlaps, sectionOverlaps, vertical, gridEngaged: getComputedStyle(document.querySelector('.tv')).display === 'grid' };
  });
  const ok = g.singleScreen && !g.bad.length && !g.statOverlaps.length && !g.sectionOverlaps.length && !g.vertical.length;
  L.add({ check: label, result: ok ? 'PASS' : 'FAIL', detail: g });
  if (shotName && (shotsAll || !ok || ['960x540', '1024x768', '1093x614'].some(k => shotName.includes(k)))) L.add({ note: 'screenshot', detail: await shot(page, shotName) });
  return ok;
}
const tvStates = [['live', F.large, 'AUDIT-E2 Large (100 teams, bid on block)'], ['live-e2', F.live, 'AUDIT-E2 Live (six metrics)'], ['completed', F.completed, 'AUDIT-E2 Completed (seven metrics)']];
try {
  for (const [state, id, note] of tvStates) for (const [w, h] of tvSizes) {
    const { ctx, page } = await open({ width: w, height: h }, '/tv?event=' + id);
    await tvCheck(page, `tv ${state} ${w}x${h} — ${note}`, { shotName: `tv-${state}-${w}x${h}` });
    await ctx.close();
  }
  // Paused: temporary status change on the synthetic Live fixture, restored below.
  const before = (await readAdmin(F.live)).event; L.add({ note: 'fixture status before pause', detail: { id: F.live, status: before.status, revision: before.revision } });
  await setStatus(F.live, 'PAUSED');
  for (const [w, h] of tvSizes) { const { ctx, page } = await open({ width: w, height: h }, '/tv?event=' + F.live); const paused = await page.evaluate(() => !!document.querySelector('.paused')); await tvCheck(page, `tv paused ${w}x${h} — AUDIT-E2 Live paused (${paused ? 'paused styling present' : 'NOT paused'})`, { shotName: `tv-paused-${w}x${h}` }); await ctx.close(); }
  // Batch C / E2 matrix extras: large, demo, empty at the two original TV sizes.
  for (const [state, id] of [['large', F.large], ['demo', F.demo], ['empty', F.empty]]) for (const [w, h] of [[1366, 768], [1920, 1080]]) {
    const { ctx, page } = await open({ width: w, height: h }, '/tv?event=' + id);
    await tvCheck(page, `tv ${state} ${w}x${h}` + (state === 'empty' ? ' (event with no teams: open block, no queue)' : ''), {});
    await ctx.close();
  }
} finally {
  const after = await setStatus(F.live, 'LIVE'); L.add({ note: 'fixture status restored', detail: { id: F.live, status: after.status, revision: after.revision } });
}
// Public board regression at phone widths (Batch C containment) — header change shares the mast.
for (const width of [320, 390, 430]) {
  const { ctx, page } = await open({ width, height: 850 }, '/?event=' + F.live);
  const g = await page.evaluate(() => { const vw = innerWidth; const bad = []; for (const s of ['.big-bid', '.block h2', '.stats strong', '.sales-strip strong', '.team-sale strong', '.pool-amount strong']) for (const el of document.querySelectorAll(s)) { const r = el.getBoundingClientRect(); const p = el.parentElement.getBoundingClientRect(); if (el.scrollWidth > el.clientWidth + 1 || r.right > p.right + 1 || r.right > vw + 1) bad.push({ s, text: el.textContent.trim().slice(0, 40) }); } return { horizontalOverflow: document.documentElement.scrollWidth > vw + 1, bad }; });
  L.add({ check: `public live ${width}x850 containment (regression)`, result: g.horizontalOverflow || g.bad.length ? 'FAIL' : 'PASS', detail: g });
  await ctx.close();
}
await browser.close();
const fails = rows.filter(r => r.result === 'FAIL').length, passes = rows.filter(r => r.result === 'PASS').length;
L.add({ note: 'summary', detail: { PASS: passes, FAIL: fails, WARN: rows.filter(r => r.result === 'WARN').length } });
console.log('done', passes, 'PASS', fails, 'FAIL');
