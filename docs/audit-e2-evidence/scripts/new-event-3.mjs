import { launch, base, fixtures as F, signIn, settle, shot, log, axe } from './lib.mjs';
const L = log('new-event-journey-3.json'); const b = await launch();
const toasts = async p => await p.evaluate(() => [...document.querySelectorAll('[data-sonner-toast]')].map(t => t.textContent.trim()));
const state = async p => await p.evaluate(() => ({ dialog: !!document.querySelector('.sale-dialog'), listbox: !!document.querySelector('[role=listbox]'), comboExpanded: document.querySelector('.sale-dialog [role=combobox]')?.getAttribute('aria-expanded'), value: document.querySelector('.sale-dialog [role=combobox]')?.value, focus: document.activeElement?.getAttribute('aria-label') || document.activeElement?.tagName }));
const ctx = await b.newContext({ viewport: { width: 1024, height: 768 } }); await signIn(ctx); const p = await ctx.newPage(); await p.goto(base + '/admin?event=' + F.journey); await p.waitForSelector('.admin-tabs'); await settle(p, 900);
if ((await p.locator('.console-grid .big-bid').textContent()).trim() === '$0') { await p.locator('.increments button').first().click(); await settle(p, 1200); }
// Escape probe 1: type, list open, one Escape.
await p.locator('.hammer').click(); await p.waitForSelector('.sale-dialog'); await settle(p, 300);
await p.keyboard.type('Nob'); await settle(p, 400); const s1 = await state(p);
await p.keyboard.press('Escape'); await settle(p, 400); const s2 = await state(p);
L.add({ check: 'Escape with suggestion list open closes only the list', result: s1.listbox && s2.dialog ? 'PASS' : 'FAIL', detail: { beforeEscape: s1, afterEscape: s2 } });
// Escape probe 2: no typing, combobox focused, list closed: Escape closes dialog (expected).
if (!s2.dialog) { await p.locator('.hammer').click(); await p.waitForSelector('.sale-dialog'); await settle(p, 300); }
const s3 = await state(p); await p.keyboard.press('Escape'); await settle(p, 400); const s4 = await state(p);
L.add({ note: 'Escape with list closed', detail: { before: s3, after: s4 } });
// Mouse probe: list open, click "Add buyer here".
if (!s4.dialog) { await p.locator('.hammer').click(); await p.waitForSelector('.sale-dialog'); await settle(p, 300); }
await p.locator('.sale-dialog [role=combobox]').fill('Nob'); await settle(p, 400);
const box = await p.evaluate(() => { const btn = [...document.querySelectorAll('.sale-dialog button')].find(b => b.textContent.includes('Add buyer here')); const r = btn.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
await p.mouse.click(box.x, box.y); await settle(p, 500); const s5 = await state(p);
const inlineOpen = await p.locator('.inline-buyer').count();
L.add({ check: 'clicking "Add buyer here" while list is open opens the inline form in one click', result: inlineOpen ? 'PASS' : 'WARN', detail: { ...s5, inlineOpen } });
if (!inlineOpen) { if (!s5.listbox) { await p.getByRole('button', { name: 'Add buyer here' }).click(); await settle(p, 300); } }
L.add({ note: 'screenshot', detail: await shot(p, 'journey-sold-dialog-add-buyer') });
await p.getByLabel('New buyer name').fill('Journey Buyer'); await p.getByRole('button', { name: 'Add & select' }).click(); await settle(p, 1200);
L.add({ check: 'inline buyer created and selected; confirm enabled', result: await p.getByRole('button', { name: 'Confirm sale' }).isEnabled() ? 'PASS' : 'FAIL', detail: await state(p) });
await p.getByRole('button', { name: 'Confirm sale' }).click(); await settle(p, 1500);
L.add({ check: 'sale confirmed; next team advanced', result: (await p.locator('.console-grid .block h2').textContent()).includes('Charlie / Delta') ? 'PASS' : 'FAIL', detail: await toasts(p) });
const pub = await ctx.newPage(); await pub.goto(base + '/?event=' + F.journey); await pub.waitForSelector('.live-grid'); await settle(pub, 800);
L.add({ check: 'public board shows the sale', result: (await pub.locator('.sales-strip').textContent()).includes('Alpha / Bravo') ? 'PASS' : 'FAIL' });
await pub.close();
await p.getByRole('button', { name: 'Mark unsold' }).click(); await p.getByRole('button', { name: 'Confirm' }).click(); await settle(p, 1500);
await p.getByRole('button', { name: 'Complete' }).click(); await p.getByRole('button', { name: 'Confirm' }).click(); await settle(p, 1500);
L.add({ check: 'complete after clearing block', result: (await p.locator('.console-toolbar .badge').textContent()).trim() === 'COMPLETED' ? 'PASS' : 'FAIL', detail: await toasts(p) });
await p.getByRole('tab', { name: 'Results' }).click(); await settle(p, 500);
L.add({ note: 'results tab rows', detail: await p.evaluate(() => [...document.querySelectorAll('.result-row')].map(r => ({ label: r.querySelector('label').textContent.trim(), disabled: r.querySelector('input').disabled }))) });
await p.locator('.result-row input').nth(1).fill('1'); await p.getByRole('button', { name: 'Save final positions' }).click(); await settle(p, 1200);
L.add({ check: 'UNSOLD team given place 1: response', result: 'INFO', detail: { toast: await toasts(p), entitlements: await p.locator('.entitlement').count(), entitlementText: await p.locator('.entitlement, .results-grid .muted').allTextContents() } });
await p.getByRole('tab', { name: 'Settlement' }).click(); await settle(p, 500); await p.getByRole('tab', { name: 'Tournament payouts' }).click(); await settle(p, 400);
L.add({ note: 'payouts view after results', detail: await p.locator('.settlement-accounts, .settlement-page .empty-state').allTextContents() });
await axe(p, 'settlement payouts (journey event)', L);
await ctx.close(); await b.close();
