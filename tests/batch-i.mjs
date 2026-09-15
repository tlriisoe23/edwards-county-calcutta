// Batch I: server-side rules for D-CAL-2 (minimum bid / house deduction), D-CAL-4 (Access messages, no audit rows),
// plus the Batch D import fixtures and the API-level Batch A access checks rerun. Local test server only; writes go to
// one disposable synthetic event and to operator rows the script revokes again.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {parsePaste,csv,defaultSettings} from '../lib/model.ts';
const base=process.env.CALCUTTA_TEST_URL||'http://localhost:5173',out=process.env.BATCH_I_OUT||'docs/batch-i-evidence';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Batch I writes are restricted to a local test server.');
fs.mkdirSync(out,{recursive:true});
const report={at:new Date().toISOString(),base,checks:[],fixtures:{},state:{}};
const check=(name,value)=>{assert.ok(value,name);report.checks.push({name,status:'PASS'});console.log('PASS '+name);};
const equal=(name,a,b)=>{assert.deepEqual(a,b,name);check(name,true);};
const {testSession}=await import('./test-session.mjs'),cookie=await testSession(base);
let eventId,d;
async function read(id=eventId){const r=await fetch(base+'/api/admin'+(id?'?event='+id:''),{headers:{cookie}});assert.equal(r.status,200);const b=await r.json();if(id===eventId)d=b.data;return b;}
async function post(action,payload={},extra={}){const requestId=extra.requestId||crypto.randomUUID();const r=await fetch(base+'/api/admin',{method:'POST',headers:{cookie,origin:base,'content-type':'application/json'},body:JSON.stringify({action,payload,eventId,revision:d?.event.revision,...extra,requestId})});return {status:r.status,body:await r.json(),requestId};}
async function send(action,payload={},extra={}){const r=await post(action,payload,extra);assert.equal(r.status,200,JSON.stringify(r.body));if(r.body.eventId)eventId=r.body.eventId;await read();return r;}
const has=async email=>(await read()).operators.some(o=>o.email===email);
const audit=async requestId=>(await read()).audit.filter(a=>a.id===requestId);
const auditFor=async action=>(await read()).audit.filter(a=>a.action===action).length;
const eventPayload=()=>({name:d.event.name,calcuttaName:d.event.calcuttaName,course:d.event.course,dates:d.event.dates,auctionAt:d.event.auctionAt,description:d.event.description,rules:d.event.rules,currency:d.event.currency});
async function rules(settings){const revision=d.event.revision,r=await post('event_update',{...eventPayload(),settings:{...d.event.settings,...settings}});await read();return {...r,revision,unchanged:d.event.revision===revision};}
const owner='seedy@sites.test',operator='batch-i-operator@sites.test',race='batch-i-race@sites.test';
try{
 await send('create_event',{name:'BATCH-I Server rules · 2026-09-15',course:'Synthetic fixture (disposable)'});report.fixtures.event=eventId;
 await send('flight_save',{name:'Flight A',color:'#b79a59',ownPool:true});const flightId=d.flights[0].id;
 report.state.settingsBefore={minBid:d.event.settings.minBid,deductionType:d.event.settings.deductionType,deduction:d.event.settings.deduction};

 // ---- D-CAL-2: minimum starting bid ----
 const withoutMinBid={...d.event.settings};delete withoutMinBid.minBid;
 let r=await post('event_update',{...eventPayload(),settings:withoutMinBid});await read();
 check('Blank (omitted) minimum bid is rejected and nothing is saved',r.status===400&&d.event.settings.minBid===10000);
 r=await rules({minBid:null});check('Null minimum bid is rejected',r.status===400&&r.unchanged);
 r=await rules({minBid:0});check('$0.00 minimum bid is rejected with the decision message',r.status===400&&/at least \$1\.00/.test(r.body.error)&&r.unchanged&&d.event.settings.minBid===10000);
 r=await rules({minBid:99});check('$0.99 minimum bid is rejected with the decision message',r.status===400&&/Enter a minimum starting bid of at least \$1\.00/.test(r.body.error)&&r.unchanged);
 r=await rules({minBid:100});check('$1.00 minimum bid is accepted',r.status===200&&d.event.settings.minBid===100);
 r=await rules({minBid:10000});check('$100.00 minimum bid is accepted (restored)',r.status===200&&d.event.settings.minBid===10000);
 // ---- D-CAL-2: house deduction ----
 r=await rules({deductionType:'percent',deduction:0});check('Percent deduction of 0 is rejected',r.status===400&&/deduction greater than 0/.test(r.body.error)&&r.unchanged);
 const withoutDeduction={...d.event.settings,deductionType:'percent'};delete withoutDeduction.deduction;
 r=await post('event_update',{...eventPayload(),settings:withoutDeduction});await read();check('Blank (omitted) percent deduction is rejected',r.status===400);
 r=await rules({deductionType:'fixed',deduction:0});check('Fixed deduction of 0 is rejected',r.status===400&&/deduction greater than 0/.test(r.body.error)&&r.unchanged);
 r=await rules({deductionType:'percent',deduction:10001});check('Percent deduction above 100% is still rejected',r.status===400&&/100%/.test(r.body.error));
 r=await rules({deductionType:'percent',deduction:1});check('Percent deduction of 0.01% is accepted',r.status===200&&d.event.settings.deduction===1);
 r=await rules({deductionType:'fixed',deduction:1});check('Fixed deduction of one cent is accepted (acceptance suite case)',r.status===200&&d.event.settings.deduction===1);
 r=await rules({deductionType:'none',deduction:0});check('Deduction type None with amount 0 is accepted (the only "no house cut")',r.status===200&&d.event.settings.deductionType==='none');
 r=await rules({deductionType:'none',deduction:1000});check('Deduction type None ignores the stored amount',r.status===200);
 r=await rules({...defaultSettings});check('New-event defaults still save (minBid $100, 10% deduction)',r.status===200&&d.event.settings.minBid===10000&&d.event.settings.deduction===1000);
 report.state.settingsAfter={minBid:d.event.settings.minBid,deductionType:d.event.settings.deductionType,deduction:d.event.settings.deduction};

 // ---- D-CAL-4: Access ----
 const ownersBefore=await auditFor('operator_add '+owner);
 r=await post('operator_add',{email:owner});await read();
 check('Granting an owner email says "already an owner" and writes no operator row',r.status===400&&/already an owner/.test(r.body.error)&&!await has(owner));
 check('Owner grant writes no audit entry',(await audit(r.requestId)).length===0&&await auditFor('operator_add '+owner)===ownersBefore);
 r=await post('operator_add',{email:owner.toUpperCase()});check('Owner email is matched case-insensitively',r.status===400&&/already an owner/.test(r.body.error)&&!await has(owner));
 equal('GET lists the owner allowlist read-only for the owner',(await read()).owners,[owner]);
 const grant=await send('operator_add',{email:operator.toUpperCase()});
 check('Successful grant normalizes email and commits audit (Batch A)',await has(operator)&&(await audit(grant.requestId)).length===1);
 const revision=d.event.revision;
 const repeat=await send('operator_add',{email:operator},{requestId:grant.requestId});
 check('Sequential replay returns duplicate and one audit without changing auction revision (Batch A)',repeat.body.duplicate&&(await audit(grant.requestId)).length===1&&d.event.revision===revision);
 const dupBefore=await auditFor('operator_add '+operator);
 r=await post('operator_add',{email:operator.toUpperCase()});await read();
 check('Granting an existing operator (case-insensitive) says "already has access"',r.status===400&&/already has access/.test(r.body.error));
 check('Duplicate grant writes no audit entry and keeps one row',(await audit(r.requestId)).length===0&&await auditFor('operator_add '+operator)===dupBefore&&(await read()).operators.filter(o=>o.email===operator).length===1);
 check('Owner is never listed among operators',!(await read()).operators.some(o=>o.email===owner));
 const badPayload=await post('operator_add',{email:'batch-i-other@sites.test'},{requestId:grant.requestId});
 check('Request ID reused for a different email is rejected (Batch A)',badPayload.status===409&&!await has('batch-i-other@sites.test'));
 const revoke=await send('operator_remove',{email:operator});
 await send('operator_add',{email:operator},{requestId:grant.requestId});
 check('Replaying old grant after revocation does not restore access (Batch A)',!await has(operator));
 await send('operator_add',{email:operator});
 await send('operator_remove',{email:operator},{requestId:revoke.requestId});
 check('Replaying old revoke after a new grant does not revoke again (Batch A)',await has(operator));
 for(const action of ['operator_add','operator_remove']){
  const requestId=crypto.randomUUID(),results=await Promise.all(Array.from({length:8},()=>post(action,{email:race},{requestId})));
  check('Eight concurrent '+action+' retries commit one logical change (Batch A)',results.every(x=>x.status===200)&&results.filter(x=>!x.body.duplicate).length===1&&(await audit(requestId)).length===1&&await has(race)===(action==='operator_add'));
 }
 await send('operator_remove',{email:operator});check('Test operator revoked',!await has(operator));

 // ---- Batch D import fixtures rerun ----
 const quote=value=>'"'+value.replaceAll('"','""')+'"';
 const rows=[['North | South','Renée, Jr.','O"Brien','Flight A','8.4'],['East\tWest','José','Zoë','Flight A','2.1'],['River\nBend','One','Two','Flight A','']];
 for(const delimiter of [',','|','\t']){
  equal('Quoted mixed content in '+JSON.stringify(delimiter)+' format (Batch D)',parsePaste([['Team Name','Player 1','Player 2','Flight','Handicap'],...rows].map(row=>row.map(quote).join(delimiter)).join('\r\n')),rows);
  equal('Headerless quoted '+JSON.stringify(delimiter)+' format (Batch D)',parsePaste(rows.map(row=>row.map(quote).join(delimiter)).join('\n')),rows);
 }
 equal('Leading blank lines and BOM header (Batch D)',parsePaste('﻿\r\n\r\nTeam Name,Player 1,Player 2,Flight\r\n"North | South",One,Two,Flight A'),[['North | South','One','Two','Flight A']]);
 equal('Pipe quick paste stays compatible (Batch D)',parsePaste('Smith / Jones | John Smith | Mike Jones | Flight A | 8.4'),[['Smith / Jones','John Smith','Mike Jones','Flight A','8.4']]);
 equal('Roster serializer round trip (Batch D)',parsePaste(csv([['Team Name','Player 1','Player 2','Flight','Handicap'],...rows])),rows);
 assert.throws(()=>parsePaste('"Unclosed | team,One,Two,Flight A'),/Close the quoted field/);check('Unclosed quoted field is rejected (Batch D)',true);
 const source=csv([['Team Name','Player 1','Player 2','Flight','Handicap'],...Array.from({length:100},(_,i)=>['Team '+i+' | North','Renée, '+i,'O"Brien','Flight A','8.4'])]);
 const teams=parsePaste(source).map(x=>({name:x[0],players:[x[1],x[2]],flightId:x[3]==='Flight A'?flightId:'',handicap:Number(x[4])}));
 await send('team_import',{teams});equal('100-team import preserves all names and player mappings (Batch D)',d.teams.map(t=>[t.name,...t.players]),teams.map(t=>[t.name,...t.players]));
 const rev=d.event.revision,before=JSON.stringify(d.teams);
 const malformed=await post('team_import',{teams:[{name:'Valid first row',players:['One'],flightId},{name:'Invalid second row',players:[],flightId}]});
 await read();check('Malformed batch saves no rows or revision (Batch D)',malformed.status===400&&d.event.revision===rev&&JSON.stringify(d.teams)===before);
 const wrongFlight=await post('team_import',{teams:[{name:'Valid first row',players:['One'],flightId},{name:'Unknown flight',players:['Two'],flightId:crypto.randomUUID()}]});
 await read();check('Unknown flight saves no partial import (Batch D)',wrongFlight.status===400&&d.event.revision===rev&&JSON.stringify(d.teams)===before);
}catch(error){report.failure=String(error);process.exitCode=1;console.error(error);}
finally{
 for(const email of [operator,race,owner,'batch-i-other@sites.test'])try{if(await has(email))await send('operator_remove',{email});}catch(error){report.cleanupError=String(error);process.exitCode=1;}
 report.operatorsLeft=(await read()).operators.map(o=>o.email);
 report.passed=report.checks.length;report.failed=report.failure?1:0;
 fs.writeFileSync(out+'/checks.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,failed:report.failed,fixtures:report.fixtures,operatorsLeft:report.operatorsLeft,cleanupError:report.cleanupError}));
}
