// Batch G evidence: CAL-P2-006 — Escape with buyer suggestions open must close only the list.
// Local dev server only. Creates ONE disposable synthetic event ("BATCH-G Escape · <stamp>") on the local
// .wrangler/state store and records sales only on that event. Usage: OUT=/abs/dir node batch-g.mjs [--shots]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
const base = 'http://localhost:5173';
if (!/^http:\/\/localhost:5173$/.test(base)) throw new Error('local only');
const out = process.env.OUT || path.resolve('out'); fs.mkdirSync(out, { recursive: true });
const shotsAll = process.argv.includes('--shots');
const axeSource = fs.readFileSync('/home/tanner/development/edwards-county-calcutta/node_modules/axe-core/axe.min.js', 'utf8');
const rows = []; const write = () => fs.writeFileSync(path.join(out, 'batch-g.json'), JSON.stringify(rows, null, 2));
const L = { add(o) { rows.push({ at: new Date().toISOString(), ...o }); write(); console.log((o.result || 'INFO').padEnd(8), o.check || o.note || ''); if (o.detail !== undefined && o.result && o.result !== 'PASS') console.log('   ', JSON.stringify(o.detail).slice(0, 700)); } };
const shot = async (page, name) => { const file = path.join(out, name + '.png'); await page.screenshot({ path: file }); return name + '.png'; };
const settle = (page, ms = 500) => page.waitForTimeout(ms);

// ---- admin API helper (synthetic event only) ----
const login = await fetch(base + '/signin-with-chatgpt?return_to=%2Fadmin', { redirect: 'manual' });
const cookie = login.headers.get('set-cookie').split(';')[0];
let eventId = process.env.EVENT || null, d = null;
async function read() { const r = await fetch(base + '/api/admin' + (eventId ? '?event=' + eventId : ''), { headers: { cookie } }); if (r.status !== 200) throw new Error('admin read ' + r.status); d = (await r.json()).data; return d; }
async function send(action, payload = {}) { const body = { action, payload, eventId, revision: d?.event.revision, requestId: crypto.randomUUID() }; const r = await fetch(base + '/api/admin', { method: 'POST', headers: { cookie, origin: base, 'content-type': 'application/json' }, body: JSON.stringify(body) }); const result = await r.json(); if (r.status !== 200) throw new Error(action + ' ' + r.status + ' ' + JSON.stringify(result)); if (result.eventId) eventId = result.eventId; await read(); return result; }

// ---- disposable synthetic event ----
if (!eventId) {
  const stamp = new Date().toISOString().slice(0, 10);
  await send('create_event', { name: 'BATCH-G Escape · ' + stamp, course: 'Fictional Course', calcuttaName: 'Batch G Escape Calcutta' });
  await send('flight_save', { name: 'Championship', color: '#b79a59', ownPool: true });
  const flightId = d.flights.at(-1).id;
  await send('team_import', { teams: [['Alpha / Bravo', 'Al Pha', 'Bra Vo'], ['Charlie / Delta', 'Char Lie', 'Del Ta'], ['Echo / Foxtrot', 'Ec Ho', 'Fox Trot'], ['Golf / Hotel', 'Go Lf', 'Ho Tel']].map(([name, a, b]) => ({ name, players: [a, b], flightId })) });
  for (const name of ['Table One Syndicate', 'Taylor Syndicate', 'Tanner Group', 'Weekend Club']) await send('buyer_save', { name, privateNotes: 'Synthetic Batch G buyer' });
  await send('status', { status: 'LIVE' });
  L.add({ note: 'created disposable synthetic event', detail: { eventId, name: d.event.name, teams: d.teams.length, buyers: d.buyers.length, status: d.event.status, revision: d.event.revision } });
} else { await read(); L.add({ note: 'reusing event', detail: { eventId, name: d.event.name, revision: d.event.revision } }); }
fs.writeFileSync(path.join(out, 'event.json'), JSON.stringify({ eventId, name: d.event.name }, null, 2));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 } });
{ const p = await ctx.newPage(); await p.goto(base + '/signin-with-chatgpt?return_to=%2Fadmin'); await p.close(); }
const page = await ctx.newPage(); page.on('pageerror', e => L.add({ note: 'pageerror', detail: String(e) }));
await page.goto(base + '/admin?event=' + eventId); await page.waitForSelector('.admin-tabs', { timeout: 20000 }); await settle(page, 900);

