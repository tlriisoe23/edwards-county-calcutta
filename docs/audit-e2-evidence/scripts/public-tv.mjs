// Read-only public board / TV pass across viewports, states, zoom emulation, reduced motion, axe, keyboard.
import { launch, base, fixtures as F, viewports as V, log, shot, settle, geometry, sectionOverlaps, focusableInvisible, tabOrder, axe, targets, contrast, computedColors, rgb } from './lib.mjs';
const L = log('public-tv.json');
const browser = await launch();
const moneySel = ['.big-bid', '.block h2', '.stats strong', '.sales-strip strong', '.sales-strip h3', '.team-sale strong', '.pool-amount strong', '.payouts strong', '.queue-row h3', '.page-head h1'];
async function open(vp, path, opts = {}) { const ctx = await browser.newContext({ viewport: vp, ...opts }); const page = await ctx.newPage(); page.on('pageerror', e => L.add({ note: 'pageerror ' + path, detail: String(e) })); await page.goto(base + path); await page.waitForSelector('.live-grid, .empty-state', { timeout: 15000 }); await settle(page, 900); return { ctx, page }; }
async function checkGeometry(page, label, tv = false) {
  const g = await geometry(page, moneySel);
  const bad = g.items.filter(i => i.clipped || i.outsideParent || i.outsideViewport);
  L.add({ check: label + ' containment', result: bad.length || g.horizontalOverflow ? 'FAIL' : 'PASS', detail: { horizontalOverflow: g.horizontalOverflow, scrollWidth: g.scrollWidth, innerWidth: g.innerWidth, scrollHeight: g.scrollHeight, innerHeight: g.innerHeight, bad } });
  if (tv) { const ov = await sectionOverlaps(page, ['.tv>.mast', '.tv>.page-head', '.tv>.live-grid', '.tv>.stats', '.tv>.recent']); L.add({ check: label + ' single screen / no section overlap', result: g.scrollHeight > g.innerHeight + 1 || ov.length ? 'FAIL' : 'PASS', detail: { scrollHeight: g.scrollHeight, innerHeight: g.innerHeight, overlaps: ov } }); }
}
// 1. Public board, live event, all widths.
for (const [name, vp] of Object.entries(V)) {
  if (name.startsWith('tv')) continue;
  const { ctx, page } = await open(vp, '/?event=' + F.live);
  await checkGeometry(page, 'public live ' + name);
  L.add({ note: 'screenshot', detail: await shot(page, 'public-live-' + name, true) });
  if (vp.width <= 700) {
    const inv = await focusableInvisible(page);
    L.add({ check: 'public ' + name + ' focusable-but-invisible controls', result: inv.length ? 'FAIL' : 'PASS', detail: inv });
    const order = await tabOrder(page, 6);
    L.add({ note: 'public ' + name + ' tab order (first 6)', detail: order });
    const navNames = await page.evaluate(() => [...document.querySelectorAll('.mast nav a')].map(a => ({ text: a.textContent.trim(), title: a.title, ariaLabel: a.getAttribute('aria-label'), w: Math.round(a.getBoundingClientRect().width), h: Math.round(a.getBoundingClientRect().height) })));
    L.add({ note: 'public ' + name + ' header nav links', detail: navNames });
    const small = await targets(page, '.board-tools [data-slot=tabs-trigger], .mast nav a, .board-tools button, .search input', 24);
    L.add({ check: 'public ' + name + ' targets >= 24px', result: small.length ? 'WARN' : 'PASS', detail: small });
  }
  await ctx.close();
}
// 2. Contrast samples on public (laptop).
{
  const { ctx, page } = await open(V.laptop, '/?event=' + F.live);
  const samples = ['.recent .eyebrow', '.stats p', '.fine', '.muted', '.team-meta span', '.badge.sold', '.badge.unsold', '.pool-deduction span', '.block-top span', '.block-foot span', '.players', '.bidder p:last-child', '.page-footer>span', '.connection', '.sold-label', '.payouts small', '.team-card>p', '.queue-row p'];
  const out = [];
  for (const s of samples) { const c = await computedColors(page, s); if (!c) continue; const ratio = contrast(rgb(c.color), rgb(c.background)); const size = parseFloat(c.fontSize); const large = size >= 24 || size >= 18.66 && parseInt(c.fontWeight) >= 700; out.push({ sel: s, ...c, ratio, needed: large ? 3 : 4.5, ok: ratio >= (large ? 3 : 4.5) }); }
  L.add({ check: 'public text contrast samples', result: out.some(o => !o.ok) ? 'FAIL' : 'PASS', detail: out });
  await axe(page, 'public board laptop', L);
  await ctx.close();
}
{
  const { ctx, page } = await open(V.phone390, '/?event=' + F.live);
  await axe(page, 'public board phone390', L);
  await ctx.close();
}
// 3. Public states: completed, empty, large (six flights, 100 teams).
for (const [label, id] of [['completed', F.completed], ['empty', F.empty], ['large', F.large]]) for (const name of ['phone320', 'phone390', 'laptop']) {
  const { ctx, page } = await open(V[name], '/?event=' + id);
  await checkGeometry(page, 'public ' + label + ' ' + name);
  L.add({ note: 'screenshot', detail: await shot(page, 'public-' + label + '-' + name, name !== 'laptop') });
  if (label === 'large') {
    const tabs = await page.evaluate(() => { const l = document.querySelector('.board-tools [data-slot=tabs-list]'); return { tabs: l.querySelectorAll('[data-slot=tabs-trigger]').length, scrollWidth: l.scrollWidth, clientWidth: l.clientWidth, overflowX: getComputedStyle(l).overflowX }; });
    L.add({ note: 'public large ' + name + ' flight tab strip', detail: tabs });
    await page.getByRole('tab', { name: 'Senior Flight' }).click(); await settle(page, 300);
    const cards = await page.locator('.team-card').count();
    L.add({ check: 'public large ' + name + ' sixth flight filter', result: cards === 17 || cards === 16 ? 'PASS' : 'WARN', detail: { cards } });
    await page.getByLabel('Search teams').fill('Audit Team 099'); await settle(page, 300);
    L.add({ check: 'public large ' + name + ' search + flight', result: (await page.locator('.team-card').count()) <= 1 ? 'PASS' : 'FAIL', detail: { cards: await page.locator('.team-card').count(), emptyText: await page.locator('.board .empty-state').textContent().catch(() => null) } });
    L.add({ note: 'screenshot', detail: await shot(page, 'public-large-filtered-' + name) });
  }
  await ctx.close();
}
// 4. TV states at both TV sizes.
for (const [label, id] of [['live', F.live], ['completed', F.completed], ['large', F.large], ['empty', F.empty], ['demo', F.demo]]) for (const name of ['tv1366', 'tv1080']) {
  const { ctx, page } = await open(V[name], '/tv?event=' + id);
  await checkGeometry(page, 'tv ' + label + ' ' + name, label !== 'empty');
  L.add({ note: 'screenshot', detail: await shot(page, 'tv-' + label + '-' + name) });
  if (label === 'live' && name === 'tv1080') { await axe(page, 'tv live 1080', L); const inv = await focusableInvisible(page); L.add({ check: 'tv focusable-but-invisible', result: inv.length ? 'FAIL' : 'PASS', detail: inv }); }
  await ctx.close();
}
// 5. 200% zoom emulation (CSS viewport halved) on public and TV.
for (const [name, vp] of [['zoom200laptop', V.zoom200laptop], ['zoom200desktop', V.zoom200desktop]]) {
  for (const route of ['/', '/tv']) {
    const { ctx, page } = await open(vp, route + '?event=' + F.live);
    await checkGeometry(page, route + ' ' + name + ' (200% zoom emulation)');
    L.add({ note: 'screenshot', detail: await shot(page, (route === '/' ? 'public' : 'tv') + '-' + name, true) });
    await ctx.close();
  }
}
// 6. Reduced motion runtime + sold toast animation.
{
  const ctx = await browser.newContext({ viewport: V.phone390, reducedMotion: 'reduce' }); const page = await ctx.newPage(); await page.goto(base + '/?event=' + F.live); await page.waitForSelector('.live-grid'); await settle(page);
  const anim = await page.evaluate(() => { const el = document.createElement('div'); el.className = 'sold-toast'; document.body.appendChild(el); const a = getComputedStyle(el).animationName; el.remove(); return { soldToastAnimation: a, scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior, matches: matchMedia('(prefers-reduced-motion: reduce)').matches }; });
  L.add({ check: 'reduced motion runtime disables sold-toast animation', result: anim.matches && anim.soldToastAnimation === 'none' ? 'PASS' : 'FAIL', detail: anim });
  await ctx.close();
}
// 7. Newest-event fallback and unqualified entry.
{
  const ctx = await browser.newContext({ viewport: V.laptop }); const page = await ctx.newPage(); await page.goto(base + '/'); await page.waitForSelector('.live-grid, .empty-state'); await settle(page);
  L.add({ note: 'unqualified / resolves to newest event', detail: { url: page.url(), h1: await page.locator('.page-head h1').textContent().catch(() => null) } });
  await page.goto(base + '/?event=does-not-exist'); await settle(page, 1500);
  L.add({ check: 'unknown event ID shows an explained state', result: 'INFO', detail: { url: page.url(), heading: await page.locator('h1').first().textContent().catch(() => null), body: await page.locator('.empty-state p').textContent().catch(() => null) } });
  L.add({ note: 'screenshot', detail: await shot(page, 'public-unknown-event') });
  await ctx.close();
}
await browser.close();
console.log('done', L.rows.filter(r => r.result === 'FAIL').length, 'FAIL');
