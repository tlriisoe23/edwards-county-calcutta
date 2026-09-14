import { identity, read, statement } from '@/lib/store';
import { eventCsv, exportKinds } from '@/lib/exports';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
    try {
        if (!(await identity())?.operator) return Response.json({error:'Operator access required.'},{status:403});
        const q=new URL(request.url).searchParams, kind=q.get('kind') || '', eventId=q.get('event');
        if(!eventId || !(exportKinds as readonly string[]).includes(kind)) return Response.json({error:'Choose an event and export.'},{status:400});
        const data=await read(eventId); if(!data)return Response.json({error:'Event not found.'},{status:404});
        let content:string;
        if(kind==='backup') {
            // Read the audit after the snapshot, then check the monotonic revision to avoid a mixed backup.
            const audit=(await statement('SELECT * FROM audit WHERE eventId=? ORDER BY createdAt,id',eventId).all()).results;
            const head=await statement('SELECT revision FROM events WHERE id=?',eventId).first<{revision:number}>();
            if(head?.revision!==data.event.revision)return Response.json({error:'The auction changed while preparing the backup. Try again.'},{status:409});
            content=JSON.stringify({format:'edwards-calcutta-event',version:2,exportedAt:new Date().toISOString(),privateFieldsIncluded:true,data,audit},null,2);
        } else content=eventCsv(data,kind);
        const ext=kind==='backup'?'json':'csv';
        return new Response(content,{headers:{'Content-Type':kind==='backup'?'application/json':'text/csv;charset=utf-8','Content-Disposition':`attachment; filename="calcutta-${kind}.${ext}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
    } catch(error) { console.error('Export unavailable',error); return Response.json({error:'The export could not be prepared. Try again.'},{status:503}); }
}
