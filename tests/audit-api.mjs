// Comprehensive audit fixtures and probes; intentionally leaves findings failing.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base=process.env.CALCUTTA_TEST_URL||'http://localhost:5174';
if(new URL(base).origin!=='http://localhost:5174')throw Error('Audit requires isolated localhost:5174. Never use review port 5173.');
const dir='docs/audit-evidence',privateDir='.sites-runtime/audit-exports';fs.mkdirSync(dir,{recursive:true});fs.mkdirSync(privateDir,{recursive:true});
const report={at:new Date().toISOString(),base,checks:[],fixtures:{},timings:[]};
const login=await fetch(base+'/signin-with-chatgpt?return_to=%2Fadmin',{redirect:'manual'}),cookie=login.headers.get('set-cookie').split(';')[0];
let d,eventId;
async function read(id=eventId){const start=performance.now(),r=await fetch(base+'/api/admin'+(id?'?event='+id:''),{headers:{cookie}}),t=await r.text();assert.equal(r.status,200);report.timings.push({action:'admin-read',ms:Math.round(performance.now()-start),bytes:Buffer.byteLength(t)});const body=JSON.parse(t);if(id===eventId)d=body.data;return body;}
async function request(action,payload={},extra={}){const start=performance.now(),r=await fetch(base+'/api/admin',{method:'POST',headers:{cookie,origin:base,'content-type':'application/json'},body:JSON.stringify({action,payload,eventId,revision:d?.event.revision,requestId:crypto.randomUUID(),...extra})});const body=await r.json();report.timings.push({action,ms:Math.round(performance.now()-start),status:r.status});return {status:r.status,body};}
async function send(action,payload={},extra={}){const r=await request(action,payload,extra);assert.equal(r.status,200,action+JSON.stringify(r));if(r.body.eventId)eventId=r.body.eventId;await read();return r.body;}
function check(name,condition,evidence={}){const status=condition?'PASS':'FAIL';report.checks.push({name,status,evidence});console.log(status+' '+name);}
async function settings(p){await send('event_update',{...d.event,settings:{...d.event.settings,...p}});}
function parseCSV(text){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(ch===','&&!quoted){row.push(cell);cell='';}else if((ch==='\r'||ch==='\n')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}else cell+=ch;}row.push(cell);if(row.some(Boolean))rows.push(row);return rows;}
const moneyNumber=v=>Math.round(Number(v)*100);
try{
 // Review state is captured through read-only requests, never written by this harness.
 const review='http://localhost:5173',l=await fetch(review+'/signin-with-chatgpt?return_to=%2Fadmin',{redirect:'manual'}),c=l.headers.get('set-cookie').split(';')[0];
 const r=await fetch(review+'/api/admin',{headers:{cookie:c}}),current=await r.json();fs.mkdirSync('.sites-runtime',{recursive:true});fs.writeFileSync('.sites-runtime/audit-review-baseline.json',JSON.stringify(current));
 report.reviewBaseline={events:current.events.map(e=>({id:e.id,name:e.name,status:e.status})),selectedEvent:current.data?.event.id,teams:current.data?.teams.length,revision:current.data?.event.revision};
 // Failed access writes must not change access.
 const email='audit-atomic@sites.test';
 const bad=await request('operator_add',{email},{eventId:crypto.randomUUID()});
 const added=(await read()).operators.some(o=>o.email===email);
 check('Rejected access change is atomic',bad.status>=400&&!added,{response:bad,operatorExists:added});
 await send('operator_remove',{email},{eventId:undefined});
 check('Owner can revoke the disposable operator',!(await read()).operators.some(o=>o.email===email));
 // Create fixtures with equal revisions for cross-event draft testing.
 for(const name of ['Audit Draft A','Audit Draft B']){
  await send('create_event',{name,course:'Isolated audit course'});
  await send('flight_save',{name:'Championship',color:'#b79a59',ownPool:true});
  await send('team_save',{name:'North / West',players:['North','West'],flightId:d.flights[0].id});
  await send('buyer_save',{name:'Audit Buyer'});report.fixtures[name]={id:eventId,revision:d.event.revision};
 }
 const req=crypto.randomUUID();const first=await request('create_event',{name:'Audit duplicate creation'},{requestId:req}),second=await request('create_event',{name:'Audit duplicate creation'},{requestId:req});
 check('Repeated event creation request is idempotent',first.body.eventId===second.body.eventId,{first:first.body.eventId,second:second.body.eventId});
 report.fixtures.duplicates=[first.body.eventId,second.body.eventId];
 await send('create_event',{name:'Edwards County Calcutta — Four-flight Audit',course:'Isolated audit course'});report.fixtures.large=eventId;
 for(const name of ['Championship Flight','First Flight','Second Flight','Third Flight'])await send('flight_save',{name,color:'#b79a59',ownPool:true});
 const teams=Array.from({length:100},(_,i)=>({name:i===18?'Christopher Montgomery-Wellington / Alexander Richardson-Harrington':i===0?'Renée, Jr. / O"Brien | North':i===1?'=HYPERLINK("https://invalid.example")':'Audit Team '+String(i+1).padStart(3,'0'),players:['Player '+i+' A','Player '+i+' B'],flightId:d.flights[i%4].id,privateNotes:'AUDIT_PRIVATE_TEAM_SENTINEL'}));
 await send('team_import',{teams});
 for(const name of ['Johnson Group','Renée, Jr. "Club"','Pine Syndicate'])await send('buyer_save',{name,contact:'AUDIT_PRIVATE_CONTACT_SENTINEL',privateNotes:'AUDIT_PRIVATE_BUYER_SENTINEL'});
 await settings({minBid:1,increment:1,deductionType:'fixed',deduction:101,buybackMode:'track',buybackMax:10000,trackBidder:false});
 await send('status',{status:'LIVE'});const buyers=d.buyers.map(b=>b.id);
 for(let i=0;i<18;i++){await send('bid',{teamId:d.state.teamId,amount:i===0?125001:62501+i});await send('sell',{teamId:d.state.teamId,amount:d.state.bid,buyerId:buyers[i%3]});}
 await send('bid',{teamId:d.state.teamId,amount:100000000});
 check('100-team four-flight fixture is live with 18 sales',d.teams.length===100&&d.flights.length===4&&d.sales.length===18&&d.event.status==='LIVE');
 const sold=d.sales.find(s=>s.teamId===d.teams[0].id),gross=d.totals.gross;
 await send('buyback',{saleId:sold.id,percent:3333,status:'Completed'});
 check('Odd-cent partial buyback preserves pool and receivables',d.totals.gross===gross&&d.settlement.purchases===gross,{consideration:d.ownership.find(o=>o.saleId===sold.id&&o.kind==='team').consideration});
 const receipt={kind:'receipt',partyKind:'buyer',partyId:buyers[0],occurredAt:'2026-09-14T04:00:00.000Z',method:'Check',note:'AUDIT_PRIVATE_PAYMENT_SENTINEL'};
 const paid1=await send('settlement_record',{...receipt,amount:10001});await send('settlement_record',{...receipt,amount:20002,method:'Cash'});
 check('Multiple partial payments reconcile to cents',d.settlement.receipts.find(a=>a.id===buyers[0]).paid===30003);
 await send('settlement_reverse',{kind:'receipt',id:paid1.recordId,note:'Audit correction'});
 check('Reversal retains originals and exact balance',d.payments.length===3&&d.settlement.received===20002);
 // Current-price correction and stale client conflict.
 const stale=d.event.revision;await send('bid',{teamId:d.state.teamId,amount:98765432,correction:true});
 const fail=await request('bid',{teamId:d.state.teamId,amount:98765433},{revision:stale});
 check('Stale mutation rejects without false success',fail.status===409&&!fail.body.ok,{error:fail.body.error});
 const malformed=await fetch(base+'/api/admin',{method:'POST',headers:{cookie,origin:base,'content-type':'application/json'},body:'{broken'});
 check('Malformed JSON rejected',malformed.status===400);
 const before=d.event.revision;const invalid=await request('team_save',{id:d.teams[1].id,name:'bad',players:['Only'],flightId:'other-event-flight'});await read();
 check('Invalid foreign event reference applies no partial mutation',invalid.status===400&&d.event.revision===before);
 const start=performance.now(),pr=await fetch(base+'/api/public?event='+eventId),publicText=await pr.text();report.timings.push({action:'large-public',ms:Math.round(performance.now()-start),bytes:Buffer.byteLength(publicText)});
 check('Public large payload excludes every private sentinel',!publicText.includes('AUDIT_PRIVATE_'));
 check('Public large snapshot remains under 100 KB',Buffer.byteLength(publicText)<100000,{bytes:Buffer.byteLength(publicText)});
 const pub=JSON.parse(publicText);await send('bid',{teamId:d.state.teamId,amount:98765433});const delta=await fetch(base+`/api/public?event=${eventId}&revision=${pub.event.revision}&boardRevision=${pub.event.boardRevision}`),dt=await delta.text();
 check('Large event bid delta omits full board',JSON.parse(dt).light===true&&Buffer.byteLength(dt)<3000,{bytes:Buffer.byteLength(dt)});
 const unchanged=await fetch(base+`/api/public?event=${eventId}&revision=${d.event.revision}`);check('Unchanged large event response is 204',unchanged.status===204);
 // Finish paid teams, with unique places in every independent flight.
 await send('team_status',{id:d.state.teamId,status:'UNSOLD'});await send('status',{status:'COMPLETED'});
 const places=new Map();await send('results',{rows:d.teams.map(t=>{const finish=t.status==='SOLD'?(places.get(t.flightId)||0)+1:null;if(finish)places.set(t.flightId,finish);return {teamId:t.id,finish};})});
 check('Four-flight final entitlements reconcile exactly',d.settlement.entitled===d.totals.net);
 const payee=d.settlement.payables.find(a=>a.balance>100),payout={kind:'payout',partyKind:payee.kind,partyId:payee.id,occurredAt:new Date().toISOString(),method:'Other',note:'Audit partial payout'};
 await send('settlement_record',{...payout,amount:1});check('Partial payout leaves receipts separate',d.settlement.disbursed===1&&d.settlement.received===20002);
 await send('settlement_record',{...payout,amount:payee.balance-1});check('Final payout becomes Paid',d.settlement.payables.find(a=>a.id===payee.id&&a.kind===payee.kind).status==='Paid');
 const decoded={};
 for(const kind of ['auction','settlement','teams','payouts','ownership','payments','backup']){
  const start=performance.now(),r=await fetch(base+`/api/export?event=${eventId}&kind=${kind}`,{headers:{cookie}}),text=await r.text();assert.equal(r.status,200);
  report.timings.push({action:'export-'+kind,ms:Math.round(performance.now()-start),bytes:Buffer.byteLength(text)});
  const path=`${kind==='backup'?privateDir:dir}/sample-${kind}.${kind==='backup'?'json':'csv'}`;fs.writeFileSync(path,text);
  // Open actual downloaded bytes, using a separate RFC-style CSV reader.
  const reopened=fs.readFileSync(path,'utf8');decoded[kind]=kind==='backup'?JSON.parse(reopened):parseCSV(reopened);
  check('Open and parse actual '+kind+' export',kind==='backup'?decoded[kind].data.teams.length===100:decoded[kind].every(row=>row.length===decoded[kind][0].length));
  if(!['backup','payments'].includes(kind))check(kind+' export excludes private fields',!reopened.includes('AUDIT_PRIVATE_'));
 }
 check('Downloaded Auction CSV reconciles active sales',decoded.auction.slice(1).filter(r=>r[9]==='ACTIVE').reduce((n,r)=>n+moneyNumber(r[8]),0)===d.totals.gross);
 check('Downloaded Settlement CSV reconciles receipts',decoded.settlement.slice(1).reduce((n,r)=>n+moneyNumber(r[5]),0)===d.settlement.received);
 check('Downloaded Payout CSV reconciles entitlements',decoded.payouts.slice(1).reduce((n,r)=>n+moneyNumber(r[11]),0)===d.settlement.entitled);
 const signedSum=decoded.payments.slice(1).filter(r=>r[2]==='Receipt').reduce((n,r)=>n+moneyNumber(r[5]),0);
 check('Downloaded payment correction amounts remain numeric and reconcile',signedSum===d.settlement.received,{cells:decoded.payments.slice(1).filter(r=>r[2]==='Receipt').map(r=>r[5]),expected:d.settlement.received,actual:String(signedSum)});
 check('Backup includes complete relational state and audit',decoded.backup.data.payments.length===3&&decoded.backup.audit.length>18&&decoded.backup.data.players.length===200);
 check('Formula-like team text is escaped in downloaded CSV',decoded.teams.some(r=>r.includes("'=HYPERLINK(\"https://invalid.example\")")));
 const pos=d.teams.map(t=>({teamId:t.id,finish:t.finish}));pos[1].finish=pos[5].finish;
 const duplicate=await request('results',{rows:pos});check('Duplicate finishing positions rejected',duplicate.status===400);
 // Preserve completed fixture for settlement and export browser review; separate live demo for four clients.
 report.fixtures.completed=eventId;
 fs.writeFileSync(`${privateDir}/restart-expected.json`,JSON.stringify({eventId,payments:d.payments,disbursements:d.disbursements,settlement:d.settlement}));
 await send('load_demo');report.fixtures.live=eventId;
 await settings({trackBidder:false,buybackMode:'off'});await send('bid',{teamId:d.state.teamId,amount:10000,correction:true});
 await send('create_event',{name:'Audit Empty Event'});report.fixtures.empty=eventId;
}catch(error){report.harnessError=error.stack;console.error(error);}
report.passed=report.checks.filter(c=>c.status==='PASS').length;report.failed=report.checks.filter(c=>c.status==='FAIL').length;
fs.writeFileSync(`${dir}/api.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,failed:report.failed,fixtures:report.fixtures,harnessError:report.harnessError}));process.exitCode=report.failed||report.harnessError?1:0;
