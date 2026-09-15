// Follow-up probes: TV at intermediate widths (below Batch C's 1100px grid), public at 1024, contrast specifics, settlement tabs aria, sign-in return path.
import { launch, base, fixtures as F, log, shot, settle, signIn, geometry, sectionOverlaps, axe, computedColors, contrast, rgb } from './lib.mjs';
const L = log('followup.json');
const browser = await launch();
const widths = [[1024, 768, 'iPad landscape / 1024'], [1093, 614, '1366×768 at 125% OS scale'], [1099, 618, 'just below 1100 grid'], [1100, 619, 'grid threshold'], [1280, 720, 'laptop mirrored'], [1440, 900, 'MacBook mirrored'], [1536, 864, '1920×1080 at 125% OS scale'], [1280, 1024, '5:4 projector']];
for (const [width, height, label] of widths) for (const [state, id] of [['live', F.live], ['completed', F.completed]]) {
  const ctx = await browser.newContext({ viewport: { width, height } }); const page = await ctx.newPage(); await page.goto(base + '/tv?event=' + id); await page.waitForSelector('.live-grid'); await settle(page, 900);
  const g = await geometry(page, ['.stats strong', '.stats p', '.big-bid', '.block h2', '.sales-strip strong', '.sales-strip h3', '.queue-row h3']);
  const overlaps = await page.evaluate(() => { const cells = [...document.querySelectorAll('.stats>div')].map(d => ({ label: d.querySelector('p').textContent, r: d.querySelector('strong').getBoundingClientRect(), cell: d.getBoundingClientRect() })); const out = []; for (let i = 0; i < cells.length; i++) { const a = cells[i]; if (a.r.right > a.cell.right + 1) out.push({ value: a.label, spill: Math.round(a.r.right - a.cell.right) }); for (let j = i + 1; j < cells.length; j++) { const b = cells[j]; const x = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), y = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top); if (x > 1 && y > 1) out.push({ a: a.label, b: b.label, overlap: [Math.round(x), Math.round(y)] }); } } return out; });
  const sections = await sectionOverlaps(page, ['.tv>.page-head', '.tv>.live-grid', '.tv>.stats', '.tv>.recent']);
  const bad = g.items.filter(i => i.clipped || i.outsideParent || i.outsideViewport);
  L.add({ check: `tv ${state} ${width}x${height} (${label})`, result: overlaps.length || sections.length || bad.length ? 'FAIL' : 'PASS', detail: { scrollHeight: g.scrollHeight, innerHeight: g.innerHeight, singleScreen: g.scrollHeight <= g.innerHeight + 1, statOverlaps: overlaps, sectionOverlaps: sections, bad } });
  if (overlaps.length || sections.length || bad.length || width === 1093) L.add({ note: 'screenshot', detail: await shot(page, `tv-${state}-${width}x${height}`) });
  await ctx.close();
}
// Public board at tablet widths.
for (const [width, height] of [[768, 1024], [1024, 768], [1093, 614]]) {
  const ctx = await browser.newContext({ viewport: { width, height } }); const page = await ctx.newPage(); await page.goto(base + '/?event=' + F.live); await page.waitForSelector('.live-grid'); await settle(page, 900);
  const g = await geometry(page, ['.stats strong', '.big-bid', '.block h2', '.sales-strip strong', '.team-sale strong', '.pool-amount strong']);
  const overlaps = await page.evaluate(() => { const cells = [...document.querySelectorAll('.stats>div')].map(d => ({ label: d.querySelector('p').textContent, r: d.querySelector('strong').getBoundingClientRect(), cell: d.getBoundingClientRect() })); return cells.filter(a => a.r.right > a.cell.right + 1).map(a => ({ value: a.label, spill: Math.round(a.r.right - a.cell.right) })); });
  const bad = g.items.filter(i => i.clipped || i.outsideParent || i.outsideViewport);
  L.add({ check: `public live ${width}x${height}`, result: overlaps.length || bad.length || g.horizontalOverflow ? 'FAIL' : 'PASS', detail: { statOverlaps: overlaps, bad, horizontalOverflow: g.horizontalOverflow } });
  L.add({ note: 'screenshot', detail: await shot(page, `public-live-${width}x${height}`, true) });
  await ctx.close();
}
// Contrast specifics on public + TV.
{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } }); const page = await ctx.newPage(); await page.goto(base + '/tv?event=' + F.live); await page.waitForSelector('.live-grid'); await settle(page, 900);
  const out = [];
  for (const s of ['.queue-row .lot', '.sales-strip p', '.sales-strip .sold-label', '.next .fine', '.stats p', '.page-head .eyebrow', '.connection']) { const c = await computedColors(page, s); if (!c) continue; const ratio = contrast(rgb(c.color), rgb(c.background)); const size = parseFloat(c.fontSize); const large = size >= 24 || size >= 18.66 && parseInt(c.fontWeight) >= 700; out.push({ surface: 'tv', sel: s, ...c, ratio, needed: large ? 3 : 4.5, ok: ratio >= (large ? 3 : 4.5) }); }
  await page.goto(base + '/?event=' + F.live); await page.waitForSelector('.live-grid'); await settle(page, 900);
  for (const s of ['.queue-row .lot', '.sales-strip p', '.payouts small', '.team-card>p', '.team-meta span', '.queue-row p', '.pool-amount>span', '.projection-label']) { const c = await computedColors(page, s); if (!c) continue; const ratio = contrast(rgb(c.color), rgb(c.background)); const size = parseFloat(c.fontSize); const large = size >= 24 || size >= 18.66 && parseInt(c.fontWeight) >= 700; out.push({ surface: 'public', sel: s, ...c, ratio, needed: large ? 3 : 4.5, ok: ratio >= (large ? 3 : 4.5) }); }
  L.add({ check: 'contrast specifics', result: out.some(o => !o.ok) ? 'FAIL' : 'PASS', detail: out });
  const aria = await page.evaluate(() => [...document.querySelectorAll('[role=tab]')].map(t => ({ name: t.textContent.trim(), controls: t.getAttribute('aria-controls'), exists: !!document.getElementById(t.getAttribute('aria-controls') || '') })));
  L.add({ check: 'public flight filter tabs reference existing panels', result: aria.every(a => a.exists) ? 'PASS' : 'FAIL', detail: aria });
  await ctx.close();
}
// Settlement tabs aria + operator tabs aria; unauthorized non-operator screen (cannot emulate distinct identity locally: note only).
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); await signIn(ctx); const page = await ctx.newPage(); await page.goto(base + '/admin?event=' + F.completed); await page.waitForSelector('.admin-tabs'); await settle(page, 900);
  await page.getByRole('tab', { name: 'Settlement' }).click(); await settle(page, 600);
  const aria = await page.evaluate(() => [...document.querySelectorAll('.settlement-tools [role=tab]')].map(t => ({ name: t.textContent.trim(), controls: t.getAttribute('aria-controls'), exists: !!document.getElementById(t.getAttribute('aria-controls') || '') })));
  L.add({ check: 'settlement receipt/payout tabs reference existing panels', result: aria.every(a => a.exists) ? 'PASS' : 'FAIL', detail: aria });
  await ctx.close();
}
// Public → Operator link → local mock sign-in returns to the same event admin; sign out returns to public event.
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const page = await ctx.newPage(); await page.goto(base + '/?event=' + F.live); await page.waitForSelector('.live-grid'); await settle(page, 500);
  await page.locator('.mast nav a[title="Operator area"]').click(); await page.waitForSelector('.admin-tabs, .access-screen', { timeout: 20000 }); await settle(page, 800);
  L.add({ check: 'Operator link → sign-in → returns to admin for same event', result: page.url().includes('/admin?event=' + F.live) ? 'PASS' : 'FAIL', detail: page.url() });
  await page.locator('.mast nav a', { hasText: 'Sign out' }).click(); await page.waitForSelector('.live-grid'); await settle(page, 500);
  L.add({ check: 'Sign out returns to public board for same event', result: page.url().includes('/?event=' + F.live) ? 'PASS' : 'FAIL', detail: page.url() });
  await ctx.close();
}
await browser.close();
console.log('done', L.rows.filter(r => r.result === 'FAIL').length, 'FAIL');
