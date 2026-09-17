// UI3 rendered checks: flat operator tab bar, prepare step 5, masthead controls, hover help,
// undo description, queue reordering, scroll stability and the public board anchor.
// Optional test tools live outside the application dependency tree, exactly as tests/s1-browser.mjs
// does: UI3_PLAYWRIGHT_MODULE accepts an installed module path.
import fs from 'node:fs';
const { chromium } = await import(process.env.UI3_PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.CALCUTTA_TEST_URL || 'http://localhost:5173';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('UI3 browser fixtures require localhost.');
const out = process.env.UI3_EVIDENCE || 'docs/batch-l-evidence';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const checks = [], errors = [];
function check(ok, label, detail) { checks.push({ label, pass: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + label + (detail !== undefined && !ok ? ' :: ' + JSON.stringify(detail) : '')); }

async function makeContext(width, height) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
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
    return { context, page, send, read, get eventId() { return eventId; }, get data() { return data; } };
}
const shot = (page, name) => page.screenshot({ path: out + '/' + name + '.png', fullPage: false });

// ---------------------------------------------------------------- desktop, 1920x1080
{
    const S = await makeContext(1920, 1080);
    await S.send('load_demo');
    const { page } = S;
    await page.goto(base + '/admin?event=' + S.eventId);
    await page.getByRole('tab', { name: 'Auction console' }).waitFor();
    await page.waitForTimeout(1200);

    // item 1: one flat strip, no groups, no note rows, no Return to console
    const strip = await page.evaluate(() => ({
        tabs: [...document.querySelectorAll('.op-tabs [role=tab]')].map(t => t.textContent.trim()),
        lists: document.querySelectorAll('.op-tabs').length,
        groups: document.querySelectorAll('.nav-group, .nav-group-head').length,
        notes: document.querySelectorAll('.nav-notes').length,
        returnBtn: [...document.querySelectorAll('button')].filter(b => /Return to console/.test(b.textContent)).length,
        eyebrows: [...document.querySelectorAll('.op-nav .eyebrow')].map(n => n.textContent.trim()),
    }));
    check(strip.tabs.join('|') === 'Auction console|View and Edit Sales|Results|Settlement|Exports', 'Flat strip lists the five tabs in order', strip.tabs);
    check(strip.lists === 1, 'Exactly one tab strip', strip.lists);
    check(strip.groups === 0 && strip.notes === 0, 'No NavGroup headers or below-tab note rows remain', strip);
    check(strip.returnBtn === 0, 'Return to console button removed', strip.returnBtn);
    check(!strip.eyebrows.includes('RUN AUCTION') && !strip.eyebrows.includes('AFTER AUCTION'), 'No RUN/AFTER AUCTION captions above the tabs', strip.eyebrows);

    // active-tab affordance: page-coloured, bordered, accent bar, overlapping the strip rule
    const activeStyle = await page.evaluate(() => {
        const bar = document.querySelector('.op-nav-bar'), a = document.querySelector('.op-tabs [role=tab][aria-selected=true]'), i = document.querySelector('.op-tabs [role=tab][aria-selected=false]');
        const g = el => { const c = getComputedStyle(el); return { bg: c.backgroundColor, shadow: c.boxShadow, borderTop: c.borderTopColor, borderBottomWidth: c.borderBottomWidth }; };
        return { page: getComputedStyle(document.body).backgroundColor, bar: getComputedStyle(bar).borderBottomWidth, active: g(a), inactive: g(i) };
    });
    check(activeStyle.active.bg === activeStyle.page, 'Active tab carries the page surface colour (connects to the panel)', activeStyle);
    check(activeStyle.active.bg !== activeStyle.inactive.bg, 'Active and inactive tabs differ in surface', activeStyle);
    check(/inset/.test(activeStyle.active.shadow), 'Active tab has an accent bar', activeStyle.active.shadow);
    check(activeStyle.active.borderBottomWidth === '0px' && activeStyle.bar === '2px', 'Active tab notches through the strip rule', activeStyle);

    // every tab really switches the panel below
    for (const name of ['View and Edit Sales', 'Results', 'Settlement', 'Exports', 'Auction console']) {
        await page.getByRole('tab', { name, exact: true }).click();
        await page.waitForTimeout(400);
        const ok = await page.evaluate(n => {
            const sel = document.querySelector('.op-tabs [role=tab][aria-selected=true]');
            const panel = document.querySelector('[data-slot=tabs-content][data-state=active]');
            return sel?.textContent.trim() === n && !!panel && panel.textContent.trim().length > 0;
        }, name);
        check(ok, 'Tab "' + name + '" selects itself and shows a panel');
    }
    await shot(page, '01-flat-tabs-desktop-1920');

    // item 3: masthead controls survive compact, scroll and tab changes
    const header = await page.evaluate(() => {
        const inMast = s => !!document.querySelector('.mast ' + s);
        return { compact: inMast('.compact-toggle'), theme: inMast('.theme-quick-picker'), toolbarTheme: !!document.querySelector('.event-toolbar .theme-quick-picker'), mastVisible: !!document.querySelector('.mast')?.offsetParent, compactMode: document.querySelector('main').classList.contains('compact') };
    });
    check(header.compact && header.theme, 'Compact toggle and theme picker live in the masthead', header);
    check(!header.toolbarTheme, 'Theme picker no longer in the event toolbar', header);
    check(header.mastVisible && header.compactMode, 'Masthead stays visible while compact', header);
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(300);
    check(await page.locator('.mast .compact-toggle').isVisible(), 'Compact toggle still rendered after scrolling');

    // the Auto button: appears on manual override, explains itself, and restores automatic
    await page.locator('.mast .compact-toggle [role=switch]').click();
    await page.waitForTimeout(500);
    const auto = page.getByRole('button', { name: 'Auto', exact: true });
    check(await auto.isVisible(), 'Auto appears once compact is set manually');
    await auto.hover();
    await page.waitForTimeout(700);
    const autoTip = await page.evaluate(() => [...document.querySelectorAll('[data-slot=tooltip-content]')].map(t => t.textContent.trim()));
    check(autoTip.some(t => /follow the auction status automatically/.test(t)), 'Auto explains what it restores on hover', autoTip);
    await shot(page, '02-auto-tooltip-desktop-1920');
    const beforeAuto = await page.evaluate(() => document.querySelector('main').classList.contains('compact'));
    await auto.click();
    await page.waitForTimeout(600);
    const afterAuto = await page.evaluate(() => ({ compact: document.querySelector('main').classList.contains('compact'), autoGone: !document.querySelector('.compact-auto') }));
    check(afterAuto.compact !== beforeAuto && afterAuto.autoGone, 'Auto restores status-driven compact and hides itself', { beforeAuto, afterAuto });

    // item 3: Load demo and Reset demo data moved into Tools
    await page.getByRole('button', { name: 'Tools menu' }).click();
    await page.waitForTimeout(500);
    const tools = await page.evaluate(() => [...document.querySelectorAll('[data-slot=dropdown-menu-item]')].map(i => ({ label: i.childNodes[0]?.textContent?.trim(), note: i.querySelector('small')?.textContent?.trim() })));
    check(tools.some(t => t.label === 'Load demo'), 'Load demo is in the Tools menu', tools.map(t => t.label));
    check(tools.some(t => t.label === 'Reset demo data'), 'Reset demo data is in the Tools menu', tools.map(t => t.label));
    check(tools.every(t => t.note && t.note.length > 12), 'Every Tools item explains itself in plain language', tools);
    await shot(page, '03-tools-menu-desktop-1920');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    check(!(await page.locator('.event-toolbar').getByRole('button', { name: 'Load demo' }).count()), 'Load demo no longer on the working toolbar');
    check(!(await page.locator('.demo-reset').count()), 'Standalone demo-reset panel removed');

    // ...and they survive scrolling on the long tabs, where the masthead sticks
    await page.getByRole('tab', { name: 'Settlement', exact: true }).click();
    await page.waitForTimeout(600);
    await page.evaluate(() => window.scrollTo(0, 900));
    await page.waitForTimeout(400);
    const stuck = await page.evaluate(() => {
        const m = document.querySelector('.admin-site .mast').getBoundingClientRect();
        const c = document.querySelector('.mast-controls')?.getBoundingClientRect();
        return { scrollY: Math.round(window.scrollY), mastTop: Math.round(m.top), controlsVisible: !!c && c.top >= 0 && c.bottom <= window.innerHeight };
    });
    check(stuck.scrollY > 200 && stuck.mastTop >= 0 && stuck.controlsVisible, 'Masthead controls stay on screen while scrolling a long tab', stuck);
    await shot(page, '13-sticky-masthead-scrolled-1920');
    // ...but the console keeps its full fold: a sticky bar there would push the Hammer row away
    await page.getByRole('tab', { name: 'Auction console', exact: true }).click();
    await page.waitForTimeout(500);
    const fold = await page.evaluate(() => {
        const el = document.querySelector('.op-nav-bar'), mast = document.querySelector('.admin-site .mast');
        const sticky = getComputedStyle(mast).position === 'sticky' ? mast.getBoundingClientRect().height : 0;
        window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - sticky - 8), behavior: 'auto' });
        return new Promise(r => setTimeout(() => r({ sticky, hammerBottom: Math.round(document.querySelector('.hammer').getBoundingClientRect().bottom), vh: window.innerHeight }), 300));
    });
    check(fold.sticky === 0, 'Masthead is not sticky on the auction console', fold);
    check(fold.hammerBottom <= fold.vh, 'Hammer row still clears the fold on the console', fold);

    // item 4: hover help on a control whose destination is not obvious from the label
    await page.getByRole('tab', { name: 'View and Edit Sales' }).hover();
    await page.waitForTimeout(700);
    const salesTip = await page.evaluate(() => [...document.querySelectorAll('[data-slot=tooltip-content]')].map(t => t.textContent.trim()));
    check(salesTip.some(t => /correct/i.test(t) && /sale/i.test(t)), 'Sales tab hover says what you can do there', salesTip);
    await shot(page, '04-tab-tooltip-desktop-1920');

    // item 5: undo names the actual last undoable action
    await S.send('team_skip', { id: S.data.teams.find(t => t.status === 'UPCOMING').id });
    await page.waitForTimeout(2600);
    check(await page.locator('.mast-controls').getByRole('button', { name: /Undo/ }).isVisible(), 'Undo stays reachable in the masthead while the auction is LIVE');
    await page.locator('.mast-controls').getByRole('button', { name: /Undo/ }).click();
    await page.waitForTimeout(600);
    const undoText = await page.locator('[data-slot=alert-dialog-description]').textContent();
    check(/This will undo:/.test(undoText), 'Undo dialog states what it will undo', undoText);
    check(/Team skipped for now/i.test(undoText), 'Undo names the action', undoText);
    check(/recorded \d/.test(undoText), 'Undo names when it was recorded', undoText);
    await shot(page, '05-undo-dialog-desktop-1920');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.waitForTimeout(400);
    await S.context.close();
}

