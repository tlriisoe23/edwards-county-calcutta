// Batch H evidence: CAL-P2-007 (AA contrast for five supporting texts) and CAL-P3-002 (filter tabs must control real panels).
// Local dev server only; READ-ONLY — it signs in with the starter's mock identity and only reads the existing AUDIT-E2 fixtures.
// Usage: OUT=/abs/dir node batch-h.mjs [--shots]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
const base = 'http://localhost:5173';
if (!/^http:\/\/localhost:5173$/.test(base)) throw new Error('local only');
const repo = '/home/tanner/development/edwards-county-calcutta';
const F = JSON.parse(fs.readFileSync(repo + '/docs/audit-e2-evidence/fixtures.json', 'utf8'));
const out = process.env.OUT || path.resolve('out'); fs.mkdirSync(out, { recursive: true });
const shots = process.argv.includes('--shots');
const axeSource = fs.readFileSync(repo + '/node_modules/axe-core/axe.min.js', 'utf8');
const rows = []; const write = () => fs.writeFileSync(path.join(out, 'batch-h.json'), JSON.stringify(rows, null, 2));
const L = { add(o) { rows.push({ at: new Date().toISOString(), ...o }); write(); console.log((o.result || 'INFO').padEnd(8), o.check || o.note || ''); if (o.detail !== undefined && o.result && o.result !== 'PASS') console.log('   ', JSON.stringify(o.detail).slice(0, 600)); } };
const settle = (page, ms = 700) => page.waitForTimeout(ms);
const shot = async (page, name, clip) => { if (!shots) return null; const file = path.join(out, name + '.png'); await page.screenshot({ path: file, clip }); return name + '.png'; };

