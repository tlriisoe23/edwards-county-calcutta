// Additional audit journeys. Synthetic data, isolated server only; never review port 5173.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base='http://localhost:5174',report={at:new Date().toISOString(),checks:[]};
const login=await fetch(base+'/signin-with-chatgpt?return_to=%2Fadmin',{redirect:'manual'}),cookie=login.headers.get('set-cookie').split(';')[0];
let d,eventId;
async function read(){const r=await fetch(base+'/api/admin?event='+eventId,{headers:{cookie}});assert.equal(r.status,200);d=(await r.json()).data;}
async function send(action,payload={},expected=200){const r=await fetch(base+'/api/admin',{method:'POST',headers:{cookie,origin:base,'content-type':'application/json'},body:JSON.stringify({action,payload,eventId,revision:d?.event.revision,requestId:crypto.randomUUID()})});const b=await r.json();assert.equal(r.status,expected,JSON.stringify(b));if(b.eventId)eventId=b.eventId;await read();return b;}
function check(name,condition,evidence={}){report.checks.push({name,status:condition?'PASS':'FAIL',evidence});}
await send('create_event',{name:'Audit queue and correction journey',course:'Synthetic course'});report.eventId=eventId;
await send('flight_save',{name:'Audit Flight',color:'#b79a59',ownPool:true});
for(const name of ['Withdraw me','Auction me','Later team'])await send('team_save',{name,players:[name+' player'],flightId:d.flights[0].id});
const [withdrawn,auction,later]=d.teams.map(t=>t.id);
await send('team_status',{id:withdrawn,status:'WITHDRAWN'});
check('Withdraw retains team and excludes active participation',d.teams.find(t=>t.id===withdrawn).status==='WITHDRAWN'&&d.sales.length===0);
await send('status',{status:'LIVE'});
check('Starting skips withdrawn team',d.state.teamId===auction);
await send('block',{id:withdrawn},400);
check('Withdrawn team cannot be placed directly on block',d.state.teamId===auction);
await send('bid',{teamId:auction,amount:125000});
await send('bid',{teamId:auction,amount:100000},400);
check('Ordinary lower bid rejected without state change',d.state.bid===125000);
await send('bid',{teamId:auction,amount:100000,correction:true});
check('Explicit wrong-bid correction succeeds',d.state.bid===100000);
await send('bid',{teamId:auction,amount:125000});
await send('buyer_save',{name:'Original buyer'});const buyerA=d.buyers.find(b=>b.name==='Original buyer').id;
await send('buyer_save',{name:'Correct buyer'});const buyerB=d.buyers.find(b=>b.name==='Correct buyer').id;
await send('sell',{teamId:auction,amount:125000,buyerId:buyerA});const sale=d.sales[0];
await send('event_update',{...d.event,settings:{...d.event.settings,buybackMode:'calculate',buybackSuggested:5000}});
check('1250 sale at suggested 50 percent is 625 without ownership or receivable change',Math.round(sale.amount*d.event.settings.buybackSuggested/10000)===62500&&d.totals.gross===125000&&d.ownership.length===1&&d.settlement.purchases===125000);
await send('settlement_record',{kind:'receipt',partyKind:'buyer',partyId:buyerA,amount:10001,occurredAt:'2026-09-14T04:00:00Z',method:'Check',note:'Synthetic check 123, correction review'});
await send('sale_edit',{id:sale.id,amount:125000,buyerId:buyerB,notes:'Wrong purchaser correction'});
check('Purchaser correction changes ownership and debt without moving receipt',d.sales[0].buyerId===buyerB&&d.ownership[0].party==='Correct buyer'&&d.payments[0].buyerId===buyerA&&d.settlement.receipts.find(r=>r.id===buyerA).balance===-10001&&d.settlement.receipts.find(r=>r.id===buyerB).due===125000);
check('Receipt method and note persist after correction',d.payments[0].method==='Check'&&d.payments[0].note==='Synthetic check 123, correction review');
await send('undo');
check('Undo purchaser correction restores debt and preserves receipts',d.sales[0].buyerId===buyerA&&d.payments.length===1&&d.settlement.receipts.find(r=>r.id===buyerA).balance===114999);
await send('team_status',{id:later,status:'UNSOLD'});await send('status',{status:'COMPLETED'});
check('Completion retains correct final purse and unsold classification',d.event.status==='COMPLETED'&&d.totals.gross===125000&&d.totals.net===112500&&d.teams.find(t=>t.id===later).status==='UNSOLD');
await send('team_save',{...d.teams.find(t=>t.id===withdrawn),name:'Retained withdrawn record',status:'SOLD',eventId:'forged',finish:1});
check('Team editor strips unrecognized status event and finish fields',d.teams.find(t=>t.id===withdrawn).status==='WITHDRAWN'&&d.teams.find(t=>t.id===withdrawn).eventId===eventId&&d.teams.find(t=>t.id===withdrawn).finish===null);
report.passed=report.checks.filter(r=>r.status==='PASS').length;report.failed=report.checks.length-report.passed;
fs.writeFileSync('docs/audit-evidence/workflows.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));process.exitCode=report.failed?1:0;
