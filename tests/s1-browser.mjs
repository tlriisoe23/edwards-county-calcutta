// Optional test tools live outside the application dependency tree.
// S1_PLAYWRIGHT_MODULE / S1_AXE_MODULE accept installed module paths.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const { chromium } = await import(process.env.S1_PLAYWRIGHT_MODULE || 'playwright');
const { default: AxeBuilder } = await import(process.env.S1_AXE_MODULE || '@axe-core/playwright');
const base = process.env.CALCUTTA_TEST_URL || 'http://localhost:5186';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('S1 browser fixtures require localhost.');
const out = process.env.S1_EVIDENCE || 'docs/s1-evidence';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.S1_CHROMIUM ? { executablePath: process.env.S1_CHROMIUM } : {}) });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
context.setDefaultTimeout(15000);
const page = await context.newPage(), viewer = await context.newPage();
const checks = [], scans = [], errors = [];
page.on('pageerror', e => errors.push(e.message));
function check(ok, label) { checks.push({ label, pass: !!ok }); if (!ok) console.error('FAIL ' + label); }
async function scan(label) {
    // Primitive tab/button transitions must settle before measuring actual colors.
    await page.waitForTimeout(250);
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    scans.push({ label, violations: r.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) });
    check(r.violations.length === 0, label + ': axe');
}
let eventId, data;
async function read() { const r = await context.request.get(base + '/api/admin?event=' + eventId); assert.ok(r.ok()); data = (await r.json()).data; }
async function send(action, payload = {}) {
    if (eventId) await read();
    const r = await context.request.post(base + '/api/admin', { headers: { origin: base }, data: { action, payload, eventId, revision: data?.event.revision, requestId: crypto.randomUUID() } });
    const body = await r.json(); assert.ok(r.ok(), JSON.stringify(body)); eventId = body.eventId || eventId; await read();
}
const tabs = ['Event & rules', 'Teams & flights', 'Buyers', 'Auction console', 'Sales', 'Results', 'Settlement', 'Exports', 'Display & sharing', 'Help', 'Activity', 'Access'];
async function tab(name) { await page.getByRole('tab', { name: new RegExp(name) }).click(); }
async function overflow(label, target = page) {
    const size = await target.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
    check(size.scroll <= size.width + 1, `${label}: no horizontal page overflow (${size.scroll}/${size.width})`);
}
try {
    await page.goto(base + '/signin-with-chatgpt?return_to=%2Fadmin');
    await send('load_demo');
    await page.goto(base + '/admin?event=' + eventId);
    await page.getByRole('tab', { name: 'Event & rules', exact: false }).waitFor();
    await viewer.goto(base + '/tv?event=' + eventId);
    await viewer.locator('.big-bid').waitFor();
    const originalTabs = await page.getByRole('tab').evaluateAll(es => es.map(e => e.getAttribute('data-state') + ':' + e.id.replace(/.*trigger-/, '')));
    check(originalTabs.map(x => x.split(':').at(-1)).join(',') === 'rules,teams,buyers,console,sales,results,settlement,exports,sharing,help,activity,access', 'C1 original tab values preserved');
    await tab('Event & rules');
    check(!(await page.locator('.advanced-settings').evaluate(e => e.open)), 'Normal setup starts with Advanced closed');
    check(await page.getByLabel('Minimum starting bid', { exact: true }).isVisible(), 'Minimum bid stays visible');
    check(await page.getByRole('heading', { name: 'Payout structures' }).isVisible(), 'Payouts stay visible');
    await page.getByRole('button', { name: 'Advanced settings', exact: true }).click();
    check(await page.locator('.advanced-settings').evaluate(e => e.open), 'C1 shortcut opens Advanced on existing rules tab');
    check(await page.locator('.advanced-settings summary').evaluate(e => e === document.activeElement), 'Shortcut focuses summary');
    await page.keyboard.press('Space');
    check(!(await page.locator('.advanced-settings').evaluate(e => e.open)), 'Space closes disclosure');
    await page.keyboard.press('Enter');
    check(await page.locator('.advanced-settings').evaluate(e => e.open), 'Enter opens disclosure');
    check(await page.locator('.advanced-settings summary').evaluate(e => parseFloat(getComputedStyle(e).outlineWidth) >= 3), 'Keyboard summary has visible focus outline');
    await page.keyboard.press('Tab');
    check(await page.locator('.advanced-settings').evaluate(e => e.contains(document.activeElement)), 'Tab enters Advanced controls');
    const auto = page.getByRole('switch', { name: 'Automatically bring the next team onto the block after a sale' });
    await auto.click(); await page.getByRole('button', { name: 'Save event & rules', exact: true }).click();
    await page.waitForTimeout(400); await read(); check(data.event.settings.autoAdvance === false, 'Advanced save persists through existing event settings');
    await auto.click(); await page.getByRole('button', { name: 'Save event & rules', exact: true }).click();
    await page.waitForTimeout(400); await read(); check(data.event.settings.autoAdvance === true, 'Advanced setting restored');
    await tab('Display & sharing');
    const classicRadio = page.getByRole('radio', { name: /Classic ECGC/ });
    await classicRadio.focus(); await page.keyboard.press('ArrowRight');
    check(await page.getByRole('radio', { name: /High Contrast/ }).isChecked(), 'Arrow keys choose theme presets');
    await read(); check(data.event.settings.theme === 'classic', 'Radio navigation does not save until explicit Save theme');
    check(await classicRadio.locator('..').evaluate(e => e.getBoundingClientRect().height >= 44), 'Theme option has a comfortable touch target');
    const presets = [['classic', 'Classic ECGC'], ['high-contrast', 'High Contrast'], ['dark-event', 'Dark Event'], ['light-event', 'Light Event']];
    for (const [theme, name] of presets) {
        console.log('Checking ' + theme);
        await page.setViewportSize({ width: 1280, height: 900 }); await tab('Display & sharing');
        await page.getByRole('radio', { name: new RegExp(name) }).check();
        const save = page.getByRole('button', { name: 'Save theme', exact: true });
        if (await save.isEnabled()) await save.click();
        await page.waitForFunction(t => document.documentElement.dataset.theme === t, theme);
        await viewer.waitForFunction(t => document.documentElement.dataset.theme === t, theme);
        check(true, theme + ': saved theme reaches already-open TV through polling');
        await page.reload(); await page.getByRole('tab', { name: 'Display & sharing', exact: true }).waitFor();
        await page.waitForFunction(t => document.documentElement.dataset.theme === t, theme);
        check(true, theme + ': persists after reload');
        const colors = await page.evaluate(() => [getComputedStyle(document.body).backgroundColor, getComputedStyle(document.body).color]);
        await page.emulateMedia({ colorScheme: 'dark' });
        check(JSON.stringify(colors) === JSON.stringify(await page.evaluate(() => [getComputedStyle(document.body).backgroundColor, getComputedStyle(document.body).color])), theme + ': explicit preset overrides device dark preference');
        await page.emulateMedia({ colorScheme: 'light' });
        for (const width of [1280, 820, 390]) {
            await page.setViewportSize({ width, height: width === 390 ? 844 : 1024 });
            for (const name of tabs) {
                await tab(name);
                if (name === 'Event & rules') await page.getByRole('button', { name: 'Advanced settings', exact: true }).click();
                await overflow(`${theme}/${width}/${name}`);
                if (width === 1280 || width === 390 && ['Display & sharing', 'Event & rules'].includes(name)) await scan(`${theme}/${width}/${name}`);
                if (width === 1280 && name === 'Display & sharing' || width === 390 && theme === 'classic' && name === 'Display & sharing') {
                    await page.locator('.theme-settings').screenshot({ path: `${out}/${theme}-settings-${width}.png` });
                }
                if (width === 1280 && name === 'Auction console' && ['classic', 'dark-event'].includes(theme)) await page.screenshot({ path: `${out}/${theme}-console-${width}.png`, fullPage: true });
                if (width === 820 && theme === 'classic' && name === 'Auction console') await page.screenshot({ path: `${out}/classic-console-820.png`, fullPage: true });
                if (width === 390 && theme === 'classic' && name === 'Event & rules') await page.screenshot({ path: `${out}/classic-advanced-390.png` });
            }
        }
        await page.setViewportSize({ width: 1280, height: 900 }); await tab('Auction console');
        await page.locator('h1').click(); await page.keyboard.press('b');
        check(await page.getByLabel('Bid amount', { exact: true }).evaluate(e => e === document.activeElement), theme + ': B shortcut focuses bid');
        await page.locator('h1').click(); await page.keyboard.press('s');
        await page.getByRole('dialog').waitFor();
        check(await page.getByRole('dialog').evaluate(e => e.contains(document.activeElement)), theme + ': Sold dialog receives focus');
        check(await page.getByRole('dialog').evaluate(e => getComputedStyle(e).getPropertyValue('--background').trim() === getComputedStyle(document.documentElement).getPropertyValue('--background').trim()), theme + ': portal inherits theme');
        await scan(theme + '/Sold dialog');
        for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
        check(await page.getByRole('dialog').evaluate(e => e.contains(document.activeElement)), theme + ': Sold dialog traps keyboard focus');
        await page.keyboard.press('Escape');check(await page.getByRole('dialog').count() === 0, theme + ': Escape closes Sold');
        await page.locator('h1').click(); await page.keyboard.press('u');
        await page.getByRole('alertdialog').waitFor();
        check(true, theme + ': U opens existing undo confirmation');
        await page.keyboard.press('Escape');
        await read(); const oldBid = data.state.bid;
        await page.locator('h1').click(); await page.keyboard.press('+');
        await page.waitForTimeout(400); await read();
        check(data.state.bid === oldBid + data.event.settings.increment, theme + ': + shortcut preserves minimum increment');
        const bidInput = page.getByLabel('Bid amount', { exact: true });
        await bidInput.fill(String((data.state.bid + data.event.settings.increment) / 100)); await bidInput.press('Enter');
        await page.waitForTimeout(400); await read();
        check(data.state.bid === oldBid + 2 * data.event.settings.increment, theme + ': Enter records typed bid');

        for (const [route, width, height] of [['/', 390, 844], ['/', 820, 1024], ['/', 1280, 900], ['/tv', 1920, 1080], ['/tv', 3840, 2160]]) {
            await page.setViewportSize({ width, height }); await page.goto(base + route + '?event=' + eventId); await page.locator('.big-bid').waitFor();
            await page.waitForFunction(t => document.documentElement.dataset.theme === t, theme);
            await overflow(`${theme}/${route}/${width}`); await scan(`${theme}/${route}/${width}`);
            if (route === '/tv') check(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1), `${theme}/${width}: TV fits one screen`);
            if (width === 1920 || width === 390 && ['classic', 'light-event'].includes(theme)) await page.screenshot({ path: `${out}/${theme}-${route === '/tv' ? 'tv' : 'public'}-${width}.png`, fullPage: true });
        }
        await page.goto(base + '/admin?event=' + eventId); await page.getByRole('tab', { name: 'Event & rules', exact: false }).waitFor();
    }
    // Explicit status text and one-screen layout survive every lifecycle display state.
    await page.setViewportSize({ width: 1920, height: 1080 });
    for (const status of ['SETUP', 'READY', 'LIVE', 'PAUSED', 'COMPLETED']) {
        if (status === 'COMPLETED') await send('team_status', { id: data.state.teamId, status: 'UNSOLD' });
        await send('status', { status });
        for (const [theme] of presets) {
            await send('theme_update', { theme });await page.goto(base + '/tv?event=' + eventId);await page.locator('.block-top').waitFor();
            await page.waitForFunction(t => document.documentElement.dataset.theme === t, theme);
            const text = await page.locator('.block-top').innerText();
            check(text.includes({ SETUP: 'AUCTION SETUP', READY: 'READY TO BEGIN', LIVE: 'LIVE · ON THE BLOCK', PAUSED: 'AUCTION PAUSED', COMPLETED: 'AUCTION COMPLETE' }[status]), `${theme}/${status}: explicit state text`);
            check(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1), `${theme}/${status}: one-screen TV`);
            await scan(`${theme}/${status}/TV`);
        }
    }
    check(errors.length === 0, 'No browser page errors');
} finally {
    fs.writeFileSync(`${out}/browser-checks.json`, JSON.stringify({ checks, errors, passed: checks.filter(x => x.pass).length, failed: checks.filter(x => !x.pass).length }, null, 2));
    fs.writeFileSync(`${out}/axe-candidate.json`, JSON.stringify(scans, null, 2));
    await browser.close();
}
console.log(JSON.stringify({ checks: checks.length, failed: checks.filter(x => !x.pass).length, scans: scans.length }));
assert.ok(checks.every(x => x.pass), 'See browser-checks.json and axe-candidate.json');