// Contrast: resolve any CSS colour (including alpha / color-mix output) by painting it on a canvas over the resolved ancestor background.
const CONTRAST_FN = new Function('return ' + `(sel) => {
  const paint = (css, over) => { const c = document.createElement('canvas'); c.width = c.height = 1; const x = c.getContext('2d'); if (over) { x.fillStyle = over; x.fillRect(0, 0, 1, 1); } x.fillStyle = css; x.fillRect(0, 0, 1, 1); const d = x.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3]]; };
  const hex = a => '#' + a.slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join('');
  const lum = a => { const [r, g, b] = a.slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
  const items = [];
  for (const el of document.querySelectorAll(sel)) {
    const cs = getComputedStyle(el); if (cs.display === 'none' || !el.getClientRects().length) continue;
    let bgCss = null, p = el.parentElement; while (p && !bgCss) { const b = getComputedStyle(p).backgroundColor; if (b && paint(b)[3] === 255) bgCss = b; p = p.parentElement; }
    bgCss = bgCss || 'rgb(255,255,255)';
    const bg = paint(bgCss), fg = paint(cs.color, bgCss);
    const l1 = lum(fg), l2 = lum(bg); const ratio = Math.round((Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05) * 100) / 100;
    const size = parseFloat(cs.fontSize), weight = parseInt(cs.fontWeight); const large = size >= 24 || (size >= 18.66 && weight >= 700);
    items.push({ text: (el.textContent || '').trim().slice(0, 30), color: hex(fg), rawColor: cs.color, background: hex(bg), fontSize: cs.fontSize, fontWeight: cs.fontWeight, ratio, needed: large ? 3 : 4.5 });
  }
  const min = items.length ? Math.min(...items.map(i => i.ratio)) : null;
  return { selector: sel, nodes: items.length, min, ok: items.length > 0 && items.every(i => i.ratio >= i.needed), sample: items[0] || null, distinct: [...new Set(items.map(i => i.color + ' on ' + i.background + ' ' + i.fontSize + '/' + i.fontWeight + ' = ' + i.ratio))] };
}`)();
async function contrastRows(page, surface, selectors) {
  const results = [];
  for (const sel of selectors) results.push(await page.evaluate(CONTRAST_FN, sel));
  const missing = results.filter(r => !r.nodes).map(r => r.selector);
  L.add({ check: `contrast ${surface}: ${selectors.join(', ')}`, result: results.every(r => r.ok) ? 'PASS' : 'FAIL', detail: { missing, rows: results.map(r => ({ selector: r.selector, nodes: r.nodes, min: r.min, ok: r.ok, distinct: r.distinct.slice(0, 4) })) } });
  return results;
}
async function axeRun(page, name, options = {}) {
  await page.addScriptTag({ content: axeSource });
  const res = await page.evaluate(async (options) => { const r = await window.axe.run(document, { resultTypes: ['violations'], ...options }); return r.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, count: v.nodes.length, nodes: v.nodes.slice(0, 40).map(n => ({ target: n.target.join(' '), html: n.html.slice(0, 100) })) })); }, options);
  const contrast = res.find(v => v.id === 'color-contrast' && ['serious', 'critical'].includes(v.impact));
  const aria = res.filter(v => ['aria-valid-attr-value', 'aria-valid-attr'].includes(v.id));
  L.add({ check: `axe ${name}`, result: contrast || aria.length ? 'FAIL' : 'PASS', detail: { colorContrastNodes: contrast?.count || 0, ariaControlsViolations: aria.reduce((n, v) => n + v.count, 0), all: res.map(v => ({ id: v.id, impact: v.impact, count: v.count })), contrastNodes: contrast?.nodes, ariaNodes: aria.flatMap(v => v.nodes) } });
  return res;
}
const TABS_FN = new Function('return ' + `(scope) => [...document.querySelectorAll(scope + ' [role=tab]')].map(t => { const id = t.getAttribute('aria-controls'); const panel = id ? document.getElementById(id) : null; return { name: t.textContent.trim(), selected: t.getAttribute('aria-selected'), controls: id, panelExists: !!panel, panelRole: panel?.getAttribute('role') || null, labelledByTab: panel?.getAttribute('aria-labelledby') === t.id, panelTabIndex: panel?.getAttribute('tabindex') ?? null }; })`)();
async function tabsCheck(page, name, scope) {
  const tabs = await page.evaluate(TABS_FN, scope);
  const active = tabs.filter(t => t.selected === 'true');
  const ok = tabs.length > 0 && active.length === 1 && active.every(t => t.panelExists && t.panelRole === 'tabpanel' && t.labelledByTab);
  L.add({ check: `${name}: the selected tab controls an existing tabpanel labelled by it`, result: ok ? 'PASS' : 'FAIL', detail: tabs });
  return tabs;
}
const focusInfo = () => ({ tag: document.activeElement?.tagName, role: document.activeElement?.getAttribute('role'), name: (document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent || '').trim().slice(0, 40), selected: document.activeElement?.getAttribute('aria-selected') });
async function headerCheck(page, name) {
  const links = await page.evaluate(() => [...document.querySelectorAll('.mast nav a, .mast nav button')].map(a => { const r = a.getBoundingClientRect(); return { name: (a.getAttribute('aria-label') || a.getAttribute('title') || a.textContent || '').trim(), w: Math.round(r.width), h: Math.round(r.height) }; }));
  const focus = [];
  for (let i = 0; i < links.length; i++) { await page.evaluate(i => { const el = document.querySelectorAll('.mast nav a, .mast nav button')[i]; el.focus(); }, i); const f = await page.evaluate(i => { const el = document.querySelectorAll('.mast nav a, .mast nav button')[i]; const cs = getComputedStyle(el); return { focusVisible: el.matches(':focus-visible'), outline: cs.outlineStyle + ' ' + cs.outlineWidth }; }, i); focus.push(f); }
  const ok = links.length >= 2 && links.every((l, i) => l.name && l.w >= 24 && l.h >= 24 && focus[i].focusVisible && focus[i].outline !== 'none 0px');
  L.add({ check: `${name}: header controls named, >= 24 px and focus-visible (Batch F regression)`, result: ok ? 'PASS' : 'FAIL', detail: links.map((l, i) => ({ ...l, ...focus[i] })) });
}
async function tvOneScreen(page, name) {
  const g = await page.evaluate(() => {
    const vw = innerWidth, vh = innerHeight, bad = [];
    for (const sel of ['.stats strong', '.stats p', '.big-bid', '.block h2', '.sales-strip strong', '.sales-strip h3', '.queue-row h3']) for (const el of document.querySelectorAll(sel)) { const r = el.getBoundingClientRect(); if (!r.width && !r.height) continue; const pr = el.parentElement.getBoundingClientRect(); if (el.scrollWidth > el.clientWidth + 1 || r.right > pr.right + 1 || r.left < pr.left - 1 || r.right > vw + 1 || r.bottom > vh + 1) bad.push({ sel, text: el.textContent.trim().slice(0, 40) }); }
    const cells = [...document.querySelectorAll('.stats>div')].map(d => ({ label: d.querySelector('p').textContent, r: d.querySelector('strong').getBoundingClientRect(), cell: d.getBoundingClientRect() })); const overlaps = [];
    for (let i = 0; i < cells.length; i++) { const a = cells[i]; if (a.r.right > a.cell.right + 1) overlaps.push({ value: a.label, spill: Math.round(a.r.right - a.cell.right) }); for (let j = i + 1; j < cells.length; j++) { const b = cells[j]; const x = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), y = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top); if (x > 1 && y > 1) overlaps.push({ a: a.label, b: b.label }); } }
    const secs = ['.tv>.page-head', '.tv>.live-grid', '.tv>.stats', '.tv>.recent'].map(s => document.querySelector(s)).filter(Boolean).map(el => el.getBoundingClientRect()); const sectionOverlaps = [];
    for (let i = 0; i < secs.length; i++) for (let j = i + 1; j < secs.length; j++) { const a = secs[i], b = secs[j]; const x = Math.min(a.right, b.right) - Math.max(a.left, b.left), y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (x > 2 && y > 2) sectionOverlaps.push([i, j]); }
    return { scrollHeight: document.documentElement.scrollHeight, innerHeight: vh, singleScreen: document.documentElement.scrollHeight <= vh + 1, bad, overlaps, sectionOverlaps };
  });
  L.add({ check: `${name}: one screen, contained statistics, no section overlap (Batch F regression)`, result: g.singleScreen && !g.bad.length && !g.overlaps.length && !g.sectionOverlaps.length ? 'PASS' : 'FAIL', detail: g });
}

