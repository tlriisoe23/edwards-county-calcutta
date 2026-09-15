// Settlement, results (keyboard, tablet), exports, print (PDF pagination), sharing on Completed + Large fixtures.
import fs from 'node:fs';
import path from 'node:path';
import { launch, base, fixtures as F, viewports as V, log, shot, settle, signIn, geometry, axe, evidence } from './lib.mjs';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
const L = log('settlement-exports.json');
const browser = await launch();
const toasts = async page => await page.evaluate(() => [...document.querySelectorAll('[data-sonner-toast]')].map(t => t.textContent.trim()));
async function waitToast(page, ms = 4000) { try { await page.waitForSelector('[data-sonner-toast]', { timeout: ms }); } catch { } await settle(page, 200); return await toasts(page); }
async function desk(vp, event, tab, opts = {}) { const ctx = await browser.newContext({ viewport: vp, ...opts }); await signIn(ctx); const page = await ctx.newPage(); page.on('pageerror', e => L.add({ note: 'pageerror', detail: String(e) })); await page.goto(base + '/admin?event=' + event); await page.waitForSelector('.admin-tabs', { timeout: 20000 }); await settle(page, 900); if (tab) { await page.getByRole('tab', { name: tab }).click(); await settle(page, 700); } return { ctx, page }; }
const pdfPages = buf => (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
// 1. Settlement at three sizes; overpayment and reversal visible; record partial + mark paid + reverse via UI.
for (const name of ['laptop', 'tabletPortrait', 'phone390']) {
  const { ctx, page } = await desk(V[name], F.completed, 'Settlement');
  const g = await geometry(page, ['.settlement-overview strong', '.account-totals dd', '.account-card h3']);
  L.add({ check: 'settlement ' + name + ' containment', result: g.horizontalOverflow || g.items.some(i => i.clipped || i.outsideViewport) ? 'FAIL' : 'PASS', detail: { horizontalOverflow: g.horizontalOverflow, bad: g.items.filter(i => i.clipped || i.outsideViewport) } });
  L.add({ note: 'screenshot', detail: await shot(page, 'settlement-' + name, true) });
  if (name === 'laptop') {
    L.add({ note: 'overview text', detail: await page.locator('.settlement-overview').textContent() });
    await axe(page, 'settlement laptop', L);
    const over = page.locator('.account-card', { hasText: 'Overpaid Buyer' });
    L.add({ note: 'overpaid card', detail: await over.locator('.account-totals, .badge, .notice').allTextContents() });
    const owes = page.locator('.account-card', { hasText: 'Owes Everything' });
    await owes.getByRole('button', { name: 'Record partial payment' }).click(); await page.waitForSelector('[data-slot=dialog-content]'); await settle(page, 300);
    const balance = await page.evaluate(() => document.querySelector('[data-slot=dialog-content] input[type=number]')?.max);
    await page.getByLabel(/Amount/).fill(String(Number(balance) + 100)); await page.getByRole('button', { name: 'Confirm recorded payment' }).click(); await settle(page, 400);
    const native = await page.evaluate(() => { const i = document.querySelector('[data-slot=dialog-content] input[type=number]'); return { validity: i.validationMessage, max: i.max }; });
    L.add({ check: 'partial payment above balance blocked with a message', result: native.validity ? 'PASS' : 'WARN', detail: native });
    await page.getByLabel(/Amount/).fill('25'); await page.getByLabel(/Note/).fill('Audit E2 partial'); await page.getByRole('button', { name: 'Confirm recorded payment' }).click(); const t = await waitToast(page); await settle(page, 1200);
    L.add({ check: 'partial payment recorded', result: (await owes.locator('.badge').textContent()).trim() === 'Partial' ? 'PASS' : 'FAIL', detail: { toast: t, badge: await owes.locator('.badge').textContent() } });
    await settle(page, 4500);
    await owes.getByRole('button', { name: 'Mark paid' }).click(); await page.waitForSelector('[data-slot=dialog-content]'); await settle(page, 300);
    const prefill = await page.getByLabel(/Amount/).inputValue();
    await page.getByRole('button', { name: 'Confirm recorded payment' }).click(); const t2 = await waitToast(page); await settle(page, 1200);
    L.add({ check: 'Mark paid prefilled balance and settles account', result: (await owes.locator('.badge').textContent()).trim() === 'Paid' ? 'PASS' : 'FAIL', detail: { prefill, toast: t2 } });
    await settle(page, 4500);
    await owes.getByRole('button', { name: /Purchases \/ entitlement/ }).click(); await settle(page, 400);
    await owes.getByRole('button', { name: 'Reverse entry' }).last().click(); await page.waitForSelector('[data-slot=dialog-content]'); await settle(page, 300);
    await page.getByRole('button', { name: 'Confirm reversal' }).click(); await settle(page, 400);
    const reasonRequired = await page.evaluate(() => document.querySelector('[data-slot=dialog-content] textarea')?.validationMessage);
    L.add({ check: 'reversal requires a reason', result: reasonRequired ? 'PASS' : 'WARN', detail: reasonRequired });
    await page.getByLabel(/Reason/).fill('Audit E2 reversal'); await page.getByRole('button', { name: 'Confirm reversal' }).click(); const t3 = await waitToast(page); await settle(page, 1200);
    L.add({ check: 'reversal recorded, original retained', result: (await owes.locator('.payment-entry').count()) >= 3 ? 'PASS' : 'FAIL', detail: { toast: t3, entries: await owes.locator('.payment-entry').allTextContents() } });
    L.add({ note: 'screenshot', detail: await shot(page, 'settlement-history-open', true) });
    await page.getByRole('tab', { name: 'Tournament payouts' }).click(); await settle(page, 500);
    L.add({ note: 'payouts view', detail: await page.locator('.settlement-accounts').textContent() });
    L.add({ note: 'screenshot', detail: await shot(page, 'settlement-payouts-laptop', true) });
  }
  await ctx.close();
}
// 2. Results: tablet portrait keyboard entry journey (clear, re-enter by Tab/typing, save), duplicate place message.
{
  const { ctx, page } = await desk(V.tabletPortrait, F.completed, 'Results');
  L.add({ note: 'screenshot', detail: await shot(page, 'results-tabletPortrait', true) });
  const inputs = page.locator('.result-row input');
  const n = await inputs.count();
  await inputs.first().focus();
  // Set the first two teams in the same flight to place 1 (duplicate)
  await page.keyboard.press('Control+a'); await page.keyboard.type('1'); await page.keyboard.press('Tab'); await page.keyboard.press('Control+a'); await page.keyboard.type('1');
  await page.getByRole('button', { name: 'Save final positions' }).click(); const t = await waitToast(page);
  L.add({ check: 'duplicate place explained', result: t.some(x => /unique|tie/i.test(x)) ? 'PASS' : 'FAIL', detail: t });
  await settle(page, 4500);
  await inputs.nth(1).focus(); await page.keyboard.press('Control+a'); await page.keyboard.type('2');
  await page.keyboard.press('Tab'); await page.keyboard.press('Control+a'); await page.keyboard.type('3');
  await page.keyboard.press('Tab'); await page.keyboard.press('Control+a'); await page.keyboard.press('Backspace');
  await page.getByRole('button', { name: 'Save final positions' }).focus(); await page.keyboard.press('Enter'); const t2 = await waitToast(page); await settle(page, 1000);
  L.add({ check: 'keyboard results entry saves', result: t2.some(x => /Saved/.test(x)) ? 'PASS' : 'FAIL', detail: { toast: t2, inputs: n, entitlements: await page.locator('.entitlement').count() } });
  L.add({ note: 'screenshot', detail: await shot(page, 'results-tabletPortrait-saved', true) });
  await ctx.close();
}
// 3. Exports tab: download each report via UI (blob), print emulation + PDF pagination for completed and large.
for (const [label, event] of [['completed', F.completed], ['large', F.large]]) {
  const { ctx, page } = await desk(V.laptop, event, 'Exports');
  if (label === 'completed') {
    L.add({ note: 'screenshot', detail: await shot(page, 'exports-laptop', true) });
    for (const btn of await page.locator('.export-card button').all()) { const title = await btn.locator('..').locator('h3').textContent(); const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }).catch(() => null), btn.click()]); L.add({ check: 'download ' + title.trim(), result: dl ? 'PASS' : 'FAIL', detail: dl ? dl.suggestedFilename() : await toasts(page) }); await settle(page, 300); }
    await axe(page, 'exports', L);
  }
  await page.emulateMedia({ media: 'print' }); await settle(page, 300);
  const visible = await page.evaluate(() => ({ printSummary: getComputedStyle(document.querySelector('.print-summary')).display, tabs: getComputedStyle(document.querySelector('.admin-tabs')).display, header: getComputedStyle(document.querySelector('.mast')).display, exportGrid: getComputedStyle(document.querySelector('.export-grid')).display, rows: document.querySelectorAll('.print-summary tbody tr').length }));
  L.add({ check: 'print media shows only the summary (' + label + ')', result: visible.printSummary === 'block' && visible.tabs === 'none' && visible.header === 'none' && visible.exportGrid === 'none' ? 'PASS' : 'FAIL', detail: visible });
  L.add({ note: 'screenshot', detail: await shot(page, 'print-summary-' + label, true) });
  const pdf = await page.pdf({ format: 'Letter', printBackground: true, margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' } });
  const file = path.join(evidence, 'print-summary-' + label + '.pdf'); fs.writeFileSync(file, pdf);
  L.add({ note: 'print summary PDF (' + label + ')', detail: { file: path.relative('/home/tanner/development/edwards-county-calcutta/docs', file), bytes: pdf.length, pages: pdfPages(pdf), rows: visible.rows } });
  await page.emulateMedia({ media: null });
  await ctx.close();
}
// 4. Sharing: QR decode from rendered image, copy buttons, print handout emulation, TV instructions; phone layout.
{
  const { ctx, page } = await desk(V.laptop, F.live, 'Display & sharing', { permissions: ['clipboard-read', 'clipboard-write'] });
  await page.waitForSelector('.qr-card img'); await settle(page, 300);
  const src = await page.locator('.qr-card img').getAttribute('src');
  const png = PNG.sync.read(Buffer.from(src.split(',')[1], 'base64')); const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  const boardLink = await page.getByLabel('Public board link').inputValue();
  L.add({ check: 'rendered QR decodes to the public link', result: decoded?.data === boardLink ? 'PASS' : 'FAIL', detail: { decoded: decoded?.data, boardLink } });
  L.add({ note: 'local warning present', detail: await page.locator('.local-warning').textContent().catch(() => null) });
  await page.getByRole('button', { name: 'Copy public link' }).click(); const t = await waitToast(page);
  const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => null));
  L.add({ check: 'copy public link', result: clip === boardLink ? 'PASS' : 'WARN', detail: { toast: t, clip } });
  L.add({ note: 'screenshot', detail: await shot(page, 'sharing-laptop', true) });
  await page.emulateMedia({ media: 'print' }); await settle(page, 300);
  const pv = await page.evaluate(() => ({ share: getComputedStyle(document.querySelector('.print-share')).display, tvSection: getComputedStyle(document.querySelector('.sharing-grid>section:last-child')).display, header: getComputedStyle(document.querySelector('.mast')).display, tabs: getComputedStyle(document.querySelector('.admin-tabs')).display }));
  L.add({ check: 'print QR handout shows only the handout', result: pv.share !== 'none' && pv.tvSection === 'none' && pv.header === 'none' && pv.tabs === 'none' ? 'PASS' : 'FAIL', detail: pv });
  const pdf = await page.pdf({ format: 'Letter', printBackground: true }); const file = path.join(evidence, 'print-qr-handout.pdf'); fs.writeFileSync(file, pdf);
  L.add({ note: 'QR handout PDF', detail: { file: path.relative('/home/tanner/development/edwards-county-calcutta/docs', file), bytes: pdf.length, pages: pdfPages(pdf) } });
  L.add({ note: 'screenshot', detail: await shot(page, 'print-qr-handout', true) });
  await page.emulateMedia({ media: null });
  await ctx.close();
  const p = await desk(V.phone390, F.live, 'Display & sharing');
  const g = await geometry(p.page, ['.qr-card', '.qr-card p', '.sharing-grid input']);
  L.add({ check: 'sharing phone390 containment', result: g.horizontalOverflow || g.items.some(i => i.outsideViewport) ? 'FAIL' : 'PASS', detail: { horizontalOverflow: g.horizontalOverflow, bad: g.items.filter(i => i.outsideViewport) } });
  L.add({ note: 'screenshot', detail: await shot(p.page, 'sharing-phone390', true) });
  await p.ctx.close();
}
// 5. Help and Activity tabs at tablet; Buyers at phone; Empty event operator state; demo reset dialog.
{
  const { ctx, page } = await desk(V.tabletPortrait, F.live, 'Help');
  L.add({ note: 'screenshot', detail: await shot(page, 'help-tabletPortrait', true) });
  await axe(page, 'help', L);
  await page.getByRole('tab', { name: 'Activity' }).click(); await settle(page, 500);
  L.add({ note: 'activity rows', detail: { rows: await page.locator('.roster tbody tr').count(), first: await page.locator('.roster tbody tr').first().textContent() } });
  L.add({ note: 'screenshot', detail: await shot(page, 'activity-tabletPortrait') });
  await page.getByRole('tab', { name: 'Buyers' }).click(); await settle(page, 500);
  L.add({ note: 'screenshot', detail: await shot(page, 'buyers-tabletPortrait', true) });
  await ctx.close();
  const e = await desk(V.laptop, F.empty, null);
  L.add({ note: 'empty event console text', detail: await page.evaluate(() => 1).catch(() => null) });
  L.add({ note: 'empty event: console text', detail: await e.page.locator('.console-grid').textContent() });
  await e.page.getByRole('button', { name: 'Start auction' }).click(); const t = await waitToast(e.page);
  L.add({ check: 'start auction with no teams explains', result: t.some(x => /flights and teams/i.test(x)) ? 'PASS' : 'FAIL', detail: t });
  L.add({ note: 'screenshot', detail: await shot(e.page, 'operator-empty-event', true) });
  await e.page.getByRole('tab', { name: 'Teams' }).click(); await settle(e.page, 500);
  L.add({ note: 'empty event teams tab notice', detail: await e.page.locator('.notice').allTextContents() });
  L.add({ check: 'quick add disabled without flights', result: await e.page.getByRole('button', { name: 'Add another' }).isDisabled() ? 'PASS' : 'FAIL' });
  await e.ctx.close();
  const d = await desk(V.laptop, F.demo, null);
  await d.page.getByRole('button', { name: 'Reset demo data' }).click(); await d.page.waitForSelector('[data-slot=alert-dialog-content]');
  L.add({ check: 'demo reset requires typed phrase', result: await d.page.getByRole('button', { name: 'Confirm' }).isDisabled() ? 'PASS' : 'FAIL' });
  L.add({ note: 'screenshot', detail: await shot(d.page, 'demo-reset-dialog') });
  await d.page.keyboard.press('Escape');
  await d.ctx.close();
}
await browser.close();
console.log('done', L.rows.filter(r => r.result === 'FAIL').length, 'FAIL');
