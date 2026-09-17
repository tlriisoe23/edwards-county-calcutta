// Browser-only display stress: serves a synthetic public snapshot through Playwright,
// never writes auction records. Real application components, CSS and polling render it.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const {chromium}=await import(process.env.S1_PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.CALCUTTA_TEST_URL || 'http://localhost:5186';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const out=process.env.S1_EVIDENCE || 'docs/s1-evidence/recovery';fs.mkdirSync(out,{recursive:true});
const {eventId}=JSON.parse(fs.readFileSync('.sites-runtime/s1/fixture.json'));
const original=await (await fetch(base+'/api/public?event='+eventId)).json();assert.ok(original.state.team);
const browser=await chromium.launch({headless:true,...(process.env.S1_CHROMIUM?{executablePath:process.env.S1_CHROMIUM}:{})});
const page=await browser.newPage({reducedMotion:'reduce'}), rows=[];
let fixture;
await page.route('**/api/public?*',route=>route.fulfill({json:fixture}));
const sizes=[[960,540],[1024,768],[1093,614],[1099,618],[1100,619],[1280,720],[1366,768],[1920,1080],[3840,2160]];
try{
for(const theme of ['classic','high-contrast','dark-event','light-event'])for(const mode of ['live','long','paused','completed','hidden','empty']){
 fixture=structuredClone(original);fixture.event.settings.theme=theme;
 if(mode==='long'){
  fixture.state.team.name='Championship Partners — Alexander Montgomery / Christopher Washington';
  fixture.state.team.players=['Alexander Montgomery','Christopher Washington','Nathaniel Richardson','Benjamin Fitzpatrick'];
  fixture.state.bid=100000000;fixture.state.buyer='Edwards County Championship Supporters';
  fixture.totals.gross=123456789;fixture.totals.net=111111110;
  for(const team of fixture.teams.filter(t=>t.status==='UPCOMING'))team.name='Montgomery / Washington Championship Partners';
  for(const sale of fixture.sales)sale.buyer='Edwards County Championship Supporters';
 }
 if(mode==='empty'){fixture.event.status='SETUP';fixture.state.team=null;fixture.state.teamId=null;fixture.teams=[];fixture.sales=[];}
 if(mode==='paused')fixture.event.status='PAUSED';
 if(mode==='completed'){fixture.event.status='COMPLETED';fixture.state.team=null;fixture.state.teamId=null;fixture.teams.forEach(t=>t.status='SOLD');}
 if(mode==='hidden')Object.assign(fixture.event.settings,{showUpcoming:false,showTotalPool:false,showSalePrice:false,showBid:false,showBidder:false});
 await page.goto(base+'/tv?event='+eventId);await page.locator('.stats strong').first().waitFor();
 await page.waitForFunction(t=>document.documentElement.dataset.theme===t,theme);
 for(const [width,height] of sizes){
  await page.setViewportSize({width,height});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const facts=await page.evaluate(()=>{
   const selectors=['.block h2','.players','.big-bid','.bidder h3','.block-top','.stats p','.stats strong','.next h3','.next p','.sales-strip h3','.sales-strip p','.sales-strip strong','.brand','.connection','.next>.muted','.sales-strip>.muted'];
   const type=Object.fromEntries(selectors.map(s=>{const e=document.querySelector(s);return[s,e?parseFloat(getComputedStyle(e).fontSize):null]}));
   const overflow=[];
   for(const s of ['.block-body','.next','.stats','.recent','.stats strong','.big-bid','.sales-strip article'])for(const e of document.querySelectorAll(s)){
    const r=e.getBoundingClientRect();if(r.bottom>innerHeight+1 || e.scrollWidth>e.clientWidth+1 || (!['.big-bid','.stats strong'].includes(s)&&e.scrollHeight>e.clientHeight+1))overflow.push({s,width:e.clientWidth,scrollWidth:e.scrollWidth,height:e.clientHeight,scrollHeight:e.scrollHeight,bottom:r.bottom});
   }
   for(const e of document.querySelectorAll('.stats strong')){
    const range=document.createRange();range.selectNodeContents(e);const text=range.getBoundingClientRect(),cell=e.parentElement.getBoundingClientRect();
    if(text.left<cell.left-1||text.right>cell.right+1)overflow.push({s:'.stats text',textRight:text.right,cellRight:cell.right});
   }
   const block=document.querySelector('.block-body'),blockRect=block.getBoundingClientRect();
   for(const e of block.children){const r=e.getBoundingClientRect();if(r.top<blockRect.top-1||r.bottom>blockRect.bottom+1)overflow.push({s:'.block child',top:r.top,bottom:r.bottom});}
   const bounds=[...document.querySelectorAll('.tv>.page-head,.tv>.live-grid,.tv>.stats,.tv>.recent')].map(e=>e.getBoundingClientRect());
   const overlap=bounds.some((r,i)=>i>0&&r.top<bounds[i-1].bottom-1);
   return{type,overflow,overlap,page:[document.documentElement.scrollWidth,document.documentElement.scrollHeight]};
  });
  const pass=!facts.overflow.length&&!facts.overlap&&facts.page[0]<=width+1&&facts.page[1]<=height+1;
  rows.push({theme,mode,width,height,pass,...facts});if(!pass)console.error('FAIL',theme,mode,width,JSON.stringify(facts.overflow));
  if(mode==='live'&&width>=1366||theme==='high-contrast'&&mode==='long'&&width===1920)await page.screenshot({path:`${out}/${theme}-${mode}-tv-${width}.png`});
 }
}
const comparisons=[];
for(const theme of ['classic','high-contrast','dark-event','light-event']){
 const a=rows.find(r=>r.theme===theme&&r.mode==='live'&&r.width===1920),b=rows.find(r=>r.theme===theme&&r.mode==='live'&&r.width===3840);
 for(const [selector,size]of Object.entries(a.type)){if(size!==null){const ratio=b.type[selector]/size;comparisons.push({theme,selector,ratio,pass:ratio>=1.95&&ratio<=2.05});}}
 assert.ok(a.type['.stats p']>=22&&a.type['.stats strong']>=48,'Meaningfully larger 1080p statistics');
}
fs.writeFileSync(out+'/tv-scaling.json',JSON.stringify({rows,comparisons},null,2));
console.log(`${rows.filter(r=>r.pass).length}/${rows.length} layouts; ${comparisons.filter(r=>r.pass).length}/${comparisons.length} proportional 4K checks`);
assert.ok(rows.every(r=>r.pass)&&comparisons.every(r=>r.pass),'TV containment and proportional scaling');
}finally{fs.writeFileSync(out+'/tv-layouts.json',JSON.stringify(rows,null,2));await browser.close();}
