// Role boundary integration on an isolated portable database, using synthetic sessions.
import assert from 'node:assert/strict';
import {mkdtempSync,cpSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createServer} from 'node:net';
import {spawn,spawnSync} from 'node:child_process';
const dir=mkdtempSync(join(tmpdir(),'calcutta-s1-roles-'));
const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
const base='http://127.0.0.1:'+port;
Object.assign(process.env,{DATABASE_PATH:join(dir,'roles.sqlite'),ADMIN_EMAILS:'s1-owner@example.test',PUBLIC_ORIGIN:base,CALCUTTA_TEST_URL:base});
const migrated=spawnSync(process.execPath,['portable/migrate.mjs'],{encoding:'utf8'});assert.equal(migrated.status,0,migrated.stderr);
const {getDatabase}=await import('../portable/runtime.mjs');
const {createSession}=await import('../portable/sessions.mjs');
const cookies={};
for(const role of ['owner','operator','outsider'])cookies[role]='calcutta_session='+createSession({kind:'user',user:{userId:'s1-'+role,email:`s1-${role}@example.test`,displayName:'S1 '+role,fullName:'S1 '+role}});
getDatabase().connection.prepare('INSERT INTO operators(email,addedBy,createdAt) VALUES (?,?,?)').run('s1-operator@example.test','s1-owner@example.test',new Date().toISOString());getDatabase().close();
const source=resolve('.sites-runtime/portable-build/.next/standalone/.sites-runtime/portable-build');
// Copy only to this harness's own directory; never modify a running build or dev tree.
cpSync(source,join(dir,'app'),{recursive:true});
cpSync('.sites-runtime/portable-build/.next/static',join(dir,'app/.next/static'),{recursive:true});
cpSync('public',join(dir,'app/public'),{recursive:true});
// Next standalone dependencies live above the nested standalone application.
const dependencies=resolve('.sites-runtime/portable-build/.next/standalone/node_modules');
cpSync(dependencies,join(dir,'node_modules'),{recursive:true});
const server=spawn(process.execPath,[join(dir,'app/server.js')],{cwd:dir,env:{...process.env,PORT:String(port),HOSTNAME:'127.0.0.1'},stdio:['ignore','pipe','pipe']});let log='';server.stdout.on('data',x=>log+=x);server.stderr.on('data',x=>log+=x);
try{
 let ready=false;for(let i=0;i<60;i++){if(server.exitCode!==null)throw Error(log);try{if((await fetch(base+'/api/public')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert.ok(ready,log);
 const demo=await fetch(base+'/api/admin',{method:'POST',headers:{cookie:cookies.owner,origin:base,'content-type':'application/json'},body:JSON.stringify({action:'load_demo',payload:{},requestId:crypto.randomUUID()})});assert.equal(demo.status,200,await demo.text());
 for(const role of ['owner','operator','outsider']){
  const child=spawn(process.execPath,['tests/s1-roles.mjs',role],{env:{...process.env,S1_SESSION_COOKIE:cookies[role]},stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);
  const code=await new Promise(r=>child.once('exit',r));process.stdout.write(output);assert.equal(code,0,role+' role validation');
 }
}finally{server.kill();await new Promise(r=>server.exitCode!==null?r():server.once('exit',r));rmSync(dir,{recursive:true,force:true});}
