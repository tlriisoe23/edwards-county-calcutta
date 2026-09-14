// Batch D: quoted delimiters and durable creation retries. Scratch-only writes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {parsePaste,csv} from '../lib/model.ts';
const base='http://localhost:5174',out=process.env.BATCH_D_OUT||'docs/batch-d-evidence';
fs.mkdirSync(out,{recursive:true});
const report={at:new Date().toISOString(),checks:[],fixtures:{}};
const check=(name,value)=>{assert.ok(value,name);report.checks.push({name,status:'PASS'});console.log('PASS '+name);};
const equal=(name,a,b)=>{assert.deepEqual(a,b,name);check(name,true);};
const quote=value=>'"'+value.replaceAll('"','""')+'"';
const rows=[['North | South','Renée, Jr.','O"Brien','Flight A','8.4'],['East\tWest','José','Zoë','Flight A','2.1'],['River\nBend','One','Two','Flight A','']];
for(const delimiter of [',','|','\t']){
 const source=[['Team Name','Player 1','Player 2','Flight','Handicap'],...rows].map(row=>row.map(quote).join(delimiter)).join('\r\n');
 equal('Quoted mixed content in '+JSON.stringify(delimiter)+' format',parsePaste(source),rows);
 equal('Headerless quoted '+JSON.stringify(delimiter)+' format',parsePaste(rows.map(row=>row.map(quote).join(delimiter)).join('\n')),rows);
}
equal('Leading blank lines and BOM header',parsePaste('\ufeff\r\n\r\nTeam Name,Player 1,Player 2,Flight\r\n"North | South",One,Two,Flight A'),[['North | South','One','Two','Flight A']]);
equal('Header chooses comma even with unquoted pipe in later data',parsePaste('Team Name,Player 1,Player 2,Flight\nNorth | South,One,Two,Flight A'),[['North | South','One','Two','Flight A']]);
equal('Pipe quick paste stays compatible',parsePaste('Smith / Jones | John Smith | Mike Jones | Flight A | 8.4'),[['Smith / Jones','John Smith','Mike Jones','Flight A','8.4']]);
equal('Tab spreadsheet paste stays compatible',parsePaste('Smith / Jones\tJohn Smith\tMike Jones\tFlight A\t8.4'),[['Smith / Jones','John Smith','Mike Jones','Flight A','8.4']]);
equal('Single-column signed amounts',parsePaste('Amount\r\n-12.50\r\n0.00'),[['Amount'],['-12.50'],['0.00']]);
equal('Roster serializer round trip',parsePaste(csv([['Team Name','Player 1','Player 2','Flight','Handicap'],...rows])),rows);
assert.throws(()=>parsePaste('"Unclosed | team,One,Two,Flight A'),/Close the quoted field/);check('Unclosed quoted field is rejected',true);

