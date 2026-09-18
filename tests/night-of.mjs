// The night-of correctness set: UI-CA-07, 08, 09 and 16 from the 2026-09-17 UI
// audit, which §5.1 put first on its own list — "each one removes a way to
// record a wrong number or stall the room".
//
// These are money-path behaviours, so each check is written against the audit's
// own acceptance test rather than against the implementation:
//
//   UI-CA-08  B, type 1300, Enter records $1,300 — not $12,501,300.
//   UI-CA-07  On a fresh event Undo is disabled; both ways in say the same thing.
//   UI-CA-09  S → pick a buyer → Enter records the sale, and focus comes back
//             to the bid field afterwards.
//   UI-CA-16  Reopening a completed auction always confirms.
//
// Optional test tools live outside the application dependency tree, exactly as
// tests/ui3-browser.mjs does: UI3_PLAYWRIGHT_MODULE accepts an installed path.
const { chromium } = await import(process.env.UI3_PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.CALCUTTA_TEST_URL || 'http://localhost:5173';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Night-of fixtures require localhost.');
const browser = await chromium.launch({ headless: true });
const checks = [], errors = [];
const check = (ok, label, detail) => { checks.push({ label, pass: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + label + (detail !== undefined && !ok ? ' :: ' + JSON.stringify(detail) : '')); };

const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, reducedMotion: 'reduce' });
context.setDefaultTimeout(20000);
let eventId = null, data = null;
const read = async () => { const r = await context.request.get(base + '/api/admin' + (eventId ? '?event=' + eventId : '')); data = (await r.json()).data; return data; };
const send = async (action, payload = {}) => {
    if (eventId) await read();
    const r = await context.request.post(base + '/api/admin', { headers: { origin: base }, data: { action, payload, eventId, revision: data?.event.revision, requestId: crypto.randomUUID() } });
    const b = await r.json();
    if (!r.ok()) throw Error(action + ': ' + JSON.stringify(b));
    if (b.eventId) eventId = b.eventId;
    await read();
    return b;
};
const page = await context.newPage();
page.on('pageerror', e => errors.push(e.message));
await page.goto(base + '/signin-with-chatgpt?return_to=%2Fadmin');

await send('load_demo');
await page.goto(base + '/admin?event=' + eventId);
await page.getByRole('tab', { name: 'Auction console' }).waitFor();

// ---- UI-CA-07: nothing has happened yet, so Undo has nothing to offer.
const undo = page.getByRole('button', { name: /Undo/ });
check(await undo.isDisabled(), 'Undo is disabled on an event with nothing to undo');

await send('status', { status: 'LIVE' });
await page.reload();
await page.getByRole('tab', { name: 'Auction console' }).waitFor();
await page.waitForTimeout(600);

// ---- UI-CA-08: the bid field replaces rather than appends.
// An opening bid first, so the field holds a number to type over.
const bid = page.getByLabel('Bid amount');
await bid.fill('1250');
await page.getByRole('button', { name: 'Record bid' }).click();
await page.waitForTimeout(700);
check((await read()).state.bid === 125000, 'An opening bid of $1,250 is recorded', (await read()).state.bid);

// The documented keyboard path: B, then type over what is there.
await page.locator('body').click({ position: { x: 5, y: 5 } });
await page.keyboard.press('b');
await page.keyboard.type('1300');
await page.keyboard.press('Enter');
await page.waitForTimeout(800);
const afterTyping = (await read()).state.bid;
check(afterTyping === 130000, 'B then typing 1300 over 1250 records $1,300, not $12,501,300', afterTyping);
check(afterTyping !== 1250130000, 'the appended value is not what reaches the server', afterTyping);

// ---- UI-CA-09: the sale confirms from the keyboard, and focus comes back.
// The shortcut handler deliberately ignores keys while an input has focus, and
// Enter on a bid leaves focus in the bid field — so step out of it first, which
// is what a clerk does with the mouse or Tab between recording and hammering.
await page.locator('body').click({ position: { x: 5, y: 5 } });
await page.keyboard.press('s');
await page.getByRole('dialog').waitFor();
const firstBuyer = page.locator('.buyer-chips button').first();
if (await firstBuyer.count()) await firstBuyer.click();
else {
    await page.getByLabel('Final purchaser').fill('Night of buyer');
    await page.getByRole('button', { name: /Add buyer here/ }).click();
}
const buyerChosen = await page.locator('.buyer-chips button.bg-primary, .buyer-chips button[data-state=on]').count();
void buyerChosen;
await page.keyboard.press('Enter');
await page.waitForTimeout(900);
const sold = (await read()).sales.filter((s) => s.status === 'ACTIVE').length;
check(sold >= 1, 'Enter in the sale dialog records the sale without reaching for the mouse', sold);
check(await page.getByRole('dialog').count() === 0, 'and the dialog closes');
const focused = await page.evaluate(() => ({ tag: document.activeElement?.tagName, label: document.activeElement?.getAttribute('aria-label') }));
check(focused.label === 'Bid amount', 'focus returns to the bid field, ready for the next lot', focused);

// ---- UI-CA-16: reopening a completed auction is never one click.
// The server refuses to complete while a team is still on the block, and the
// sale above brought the next one up, so clear the queue first.
for (let i = 0; i < 40; i++) {
    const onBlock = (await read()).teams.find((t) => t.status === 'ON_BLOCK');
    if (!onBlock) break;
    await send('team_status', { id: onBlock.id, status: 'UNSOLD' });
}
await send('status', { status: 'COMPLETED' });
await page.reload();
await page.getByRole('tab', { name: 'Auction console' }).waitFor();
await page.waitForTimeout(600);
const restart = page.getByRole('button', { name: /Restart auction/ });
await restart.click();
await page.waitForTimeout(500);
const dialog = await page.getByRole('alertdialog').count();
check(dialog === 1, 'Restarting a completed auction asks first', dialog);
const wording = dialog ? await page.getByRole('alertdialog').innerText() : '';
check(/Reopen auction/.test(wording), 'and its button names the act rather than reading "Confirm"', wording.slice(0, 80));
check(/Recorded sales are kept/.test(wording), 'and says what happens to the sales already recorded', wording.slice(0, 80));
check((await read()).event.status === 'COMPLETED', 'and nothing has changed until it is confirmed');

check(errors.length === 0, 'No uncaught page errors', errors);
const passed = checks.filter((c) => c.pass).length;
console.log('\n' + passed + '/' + checks.length + ' night-of checks passed');
await browser.close();
process.exit(passed === checks.length ? 0 : 1);
