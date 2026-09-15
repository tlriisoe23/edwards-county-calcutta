// Throwaway experiment for D-CAL-5: inject sticky/compaction CSS into the live console (nothing shipped) and measure whether team + bid stay uncovered.
import fs from 'node:fs'; import { chromium } from 'playwright';
const base='http://localhost:5173'; const F=JSON.parse(fs.readFileSync('/home/tanner/development/edwards-county-calcutta/docs/audit-e2-evidence/fixtures.json','utf8'));
const browser=await chromium.launch(); const out=[];
const GEOM=()=>{const r=s=>{const el=document.querySelector(s);if(!el)return null;const b=el.getBoundingClientRect();return {top:Math.round(b.top),bottom:Math.round(b.bottom)}};const panel=r('.bid-controls'),team=r('.console-grid .block h2'),bid=r('.console-grid .big-bid'),hammer=r('.hammer');const vh=innerHeight;const unc=x=>x.bottom<=panel.top;return {vh,panel,panelHeight:panel.bottom-panel.top,team,bid,hammer,hammerVisible:hammer.bottom<=vh,teamUncovered:unc(team),bidUncovered:unc(bid),coveredBy:{team:Math.max(0,team.bottom-panel.top),bid:Math.max(0,bid.bottom-panel.top)}}};
const variants={
 'sticky only':'.console-active .bid-controls{position:sticky;bottom:0;z-index:2}',
 'sticky + compact panel (hint hidden, tighter margins, 48px hammer)':'.console-active .bid-controls{position:sticky;bottom:0;z-index:2;padding:12px}.console-active .bid-controls>.fine{display:none}.console-active .quick-bid-heading{display:none}.console-active .increments{margin:8px 0}.console-active .hammer-row{margin:8px 0 0}.console-active .hammer{min-height:46px!important}',
 'sticky + compact panel + compact block':'.console-active .bid-controls{position:sticky;bottom:0;z-index:2;padding:12px}.console-active .bid-controls>.fine{display:none}.console-active .quick-bid-heading{display:none}.console-active .increments{margin:8px 0}.console-active .hammer-row{margin:8px 0 0}.console-active .hammer{min-height:46px!important}.console-active .block-top{padding:8px 20px}.console-active .block-body{padding:12px 24px}.console-active .block h2{font-size:30px;margin:6px 0 2px}.console-active .players{font-size:15px}.console-active .bidline{margin-top:8px}.console-active .big-bid{font-size:48px}.console-active .bid-controls{margin-top:8px}'
};
for(const [w,h] of [[1280,720],[1024,768]]) for(const [name,css] of Object.entries(variants)){
 const ctx=await browser.newContext({viewport:{width:w,height:h}}); const p0=await ctx.newPage(); await p0.goto(base+'/signin-with-chatgpt?return_to=%2Fadmin'); await p0.close();
 const page=await ctx.newPage(); await page.goto(base+'/admin?event='+F.live); await page.waitForSelector('.admin-tabs'); await page.waitForTimeout(900);
 await page.addStyleTag({content:css}); await page.waitForTimeout(300);
 const g=await page.evaluate(GEOM); out.push({viewport:w+'x'+h,variant:name,...g}); console.log(w+'x'+h,name,JSON.stringify(g)); await ctx.close();
}
await browser.close(); fs.writeFileSync(process.env.OUT+'/sticky-experiment.json',JSON.stringify(out,null,2));
