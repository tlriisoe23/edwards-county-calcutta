// Batch B: disposable local fixtures only; never targets the user's review.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {csv} from '../lib/model.ts';
import {settlement} from '../lib/settlement.ts';
const base='http://localhost:5174',out='docs/batch-b-evidence';
fs.mkdirSync(out,{recursive:true});
const report={at:new Date().toISOString(),checks:[]};
function check(name,ok){assert.ok(ok,name);report.checks.push({name,status:'PASS'});console.log('PASS '+name);}
// Independent fixed-comma reader; deliberately never uses production parsePaste.
function parse(text){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\r'||c==='\n')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}else cell+=c;}assert.equal(quoted,false);row.push(cell);if(row.some(Boolean))rows.push(row);return rows;}
const cents=s=>{assert.match(s,/^-?\d+(?:\.\d{1,2})?$/);return Math.round(Number(s)*100);};
let d,eventId,cookie;
async function read(){const r=await fetch(base+'/api/admin?event='+eventId,{headers:{cookie}});assert.equal(r.status,200);d=(await r.json()).data;}
async function send(action,payload={},expected=200){const r=await fetch(base+'/api/admin',{method:'POST',headers:{cookie,origin:base,'content-type':'application/json'},body:JSON.stringify({action,payload,eventId,revision:d?.event.revision,requestId:crypto.randomUUID()})});const b=await r.json();assert.equal(r.status,expected,action+JSON.stringify(b));if(b.eventId)eventId=b.eventId;await read();return b;}
function summary(){const s=d.settlement;for(const [rows,due,over,net] of [[s.receipts,'receivable','receiptOverpayments','netReceivable'],[s.payables,'payable','payoutOverpayments','netPayable']]){
 assert.equal(s[due],rows.filter(r=>r.balance>0).reduce((n,r)=>n+r.balance,0));assert.equal(s[over],-rows.filter(r=>r.balance<0).reduce((n,r)=>n+r.balance,0)||0);assert.equal(s[net],s[due]-s[over]);
}return s;}
try{
 const numeric=[-12.5,'-12.50','-0.01',0,'0.00','1000000.00',-20];
 check('Signed numeric cells round-trip without an apostrophe',parse(csv([numeric]))[0].every((v,i)=>Number(v)===Number(numeric[i])&&!v.startsWith("'")));
 const attacks=['=1+1','+SUM(1,2)','@SUM(1,2)','-1+2','-12.50*2','-1e2+3','-cmd|bad','\t=1+1','\r=1+1','-1\n=1+1'];
 check('Formula-like text remains escaped',parse(csv([attacks]))[0].every((v,i)=>v==="'"+attacks[i]));
 const text=['Renée, Jr.','O"Brien','Line one\nLine two','North | South','plain text'];
 check('Commas quotes Unicode newlines and pipes survive CSV serialization',JSON.stringify(parse(csv([text]))[0])===JSON.stringify(text));
 const empty={buyers:[],teams:[],sales:[],payments:[],disbursements:[],totals:{entitlements:[]}};
 const z=settlement(empty);check('Empty summary has zero debts credits and net balances',['receivable','receiptOverpayments','netReceivable','payable','payoutOverpayments','netPayable'].every(k=>z[k]===0));
 const creditOnly=settlement({...empty,buyers:[{id:'a',name:'Credit only'}],payments:[{buyerId:'a',amount:1}],disbursements:[{buyerId:'a',amount:2}]});
 check('Credit-only parties never produce negative remaining totals',creditOnly.receivable===0&&creditOnly.receiptOverpayments===1&&creditOnly.netReceivable===-1&&creditOnly.payable===0&&creditOnly.payoutOverpayments===2&&creditOnly.netPayable===-2);
 const login=await fetch(base+'/signin-with-chatgpt?return_to=%2Fadmin',{redirect:'manual'});cookie=login.headers.get('set-cookie').split(';')[0];
 await send('create_event',{name:'Batch B Settlement Review',course:'Isolated fictional fixture'});report.eventId=eventId;
 await send('flight_save',{name:'Championship',color:'#b79a59',ownPool:true});const flightId=d.flights[0].id;
 await send('team_import',{teams:['North / West','Lake / Field','Pine / Oak'].map(name=>({name,players:name.split(' / '),flightId}))});const [a,b,c]=d.teams.map(t=>t.id);
 await send('buyer_save',{name:'Paid Buyer',contact:'BATCH_B_PRIVATE_CONTACT',privateNotes:'BATCH_B_PRIVATE_NOTE'});const buyerA=d.buyers[0].id;
 await send('buyer_save',{name:'=1+1'});const buyerB=d.buyers.find(b=>b.id!==buyerA).id;
 await send('event_update',{...d.event,settings:{...d.event.settings,minBid:1,increment:1,deductionType:'none',deduction:0}});
 await send('payout_save',{poolId:flightId,percent:[5000,5000]});
 await send('status',{status:'LIVE'});
 for(const [teamId,amount,buyerId] of [[a,10001,buyerA],[b,20002,buyerA],[c,30003,buyerB]]){await send('bid',{teamId,amount});await send('sell',{teamId,amount,buyerId});}
 const saleA=d.sales.find(s=>s.teamId===a).id,saleB=d.sales.find(s=>s.teamId===b).id;
 const receipt={kind:'receipt',partyKind:'buyer',partyId:buyerA,occurredAt:'2026-09-14T13:00:00Z',method:'Check',note:'=SUM(1,2)'};
 const first=await send('settlement_record',{...receipt,amount:10001});
 check('Partial payment retains full unpaid collection total',summary().receivable===50005&&d.settlement.receiptOverpayments===0);
 await send('settlement_record',{...receipt,amount:20002});
 check('Fully paid buyer does not affect another buyer debt',summary().receivable===30003&&d.settlement.receiptOverpayments===0);
 await send('settlement_record',{...receipt,amount:1},400);check('Direct overpayment remains rejected',d.payments.length===2);
 await send('sale_edit',{id:saleA,buyerId:buyerA,amount:5001,notes:'Price correction after payment'});
 check('Price correction shows debt and overpayment separately',summary().receivable===30003&&d.settlement.receiptOverpayments===5000&&d.settlement.netReceivable===25003);
 const records=JSON.stringify(d.payments);
 await send('sale_edit',{id:saleB,buyerId:buyerB,amount:20002,notes:'Purchaser correction'});
 check('Purchaser correction retains receipt with its original buyer',summary().receivable===50005&&d.settlement.receiptOverpayments===25002&&JSON.stringify(d.payments)===records);
 await send('undo');check('Undo purchaser correction restores debt credit split without moving payments',summary().receivable===30003&&d.settlement.receiptOverpayments===5000&&JSON.stringify(d.payments)===records);
 await send('settlement_reverse',{kind:'receipt',id:first.recordId,note:'Receipt correction'});
 check('Receipt reversal reconciles positive balances and retains original',summary().receivable===35004&&d.settlement.receiptOverpayments===0&&d.payments.some(p=>p.id===first.recordId&&p.amount===10001)&&d.payments.some(p=>p.amount===-10001));
 await send('undo');check('Undo receipt reversal restores credit with a compensating entry',summary().receivable===30003&&d.settlement.receiptOverpayments===5000&&d.payments.length===4);
 await send('status',{status:'COMPLETED'});await send('results',{rows:[{teamId:a,finish:1},{teamId:b,finish:null},{teamId:c,finish:2}]});
 const payee=d.settlement.payables.find(p=>p.id===buyerA),receiptState=JSON.stringify(d.settlement.receipts);
 const payout=await send('settlement_record',{kind:'payout',partyKind:'buyer',partyId:buyerA,amount:payee.balance,occurredAt:'2026-09-14T13:10:00Z',method:'Other',note:'-1+2'});
 check('Recorded payout remains separate from purchase receipts',summary().payable===27503&&JSON.stringify(d.settlement.receipts)===receiptState);
 await send('payout_save',{poolId:flightId,percent:[2500,7500]});
 check('Reduced award cannot offset another payee unpaid award',summary().payable===41254&&d.settlement.payoutOverpayments===13751&&d.settlement.netPayable===27503);
 await send('settlement_reverse',{kind:'payout',id:payout.recordId,note:'Payout correction'});
 check('Payout reversal restores full outstanding awards',summary().payable===55006&&d.settlement.payoutOverpayments===0&&d.disbursements.some(p=>p.amount===-27503));
 await send('undo');check('Undo payout reversal restores separate overpayment',summary().payable===41254&&d.settlement.payoutOverpayments===13751&&d.disbursements.length===3&&JSON.stringify(d.settlement.receipts)===receiptState);
 const files={};
 for(const kind of ['auction','settlement','teams','payouts','ownership','payments','backup']){
  const r=await fetch(base+'/api/export?event='+eventId+'&kind='+kind,{headers:{cookie}});assert.equal(r.status,200);assert.match(r.headers.get('content-disposition'),/attachment/);const body=await r.text();
  if(kind==='backup'){const backup=JSON.parse(body);check('JSON backup preserves exact signed entries and summary',JSON.stringify(backup.data.payments)===JSON.stringify(d.payments)&&JSON.stringify(backup.data.disbursements)===JSON.stringify(d.disbursements)&&backup.data.settlement.receiptOverpayments===5000);continue;}
  fs.writeFileSync(out+'/'+kind+'.csv',body);const rows=parse(body);assert.ok(rows.length>1);assert.ok(rows.every(row=>row.length===rows[0].length));files[kind]=rows.slice(1).map(row=>Object.fromEntries(rows[0].map((name,i)=>[name,row[i]])));
  check(kind+' actual download parses and excludes private contact fields',!body.includes('BATCH_B_PRIVATE_'));
 }
 const sum=(rows,key)=>rows.reduce((n,r)=>n+cents(r[key]),0);
 check('Auction CSV ACTIVE amounts reconcile to pool',sum(files.auction.filter(r=>r['Sale Status']==='ACTIVE'),'Sale Price')===d.totals.gross);
 check('Settlement CSV keeps signed negative balances numeric',files.settlement.some(r=>cents(r['Remaining Balance'])===-5000)&&sum(files.settlement,'Remaining Balance')===d.settlement.netReceivable);
 check('CSV positive debts and credits independently reproduce collection summary',files.settlement.reduce((n,r)=>n+Math.max(0,cents(r['Remaining Balance'])),0)===30003&&files.settlement.reduce((n,r)=>n+Math.max(0,-cents(r['Remaining Balance'])),0)===5000);
 check('Payout CSV negative remaining due is numeric and awards reconcile',files.payouts.some(r=>cents(r['Party Remaining Due'])===-13751)&&sum(files.payouts,'Entitled Amount')===d.settlement.entitled);
 check('Receipt and payout reversals remain numeric in actual CSV',files.payments.some(r=>r.Direction==='Receipt'&&cents(r.Amount)===-10001)&&files.payments.some(r=>r.Direction==='Payout'&&cents(r.Amount)===-27503));
 check('Payment CSV reconciles each direction independently',sum(files.payments.filter(r=>r.Direction==='Receipt'),'Amount')===d.settlement.received&&sum(files.payments.filter(r=>r.Direction==='Payout'),'Amount')===d.settlement.disbursed);
 check('Actual export keeps malicious buyer and payment notes escaped',files.settlement.some(r=>r.Buyer==="'=1+1")&&files.payments.some(r=>r['Note / Reference']==="'=SUM(1,2)")&&files.payments.some(r=>r['Note / Reference']==="'-1+2"));
 check('Anonymous private export remains denied',(await fetch(base+'/api/export?event='+eventId+'&kind=payments')).status===403);
 const pub=await (await fetch(base+'/api/public?event='+eventId)).json();check('Public projection excludes settlement and payments',!('settlement'in pub)&&!('payments'in pub)&&!JSON.stringify(pub).includes('BATCH_B_PRIVATE_'));
 // Save only derived totals, not private entry payloads.
 report.summary=Object.fromEntries(Object.entries(d.settlement).filter(([k])=>!['receipts','payables'].includes(k)));
}catch(error){report.failure=String(error);process.exitCode=1;console.error(error);}
finally{report.passed=report.checks.length;report.failed=report.failure?1:0;fs.writeFileSync(out+'/checks.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,failed:report.failed,eventId}));}
