// Audit-only tests. Run from the project root; does not write application data.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {compute, splitCents, defaultSettings, csv, parsePaste} from '../lib/model.ts';
const seed=0xEC6C2026;
let state=seed;
function next(max){state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)%max;}
function weights(count){const cuts=[0,10000,...Array.from({length:count-1},()=>next(10001))].sort((a,b)=>a-b);return cuts.slice(1).map((n,i)=>n-cuts[i]);}
function allocate(total,parts,denominator=10000,keys=parts.map((_,i)=>String(i).padStart(4,'0'))){
 const den=BigInt(denominator||1),n=BigInt(total),out=parts.map(w=>Number(n*BigInt(w)/den));
 const ranks=parts.map((w,i)=>({i,rem:n*BigInt(w)%den})).sort((a,b)=>a.rem===b.rem?keys[a.i].localeCompare(keys[b.i]):a.rem>b.rem?-1:1);
 for(let left=total-out.reduce((a,b)=>a+b,0),i=0;i<left;i++)out[ranks[i].i]++;
 return out;
}
const report={seed:'0x'+seed.toString(16),method:'xorshift32; independent BigInt largest-remainder oracle',cases:1000,passed:0,failed:0,assertions:0,failures:[],observations:[]};
function equal(actual,expected){assert.deepEqual(actual,expected);report.assertions++;}
for(let c=0;c<report.cases;c++){
 try{
  const n=2+next(9),w=weights(n),total=c<4?[0,1,3,100000000][c]:next(2000000001);
  equal(splitCents(total,w),allocate(total,w));
  const mode=['separate','combined','custom'][c%3],deductionType=['none','percent','fixed'][Math.floor(c/3)%3];
  const data={event:{settings:{...defaultSettings,poolMode:mode,deductionType,deduction:deductionType==='percent'?next(10001):next(100000001)}},flights:[],teams:[],sales:[],ownership:[],payoutRules:[]};
  const poolIds=[],poolPositions=new Map();
  for(let f=0;f<4;f++){
   const flight={id:'f'+f,name:'Flight '+f,ownPool:f<2};data.flights.push(flight);
   const pool=mode==='combined'||mode==='custom'&&!flight.ownPool?'combined':flight.id;
   if(!poolIds.includes(pool)){poolIds.push(pool);weights(n).forEach((percent,i)=>data.payoutRules.push({poolId:pool,place:i+1,percent}));}
   for(let t=0;t<10;t++){
    const id='t'+f+'-'+t,sid='s'+id,finish=(poolPositions.get(pool)||0)+1;poolPositions.set(pool,finish);
    const amount=c===0?1:1+next(100000000),owner=next(10001);
    data.teams.push({id,flightId:flight.id,status:'SOLD',name:id,finish});
    data.sales.push({id:sid,teamId:id,buyerId:'buyer',amount,status:'ACTIVE'});
    data.ownership.push({saleId:sid,kind:'buyer',party:'Buyer',percent:owner,status:'Completed'},{saleId:sid,kind:'team',party:id,percent:10000-owner,status:'Completed'});
   }
  }
  const result=compute(data),gross=data.sales.reduce((s,r)=>s+r.amount,0),setting=data.event.settings;
  const deduction=Math.min(gross,deductionType==='none'?0:deductionType==='fixed'?setting.deduction:Number((BigInt(gross)*BigInt(setting.deduction)+5000n)/10000n));
  equal(result.gross,gross);equal(result.deduction,deduction);equal(result.net,gross-deduction);
  equal(result.pools.map(p=>p.deduction),allocate(deduction,result.pools.map(p=>p.gross),gross,result.pools.map(p=>p.id)));
  equal(result.pools.reduce((s,p)=>s+p.net,0),result.net);
  for(const p of result.pools){equal(p.payouts.map(r=>r.amount),allocate(p.net,p.payouts.map(r=>r.percent)));}
  for(const s of data.sales){const rows=result.entitlements.filter(r=>r.saleId===s.id);equal(rows.map(r=>r.amount),allocate(rows[0].prize,rows.map(r=>r.percent)));}
  equal(result.entitlements.reduce((s,r)=>s+r.amount,0),result.net);
  assert(result.entitlements.every(r=>Number.isSafeInteger(r.amount)&&r.amount>=0));report.assertions++;
  report.passed++;
 }catch(error){report.failed++;report.failures.push({case:c,error:error.message});}
}
// Independent observations of import/export edge cases, kept separate from money properties.
for(const [name,fn] of [
 ['Quoted pipe in a comma CSV retains all columns',()=>equal(parsePaste(csv([['Team Name','Player 1','Player 2','Flight'],['North | South','Renée, Jr.','O\"Brien','Flight A']]))[0],['North | South','Renée, Jr.','O\"Brien','Flight A'])],
 ['Negative financial CSV cells remain numeric',()=>equal(Number(parsePaste(csv([['Amount'],['-12.50']]))[1][0]),-12.5)],
 ['Quoted commas, quotes and unicode survive CSV',()=>equal(parsePaste(csv([['Team Name','Player 1'],['Renée, Jr.','O\"Brien']]))[0],['Renée, Jr.','O\"Brien'])]
]){try{fn();report.observations.push({name,status:'PASS'});}catch(e){report.observations.push({name,status:'FAIL',evidence:e.message});}}
fs.mkdirSync('docs/audit-evidence',{recursive:true});fs.writeFileSync('docs/audit-evidence/math.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report));process.exitCode=report.failed||report.observations.some(r=>r.status==='FAIL')?1:0;