const login=await fetch(base+'/signin-with-chatgpt?return_to=%2Fadmin',{redirect:'manual'}),cookie=login.headers.get('set-cookie').split(';')[0];
let eventId,d;
async function read(id=eventId){const r=await fetch(base+'/api/admin'+(id?'?event='+id:''),{headers:{cookie}});assert.equal(r.status,200);const b=await r.json();if(id===eventId)d=b.data;return b;}
async function post(action,payload={},extra={}){const r=await fetch(base+'/api/admin',{method:'POST',headers:{cookie,origin:base,'content-type':'application/json'},body:JSON.stringify({action,payload,eventId,revision:d?.event.revision,requestId:crypto.randomUUID(),...extra})});return {status:r.status,body:await r.json()};}
async function send(action,payload={},extra={}){const r=await post(action,payload,extra);assert.equal(r.status,200,JSON.stringify(r));if(r.body.eventId)eventId=r.body.eventId;await read();return r.body;}
const count=async()=>(await read()).events.length;
const sql=command=>JSON.parse(execFileSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.sites-runtime/audit-checkout/.wrangler/state','--json','--command',command],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
const trigger='batch_d_demo_failure';
try{
 for(const action of ['create_event','load_demo']){
  const payload=action==='create_event'?{name:'Batch D retry review',course:'Isolated review'}:{},requestId=crypto.randomUUID(),before=await count();
  const first=await send(action,payload,{requestId}),created=first.eventId;
  const replay=await send(action,payload,{requestId,eventId:crypto.randomUUID()});
  check(action+' sequential retry returns original event',replay.duplicate&&replay.eventId===created&&await count()===before+1);
  check(action+' audit persists request ID',(await read()).audit.filter(a=>a.id===requestId&&a.action===action).length===1);
  await send('event_update',{...d.event,name:'Edited after creation'});
  const afterEdit=await send(action,payload,{requestId});
  check(action+' retry never resets an edited event',afterEdit.eventId===created&&d.event.name==='Edited after creation');
  const beforeRace=await count(),raceId=crypto.randomUUID();
  const responses=await Promise.all(Array.from({length:8},()=>post(action,payload,{requestId:raceId})));
  const ids=new Set(responses.map(r=>r.body.eventId));
  check(action+' eight concurrent retries create one complete event',responses.every(r=>r.status===200)&&ids.size===1&&await count()===beforeRace+1);
  check(action+' seven concurrent responses identify replay',responses.filter(r=>r.body.duplicate).length===7);
  const state=(await read([...ids][0])).data;
  if(action==='load_demo')equal('Demo relational records remain complete',[state.flights.length,state.teams.length,state.players.length,state.buyers.length,state.sales.length,state.ownership.length,state.payoutRules.length],[2,12,24,5,5,5,6]);
  else check('New event defaults preserved',state.event.status==='SETUP'&&!state.event.settings.trackBidder&&state.event.settings.buybackMode==='off'&&state.state.bid===0);
  const changed=await post(action==='create_event'?'create_event':'create_event',{name:'Changed details'},{requestId});
  check(action+' rejects changed payload/action without a new event',changed.status===409&&await count()===beforeRace+1);
  const distinct=await send(action,payload);check(action+' distinct request creates a distinct event',distinct.eventId!==created&&distinct.eventId!==[...ids][0]);
  report.fixtures[action]=distinct.eventId;
 }
 const mixedId=crypto.randomUUID(),beforeMixed=await count();
 const mixed=await Promise.all(['North draft','South draft'].map(name=>post('create_event',{name},{requestId:mixedId})));
 equal('Different payload race has one success and one conflict',mixed.map(r=>r.status).sort(),[200,409]);
 check('Different payload race creates only one event',await count()===beforeMixed+1);
 await send('create_event',{name:'Batch D import review',course:'Isolated review'});report.fixtures.import=eventId;
 await send('flight_save',{name:'Flight A',color:'#b79a59',ownPool:true});const flightId=d.flights[0].id;
 const source=csv([['Team Name','Player 1','Player 2','Flight','Handicap'],...Array.from({length:100},(_,i)=>['Team '+i+' | North','Renée, '+i,'O"Brien','Flight A','8.4'])]);
 const teams=parsePaste(source).map(r=>({name:r[0],players:[r[1],r[2]],flightId:r[3]==='Flight A'?flightId:'',handicap:Number(r[4])}));
 await send('team_import',{teams});equal('100-team import preserves all names and player mappings',d.teams.map(t=>[t.name,...t.players]),teams.map(t=>[t.name,...t.players]));
 const revision=d.event.revision,before=JSON.stringify(d.teams);
 const malformed=await post('team_import',{teams:[{name:'Valid first row',players:['One'],flightId},{name:'Invalid second row',players:[],flightId}]});
 await read();check('Malformed batch saves no rows or revision',malformed.status===400&&d.event.revision===revision&&JSON.stringify(d.teams)===before);
 const wrongFlight=await post('team_import',{teams:[{name:'Valid first row',players:['One'],flightId},{name:'Unknown flight',players:['Two'],flightId:crypto.randomUUID()}]});
 await read();check('Unknown flight saves no partial import',wrongFlight.status===400&&d.event.revision===revision&&JSON.stringify(d.teams)===before);
 const replayId=crypto.randomUUID(),beforeInvalid=await count();
 const invalid=await post('create_event',{name:''},{requestId:replayId});check('Invalid creation reserves no request/event',invalid.status===400&&await count()===beforeInvalid);
 const valid=await send('create_event',{name:'Batch D corrected invalid draft'},{requestId:replayId});check('Corrected invalid draft can reuse uncommitted request',!!valid.eventId&&await count()===beforeInvalid+1);
 const unauthorized=await fetch(base+'/api/admin',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({action:'create_event',payload:{name:'Batch D corrected invalid draft'},requestId:replayId})});check('Unauthenticated replay remains denied',unauthorized.status===403);
 const actorSql="UPDATE audit SET actor='other-fixture@sites.test' WHERE id='"+replayId+"'";sql(actorSql);
 try{const other=await post('create_event',{name:'Batch D corrected invalid draft'},{requestId:replayId});check('Different recorded actor cannot reuse creation ID',other.status===409);}finally{sql("UPDATE audit SET actor='seedy@sites.test' WHERE id='"+replayId+"'");}
 const failureId=crypto.randomUUID(),beforeFailure=await count();
 sql("CREATE TRIGGER "+trigger+" BEFORE INSERT ON buyers WHEN EXISTS(SELECT 1 FROM audit WHERE eventId=NEW.eventId AND id='"+failureId+"') BEGIN SELECT RAISE(ABORT,'batch_d_demo_failure'); END");
 const failed=await post('load_demo',{}, {requestId:failureId});check('Late demo failure rolls back event and request result',failed.status>=400&&await count()===beforeFailure&&sql("SELECT id FROM audit WHERE id='"+failureId+"'")[0].results.length===0);
 sql('DROP TRIGGER '+trigger);
 const retried=await send('load_demo',{}, {requestId:failureId});check('Failed demo retry succeeds once after recovery',!!retried.eventId&&await count()===beforeFailure+1&&d.teams.length===12);
 const fallback=await fetch(base+'/api/admin',{headers:{cookie}}).then(r=>r.json());
 check('Newest-event fallback sees the last created event',fallback.data.event.id===retried.eventId&&fallback.events[0].id===retried.eventId);
 equal('Foreign keys remain valid',sql('PRAGMA foreign_key_check;')[0].results,[]);
}catch(error){report.failure=String(error);process.exitCode=1;console.error(error);}
finally{try{sql('DROP TRIGGER IF EXISTS '+trigger);}catch(error){report.cleanupError=String(error);process.exitCode=1;}report.passed=report.checks.length;report.failed=report.failure?1:0;fs.writeFileSync(out+'/checks.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,failed:report.failed,fixtures:report.fixtures}));}