// ---------------------------------------------------------------- laptop, 1366x768
{
    const S = await makeContext(1366, 768);
    await S.send('load_demo');
    const { page } = S;

    // item 2: prepare steps 1-5 and the step 4 rename
    await S.send('status', { status: 'SETUP' });
    await page.goto(base + '/admin?event=' + S.eventId);
    await page.getByRole('tab', { name: 'Auction console' }).waitFor();
    await page.waitForTimeout(900);
    const steps = await page.evaluate(() => [...document.querySelectorAll('.prepare-step')].map(s => s.querySelector('.prepare-step-label')?.textContent.trim()));
    check(steps.length === 5, 'Prepare shows five steps', steps);
    check(steps[3] === 'TV / Display Settings', 'Step 4 renamed to TV / Display Settings', steps);
    check(steps[4] === 'Start Auction', 'Step 5 is Start Auction', steps);
    const stepsFit = await page.evaluate(() => { const r = document.querySelector('.prepare-steps').getBoundingClientRect(); return { right: Math.round(r.right), inner: window.innerWidth, overflow: document.documentElement.scrollWidth - window.innerWidth }; });
    check(stepsFit.overflow <= 1, 'No horizontal overflow at 1366 with five steps', stepsFit);
    await shot(page, '06-prepare-five-steps-1366');

    // step 5 dialog copy
    await page.getByRole('button', { name: 'Start Auction', exact: true }).click();
    await page.waitForTimeout(600);
    const dialog = await page.evaluate(() => ({
        title: document.querySelector('[data-slot=dialog-title]')?.textContent.trim(),
        choices: [...document.querySelectorAll('.start-choice')].map(c => ({ label: c.querySelector('strong')?.textContent.trim(), body: c.querySelector(':scope > span')?.textContent.trim() })),
    }));
    check(dialog.choices.length === 2, 'Step 5 offers two placements', dialog);
    check(/this screen/i.test(dialog.choices[0].label), 'First choice is this screen', dialog.choices[0].label);
    check(/external TV\/Monitor/i.test(dialog.choices[1].label), 'Second choice is an external TV/Monitor', dialog.choices[1].label);
    check(/sign in to calcutta\.edcogolf\.org\/admin from a different device/i.test(dialog.choices[0].body), 'This-screen note warns you must operate from another device', dialog.choices[0].body);
    check(/dragged to that screen/i.test(dialog.choices[1].body) && /full screen/i.test(dialog.choices[1].body) && /controlling everything from this device/i.test(dialog.choices[1].body), 'External note covers drag, full screen and keeping control here', dialog.choices[1].body);
    await shot(page, '07-start-dialog-1366');

    // external path: real popup window, auction goes LIVE, tab bar pinned to the top
    await page.evaluate(() => window.scrollTo(0, 400));
    const popupPromise = page.context().waitForEvent('page', { timeout: 10000 }).catch(() => null);
    await page.locator('.start-choice').nth(1).click();
    const popup = await popupPromise;
    check(!!popup, 'External choice opens a separate TV window');
    if (popup) { await popup.waitForLoadState('domcontentloaded').catch(() => {}); check(/\/tv/.test(popup.url()), 'TV window is the TV route', popup.url()); await popup.close(); }
    await page.waitForTimeout(2500);
    const started = await page.evaluate(() => ({ status: document.querySelector('.badge')?.textContent.trim(), navTop: Math.round(document.querySelector('.op-nav-bar').getBoundingClientRect().top), dialogOpen: !!document.querySelector('[data-slot=dialog-content]') }));
    check(started.status === 'LIVE', 'Auction is LIVE after the choice', started);
    check(!started.dialogOpen, 'Dialog closed after choosing', started);
    check(Math.abs(started.navTop - 8) <= 12, 'Tab bar sits at the top of the viewport after starting', started);
    check(await page.evaluate(() => !document.querySelector('.prepare-block')?.offsetParent || document.querySelector('.prepare-block').getBoundingClientRect().bottom < 0), 'Prepare block is out of view once the auction started');
    await shot(page, '08-started-scrolled-1366');

    // the in-console Start/Resume button shares the same scroll behaviour
    await page.getByRole('button', { name: 'Pause' }).click();
    await page.waitForTimeout(2200);
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /Resume auction/ }).click();
    await page.waitForTimeout(2500);
    const resumed = await page.evaluate(() => ({ status: document.querySelector('.badge')?.textContent.trim(), navTop: Math.round(document.querySelector('.op-nav-bar').getBoundingClientRect().top) }));
    check(resumed.status === 'LIVE' && Math.abs(resumed.navTop - 8) <= 12, 'Console Resume also pins the tab bar to the top', resumed);

    // item 6: Next Up arrows actually move the team in the visible list
    const names = () => page.locator('.queue-admin h3').allTextContents();
    const lots = () => page.locator('.queue-admin .lot').allTextContents();
    const before = { names: await names(), lots: await lots() };
    await page.getByRole('button', { name: 'Move ' + before.names[1] + ' up' }).click();
    await page.waitForTimeout(2200);
    const afterUp = { names: await names(), lots: await lots() };
    check(afterUp.names[0] === before.names[1] && afterUp.names[1] === before.names[0], 'Move up swaps the two teams in Next up', { before: before.names, afterUp: afterUp.names });
    check(afterUp.lots.join() === before.lots.join(), 'Lot numbers stay a stable sequence after a visible swap', { before: before.lots, after: afterUp.lots });
    const topName = afterUp.names[0];
    await page.getByRole('button', { name: 'Move ' + topName + ' up' }).click();
    await page.waitForTimeout(2200);
    const atTop = { names: await names(), lots: await lots() };
    check(atTop.names.join() === afterUp.names.join() && atTop.lots.join() === afterUp.lots.join(), 'Move up at the top of Next up is a no-op, not a silent renumber', { afterUp, atTop });
    await page.getByRole('button', { name: 'Move ' + topName + ' down' }).click();
    await page.waitForTimeout(2200);
    const afterDown = await names();
    check(afterDown[1] === topName, 'Move down swaps with the next visible team', { atTop: atTop.names, afterDown });
    await shot(page, '09-queue-reorder-1366');

    // item 7: the page does not snap back while the pointer crosses the nav
    await page.getByRole('tab', { name: 'Auction console' }).click();
    await page.waitForTimeout(600);
    await page.mouse.move(700, 400);
    for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 160); await page.waitForTimeout(110); }
    const scroll = await page.evaluate(() => new Promise(res => { const s = []; const t0 = Date.now(); const iv = setInterval(() => { s.push(Math.round(window.scrollY)); if (Date.now() - t0 > 7000) { clearInterval(iv); res(s); } }, 200); }));
    check(Math.max(...scroll) - Math.min(...scroll) <= 4, 'Scroll position holds steady across poll refreshes', { min: Math.min(...scroll), max: Math.max(...scroll) });
    check(!scroll.some(y => y < 40) || scroll[0] < 40, 'Page never snaps back to the top on its own', scroll.slice(0, 8));

    // hover help must not move focus away from the bid field
    await page.getByLabel('Bid amount').click();
    const tipTrigger = page.locator('.help-tip-trigger').first();
    if (await tipTrigger.count()) { await tipTrigger.hover({ force: true }); await page.waitForTimeout(500); }
    check(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'Bid amount'), 'Contextual help never steals focus from the bid field');

    // item 8: public board anchor hides once the board is in view
    const pub = await S.context.newPage();
    await pub.setViewportSize({ width: 1366, height: 768 });
    await pub.goto(base + '/?event=' + S.eventId);
    await pub.locator('#board').waitFor();
    await pub.evaluate(() => window.scrollTo(0, 0));
    await pub.waitForTimeout(900);
    const anchorTop = await pub.locator('a[href="#board"]').count();
    check(anchorTop === 1, 'Auction board link is offered from the top of the public page', anchorTop);
    await shot(pub, '10-public-top-1366');
    await pub.evaluate(() => document.getElementById('board').scrollIntoView());
    await pub.waitForTimeout(1200);
    const anchorAtBoard = await pub.locator('a[href="#board"]').count();
    check(anchorAtBoard === 0, 'Auction board link disappears once the board is on screen', anchorAtBoard);
    await shot(pub, '11-public-at-board-1366');
    await pub.evaluate(() => window.scrollTo(0, 0));
    await pub.waitForTimeout(1200);
    check(await pub.locator('a[href="#board"]').count() === 1, 'Auction board link returns when you scroll back up');
    await S.context.close();
}

// ---------------------------------------------------------------- this-screen placement
{
    const S = await makeContext(1366, 768);
    await S.send('load_demo');
    await S.send('status', { status: 'SETUP' });
    const { page } = S;
    await page.goto(base + '/admin?event=' + S.eventId);
    await page.getByRole('button', { name: 'Start Auction', exact: true }).click();
    await page.waitForTimeout(600);
    await page.locator('.start-choice').nth(0).click();
    await page.waitForTimeout(3000);
    check(/\/tv/.test(page.url()), 'This-screen choice turns this window into the TV display', page.url());
    await S.read();
    check(S.data.event.status === 'LIVE', 'This-screen choice also starts the auction', S.data.event.status);
    await shot(page, '12-this-screen-tv-1366');
    await S.context.close();
}

check(errors.length === 0, 'No uncaught page errors', errors);
fs.writeFileSync(out + '/checks.json', JSON.stringify({ base, ranAt: new Date().toISOString(), checks, errors }, null, 1));
const passed = checks.filter(c => c.pass).length;
console.log('\n' + passed + '/' + checks.length + ' UI3 browser checks passed');
await browser.close();
process.exit(passed === checks.length ? 0 : 1);
