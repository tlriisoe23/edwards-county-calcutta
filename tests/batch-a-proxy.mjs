// Local, read-only browser race fixture. Never forwards product mutations.
import http from 'node:http';
const upstream='http://localhost:5174',origin='http://127.0.0.1:5175';
let heldEvent=null,delivered=0;
const pending=[];
function release(){heldEvent=null;for(const item of pending.splice(0)){clearTimeout(item.timer);item.send();}}
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,origin);
 if(url.pathname.startsWith('/__batch_a/')){
  if(url.pathname.endsWith('/hold')&&req.method==='POST'){let raw='';for await(const part of req)raw+=part;heldEvent=JSON.parse(raw).eventId;}
  if(url.pathname.endsWith('/release'))release();
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({heldEvent,pending:pending.length,delivered}));return;
 }
 if(req.method!=='GET'){res.writeHead(405);res.end('Browser race fixture is read-only');return;}
 const target=new URL(req.url,upstream);
 const remote=http.request(target,{headers:{...req.headers,host:target.host}},response=>{
  const chunks=[];response.on('data',part=>chunks.push(part));response.on('end',()=>{
   const headers={...response.headers};if(headers.location?.startsWith(upstream))headers.location=headers.location.replace(upstream,origin);
   const send=()=>{if(res.destroyed)return;res.writeHead(response.statusCode,headers);res.end(Buffer.concat(chunks));delivered++;};
   if(heldEvent&&url.pathname==='/api/admin'&&url.searchParams.get('event')===heldEvent){
    const item={send,timer:null};item.timer=setTimeout(()=>{const index=pending.indexOf(item);if(index>=0)pending.splice(index,1);send();},30000);pending.push(item);
   }else send();
  });
 });
 remote.on('error',()=>{res.writeHead(502);res.end('Isolated server unavailable');});remote.end();
});
server.listen(5175,'127.0.0.1',()=>console.log('Read-only browser race fixture: '+origin));
process.on('SIGINT',()=>{release();server.close();process.exit(0);});
