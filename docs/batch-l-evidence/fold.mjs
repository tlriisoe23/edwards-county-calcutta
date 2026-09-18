import { launch, signIn, api, BASE } from './lib.mjs';
const browser = await launch();
for (const [w, h] of [[1366, 768], [1280, 720], [1920, 1080], [1024, 768]]) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  const page = await signIn(context);
  const A = api(context);
  await A.send('load_demo');
  await page.goto(BASE + '/admin?event=' + A.eventId);
  await page.getByRole('tab', { name: 'Auction console' }).waitFor();
  await page.waitForTimeout(1500);
  // put the tab bar at the top the way starting the auction does
  await page.evaluate(() => {
    const el = document.querySelector('.op-nav-bar'), mast = document.querySelector('.admin-site .mast');
    const sticky = mast && getComputedStyle(mast).position === 'sticky' ? mast.getBoundingClientRect().height : 0;
    window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - sticky - 8), behavior: 'auto' });
  });
  await page.waitForTimeout(500);
  const m = await page.evaluate(() => {
    const r = s => { const el = document.querySelector(s); return el ? Math.round(el.getBoundingClientRect().bottom) : null; };
    const t = s => { const el = document.querySelector(s); return el ? Math.round(el.getBoundingClientRect().top) : null; };
    return { mastSticky: getComputedStyle(document.querySelector('.admin-site .mast')).position, mastBottom: r('.admin-site .mast'), tabsTop: t('.op-nav-bar'), hammerBottom: r('.hammer'), bigBidTop: t('.big-bid'), vh: window.innerHeight, controlsVisible: !!document.querySelector('.mast-controls')?.getBoundingClientRect().height, overflowX: document.documentElement.scrollWidth - window.innerWidth };
  });
  console.log(w + 'x' + h, JSON.stringify({ ...m, hammerFits: m.hammerBottom !== null && m.hammerBottom <= m.vh, tabsClearMast: m.tabsTop >= m.mastBottom - 1 }));
  await context.close();
}
await browser.close();
