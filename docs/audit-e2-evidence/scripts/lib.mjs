import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
export const base = 'http://localhost:5173';
export const evidence = '/home/tanner/development/edwards-county-calcutta/docs/audit-e2-evidence';
fs.mkdirSync(evidence, { recursive: true });
export const fixtures = JSON.parse(fs.readFileSync(new URL('./fixtures.json', import.meta.url), 'utf8'));
const axeSource = fs.readFileSync(new URL('./node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
export const viewports = { phone320: { width: 320, height: 850 }, phone390: { width: 390, height: 844 }, phone430: { width: 430, height: 932 }, tabletPortrait: { width: 768, height: 1024 }, tabletLandscape: { width: 1024, height: 768 }, laptop: { width: 1280, height: 720 }, tv1366: { width: 1366, height: 768 }, tv1080: { width: 1920, height: 1080 }, zoom200laptop: { width: 640, height: 360 }, zoom200desktop: { width: 960, height: 540 } };
export async function launch() { return await chromium.launch(); }
export async function signIn(context) { const p = await context.newPage(); await p.goto(base + '/signin-with-chatgpt?return_to=%2Fadmin'); await p.close(); }
export function log(file) {
  const rows = [];
  const write = () => fs.writeFileSync(path.join(evidence, file), JSON.stringify(rows, null, 2));
  return { add(o) { rows.push({ at: new Date().toISOString(), ...o }); write(); console.log((o.result || 'INFO').padEnd(10), o.check || o.note || ''); if (o.detail !== undefined && o.result !== 'PASS') console.log('   ', typeof o.detail === 'string' ? o.detail : JSON.stringify(o.detail).slice(0, 600)); }, rows };
}
export async function shot(page, name, full = false) { const file = path.join(evidence, name + '.png'); await page.screenshot({ path: file, fullPage: full }); return path.relative('/home/tanner/development/edwards-county-calcutta/docs', file); }
export async function settle(page, ms = 700) { await page.waitForTimeout(ms); }
export async function geometry(page, selectors) {
  return await page.evaluate((selectors) => {
    const vw = window.innerWidth, vh = window.innerHeight, out = { scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, innerWidth: vw, innerHeight: vh, horizontalOverflow: document.documentElement.scrollWidth > vw + 1, items: [] };
    for (const sel of selectors) for (const el of document.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect(); if (!r.width && !r.height) continue;
      const parent = el.parentElement.getBoundingClientRect();
      const text = (el.textContent || '').trim().slice(0, 60);
      const clipped = el.scrollWidth > el.clientWidth + 1;
      const outsideParent = r.right > parent.right + 1 || r.left < parent.left - 1;
      const outsideViewport = r.right > vw + 1 || r.left < -1;
      out.items.push({ sel, text, clipped, outsideParent, outsideViewport, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] });
    }
    return out;
  }, selectors);
}
export async function sectionOverlaps(page, selectors) {
  return await page.evaluate((selectors) => {
    const els = selectors.map(s => document.querySelector(s)).filter(Boolean).map(el => ({ sel: el.className || el.tagName, r: el.getBoundingClientRect() }));
    const out = [];
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) { const a = els[i].r, b = els[j].r; const x = Math.min(a.right, b.right) - Math.max(a.left, b.left), y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (x > 2 && y > 2) out.push({ a: els[i].sel, b: els[j].sel, overlap: [Math.round(x), Math.round(y)] }); }
    return out;
  }, selectors);
}
export async function focusableInvisible(page) {
  return await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')) {
      if (el.tabIndex < 0 || el.disabled) continue;
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const tiny = r.width < 2 || r.height < 2 || parseFloat(cs.fontSize) === 0 && !el.querySelector('svg,img');
      if (tiny) out.push({ tag: el.tagName, text: (el.textContent || '').trim().slice(0, 40), href: el.getAttribute('href'), rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], fontSize: cs.fontSize });
    }
    return out;
  });
}
export async function tabOrder(page, steps = 12) {
  const out = [];
  for (let i = 0; i < steps; i++) {
    await page.keyboard.press('Tab');
    out.push(await page.evaluate(() => { const el = document.activeElement; if (!el || el === document.body) return { body: true }; const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return { tag: el.tagName, role: el.getAttribute('role'), name: (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || '').trim().slice(0, 40), rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], fontSize: cs.fontSize, outline: cs.outlineStyle + ' ' + cs.outlineWidth, boxShadow: cs.boxShadow !== 'none' }; }));
  }
  return out;
}
export async function axe(page, name, logger, options = {}) {
  await page.addScriptTag({ content: axeSource });
  const res = await page.evaluate(async (options) => { const r = await window.axe.run(document, { resultTypes: ['violations'], ...options }); return r.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 5).map(n => ({ target: n.target.join(' '), html: n.html.slice(0, 160), summary: n.failureSummary?.slice(0, 200) })), count: v.nodes.length })); }, options);
  const serious = res.filter(v => ['serious', 'critical'].includes(v.impact));
  logger.add({ check: 'axe ' + name, result: serious.length ? 'FAIL' : res.length ? 'WARN' : 'PASS', detail: res });
  return res;
}
export async function targets(page, selector, min = 24) {
  return await page.evaluate(([selector, min]) => { const out = []; for (const el of document.querySelectorAll(selector)) { const r = el.getBoundingClientRect(); if (!r.width) continue; if (r.width < min || r.height < min) out.push({ text: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) }); } return out; }, [selector, min]);
}
export function contrast(fg, bg) { const l = c => { const [r, g, b] = c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; }; const a = l(fg), b = l(bg); return Math.round(((Math.max(a, b) + .05) / (Math.min(a, b) + .05)) * 100) / 100; }
export async function computedColors(page, selector) {
  return await page.evaluate((selector) => { const el = document.querySelector(selector); if (!el) return null; const cs = getComputedStyle(el); let bg = null, p = el; while (p && !bg) { const b = getComputedStyle(p).backgroundColor; if (b && !b.startsWith('rgba(0, 0, 0, 0')) bg = b; p = p.parentElement; } return { color: cs.color, background: bg, fontSize: cs.fontSize, fontWeight: cs.fontWeight, text: el.textContent.trim().slice(0, 40) }; }, selector);
}
export const rgb = s => (s.match(/\d+/g) || []).slice(0, 3).map(Number);
