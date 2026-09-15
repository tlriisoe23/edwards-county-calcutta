// Batch I evidence: CAL-P3-003 (no silent zero settings), CAL-P3-004 (import rows marked inline), CAL-P3-005 (honest Access messages, owners read-only), CAL-P3-007 (Hammer above the fold under 800 px tall).
// Local dev server only. Writes go to ONE disposable synthetic event the script creates ("BATCH-I Data entry · 2026-09-15") and to two
// operator grants it revokes again; the AUDIT-E2 Live fixture is only read (console geometry). Usage: OUT=/abs/dir node batch-i.mjs [--shots]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
const base = 'http://localhost:5173';
if (!/^http:\/\/localhost:5173$/.test(base)) throw new Error('local only');
const repo = '/home/tanner/development/edwards-county-calcutta';
const F = JSON.parse(fs.readFileSync(repo + '/docs/audit-e2-evidence/fixtures.json', 'utf8'));
const out = process.env.OUT || path.resolve('out'); fs.mkdirSync(out, { recursive: true });
const shots = process.argv.includes('--shots');
const OWNER = 'seedy@sites.test', OPERATOR = 'batch-i-browser@sites.test';
const MSG_MINBID = 'Enter a minimum starting bid of at least $1.00';
const rows = []; const write = () => fs.writeFileSync(path.join(out, 'batch-i.json'), JSON.stringify(rows, null, 2));
const L = { add(o) { rows.push({ at: new Date().toISOString(), ...o }); write(); console.log((o.result || 'INFO').padEnd(8), o.check || o.note || ''); if (o.detail !== undefined && o.result && o.result !== 'PASS') console.log('   ', JSON.stringify(o.detail).slice(0, 700)); } };
const settle = (page, ms = 700) => page.waitForTimeout(ms);
const shot = async (page, name, full = false) => { if (!shots) return null; const file = path.join(out, name + '.png'); await page.screenshot({ path: file, fullPage: full }); return name + '.png'; };

// --- API helpers (same mock sign-in the suites use) ---
const login = await fetch(base + '/signin-with-chatgpt?return_to=%2Fadmin', { redirect: 'manual' }), cookie = login.headers.get('set-cookie').split(';')[0];
let eventId, d;
async function read(id = eventId) { const r = await fetch(base + '/api/admin' + (id ? '?event=' + id : ''), { headers: { cookie } }); if (r.status !== 200) throw new Error('read ' + r.status); const b = await r.json(); if (id === eventId) d = b.data; return b; }
async function post(action, payload = {}, extra = {}) { const requestId = extra.requestId || crypto.randomUUID(); const r = await fetch(base + '/api/admin', { method: 'POST', headers: { cookie, origin: base, 'content-type': 'application/json' }, body: JSON.stringify({ action, payload, eventId, revision: d?.event.revision, ...extra, requestId }) }); return { status: r.status, body: await r.json(), requestId }; }
async function send(action, payload = {}, extra = {}) { const r = await post(action, payload, extra); if (r.status !== 200) throw new Error(action + ' ' + JSON.stringify(r.body)); if (r.body.eventId) eventId = r.body.eventId; await read(); return r; }
const hasOperator = async email => (await read()).operators.some(o => o.email === email);
const auditFor = async action => (await read()).audit.filter(a => a.action === action).length;

