// Batch A: real local D1 transaction/replay probes. Never targets the review store.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {eventPath, shareLinks} from '../lib/sharing.ts';
const base='http://localhost:5174',out='docs/batch-a-evidence';
fs.mkdirSync(out,{recursive:true});
const report={at:new Date().toISOString(),checks:[],fixtures:{}};
const login=await fetch(base+'/signin-with-chatgpt?return_to=%2Fadmin',{redirect:'manual'}),cookie=login.headers.get('set-cookie').split(';')[0];
let eventId,d;
const check=(name,value)=>{assert.ok(value,name);report.checks.push({name,status:'PASS'});console.log('PASS '+name);};
async function read(){const r=await fetch(base+'/api/admin'+(eventId?'?event='+eventId:''),{headers:{cookie}});assert.equal(r.status,200);const b=await r.json();d=b.data;return b;}
async function post(action,payload={},extra={}){const requestId=extra.requestId||crypto.randomUUID();const r=await fetch(base+'/api/admin',{method:'POST',headers:{cookie,origin:base,'content-type':'application/json'},body:JSON.stringify({action,payload,eventId,revision:d?.event.revision,...extra,requestId})});return {status:r.status,body:await r.json(),requestId};}
async function send(action,payload={},extra={}){const r=await post(action,payload,extra);assert.equal(r.status,200,JSON.stringify(r));if(r.body.eventId)eventId=r.body.eventId;await read();return r;}
async function has(email){return (await read()).operators.some(o=>o.email===email);}
async function audit(requestId){return (await read()).audit.filter(a=>a.id===requestId);}
function sql(command){return execFileSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.sites-runtime/audit-checkout/.wrangler/state','--command',command],{encoding:'utf8',stdio:['ignore','pipe','pipe']});}
const emails={normal:'batch-a-normal@sites.test',race:'batch-a-race@sites.test',auditFail:'batch-a-audit-fail@sites.test',insertFail:'batch-a-insert-fail@sites.test',removeFail:'batch-a-remove-fail@sites.test'};
const triggers=['batch_a_audit_failure','batch_a_insert_failure','batch_a_remove_failure'];
try{
 for(const name of ['Batch A Alpha','Batch A Beta']){
  await send('create_event',{name,course:'Isolated Batch A review'});await send('flight_save',{name:'Championship',color:'#b79a59',ownPool:true});await send('team_save',{name:name+' Team',players:['Fictional North','Fictional South'],flightId:d.flights[0].id});report.fixtures[name]=eventId;
 }
 const invalid=await post('operator_add',{email:emails.normal},{eventId:crypto.randomUUID()});
 check('Invalid event grants no access or audit',invalid.status===400&&!await has(emails.normal)&&(await audit(invalid.requestId)).length===0);
 const grant=await send('operator_add',{email:emails.normal.toUpperCase()});
 check('Successful grant normalizes email and commits audit',await has(emails.normal)&&(await audit(grant.requestId)).length===1);
 const revision=d.event.revision;
 const repeat=await send('operator_add',{email:emails.normal},{requestId:grant.requestId});
 check('Sequential replay returns duplicate and one audit without changing auction revision',repeat.body.duplicate&&(await audit(grant.requestId)).length===1&&d.event.revision===revision);
 const badPayload=await post('operator_add',{email:'batch-a-other@sites.test'},{requestId:grant.requestId});
 check('Request ID reused for a different email is rejected',badPayload.status===409&&!await has('batch-a-other@sites.test'));
 const badEvent=await post('operator_add',{email:emails.normal},{requestId:grant.requestId,eventId:report.fixtures['Batch A Alpha']});
 check('Request ID reused for a different event is rejected',badEvent.status===409);
 const badAction=await post('operator_remove',{email:emails.normal},{requestId:grant.requestId});
 check('Request ID reused for another action cannot revoke access',badAction.status===409&&await has(emails.normal));
 const revoke=await send('operator_remove',{email:emails.normal});
 await send('operator_add',{email:emails.normal},{requestId:grant.requestId});
 check('Replaying old grant after revocation does not restore access',!await has(emails.normal));
 await send('operator_add',{email:emails.normal});
 await send('operator_remove',{email:emails.normal},{requestId:revoke.requestId});
 check('Replaying old revoke after a new grant does not revoke again',await has(emails.normal));
 const missingRemove=await post('operator_remove',{email:emails.normal},{eventId:crypto.randomUUID()});
 check('Invalid event revokes no access',missingRemove.status===400&&await has(emails.normal));
 for(const action of ['operator_add','operator_remove']){
  const requestId=crypto.randomUUID(),results=await Promise.all(Array.from({length:8},()=>post(action,{email:emails.race},{requestId})));
  check('Eight concurrent '+action+' retries commit one logical change',results.every(r=>r.status===200)&&results.filter(r=>!r.body.duplicate).length===1&&(await audit(requestId)).length===1&&await has(emails.race)===(action==='operator_add'));
 }
 const noContext=await send('operator_add',{email:'batch-a-no-context@sites.test'},{eventId:undefined});
 check('Omitted event uses an existing event for durable audit',(await audit(noContext.requestId)).length===1);
 const noContextRetry=await send('operator_add',{email:'batch-a-no-context@sites.test'},{eventId:undefined,requestId:noContext.requestId});
 check('Omitted-event access replay is idempotent',noContextRetry.body.duplicate);
 sql("CREATE TRIGGER batch_a_audit_failure BEFORE INSERT ON audit WHEN NEW.action LIKE '%batch-a-audit-fail@sites.test' BEGIN SELECT RAISE(ABORT,'batch_a_audit_failure'); END");
 const auditFail=await post('operator_add',{email:emails.auditFail});
 check('Forced audit insert failure leaves access and audit unchanged',auditFail.status>=400&&!await has(emails.auditFail)&&(await audit(auditFail.requestId)).length===0);
 sql("CREATE TRIGGER batch_a_insert_failure BEFORE INSERT ON operators WHEN NEW.email='batch-a-insert-fail@sites.test' BEGIN SELECT RAISE(ABORT,'batch_a_insert_failure'); END");
 const insertFail=await post('operator_add',{email:emails.insertFail});
 check('Forced allowlist insert failure rolls back the preceding audit',insertFail.status>=400&&!await has(emails.insertFail)&&(await audit(insertFail.requestId)).length===0);
 await send('operator_add',{email:emails.removeFail});
 sql("CREATE TRIGGER batch_a_remove_failure BEFORE DELETE ON operators WHEN OLD.email='batch-a-remove-fail@sites.test' BEGIN SELECT RAISE(ABORT,'batch_a_remove_failure'); END");
 const removeFail=await post('operator_remove',{email:emails.removeFail});
 check('Forced revoke failure retains access and rolls back its audit',removeFail.status>=400&&await has(emails.removeFail)&&(await audit(removeFail.requestId)).length===0);
 const redirect=await fetch(base+eventPath('/admin',eventId),{redirect:'manual'});
 const target=new URL(redirect.headers.get('location'),base);
 check('Anonymous admin sign-in retains requested event',redirect.status===307&&target.searchParams.get('return_to')===eventPath('/admin',eventId));
 const special='event / + ? & #';
 check('All event routes encode the identifier safely',['/','/admin','/tv'].every(path=>new URL(eventPath(path,special),base).searchParams.get('event')===special));
 const links=shareLinks(base,eventId);
 check('QR/share URLs agree with public and TV navigation',links.board===base+eventPath('/',eventId)&&links.tv===base+eventPath('/tv',eventId));
 check('Public remains anonymous and private admin data remains protected',(await fetch(base+'/api/public?event='+eventId)).status===200&&(await fetch(base+'/api/admin?event='+eventId)).status===403);
}catch(error){report.failure=String(error);process.exitCode=1;console.error(error);}
finally{
 for(const trigger of triggers)try{sql('DROP TRIGGER IF EXISTS '+trigger);}catch(error){report.cleanupError=String(error);process.exitCode=1;}
 for(const email of [...Object.values(emails),'batch-a-no-context@sites.test','batch-a-other@sites.test'])try{if(await has(email))await send('operator_remove',{email});}catch(error){report.cleanupError=String(error);process.exitCode=1;}
 report.passed=report.checks.length;report.failed=report.failure?1:0;
 fs.writeFileSync(out+'/api.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,failed:report.failed,fixtures:report.fixtures,cleanupError:report.cleanupError}));
}