const state = () => page.evaluate(() => ({
  dialog: !!document.querySelector('.sale-dialog'),
  dialogCount: document.querySelectorAll('.sale-dialog').length,
  listbox: !!document.querySelector('[role=listbox]'),
  comboExpanded: document.querySelector('.sale-dialog [role=combobox]')?.getAttribute('aria-expanded') ?? null,
  value: document.querySelector('.sale-dialog [role=combobox]')?.value ?? null,
  focus: document.activeElement?.getAttribute('aria-label') || document.activeElement?.tagName,
  focusIsCombobox: document.activeElement?.getAttribute('role') === 'combobox' && !!document.activeElement.closest('.sale-dialog'),
  inlineForm: !!document.querySelector('.inline-buyer'),
  stale: !!document.querySelector('.sale-dialog [role=alert]'),
  confirmDisabled: [...document.querySelectorAll('.sale-dialog button')].find(b => b.textContent.includes('Confirm sale'))?.disabled ?? null,
  alertDialog: !!document.querySelector('[role=alertdialog]'),
  bigBid: document.querySelector('.console-grid .big-bid')?.textContent.trim(),
  block: document.querySelector('.console-grid .block h2')?.textContent.trim(),
})).then(s => ({ ...s }));
const toasts = () => page.evaluate(() => [...document.querySelectorAll('[data-sonner-toast]')].map(t => t.textContent.trim()));
async function ensureBid() { const s = await state(); if (s.bigBid === '$0') { await page.locator('.increments button').first().click(); await settle(page, 1200); } }
async function blurToBody() { await page.evaluate(() => { document.activeElement?.blur?.(); }); }
async function openDialogByKeyboard() { await blurToBody(); await page.keyboard.press('s'); await page.waitForSelector('.sale-dialog', { timeout: 5000 }); await settle(page, 400); }

// ---- 1. Keyboard-only Escape sequence (the approved defect) ----
await ensureBid();
await openDialogByKeyboard();
const s0 = await state();
L.add({ check: 'S opens the Sold dialog with focus in the buyer combobox', result: s0.dialog && s0.focusIsCombobox ? 'PASS' : 'FAIL', detail: s0 });
await page.keyboard.type('Ta'); await settle(page, 500); const s1 = await state();
L.add({ check: 'typing opens the suggestion list', result: s1.listbox && s1.comboExpanded === 'true' ? 'PASS' : 'FAIL', detail: s1 });
if (s1.listbox) L.add({ note: 'screenshot', detail: await shot(page, 'sold-dialog-list-open') });
await page.keyboard.press('Escape'); await settle(page, 500); const s2 = await state();
L.add({ check: 'first Escape closes only the list: dialog retained, list closed, focus still in the combobox', result: s2.dialog && !s2.listbox && s2.comboExpanded !== 'true' && s2.focusIsCombobox ? 'PASS' : 'FAIL', detail: { beforeEscape: s1, afterEscape: s2 } });
L.add({ note: 'screenshot', detail: await shot(page, 'sold-dialog-after-first-escape') });
if (s2.dialog) { await page.keyboard.press('Escape'); await settle(page, 500); }
const s3 = await state();
L.add({ check: 'second Escape closes the dialog', result: s2.dialog && !s3.dialog ? 'PASS' : s2.dialog ? 'FAIL' : 'BLOCKED', detail: s3 });

