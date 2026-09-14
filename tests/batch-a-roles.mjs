// Local mock-role probe. Run prepare, restart ONLY scratch :5174, verify,
// stop scratch, restore, then restart. Never changes the review or hosted config.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const base='http://localhost:5174', scratch='.sites-runtime/audit-checkout';
const statePath='.sites-runtime/batch-a-role-state.json',envPath=scratch+'/.env';
const email='seedy@sites.test',target='batch-a-forbidden@sites.test';
const phase=process.argv[2],out='docs/batch-a-evidence/roles.json';
function sql(command){return execFileSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to',scratch+'/.wrangler/state','--command',command],{encoding:'utf8',stdio:['ignore','pipe','pipe']});}
const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
if(phase==='restore'){
 const state=JSON.parse(fs.readFileSync(statePath,'utf8'));
 fs.writeFileSync(envPath,Buffer.from(state.env,'base64'));
 sql('DELETE FROM operators WHERE email='+quote(email));
 if(state.operator)sql('INSERT INTO operators(email,addedBy,createdAt) VALUES ('+[state.operator.email,state.operator.addedBy,state.operator.createdAt].map(quote).join(',')+')');
 const report=JSON.parse(fs.readFileSync(out,'utf8'));report.cleanup='Original isolated owner configuration and mock operator row restored';fs.writeFileSync(out,JSON.stringify(report,null,2));
 fs.unlinkSync(statePath);console.log(report.cleanup);
}else if(phase==='prepare'||phase==='verify'){
 const login=await fetch(base+'/signin-with-chatgpt?return_to=%2Fadmin',{redirect:'manual'}),cookie=login.headers.get('set-cookie').split(';')[0];
 const read=()=>fetch(base+'/api/admin',{headers:{cookie}});
 const response=await read();assert.equal(response.status,200);const data=await response.json();
 const post=(action,payload={})=>fetch(base+'/api/admin',{method:'POST',headers:{cookie,origin:base,'content-type':'application/json'},body:JSON.stringify({action,payload,eventId:data.data.event.id,revision:data.data.event.revision,requestId:crypto.randomUUID()})});
 if(phase==='prepare'){
  assert.equal(data.user.email,email);assert.equal(data.user.owner,true);assert.ok(!fs.existsSync(statePath),'Restore an earlier role probe first');
  fs.writeFileSync(statePath,JSON.stringify({env:fs.readFileSync(envPath).toString('base64'),operator:data.operators.find(o=>o.email===email)||null}));
  assert.equal((await post('operator_add',{email})).status,200);
  fs.writeFileSync(envPath,'ADMIN_EMAILS=batch-a-owner@sites.test\n');
  console.log('Prepared isolated mock operator; restart only scratch :5174 before verify.');
 }else{
  assert.ok(fs.existsSync(statePath),'Run prepare first');
  const report={at:new Date().toISOString(),identity:'Local Sites mock only',checks:[]};
  const check=(name,value)=>{assert.ok(value,name);report.checks.push({name,status:'PASS'});console.log('PASS '+name);};
  try{
   check('Allowlisted local user can read admin without owner privileges',data.user.email===email&&data.user.owner===false&&data.operators.length===0);
   for(const action of ['operator_add','operator_remove']){
    const denied=await post(action,{email:target}),body=await denied.json();
    check('Non-owner cannot '+action,denied.status===400&&body.error==='Only the owner can manage operator access.');
   }
   // Simulate removal between requests without changing this session cookie.
   // Owner API transactional removal was exercised separately by batch-a-api.mjs.
   sql('DELETE FROM operators WHERE email='+quote(email));
   check('Existing signed-in session loses admin reads on the next request',(await read()).status===403);
   check('Revoked session cannot submit event writes',(await post('event_status',{status:'READY'})).status===403);
   check('Revoked session cannot download private exports',(await fetch(base+'/api/export?kind=backup&event='+data.data.event.id,{headers:{cookie}})).status===403);
   check('Anonymous public board remains available after revocation',(await fetch(base+'/api/public?event='+data.data.event.id)).status===200);
  }catch(error){report.failure=String(error);process.exitCode=1;console.error(error);}
  finally{report.passed=report.checks.length;report.failed=report.failure?1:0;fs.writeFileSync(out,JSON.stringify(report,null,2));console.log('Stop scratch and run restore even if this verification failed.');}
 }
}else throw Error('Use prepare, verify or restore; see file header.');
