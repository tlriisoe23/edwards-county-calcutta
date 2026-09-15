// Operator desk journey on the AUDIT-E2 Live fixture: console, keyboard, sale, corrections, undo, setup validation, teams import, access.
import { launch, base, fixtures as F, viewports as V, log, shot, settle, signIn, geometry, focusableInvisible, tabOrder, axe, targets } from './lib.mjs';
const L = log('operator.json');
const browser = await launch();
const toasts = async page => await page.evaluate(() => [...document.querySelectorAll('[data-sonner-toast]')].map(t => t.textContent.trim()));
async function waitToast(page, ms = 4000) { try { await page.waitForSelector('[data-sonner-toast]', { timeout: ms }); } catch { } await settle(page, 200); return await toasts(page); }
async function desk(vp, tab = 'console', opts = {}) { const ctx = await browser.newContext({ viewport: vp, ...opts }); await signIn(ctx); const page = await ctx.newPage(); page.on('pageerror', e => L.add({ note: 'pageerror', detail: String(e) })); await page.goto(base + '/admin?event=' + F.live); await page.waitForSelector('.admin-tabs', { timeout: 20000 }); await settle(page, 900); if (tab !== 'console') { await page.getByRole('tab', { name: tab }).click(); await settle(page, 600); } return { ctx, page }; }
// 1. Console layout at operator sizes.
for (const name of ['laptop', 'tabletLandscape', 'tabletPortrait', 'phone390']) {
  const { ctx, page } = await desk(V[name]);
  const g = await geometry(page, ['.console-grid .big-bid', '.console-grid .block h2', '.hammer', '.admin-tabs', '.stats strong']);
  L.add({ check: 'operator console ' + name + ' containment', result: g.horizontalOverflow || g.items.some(i => i.clipped || i.outsideViewport) ? 'FAIL' : 'PASS', detail: { horizontalOverflow: g.horizontalOverflow, bad: g.items.filter(i => i.clipped || i.outsideViewport) } });
  const hammerAbove = await page.evaluate(() => { const h = document.querySelector('.hammer').getBoundingClientRect(); return { top: Math.round(h.top), bottom: Math.round(h.bottom), innerHeight: innerHeight, visibleWithoutScroll: h.bottom <= innerHeight }; });
  L.add({ note: 'operator ' + name + ' hammer position on first paint', detail: hammerAbove });
  const small = await targets(page, '.console-grid button, .queue-actions button', 24);
  L.add({ check: 'operator ' + name + ' console targets >= 24px', result: small.length ? 'WARN' : 'PASS', detail: small });
  L.add({ note: 'screenshot', detail: await shot(page, 'operator-console-' + name, true) });
  if (name === 'laptop') await axe(page, 'operator console laptop', L);
  await ctx.close();
}
// 2. Keyboard journey: B, type, Enter, +, S, buyer, confirm, U (undo). Then validation errors.
{
  const { ctx, page } = await desk(V.laptop);
  const bidText = async () => (await page.locator('.console-grid .big-bid').textContent()).trim();
  L.add({ note: 'start bid', detail: await bidText() });
  await page.keyboard.press('b'); const focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
  L.add({ check: 'B focuses bid input', result: focused === 'Bid amount' ? 'PASS' : 'FAIL', detail: focused });
  await page.keyboard.press('Control+a'); await page.keyboard.type('1300'); await page.keyboard.press('Enter'); await settle(page, 1200);
  L.add({ check: 'Enter records typed bid 1300', result: (await bidText()) === '$1,300' ? 'PASS' : 'FAIL', detail: await bidText() });
  // Lower-than-current bid without correction.
  await page.keyboard.press('Control+a'); await page.keyboard.type('1000'); await page.keyboard.press('Enter'); const t1 = await waitToast(page);
  L.add({ check: 'lower bid rejected with explanation', result: t1.some(t => /increment|Correct bid/i.test(t)) ? 'PASS' : 'FAIL', detail: t1 });
  await settle(page, 4500);
  // Empty bid.
  await page.keyboard.press('Control+a'); await page.keyboard.press('Backspace'); await page.keyboard.press('Enter'); const t2 = await waitToast(page);
  L.add({ check: 'empty bid submission message', result: t2.length ? 'INFO' : 'WARN', detail: t2 });
  await settle(page, 4500);
  await page.keyboard.press('Escape'); await page.locator('.console-toolbar').click(); // blur input
  await page.keyboard.press('+'); await settle(page, 1200);
  L.add({ check: '+ adds minimum increment ($25)', result: (await bidText()) === '$1,325' ? 'PASS' : 'FAIL', detail: await bidText() });
  await page.keyboard.press('s'); await page.waitForSelector('.sale-dialog'); await settle(page, 400);
  const dialogFocus = await page.evaluate(() => { const el = document.activeElement; return { tag: el.tagName, label: el.getAttribute('aria-label'), role: el.getAttribute('role') }; });
  L.add({ note: 'S opens Sold dialog; initial focus', detail: dialogFocus });
  L.add({ note: 'screenshot', detail: await shot(page, 'operator-sold-dialog-laptop') });
  await page.keyboard.type('Taylor'); await settle(page, 400); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); await settle(page, 300);
  const chosen = await page.evaluate(() => document.querySelector('.sale-dialog [role=combobox]')?.value);
  L.add({ check: 'buyer selected by keyboard', result: chosen === 'Taylor Syndicate' ? 'PASS' : 'FAIL', detail: chosen });
  const confirmEnabled = await page.getByRole('button', { name: 'Confirm sale' }).isEnabled();
  L.add({ check: 'Confirm enabled after buyer', result: confirmEnabled ? 'PASS' : 'FAIL' });
  const salesBefore = await page.evaluate(() => fetch('/api/admin?event=' + new URLSearchParams(location.search).get('event')).then(r => r.json()).then(b => b.data.sales.length));
  await page.getByRole('button', { name: 'Confirm sale' }).focus(); await page.keyboard.press('Enter'); const t3 = await waitToast(page); await settle(page, 1200);
  const after = await page.evaluate(() => fetch('/api/admin?event=' + new URLSearchParams(location.search).get('event')).then(r => r.json()).then(b => ({ sales: b.data.sales.length, sale: b.data.sales[0], current: b.data.state })));
  L.add({ check: 'keyboard sale recorded and next team advanced', result: after.sales === salesBefore + 1 && after.sale.amount === 132500 && after.current.bid === 0 ? 'PASS' : 'FAIL', detail: { toast: t3, ...after } });
  await settle(page, 4500);
  await page.keyboard.press('u'); await page.waitForSelector('[data-slot=alert-dialog-content]'); await settle(page, 300);
  L.add({ note: 'undo dialog text', detail: await page.locator('[data-slot=alert-dialog-content]').textContent() });
  await page.getByRole('button', { name: 'Confirm' }).click(); await waitToast(page); await settle(page, 1200);
  const undone = await page.evaluate(() => fetch('/api/admin?event=' + new URLSearchParams(location.search).get('event')).then(r => r.json()).then(b => ({ sales: b.data.sales.length, bid: b.data.state.bid, audit: b.audit.slice(0, 2).map(a => a.action + (a.undone ? ' (undone)' : '')) })));
  L.add({ check: 'U undo restores sale state', result: undone.sales === salesBefore && undone.bid === 132500 ? 'PASS' : 'FAIL', detail: undone });
  // Hammer with no bid: use Skip then check message.
  await settle(page, 4500);
  await page.getByRole('button', { name: 'Skip for now' }).first().click(); await page.waitForSelector('[data-slot=alert-dialog-content]');
  L.add({ note: 'skip dialog text', detail: await page.locator('[data-slot=alert-dialog-content]').textContent() });
  await page.getByRole('button', { name: 'Skip for now' }).last().click(); await waitToast(page); await settle(page, 1200);
  await page.getByRole('button', { name: 'Hammer / sold' }).click(); const t4 = await waitToast(page);
  L.add({ check: 'Hammer without bid explains', result: t4.some(t => /opening bid/i.test(t)) ? 'PASS' : 'FAIL', detail: t4 });
  await settle(page, 4500);
  L.add({ note: 'screenshot', detail: await shot(page, 'operator-console-after-skip') });
  await ctx.close();
}
// 3. Sales corrections through the UI: Correct price, reopen, void, undo.
{
  const { ctx, page } = await desk(V.tabletLandscape, 'Sales');
  L.add({ note: 'screenshot', detail: await shot(page, 'operator-sales-tabletLandscape', true) });
  await page.getByRole('button', { name: 'Correct' }).first().click(); await page.waitForSelector('[data-slot=dialog-content]'); await settle(page, 300);
  await page.getByLabel('Sale price').fill('999.99'); await page.getByLabel('Correction notes').fill('Audit E2 correction'); await page.getByRole('button', { name: 'Save correction' }).click(); const t = await waitToast(page); await settle(page, 1000);
  const corrected = await page.locator('.roster tbody tr').first().locator('.amount').textContent();
  L.add({ check: 'sale price correction saves and shows', result: corrected.trim() === '$999.99' ? 'PASS' : 'FAIL', detail: { toast: t, corrected } });
  await settle(page, 4500);
  await page.getByRole('button', { name: /More sale actions/ }).first().click(); await page.getByRole('menuitem', { name: 'Reopen sale' }).click(); await page.waitForSelector('[data-slot=alert-dialog-content]');
  L.add({ note: 'reopen dialog', detail: await page.locator('[data-slot=alert-dialog-content]').textContent() });
  await page.getByRole('button', { name: 'Confirm' }).click(); await waitToast(page); await settle(page, 1000);
  const firstStatus = await page.locator('.roster tbody tr').first().locator('.badge').textContent();
  L.add({ check: 'reopen sale marks record REOPENED and keeps history', result: firstStatus.trim() === 'REOPENED' ? 'PASS' : 'FAIL', detail: firstStatus });
  await settle(page, 4500);
  await page.getByRole('button', { name: 'Undo last action' }).click(); await page.getByRole('button', { name: 'Confirm' }).click(); await waitToast(page); await settle(page, 1000);
  L.add({ check: 'undo restores active sale', result: (await page.locator('.roster tbody tr').first().locator('.badge').textContent()).trim() === 'ACTIVE' ? 'PASS' : 'FAIL' });
  await settle(page, 4500);
  await page.getByRole('button', { name: /More sale actions/ }).first().click(); await page.getByRole('menuitem', { name: 'Void sale' }).click(); await page.getByRole('button', { name: 'Confirm' }).click(); await waitToast(page); await settle(page, 1000);
  L.add({ check: 'void sale', result: (await page.locator('.roster tbody tr').first().locator('.badge').textContent()).trim() === 'VOID' ? 'PASS' : 'FAIL' });
  await settle(page, 4500);
  await page.getByRole('button', { name: 'Undo last action' }).click(); await page.getByRole('button', { name: 'Confirm' }).click(); await waitToast(page); await settle(page, 1000);
  await ctx.close();
}
// 4. Setup & rules validation: clear minimum bid, save; payout ladder invalid; flight add.
{
  const { ctx, page } = await desk(V.laptop, 'Setup & rules');
  L.add({ note: 'screenshot', detail: await shot(page, 'operator-rules-laptop', true) });
  await page.getByLabel('Minimum starting bid').fill(''); await page.getByRole('button', { name: 'Save event & rules' }).click(); const t = await waitToast(page);
  L.add({ check: 'cleared minimum bid produces a plain-language error', result: t.some(x => /nan|expected number/i.test(x)) ? 'FAIL' : t.length ? 'INFO' : 'WARN', detail: t });
  await settle(page, 4500);
  await page.getByLabel('Minimum starting bid').fill('100');
  await page.getByLabel('Deduction (%)').fill('250'); await page.getByRole('button', { name: 'Save event & rules' }).click(); const t2 = await waitToast(page);
  L.add({ check: 'deduction 250% rejected with message', result: t2.some(x => /100%/.test(x)) ? 'PASS' : 'INFO', detail: t2 });
  await settle(page, 4500);
  await page.getByLabel('Deduction (%)').fill('10');
  const ladder = page.locator('.payout-ladder').first();
  await ladder.getByLabel(/place 1 percent/).fill('80'); await settle(page, 200);
  L.add({ note: 'ladder total status after invalid edit', detail: await ladder.locator('.ladder-total').textContent() });
  L.add({ check: 'invalid ladder disables save', result: await ladder.getByRole('button', { name: /Save .* payouts/ }).isDisabled() ? 'PASS' : 'FAIL' });
  await ladder.getByLabel(/place 1 percent/).fill('50');
  L.add({ note: 'screenshot', detail: await shot(page, 'operator-rules-ladder') });
  await ctx.close();
}
// 5. Teams: quick add, import preview with a malformed row, phone roster.
{
  const { ctx, page } = await desk(V.laptop, 'Teams');
  await page.getByRole('button', { name: 'Bulk paste / CSV' }).click(); await page.waitForSelector('.wide-dialog');
  await page.getByLabel('Paste team rows').fill('Team Name,Player 1,Player 2,Flight,Handicap\n"Quoted, Team",Ann Quote,Bob Quote,First Flight,7.5\nNo Flight Team,Carl,Dee,Unknown Flight,x\n,Missing Name,Eve,Championship,');
  await page.getByRole('button', { name: 'Preview rows' }).click(); await settle(page, 500);
  const rows = await page.locator('.import-preview tbody tr').count();
  const importDisabled = await page.getByRole('button', { name: /Import \d+ teams/ }).isDisabled();
  const hints = await page.evaluate(() => [...document.querySelectorAll('.import-preview tbody tr')].map(tr => ({ team: tr.querySelector('input')?.value, flight: tr.querySelector('[role=combobox]')?.textContent.trim(), index: tr.querySelectorAll('input')[1]?.value, invalidMarked: !!tr.querySelector('[aria-invalid="true"], .invalid, .error') })));
  L.add({ check: 'import preview: malformed rows block import; is the invalid row identified?', result: importDisabled && hints.some(h => h.invalidMarked) ? 'PASS' : importDisabled ? 'WARN' : 'FAIL', detail: { rows, importDisabled, hints } });
  L.add({ note: 'screenshot', detail: await shot(page, 'operator-import-preview') });
  await page.keyboard.press('Escape'); await settle(page, 300);
  await page.getByLabel('Team name').first().fill('Quick / Added'); await page.getByPlaceholder('John Smith').fill('Quick Adder'); await page.getByPlaceholder('John Smith').press('Enter'); await settle(page, 1200);
  L.add({ check: 'quick add saves and refocuses team name', result: await page.evaluate(() => document.activeElement?.id === 'quick-team') ? 'PASS' : 'WARN', detail: await page.evaluate(() => document.activeElement?.id) });
  await ctx.close();
  const p = await desk(V.phone390, 'Teams');
  const g = await geometry(p.page, ['.roster', '.quick-add', '.admin-tabs']);
  L.add({ check: 'teams tab phone390 containment', result: g.horizontalOverflow ? 'FAIL' : 'PASS', detail: { scrollWidth: g.scrollWidth, innerWidth: g.innerWidth, roster: await p.page.evaluate(() => { const r = document.querySelector('.roster'); return { scrollWidth: r.scrollWidth, clientWidth: r.clientWidth, overflowX: getComputedStyle(r).overflowX }; }) } });
  L.add({ note: 'screenshot', detail: await shot(p.page, 'operator-teams-phone390', true) });
  await p.ctx.close();
}
// 6. Access tab: grant, duplicate grant, revoke; local owner identity only.
{
  const { ctx, page } = await desk(V.laptop, 'Access');
  L.add({ note: 'access copy', detail: await page.locator('.settings-card p').first().textContent() });
  await page.getByLabel(/Operator/).fill('audit-e2-operator@example.test'); await page.getByRole('button', { name: 'Grant operator access' }).click(); const t = await waitToast(page); await settle(page, 1000);
  L.add({ check: 'grant shows in list', result: (await page.locator('.access-row').count()) >= 1 ? 'PASS' : 'FAIL', detail: { toast: t, rows: await page.locator('.access-row').allTextContents() } });
  await settle(page, 4500);
  await page.getByLabel(/Operator/).fill('AUDIT-E2-OPERATOR@example.test'); await page.getByRole('button', { name: 'Grant operator access' }).click(); const t2 = await waitToast(page); await settle(page, 1000);
  L.add({ check: 'duplicate grant (case-different) feedback', result: t2.some(x => /already/i.test(x)) ? 'PASS' : 'WARN', detail: { toast: t2, rows: await page.locator('.access-row').count() } });
  await settle(page, 4500);
  await page.getByLabel(/Operator/).fill('seedy@sites.test'); await page.getByRole('button', { name: 'Grant operator access' }).click(); const t3 = await waitToast(page); await settle(page, 1000);
  L.add({ check: 'granting the owner email feedback', result: 'INFO', detail: { toast: t3, rows: await page.locator('.access-row').allTextContents() } });
  L.add({ note: 'screenshot', detail: await shot(page, 'operator-access-laptop', true) });
  await settle(page, 4500);
  for (const row of await page.locator('.access-row').all()) { await row.getByRole('button', { name: 'Revoke' }).click(); await page.getByRole('button', { name: 'Confirm' }).click(); await waitToast(page); await settle(page, 1200); }
  L.add({ check: 'revoke cleans up test emails', result: (await page.locator('.access-row').count()) === 0 ? 'PASS' : 'FAIL' });
  await axe(page, 'operator access', L);
  await ctx.close();
}
// 7. Touch-emulated tablet portrait: tap Start bid, tap increment, tap Hammer, tap recent buyer chip, confirm.
{
  const ctx = await browser.newContext({ viewport: V.tabletPortrait, hasTouch: true, isMobile: true }); await signIn(ctx); const page = await ctx.newPage(); await page.goto(base + '/admin?event=' + F.live); await page.waitForSelector('.admin-tabs'); await settle(page, 900);
  const hasBid = (await page.locator('.console-grid .big-bid').textContent()).trim() !== '$0';
  if (!hasBid) { await page.locator('.increments button').first().tap(); await settle(page, 1200); }
  await page.locator('.increments button').first().tap(); await settle(page, 1200);
  const bid = (await page.locator('.console-grid .big-bid').textContent()).trim();
  await page.locator('.hammer').tap(); await page.waitForSelector('.sale-dialog'); await settle(page, 300);
  const chips = await page.locator('.buyer-chips button').count();
  if (chips) await page.locator('.buyer-chips button').first().tap();
  const enabled = await page.getByRole('button', { name: 'Confirm sale' }).isEnabled();
  L.add({ check: 'touch tablet: increment, hammer, recent-buyer chip, confirm enabled', result: enabled ? 'PASS' : 'FAIL', detail: { bid, chips } });
  L.add({ note: 'screenshot', detail: await shot(page, 'operator-sold-dialog-tabletPortrait-touch') });
  await page.getByRole('button', { name: 'Confirm sale' }).tap(); await waitToast(page); await settle(page, 1200);
  await page.getByRole('button', { name: 'Undo last action' }).tap(); await page.getByRole('button', { name: 'Confirm' }).tap(); await waitToast(page); await settle(page, 1000);
  const inv = await focusableInvisible(page); L.add({ check: 'operator tablet focusable-but-invisible', result: inv.length ? 'FAIL' : 'PASS', detail: inv });
  await ctx.close();
}
// 8. Pause and Complete guard messages; public/TV reflect paused.
{
  const { ctx, page } = await desk(V.laptop);
  await page.getByRole('button', { name: 'Complete' }).click(); await page.getByRole('button', { name: 'Confirm' }).click(); const t = await waitToast(page); await settle(page, 500);
  const dialogStillOpen = await page.locator('[data-slot=alert-dialog-content]').count();
  L.add({ check: 'Complete with a team on the block: explains and keeps dialog', result: t.some(x => /Sell or mark/i.test(x)) ? 'PASS' : 'FAIL', detail: { toast: t, dialogStillOpen } });
  L.add({ note: 'screenshot', detail: await shot(page, 'operator-complete-blocked') });
  await page.keyboard.press('Escape'); await settle(page, 4500);
  await page.getByRole('button', { name: 'Pause' }).click(); await waitToast(page); await settle(page, 1200);
  const pub = await ctx.newPage(); await pub.goto(base + '/tv?event=' + F.live); await pub.waitForSelector('.live-grid'); await settle(pub, 800);
  L.add({ check: 'TV shows paused', result: (await pub.locator('.block-top .live').textContent()).includes('PAUSED') ? 'PASS' : 'FAIL' });
  L.add({ note: 'screenshot', detail: await shot(pub, 'tv-paused-1366') });
  await pub.close();
  await page.getByRole('button', { name: 'Resume auction' }).click(); await waitToast(page); await settle(page, 800);
  await ctx.close();
}
await browser.close();
console.log('done', L.rows.filter(r => r.result === 'FAIL').length, 'FAIL');