// ---- 2. Escape with the list closed still closes the dialog (unchanged behaviour) ----
await openDialogByKeyboard(); const s4 = await state(); await page.keyboard.press('Escape'); await settle(page, 500); const s5 = await state();
L.add({ check: 'Escape with the list closed closes the dialog (unchanged)', result: s4.dialog && !s4.listbox && !s5.dialog ? 'PASS' : 'FAIL', detail: { before: s4, after: s5 } });

// ---- 3. Cancel button unchanged ----
await openDialogByKeyboard(); await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await settle(page, 500); const s6 = await state();
L.add({ check: 'Cancel closes the dialog (unchanged)', result: !s6.dialog ? 'PASS' : 'FAIL', detail: s6 });

// ---- 4. Operator shortcuts suppressed while the dialog is open ----
await openDialogByKeyboard();
await page.keyboard.press('Tab'); // leave the combobox so the guard is the dialog, not the input check
const focusBefore = await state();
const revBefore = (await read()).event.revision, bidBefore = d.state.bid;
await page.keyboard.press('u'); await settle(page, 400); const su = await state();
await page.keyboard.press('s'); await settle(page, 400); const ss = await state();
await page.keyboard.press('+'); await settle(page, 800); const sp = await state();
await read();
L.add({ check: 'U / S / + do nothing while the Sold dialog is open', result: !su.alertDialog && ss.dialogCount === 1 && sp.dialog && d.event.revision === revBefore && d.state.bid === bidBefore ? 'PASS' : 'FAIL', detail: { focusBefore: focusBefore.focus, afterU: su, afterS: ss, afterPlus: sp, revisionBefore: revBefore, revisionAfter: d.event.revision, bidBefore, bidAfter: d.state.bid } });
await page.keyboard.press('Escape'); await settle(page, 500);
if ((await state()).dialog) { await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await settle(page, 400); }