// --- browser helpers ---
const browser = await chromium.launch();
const toasts = page => page.evaluate(() => [...document.querySelectorAll('[data-sonner-toast]')].map(t => t.textContent.trim()));
const feedback = async (page, label) => ({ toasts: await toasts(page), inline: await page.evaluate(() => [...document.querySelectorAll('.field-error, [role=alert]')].map(e => e.textContent.trim()).filter(Boolean)), validationMessage: label ? await page.getByLabel(label).evaluate(el => el.validationMessage) : null });
async function desk(vp, id, tab = 'Auction console') {
  const ctx = await browser.newContext({ viewport: vp }); const p0 = await ctx.newPage(); await p0.goto(base + '/signin-with-chatgpt?return_to=%2Fadmin'); await p0.close();
  const page = await ctx.newPage(); page.on('pageerror', e => L.add({ note: 'pageerror', detail: String(e) }));
  await page.goto(base + '/admin?event=' + id); await page.waitForSelector('.admin-tabs', { timeout: 20000 }); await settle(page, 900);
  if (tab !== 'Auction console') { await page.getByRole('tab', { name: tab }).click(); await settle(page, 600); }
  return { ctx, page };
}
const clearToasts = page => page.evaluate(() => document.querySelectorAll('[data-sonner-toast]').forEach(t => t.remove()));
async function saveRules(page, label) { await clearToasts(page); await page.getByRole('button', { name: 'Save event & rules' }).click(); await settle(page, 1300); return await feedback(page, label); }

