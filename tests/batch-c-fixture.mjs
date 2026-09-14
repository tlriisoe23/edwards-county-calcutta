// Disposable display fixture. All writes are restricted to scratch :5174.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base='http://localhost:5174',out='docs/batch-c-evidence';fs.mkdirSync(out,{recursive:true});
const file=out+'/fixture.json',action=process.argv[2]||'init';
const l=await fetch(base+'/signin-with-chatgpt?return_to=%2Fadmin',{redirect:'manual'}),cookie=l.headers.get('set-cookie').split(';')[0];
let eventId=action==='init'?undefined:JSON.parse(fs.readFileSync(file)).eventId,d;
async function read(){const r=await fetch(base+'/api/admin'+(eventId?'?event='+eventId:''),{headers:{cookie}});assert.equal(r.status,200);d=(await r.json()).data;}
async function send(action,payload={}){const r=await fetch(base+'/api/admin',{method:'POST',headers:{cookie,origin:base,'content-type':'application/json'},body:JSON.stringify({action,payload,eventId,revision:d?.event.revision,requestId:crypto.randomUUID()})});const b=await r.json();assert.equal(r.status,200,JSON.stringify(b));if(b.eventId)eventId=b.eventId;await read();}
const long='Christopher Montgomery-Wellington / Alexander Richardson-Harrington';
if(action==='init'){
 await send('create_event',{name:'Batch C Display Review',course:'Edwards County Golf Course',dates:'September 19–20'});
 for(const name of ['Championship Flight','First Flight','Second Flight','Third Flight'])await send('flight_save',{name,color:'#b79a59',ownPool:true});
 await send('team_import',{teams:Array.from({length:12},(_,i)=>({name:i===0||i===3?long:'Display Team '+String(i+1).padStart(2,'0'),players:i===3?['Christopher Montgomery-Wellington','Alexander Richardson-Harrington']:['North Player','South Player'],flightId:d.flights[i%4].id}))});
 await send('buyer_save',{name:'Johnson & Richardson Championship Syndicate'});
 await send('event_update',{...d.event,settings:{...d.event.settings,trackBidder:true}});
 await send('status',{status:'LIVE'});
 for(let i=0;i<3;i++){await send('bid',{teamId:d.state.teamId,amount:100000000,buyerId:d.buyers[0].id});await send('sell',{teamId:d.state.teamId,amount:100000000,buyerId:d.buyers[0].id});}
 await send('bid',{teamId:d.state.teamId,amount:100000000,buyerId:d.buyers[0].id});
 fs.writeFileSync(file,JSON.stringify({eventId,long,at:new Date().toISOString()},null,2));
}else{
 await read();
 if(action==='completed'){if(d.state.teamId){const fixture=JSON.parse(fs.readFileSync(file));fs.writeFileSync(file,JSON.stringify({...fixture,blockId:d.state.teamId},null,2));await send('team_status',{id:d.state.teamId,status:'UNSOLD'});}await send('status',{status:'COMPLETED'});}
 else if(action==='live'){const previous=JSON.parse(fs.readFileSync(file)).blockId;await send('status',{status:'LIVE'});if(previous&&d.state.teamId!==previous)await send('block',{id:previous});await send('bid',{teamId:d.state.teamId,amount:100000000,buyerId:d.buyers[0].id});}
 else if(action==='paused')await send('status',{status:'PAUSED'});
 else if(action==='short'||action==='long'){const t=d.teams.find(t=>t.id===d.state.teamId)||d.teams[3];await send('team_save',{...t,name:action==='long'?long:'Smith / Jones',players:action==='long'?['Christopher Montgomery-Wellington','Alexander Richardson-Harrington']:['John Smith','Mike Jones']});}
 else if(action==='hidden'||action==='visible')await send('event_update',{...d.event,settings:{...d.event.settings,...Object.fromEntries(['showBid','showBidder','showBuyer','showSalePrice','showUpcoming','showHandicap','showPayouts','showBuyback','showTotalPool','showFlightPools'].map(k=>[k,action==='visible']))}});
 else if(action==='maxbid'){const t=d.teams.find(t=>t.id===d.state.teamId);await send('team_save',{...t,name:long,players:['Christopher Montgomery-Wellington','Alexander Richardson-Harrington']});await send('bid',{teamId:d.state.teamId,amount:100000000,buyerId:d.buyers[0].id});}
 else if(action==='longqueue'){for(const t of d.teams.filter(t=>t.status==='UPCOMING').slice(0,3))await send('team_save',{...t,name:long});}
 else if(action==='toast'){await new Promise(resolve=>setTimeout(resolve,10000));await read();await send('status',{status:'LIVE'});await send('sell',{teamId:d.state.teamId,amount:d.state.bid,buyerId:d.buyers[0].id});}
 else throw Error('Use init, long, short, live, paused, completed, hidden, visible, maxbid, longqueue or toast');
}
console.log(JSON.stringify({eventId,status:d.event.status,revision:d.event.revision,team:d.teams.find(t=>t.id===d.state.teamId)?.name,bid:d.state.bid,sales:d.sales.length}));