// ---- 5. One-click "Add buyer here" with the list open (mouse) ----
await openDialogByKeyboard(); await page.locator('.sale-dialog [role=combobox]').fill('Ta'); await settle(page, 500); const s7 = await state();
const box = await page.evaluate(() => { const btn = [...document.querySelectorAll('.sale-dialog button')].find(b => b.textContent.includes('Add buyer here')); const r = btn.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
await page.mouse.click(box.x, box.y); await settle(page, 600); const s8 = await state();
L.add({ check: 'clicking "Add buyer here" while the list is open opens the inline form in one click', result: s7.listbox && s8.inlineForm && s8.dialog ? 'PASS' : 'FAIL', detail: { listOpenBefore: s7.listbox, after: s8 } });
await page.getByLabel('New buyer name').fill('Batch G Buyer'); await page.getByRole('button', { name: 'Add & select' }).click(); await settle(page, 1200); const s9 = await state();
L.add({ check: 'inline buyer created and selected; Confirm enabled', result: s9.dialog && s9.confirmDisabled === false && s9.value === 'Batch G Buyer' ? 'PASS' : 'FAIL', detail: s9 });

// ---- 6. Confirm produces exactly one sale (keyboard Enter on Confirm, then a double-click on the next team) ----
const salesBefore = (await read()).sales.length, blockBefore = d.state.teamId;
await page.getByRole('button', { name: 'Confirm sale' }).focus(); await page.keyboard.press('Enter'); await settle(page, 1500); await read(); const s10 = await state();
L.add({ check: 'Confirm (keyboard Enter) records exactly one sale and closes the dialog', result: d.sales.length === salesBefore + 1 && !s10.dialog && d.state.teamId !== blockBefore ? 'PASS' : 'FAIL', detail: { salesBefore, salesAfter: d.sales.length, dialog: s10.dialog, toasts: await toasts(), nextTeam: s10.block } });
await ensureBid(); await openDialogByKeyboard(); await page.keyboard.type('Wee'); await settle(page, 400); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); await settle(page, 400); const s11 = await state();
const salesBefore2 = (await read()).sales.length;
await page.getByRole('button', { name: 'Confirm sale' }).dblclick(); await settle(page, 1500); await read(); const s12 = await state();
L.add({ check: 'keyboard-selected buyer then double-clicked Confirm records exactly one sale', result: s11.value === 'Weekend Club' && d.sales.length === salesBefore2 + 1 && !s12.dialog ? 'PASS' : 'FAIL', detail: { selected: s11.value, salesBefore: salesBefore2, salesAfter: d.sales.length, dialog: s12.dialog } });

// ---- 7. Stale dialog still disabled; Escape with list open still keeps the (stale) dialog ----
await ensureBid(); await openDialogByKeyboard(); const revOpen = (await read()).event.revision;
await send('bid', { teamId: d.state.teamId, amount: d.state.bid + 5000 }); // another operator raises the bid
await page.waitForFunction(() => !!document.querySelector('.sale-dialog [role=alert]'), null, { timeout: 15000 }).catch(() => null); await settle(page, 300); const s13 = await state();
L.add({ check: 'stale dialog: notice shown and Confirm disabled after the auction changed', result: s13.dialog && s13.stale && s13.confirmDisabled === true ? 'PASS' : 'FAIL', detail: { revisionAtOpen: revOpen, revisionNow: d.event.revision, ...s13 } });
await page.locator('.sale-dialog [role=combobox]').focus(); await page.keyboard.type('Ta'); await settle(page, 400); const s14 = await state();
await page.keyboard.press('Escape'); await settle(page, 400); const s15 = await state();
await page.keyboard.press('Escape'); await settle(page, 400); const s16 = await state();
L.add({ check: 'stale dialog: Escape closes the list first, second Escape closes the dialog', result: s14.listbox && s15.dialog && !s15.listbox && !s16.dialog ? 'PASS' : 'FAIL', detail: { listOpen: s14.listbox, afterFirst: s15, afterSecond: s16 } });

// ---- 8. axe on the open dialog with the list open ----
await openDialogByKeyboard(); await page.keyboard.type('Ta'); await settle(page, 400);
await page.addScriptTag({ content: axeSource });
// Scoped to the dialog and its portalled popup; page-wide contrast is the separate open CAL-P2-007 and `region` is a page-landmark rule that does not apply to a popup.
const v = await page.evaluate(async () => (await window.axe.run({ include: [['.sale-dialog'], ['[role=listbox]']] }, { resultTypes: ['violations'], rules: { region: { enabled: false } } })).violations.map(v => ({ id: v.id, impact: v.impact, count: v.nodes.length, html: v.nodes.slice(0, 3).map(n => n.html.slice(0, 120)) })));
L.add({ check: 'axe on the Sold dialog and open suggestion list', result: v.some(x => ['serious', 'critical'].includes(x.impact)) ? 'FAIL' : v.length ? 'WARN' : 'PASS', detail: v });
await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await settle(page, 400);

// ---- 9. Phone width: the same first-Escape check ----
await page.setViewportSize({ width: 390, height: 844 }); await settle(page, 600);
await openDialogByKeyboard(); await page.keyboard.type('Ta'); await settle(page, 500); const s17 = await state();
await page.keyboard.press('Escape'); await settle(page, 500); const s18 = await state();
L.add({ check: 'phone 390: first Escape closes only the list', result: s17.listbox && s18.dialog && !s18.listbox && s18.focusIsCombobox ? 'PASS' : 'FAIL', detail: { before: s17, after: s18 } });
if (shotsAll) L.add({ note: 'screenshot', detail: await shot(page, 'sold-dialog-390-after-first-escape') });
await page.keyboard.press('Escape'); await settle(page, 400);

await read();
L.add({ note: 'final synthetic event state', detail: { eventId, name: d.event.name, status: d.event.status, revision: d.event.revision, sales: d.sales.length, buyers: d.buyers.map(b => b.name), bid: d.state.bid } });
const totals = rows.reduce((t, r) => { if (r.result) t[r.result] = (t[r.result] || 0) + 1; return t; }, {});
L.add({ note: 'totals', detail: totals });
await ctx.close(); await browser.close();
