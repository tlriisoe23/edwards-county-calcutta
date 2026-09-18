import { launch, signIn, api, BASE } from './lib.mjs';
const out = 'docs/batch-l-evidence';
const browser = await launch();
const rows = [];
for (const [label, w, h] of [['phone-390', 390, 844], ['tablet-820', 820, 1180], ['laptop-1366', 1366, 768], ['desktop-1920', 1920, 1080]]) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  const page = await signIn(context);
  const A = api(context);
  await A.send('load_demo');
  await A.send('status', { status: 'SETUP' });
  await page.goto(BASE + '/admin?event=' + A.eventId);
  await page.getByRole('tab', { name: 'Auction console' }).waitFor();
  await page.waitForTimeout(1200);
  const m = await page.evaluate(() => {
    const vis = s => { const el = document.querySelector(s); if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const inb = s => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right) }; };
    return {
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      compactToggle: vis('.mast-controls .compact-toggle'),
      undo: vis('.mast-controls button'),
      tools: vis('.tools-menu-trigger'),
      tabs: document.querySelectorAll('.op-tabs [role=tab]').length,
      tabsBox: inb('.op-nav-bar'),
      prepareCols: getComputedStyle(document.querySelector('.prepare-steps')).gridTemplateColumns.split(' ').length,
      tabsWrapRows: new Set([...document.querySelectorAll('.op-tabs [role=tab]')].map(t => Math.round(t.getBoundingClientRect().top))).size,
    };
  });
  await page.screenshot({ path: out + '/20-operator-' + label + '.png' });
  // step 5 dialog containment
  await page.getByRole('button', { name: 'Start Auction', exact: true }).click();
  await page.waitForTimeout(600);
  const dlg = await page.evaluate(() => { const el = document.querySelector('[data-slot=dialog-content]'); const r = el.getBoundingClientRect(); return { fits: r.left >= -1 && r.right <= window.innerWidth + 1, scrollable: el.scrollHeight <= el.clientHeight + 1 || getComputedStyle(el).overflowY === 'auto' }; });
  await page.screenshot({ path: out + '/21-start-dialog-' + label + '.png' });
  await page.keyboard.press('Escape');
  // public board at this size
  const pub = await context.newPage();
  await pub.setViewportSize({ width: w, height: h });
  await pub.goto(BASE + '/?event=' + A.eventId);
  await pub.locator('#board').waitFor();
  await pub.waitForTimeout(700);
  const pubM = await pub.evaluate(() => ({ overflowX: document.documentElement.scrollWidth - window.innerWidth, anchor: document.querySelectorAll('a[href="#board"]').length }));
  rows.push({ label, w, h, ...m, dialogFits: dlg.fits, publicOverflowX: pubM.overflowX, publicAnchorAtTop: pubM.anchor });
  console.log(label, JSON.stringify({ ...m, dialogFits: dlg.fits, publicOverflowX: pubM.overflowX, publicAnchorAtTop: pubM.anchor }));
  await context.close();
}
// TV route unchanged, but confirm it still renders one screen
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
await signIn(ctx); const A = api(ctx); await A.send('load_demo');
const tv = await ctx.newPage();
await tv.goto(BASE + '/tv?event=' + A.eventId);
await tv.locator('.big-bid').waitFor();
await tv.waitForTimeout(800);
const tvM = await tv.evaluate(() => ({ overflowY: document.documentElement.scrollHeight - window.innerHeight, overflowX: document.documentElement.scrollWidth - window.innerWidth }));
await tv.screenshot({ path: out + '/22-tv-1920.png' });
console.log('tv-1920', JSON.stringify(tvM));
rows.push({ label: 'tv-1920', ...tvM });

await browser.close();
import('node:fs').then(fs => fs.writeFileSync(out + '/responsive.json', JSON.stringify(rows, null, 1)));