const browser = await chromium.launch();
L.add({ note: 'environment', detail: { playwright: browser.version(), fixtures: { live: F.live, completed: F.completed }, readOnly: true } });

// ---- Public board (laptop) ----
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); const page = await ctx.newPage(); page.on('pageerror', e => L.add({ note: 'pageerror', detail: String(e) }));
  await page.goto(base + '/?event=' + F.live); await page.waitForSelector('.team-cards'); await settle(page, 900);
  await contrastRows(page, 'public 1280x720', ['.queue-row .lot', '.sales-strip p', '.payouts small', '.board-tools [role=tab][aria-selected=false]', '.page-head .eyebrow']);
  await tabsCheck(page, 'public flight filter', '.board-tools');
  await axeRun(page, 'public 1280x720');
  // Keyboard: arrow keys move the selection (automatic activation); Tab order unchanged.
  const before = await page.evaluate(() => ({ cards: document.querySelectorAll('.team-card').length, flights: [...new Set([...document.querySelectorAll('.team-meta span:first-child')].map(s => s.textContent))] }));
  await page.locator('.board-tools [role=tab]').first().focus(); await page.keyboard.press('ArrowRight'); await settle(page, 500);
  const afterArrow = await page.evaluate(() => ({ cards: document.querySelectorAll('.team-card').length, flights: [...new Set([...document.querySelectorAll('.team-meta span:first-child')].map(s => s.textContent))], focus: (() => { const el = document.activeElement; return { role: el?.getAttribute('role'), name: el?.textContent.trim(), selected: el?.getAttribute('aria-selected') }; })() }));
  const tabsAfter = await page.evaluate(TABS_FN, '.board-tools');
  L.add({ check: 'public: ArrowRight selects the next flight tab and filters the board', result: afterArrow.focus.role === 'tab' && afterArrow.focus.selected === 'true' && afterArrow.focus.name !== 'All flights' && afterArrow.flights.length === 1 && afterArrow.flights[0] === afterArrow.focus.name && afterArrow.cards < before.cards ? 'PASS' : 'FAIL', detail: { before, afterArrow } });
  const sel = tabsAfter.find(t => t.selected === 'true');
  L.add({ check: 'public: after the arrow key the newly selected tab controls the visible panel', result: sel?.panelExists && sel.panelRole === 'tabpanel' ? 'PASS' : 'FAIL', detail: sel });
  await page.keyboard.press('Tab'); const f1 = await page.evaluate(focusInfo);
  L.add({ check: 'public: Tab from the flight tabs reaches the team search (unchanged order)', result: f1.name === 'Search teams' ? 'PASS' : 'FAIL', detail: f1 });
  await page.keyboard.press('Tab'); const f2 = await page.evaluate(focusInfo); await page.keyboard.press('Tab'); const f3 = await page.evaluate(focusInfo);
  L.add({ note: 'public: focus after the status select (recorded for before/after comparison; the new tabpanel must not add a stop)', detail: { afterSearch: f2, afterStatus: f3 } });
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Home'); await settle(page, 400);
  const home = await page.evaluate(focusInfo);
  L.add({ check: 'public: Home returns to All flights', result: home.name === 'All flights' && home.selected === 'true' ? 'PASS' : 'FAIL', detail: home });
  await page.locator('.board-tools').scrollIntoViewIfNeeded(); await settle(page, 300);
  const toolsBox = await page.locator('.board-tools').boundingBox();
  if (toolsBox) { const y = Math.max(0, Math.round(toolsBox.y) - 90); L.add({ note: 'screenshot', detail: await shot(page, 'public-board-tools-1280', { x: 0, y, width: 1280, height: Math.min(520, 720 - y) }) }); }
  await ctx.close();
}
// ---- Public board (phone) ----
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const page = await ctx.newPage();
  await page.goto(base + '/?event=' + F.live); await page.waitForSelector('.team-cards'); await settle(page, 900);
  // The "Coming to the block" aside (and its lot numbers) is display:none at phone width by design, so .lot is not measured here.
  await contrastRows(page, 'public 390x844', ['.sales-strip p', '.payouts small', '.board-tools [role=tab][aria-selected=false]', '.page-head .eyebrow']);
  await tabsCheck(page, 'public flight filter 390', '.board-tools');
  await axeRun(page, 'public 390x844');
  await headerCheck(page, 'public 390');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  L.add({ check: 'public 390: no horizontal overflow', result: overflow ? 'FAIL' : 'PASS' });
  await ctx.close();
}
// ---- TV ----
for (const [w, h, state, id] of [[1920, 1080, 'live', F.live], [1093, 614, 'live', F.live], [1093, 614, 'completed', F.completed], [1366, 768, 'live', F.live]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } }); const page = await ctx.newPage();
  await page.goto(base + '/tv?event=' + id); await page.waitForSelector('.live-grid'); await settle(page, 900);
  if (state === 'live') await contrastRows(page, `tv ${state} ${w}x${h}`, ['.queue-row .lot', '.sales-strip p', '.page-head .eyebrow']);
  else await contrastRows(page, `tv ${state} ${w}x${h}`, ['.sales-strip p', '.page-head .eyebrow']);
  await axeRun(page, `tv ${state} ${w}x${h}`);
  if (w === 1093) { await tvOneScreen(page, `tv ${state} 1093x614`); if (state === 'live') L.add({ note: 'screenshot', detail: await shot(page, 'tv-live-1093x614') }); }
  await ctx.close();
}
// ---- Operator ----
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  { const p = await ctx.newPage(); await p.goto(base + '/signin-with-chatgpt?return_to=%2Fadmin'); await p.close(); }
  const page = await ctx.newPage(); page.on('pageerror', e => L.add({ note: 'pageerror', detail: String(e) }));
  await page.goto(base + '/admin?event=' + F.live); await page.waitForSelector('.admin-tabs'); await settle(page, 1000);
  await contrastRows(page, 'operator console 1280x720', ['.admin-tabs [role=tab][aria-selected=false]', '.admin-heading .eyebrow', '.console-queue .lot', '.payouts small']);
  const inactive = await page.evaluate(() => document.querySelectorAll('.admin-tabs [role=tab][aria-selected=false]').length);
  L.add({ note: 'operator: inactive tab count', detail: inactive });
  await axeRun(page, 'operator console');
  await tabsCheck(page, 'operator navigation tabs', '.admin-tabs');
  // Settlement on the completed fixture (has receipts and payables).
  await page.goto(base + '/admin?event=' + F.completed); await page.waitForSelector('.admin-tabs'); await settle(page, 1000);
  await page.getByRole('tab', { name: 'Settlement' }).click(); await page.waitForSelector('.settlement-tools'); await settle(page, 700);
  await contrastRows(page, 'operator settlement', ['.admin-tabs [role=tab][aria-selected=false]', '.settlement-tools [role=tab][aria-selected=false]', '.admin-heading .eyebrow']);
  await tabsCheck(page, 'settlement filter', '.settlement-tools');
  await axeRun(page, 'operator settlement');
  const receipts = await page.evaluate(() => ({ cards: document.querySelectorAll('.account-card').length, firstButton: document.querySelector('.account-card .actions button')?.textContent.trim() }));
  await page.locator('.settlement-tools [role=tab]').first().focus(); await page.keyboard.press('ArrowRight'); await settle(page, 500);
  const payouts = await page.evaluate(() => ({ cards: document.querySelectorAll('.account-card').length, firstButton: document.querySelector('.account-card .actions button')?.textContent.trim(), fine: !!document.querySelector('.settlement-tools + .fine'), focus: (() => { const el = document.activeElement; return { role: el?.getAttribute('role'), name: el?.textContent.trim(), selected: el?.getAttribute('aria-selected') }; })() }));
  L.add({ check: 'settlement: ArrowRight selects Tournament payouts and switches the accounts view', result: payouts.focus.name === 'Tournament payouts' && payouts.focus.selected === 'true' && payouts.firstButton === 'Mark payout paid' && receipts.firstButton === 'Mark paid' ? 'PASS' : 'FAIL', detail: { receipts, payouts } });
  const sTabs = await page.evaluate(TABS_FN, '.settlement-tools'); const sSel = sTabs.find(t => t.selected === 'true');
  L.add({ check: 'settlement: the Tournament payouts tab controls the visible panel', result: sSel?.panelExists && sSel.panelRole === 'tabpanel' ? 'PASS' : 'FAIL', detail: sSel });
  await page.keyboard.press('Tab'); const sf = await page.evaluate(focusInfo);
  L.add({ check: 'settlement: Tab from the filter tabs reaches the account search (unchanged order)', result: sf.name === 'Search settlement accounts' ? 'PASS' : 'FAIL', detail: sf });
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); const sf2 = await page.evaluate(focusInfo);
  L.add({ note: 'settlement: focus two stops after the search (recorded for before/after comparison)', detail: sf2 });
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('ArrowLeft'); await settle(page, 400);
  const backLeft = await page.evaluate(focusInfo);
  L.add({ check: 'settlement: ArrowLeft returns to Auction payments', result: backLeft.name === 'Auction payments' && backLeft.selected === 'true' ? 'PASS' : 'FAIL', detail: backLeft });
  const toolsBox = await page.locator('.settlement-tools').boundingBox();
  if (toolsBox) L.add({ note: 'screenshot', detail: await shot(page, 'operator-settlement-tabs-1280', { x: 0, y: Math.max(0, toolsBox.y - 120), width: 1280, height: 420 }) });
  // Exports
  await page.getByRole('tab', { name: 'Exports' }).click(); await settle(page, 700);
  await contrastRows(page, 'operator exports', ['.admin-tabs [role=tab][aria-selected=false]', '.admin-heading .eyebrow']);
  await axeRun(page, 'operator exports');
  await ctx.close();
  // Operator phone header (Batch F regression)
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  { const p = await ctx2.newPage(); await p.goto(base + '/signin-with-chatgpt?return_to=%2Fadmin'); await p.close(); }
  const p2 = await ctx2.newPage(); await p2.goto(base + '/admin?event=' + F.live); await p2.waitForSelector('.admin-tabs'); await settle(p2, 1000);
  await contrastRows(p2, 'operator console 390x844', ['.admin-tabs [role=tab][aria-selected=false]', '.admin-heading .eyebrow']);
  await headerCheck(p2, 'operator 390');
  await axeRun(p2, 'operator console 390x844');
  await ctx2.close();
}
await browser.close();
const tally = rows.reduce((t, r) => { if (r.result) t[r.result] = (t[r.result] || 0) + 1; return t; }, {});
L.add({ note: 'tally', detail: tally });
console.log('done', JSON.stringify(tally));
