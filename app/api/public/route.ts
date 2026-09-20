import { read, readLive, publicView, db, statement } from "@/lib/store";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
    try {
        const q = new URL(request.url).searchParams;
        const id = q.get("event") || undefined;
        const head = await (id ? statement('SELECT id,revision,boardRevision FROM events WHERE id=?', id) : db().prepare('SELECT id,revision,boardRevision FROM events ORDER BY createdAt DESC LIMIT 1')).first<{ id: string; revision: number; boardRevision: number }>();
        const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
        if (!head)
            return Response.json({ empty: true }, { headers });
        if ((id || q.get('cursorEvent') === head.id) && q.get("revision") === String(head.revision))
            return new Response(null, { status: 204, headers });
        const sameEvent = !!id || q.get('cursorEvent') === head.id;
        if (sameEvent && q.get('boardRevision') === String(head.boardRevision)) {
            const light = await readLive(head.id);
            if (light && q.get('boardRevision') === String(light.event.boardRevision))
                return Response.json(publicView(light, true), { headers });
        }
        const data = await read(head.id);
        if (!data)
            return Response.json({ empty: true }, { headers });
        return Response.json(publicView(data), { headers });
    }
    catch (e) {
        console.error("Public auction read failed", e);
        return Response.json({ error: "The auction connection is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
}
