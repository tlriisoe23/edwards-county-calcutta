// Targeted regression for outgoing Results-tab contrast during a theme-aware tab change.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const {chromium}=await import(process.env.S1_PLAYWRIGHT_MODULE||'playwright');
const {default:AxeBuilder}=await import(process.env.S1_AXE_MODULE||'@axe-core/playwright');
const base=process.env.CALCUTTA_TEST_URL||'http://localhost:5186';assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const out=process.env.S1_EVIDENCE||'docs/s1-evidence/recovery-final';fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch({headless:true,...(process.env.S1_CHROMIUM?{executablePath:process.env.S1_CHROMIUM}:{})}),c=await b.newContext({viewport:{width:1280,height:1024}}),p=await c.newPage();
let theme='classic';const checks=[],scans=[];
await p.route('**/api/admin?*',async route=>{const response=await route.fetch(),body=await response.json();if(body.data)body.data.event.settings.theme=theme;await route.fulfill({response,json:body});});
function check(pass,label){checks.push({label,pass});}
try{
 await p.goto(base+'/signin-with-chatgpt?return_to=%2Fadmin');
 for(theme of ['classic','high-contrast','dark-event','light-event']){
  await p.goto(base+'/admin');await p.getByRole('tab',{name:'Results',exact:true}).waitFor();await p.waitForFunction(t=>document.documentElement.dataset.theme===t,theme);
  for(const width of [1280,390]){
   await p.setViewportSize({width,height:1024});
   for(const target of ['Results','Settlement','Results']){
    await p.getByRole('tab',{name:target,exact:true}).click();
    const facts=await p.locator('.nav-group-list [data-slot=tabs-trigger]').evaluateAll(es=>es.map(e=>{const s=getComputedStyle(e);return {duration:s.transitionDuration,color:s.color,background:s.backgroundColor};}));
    check(facts.every(f=>f.duration==='0s'),`${theme}/${width}/${target}: navigation colors switch without interpolation`);
    // Scan immediately; do not hide the regression with a settle timeout.
    const r=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    scans.push({theme,width,target,violations:r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});
    check(r.violations.length===0,`${theme}/${width}/${target}: immediate full-page axe`);
   }
  }
 }
}finally{fs.writeFileSync(out+'/navigation-contrast.json',JSON.stringify({checks,scans},null,2));await b.close();}
console.log(`${checks.filter(c=>c.pass).length}/${checks.length} checks; ${scans.length} full-page scans`);assert.ok(checks.every(c=>c.pass));
