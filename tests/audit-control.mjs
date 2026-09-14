// Supporting manual browser audit only. Restricts all writes to the isolated server.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base='http://localhost:5174', fixtures=JSON.parse(fs.readFileSync('docs/audit-evidence/api.json')).fixtures;
const l=await fetch(base+'/signin-with-chatgpt?return_to=%2Fadmin',{redirect:'manual'}),cookie=l.headers.get('set-cookie').split(';')[0];
let eventId=fixtures.completed,d;
async function read(){const r=await fetch(base+'/api/admin?event='+eventId,{headers:{cookie}});assert.equal(r.status,200);d=(await r.json()).data;}
async function send(action,payload){await read();const r=await fetch(base+'/api/admin',{method:'POST',headers:{cookie,origin:base,'content-type':'application/json'},body:JSON.stringify({action,payload,eventId,revision:d.event.revision,requestId:crypto.randomUUID()})});const result=await r.json();assert.equal(r.status,200,JSON.stringify(result));await read();return result;}
await read();
switch(process.argv[2]){
 case 'stress': await send('status',{status:'LIVE'});await send('block',{id:d.teams[18].id});await send('bid',{teamId:d.state.teamId,amount:100000000});break;
 case 'pause': await send('status',{status:'PAUSED'});break;
 case 'resume': await send('status',{status:'LIVE'});break;
 case 'balance': {
  const a=d.settlement.receipts.find(a=>a.balance>0),sale=a.purchases[0];
  await send('settlement_record',{kind:'receipt',partyKind:'buyer',partyId:a.id,amount:a.balance,occurredAt:new Date().toISOString(),method:'Cash',note:'Audit paid before sale correction'});
  await send('sale_edit',{id:sale.id,buyerId:a.id,amount:sale.amount-10000,notes:'Audit overpayment after correction'});
  const positive=d.settlement.receipts.reduce((n,a)=>n+Math.max(0,a.balance),0),negative=d.settlement.receipts.reduce((n,a)=>n+Math.min(0,a.balance),0);
  const observation={name:'Remaining-to-collect summary does not offset unrelated buyer overpayments',status:positive===d.settlement.receivable?'PASS':'FAIL',positiveBalances:positive,overpayments:negative,displayedReceivable:d.settlement.receivable};
  fs.writeFileSync('docs/audit-evidence/balance.json',JSON.stringify(observation,null,2));console.log(JSON.stringify(observation));break;
 }
 case 'snapshot':fs.writeFileSync('.sites-runtime/audit-restart-current.json',JSON.stringify(d));console.log('Current isolated event snapshot saved');break;
 case 'verify':assert.deepEqual(d,JSON.parse(fs.readFileSync('.sites-runtime/audit-restart-current.json')));console.log('PASS all event records and derived balances unchanged after restart');break;
 case 'read':break;
 default:throw Error('Use stress, pause, resume, balance, snapshot, verify or read');
}
console.log(JSON.stringify({eventId,status:d.event.status,revision:d.event.revision,teamId:d.state.teamId,bid:d.state.bid,teams:d.teams.length,gross:d.totals.gross,received:d.settlement.received,payments:d.payments.length,disbursements:d.disbursements.length}));