try {
  // Disposable synthetic event (one flight pair matching the E2 import paste; SETUP status so no bidding is possible).
  await send('create_event', { name: 'BATCH-I Data entry · 2026-09-15', course: 'Synthetic fixture (disposable)' });
  await send('flight_save', { name: 'Championship', color: '#b79a59', ownPool: true });
  await send('flight_save', { name: 'First Flight', color: '#889b75', ownPool: true });
  L.add({ note: 'disposable event', detail: { eventId, minBid: d.event.settings.minBid, deductionType: d.event.settings.deductionType, deduction: d.event.settings.deduction } });
  fs.writeFileSync(path.join(out, 'event.json'), JSON.stringify({ eventId, createdAt: new Date().toISOString() }, null, 2));

  // ---------- CAL-P3-003: Setup & rules ----------
  {
    const { ctx, page } = await desk({ width: 1280, height: 720 }, eventId, 'Setup & rules');
    const minBefore = d.event.settings.minBid;
    await page.getByLabel('Minimum starting bid').fill('');
    let fb = await saveRules(page, 'Minimum starting bid'); await read();
    const blocked = !fb.toasts.includes('Saved') && d.event.settings.minBid === minBefore;
    const exact = [...fb.toasts, ...fb.inline, fb.validationMessage || ''].some(t => t.includes(MSG_MINBID));
    L.add({ check: 'rules: cleared minimum bid blocks save with the exact message', result: blocked && exact ? 'PASS' : 'FAIL', detail: { ...fb, minBidBefore: minBefore, minBidAfter: d.event.settings.minBid } });
    L.add({ note: 'screenshot', detail: await shot(page, 'rules-minbid-blank-1280') });
    if (d.event.settings.minBid !== minBefore) { await send('event_update', { ...d.event, settings: { ...d.event.settings, minBid: minBefore } }); L.add({ note: 'minBid restored after silent zero', detail: minBefore }); await page.reload(); await page.waitForSelector('.admin-tabs'); await settle(page, 900); await page.getByRole('tab', { name: 'Setup & rules' }).click(); await settle(page, 600); }
    await settle(page, 4200);
    await page.getByLabel('Minimum starting bid').fill('0.99');
    fb = await saveRules(page, 'Minimum starting bid'); await read();
    L.add({ check: 'rules: $0.99 minimum bid is rejected with the exact message', result: !fb.toasts.includes('Saved') && d.event.settings.minBid === minBefore && [...fb.toasts, ...fb.inline, fb.validationMessage || ''].some(t => t.includes(MSG_MINBID)) ? 'PASS' : 'FAIL', detail: { ...fb, minBidAfter: d.event.settings.minBid } });
    if (d.event.settings.minBid !== minBefore) { await send('event_update', { ...d.event, settings: { ...d.event.settings, minBid: minBefore } }); L.add({ note: 'minBid restored after $0.99', detail: minBefore }); await page.reload(); await page.waitForSelector('.admin-tabs'); await settle(page, 900); await page.getByRole('tab', { name: 'Setup & rules' }).click(); await settle(page, 600); }
    await settle(page, 4200);
    await page.getByLabel('Minimum starting bid').fill('1');
    fb = await saveRules(page, 'Minimum starting bid'); await read();
    L.add({ check: 'rules: $1.00 minimum bid saves', result: fb.toasts.includes('Saved') && d.event.settings.minBid === 100 ? 'PASS' : 'FAIL', detail: { ...fb, minBidAfter: d.event.settings.minBid } });
    await settle(page, 4200);
    // Deduction: percent with an empty amount must not save 0.
    const dedBefore = d.event.settings.deduction;
    await page.getByLabel('Deduction (%)').fill('');
    fb = await saveRules(page, 'Deduction (%)'); await read();
    L.add({ check: 'rules: cleared percent deduction blocks save with a message', result: !fb.toasts.includes('Saved') && d.event.settings.deduction === dedBefore && d.event.settings.deductionType === 'percent' && [...fb.toasts, ...fb.inline, fb.validationMessage || ''].some(t => /deduction/i.test(t)) ? 'PASS' : 'FAIL', detail: { ...fb, deductionBefore: dedBefore, deductionAfter: d.event.settings.deduction, type: d.event.settings.deductionType } });
    L.add({ note: 'screenshot', detail: await shot(page, 'rules-deduction-blank-1280') });
    await settle(page, 4200);
    // Deliberate "no house cut" = type None.
    await page.getByLabel('Deduction type').click(); await page.getByRole('option', { name: 'None' }).click(); await settle(page, 300);
    fb = await saveRules(page, null); await read();
    L.add({ check: 'rules: deduction type None saves deliberately', result: fb.toasts.includes('Saved') && d.event.settings.deductionType === 'none' ? 'PASS' : 'FAIL', detail: { ...fb, type: d.event.settings.deductionType, deduction: d.event.settings.deduction } });
    await ctx.close();
  }

  // ---------- CAL-P3-004: import preview ----------
  {
    const { ctx, page } = await desk({ width: 1280, height: 720 }, eventId, 'Teams');
    await page.getByRole('button', { name: 'Bulk paste / CSV' }).click(); await page.waitForSelector('.wide-dialog');
    await page.getByLabel('Paste team rows').fill('Team Name,Player 1,Player 2,Flight,Handicap\n"Quoted, Team",Ann Quote,Bob Quote,First Flight,7.5\nNo Flight Team,Carl,Dee,Unknown Flight,x\n,Missing Name,Eve,Championship,');
    await page.getByRole('button', { name: 'Preview rows' }).click(); await settle(page, 500);
    const marks = await page.evaluate(() => [...document.querySelectorAll('.import-preview tbody tr')].map(tr => ({ team: tr.querySelector('input')?.value, issues: [...tr.querySelectorAll('.import-issue')].map(e => e.textContent.trim()), invalidInputs: tr.querySelectorAll('[aria-invalid="true"]').length })));
    const button = page.getByRole('button', { name: /^Import \d+ teams/ });
    const label = (await button.textContent()).trim(), disabled = await button.isDisabled();
    const ok = marks.length === 3 && marks[0].issues.length === 0 && marks[1].issues.some(t => /flight not found/.test(t)) && marks[1].issues.some(t => /index must be a number/.test(t)) && marks[2].issues.some(t => /name required/.test(t)) && /Import 3 teams · 2 rows need attention/.test(label) && disabled;
    L.add({ check: 'import preview: each blocking row is marked inline and the button counts them', result: ok ? 'PASS' : 'FAIL', detail: { marks, label, disabled } });
    L.add({ note: 'screenshot', detail: await shot(page, 'import-preview-marked-1280') });
    // Fix the rows: pick a flight and a numeric index for row 2, name row 3.
    await page.getByLabel('Import flight 2').click(); await page.getByRole('option', { name: 'Championship' }).click(); await settle(page, 200);
    await page.getByLabel('Import index 2').fill('9.1');
    await page.getByLabel('Import team 3').fill('Named Team');
    await settle(page, 300);
    const label2 = (await button.textContent()).trim(), disabled2 = await button.isDisabled();
    const marks2 = await page.evaluate(() => [...document.querySelectorAll('.import-preview tbody tr .import-issue')].length);
    L.add({ check: 'import preview: fixing the rows clears the marks and enables "Import 3 teams"', result: label2 === 'Import 3 teams' && !disabled2 && marks2 === 0 ? 'PASS' : 'FAIL', detail: { label2, disabled2, marks2 } });
    await clearToasts(page); await button.click(); await settle(page, 1500); await read();
    L.add({ check: 'import: the corrected paste imports all three teams (atomic import unchanged)', result: d.teams.length === 3 && d.teams.some(t => t.name === 'Quoted, Team') ? 'PASS' : 'FAIL', detail: { teams: d.teams.map(t => [t.name, t.players, t.handicap]) } });
    await ctx.close();
  }

  // ---------- CAL-P3-005: Access ----------
  {
    const { ctx, page } = await desk({ width: 1280, height: 720 }, eventId, 'Access');
    const grant = async email => { await clearToasts(page); await page.getByLabel(/Operator/).fill(email); await page.getByRole('button', { name: 'Grant operator access' }).click(); await settle(page, 1300); return await toasts(page); };
    const before = { ownerAudit: await auditFor('operator_add ' + OWNER) };
    let t = await grant(OWNER); await read();
    L.add({ check: 'access: granting the owner email says "already an owner", adds no row and no audit entry', result: t.some(x => /already an owner/i.test(x)) && !t.includes('Saved') && !(await hasOperator(OWNER)) && await auditFor('operator_add ' + OWNER) === before.ownerAudit ? 'PASS' : 'FAIL', detail: { toasts: t, ownerRow: await hasOperator(OWNER), ownerAuditBefore: before.ownerAudit, ownerAuditAfter: await auditFor('operator_add ' + OWNER) } });
    if (await hasOperator(OWNER)) { await send('operator_remove', { email: OWNER }); L.add({ note: 'owner row removed again', detail: OWNER }); }
    await settle(page, 4200);
    t = await grant(OPERATOR); await read();
    L.add({ check: 'access: a new operator is granted and listed', result: t.includes('Saved') && await hasOperator(OPERATOR) ? 'PASS' : 'FAIL', detail: { toasts: t } });
    await settle(page, 4200);
    const dupBefore = await auditFor('operator_add ' + OPERATOR);
    t = await grant(OPERATOR.toUpperCase()); await read();
    L.add({ check: 'access: a case-different duplicate says "already has access" and writes no audit entry', result: t.some(x => /already has access/i.test(x)) && !t.includes('Saved') && await auditFor('operator_add ' + OPERATOR) === dupBefore && (await read()).operators.filter(o => o.email === OPERATOR).length === 1 ? 'PASS' : 'FAIL', detail: { toasts: t, auditBefore: dupBefore, auditAfter: await auditFor('operator_add ' + OPERATOR) } });
    const lists = await page.evaluate(() => { const owners = [...document.querySelectorAll('.owner-row')].map(r => ({ text: r.textContent.trim(), buttons: r.querySelectorAll('button').length, top: r.getBoundingClientRect().top })); const ops = [...document.querySelectorAll('.access-row')].map(r => ({ text: r.textContent.trim(), buttons: r.querySelectorAll('button').length, top: r.getBoundingClientRect().top })); return { owners, ops }; });
    L.add({ check: 'access: owners are listed read-only above the operators', result: lists.owners.length >= 1 && lists.owners.every(o => o.buttons === 0) && lists.owners.some(o => o.text.includes(OWNER)) && lists.ops.length === 1 && lists.ops.every(o => o.top > Math.max(...lists.owners.map(x => x.top))) ? 'PASS' : 'FAIL', detail: lists });
    L.add({ note: 'screenshot', detail: await shot(page, 'access-owners-operators-1280', true) });
    await settle(page, 4200);
    await clearToasts(page); await page.locator('.access-row', { hasText: OPERATOR }).getByRole('button', { name: 'Revoke' }).click(); await page.getByRole('button', { name: 'Confirm' }).click(); await settle(page, 1300); await read();
    L.add({ check: 'access: revoke removes the test operator', result: !(await hasOperator(OPERATOR)) && (await page.locator('.access-row').count()) === 0 ? 'PASS' : 'FAIL' });
    await ctx.close();
  }

  // ---------- CAL-P3-007: Hammer above the fold (read-only, E2 Live fixture) ----------
  const GEOM = () => { const r = s => { const el = document.querySelector(s); if (!el) return null; const b = el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right), text: (el.textContent || '').trim().slice(0, 40) }; };
    const hammer = r('.hammer'), team = r('.console-grid .block h2'), bid = r('.console-grid .big-bid'), panel = r('.bid-controls'), bidInput = r('[aria-label="Bid amount"]'), inc = r('.increments'), block = r('.console-grid .block');
    const cs = getComputedStyle(document.querySelector('.bid-controls'));
    const vh = innerHeight, panelTop = panel ? panel.top : Infinity;
    const visible = x => x && x.top >= 0 && x.bottom <= vh; const uncovered = x => x && (x.bottom <= panelTop || x.top >= (panel?.bottom ?? -1));
    return { innerWidth, innerHeight: vh, scrollY, horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1, position: cs.position, hammer, team, bid, panel, bidInput, inc, block, hammerVisible: visible(hammer), bidInputVisible: visible(bidInput), incrementsVisible: visible(inc), teamVisible: visible(team) && uncovered(team), bidVisible: visible(bid) && uncovered(bid) }; };
  for (const vp of [[1280, 720], [1024, 768]]) {
    const { ctx, page } = await desk({ width: vp[0], height: vp[1] }, F.live);
    const g = await page.evaluate(GEOM);
    L.add({ check: `console ${vp.join('x')}: bid entry, increments and Hammer visible without scrolling while the block still shows team and current bid`, result: g.hammerVisible && g.bidInputVisible && g.incrementsVisible && g.teamVisible && g.bidVisible && !g.horizontalOverflow && g.scrollY === 0 ? 'PASS' : 'FAIL', detail: g });
    L.add({ note: 'screenshot', detail: await shot(page, `console-${vp.join('x')}`) });
    // After scrolling the queue column down, the panel must still be reachable (sticky) and the team/bid simply scroll like before.
    await page.evaluate(() => scrollTo(0, 400)); await settle(page, 300);
    const g2 = await page.evaluate(GEOM);
    L.add({ note: `console ${vp.join('x')} after scrolling 400 px`, detail: { hammerVisible: g2.hammerVisible, panelTop: g2.panel?.top, position: g2.position } });
    await ctx.close();
  }
  for (const vp of [[1280, 800], [1366, 900], [768, 1024], [390, 844]]) {
    const { ctx, page } = await desk({ width: vp[0], height: vp[1] }, F.live);
    const g = await page.evaluate(GEOM);
    L.add({ check: `console ${vp.join('x')}: layout unchanged (panel not sticky) and no horizontal overflow`, result: g.position === 'static' && !g.horizontalOverflow ? 'PASS' : 'FAIL', detail: { position: g.position, hammer: g.hammer, horizontalOverflow: g.horizontalOverflow, hammerVisible: g.hammerVisible } });
    await ctx.close();
  }
} catch (error) {
  L.add({ note: 'harness error', result: 'FAIL', detail: String(error && error.stack || error) });
} finally {
  try { if (await hasOperator(OPERATOR)) { await send('operator_remove', { email: OPERATOR }); L.add({ note: 'cleanup: operator removed', detail: OPERATOR }); } if (await hasOperator(OWNER)) { await send('operator_remove', { email: OWNER }); L.add({ note: 'cleanup: owner row removed', detail: OWNER }); } } catch (e) { L.add({ note: 'cleanup error', result: 'FAIL', detail: String(e) }); }
  await browser.close();
  const pass = rows.filter(r => r.result === 'PASS').length, fail = rows.filter(r => r.result === 'FAIL').length;
  L.add({ note: 'summary', detail: { pass, fail } });
}
