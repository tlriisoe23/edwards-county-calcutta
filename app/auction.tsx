"use client";
import { useEffect, useState, useRef, useCallback, type CSSProperties } from "react";
import { Flag, Monitor, ShieldCheck, ArrowUpRight, Maximize, Search, ArrowLeft, WifiOff, Radio, Check, LayoutGrid, AlertTriangle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { money, type Row } from "@/lib/model";
import { eventPath } from "@/lib/sharing";
import { normalizeTheme } from "@/lib/themes";
import AdminPanel from "./operator";
export function Choice({ value, onChange, items, label }: any) { return <Select value={String(value)} onValueChange={onChange}><SelectTrigger aria-label={label} className="choice"><SelectValue placeholder={label}/></SelectTrigger><SelectContent>{items.map((x: any) => <SelectItem key={typeof x === "string" ? x : x.value} value={typeof x === "string" ? x : x.value}>{typeof x === "string" ? x : x.label}</SelectItem>)}</SelectContent></Select>; }
export function Brand({ eventId }: { eventId?: string | null }) { return <a className="brand" href={eventPath('/', eventId)}><Flag size={27}/><span>THE CALCUTTA<small>EDWARDS COUNTY</small></span></a>; }
export function Block({ data, admin = false }: any) {
    const e = data.event, s = e.settings, t = admin ? data.teams.find((t: Row) => t.id === data.state.teamId) : data.state.team;
    const f = data.flights?.find((f: Row) => f.id === t?.flightId);
    const bid = data.state?.bid;
    const b = admin ? data.buyers.find((b: Row) => b.id === data.state.buyerId)?.name : data.state.buyer;
    return <section className={"block " + (e.status === "PAUSED" ? "paused" : "")}><div className="block-top"><span className="live"><i />{e.status === "LIVE" ? "LIVE · ON THE BLOCK" : e.status === "PAUSED" ? "AUCTION PAUSED" : e.status === "COMPLETED" ? "AUCTION COMPLETE" : e.status === "READY" ? "READY TO BEGIN" : "AUCTION SETUP"}</span><span>{t?.order != null ? "LOT " + String(t.order + 1).padStart(2, "0") : ""}{t && " / " + data.teams.length}</span></div><div className="block-body"><p className="gold eyebrow">{f?.name || e.course || "THE CALCUTTA"}</p><h2>{t?.name || (e.status === "COMPLETED" ? "An evening, in the books." : "The block is open.")}</h2><p className="players">{t?.players.join(" & ") || (e.status === "COMPLETED" ? "Final auction summary below." : "The next team will appear here.")}</p>{t && <div className="bidline">{(admin || s.showBid) && <div><p className="eyebrow">CURRENT BID</p><div className="big-bid" aria-live="polite">{money(bid || 0, e.currency)}</div></div>}{s.trackBidder && (admin || s.showBidder) && <div className="bidder"><p className="eyebrow">CURRENT BIDDER</p><h3>{b || (bid ? "Bidder not recorded" : "Awaiting the opening bid")}</h3><p>Bids called live in the clubhouse</p></div>}</div>}</div><footer className="block-foot"><span>{t && (admin || s.showHandicap) && t.handicap != null ? "Team index " + t.handicap : ""}{t?.seed && (admin || s.showHandicap) ? " · Seed " + t.seed : ""}</span><span>{e.status === "PAUSED" ? "We will resume shortly." : "Live from the clubhouse"}</span></footer></section>;
}
// Urgency increases as the auction nears the end: 3/2/1 teams remaining step through
// caution/warning/critical tones. Always paired with an icon + word, never color alone.
function remainingTone(remaining: number): "caution" | "warning" | "critical" | undefined {
    if (remaining === 1) return "critical"; if (remaining === 2) return "warning"; if (remaining === 3) return "caution"; return undefined;
}
const toneLabel: Record<string, string> = { caution: "Getting close", warning: "Wrapping up", critical: "Almost done" };
export function Stats({ data, admin = false }: any) { const t = data.totals, e = data.event, values: [string, string | number, string?, boolean?][] = []; if (admin || e.settings.showTotalPool)
    values.push(["Gross auction pool", money(t.gross, e.currency)], ["Net Calcutta pool", money(t.net, e.currency), undefined, true]); values.push(["Teams sold", t.sold + " / " + data.teams.length], ["Teams remaining", t.remaining, remainingTone(t.remaining)]); if (admin || e.settings.showSalePrice)
    values.push(["Average sale", money(t.average, e.currency)], ["Highest sale", money(t.highest, e.currency)]); if (e.status === "COMPLETED" && (admin || e.settings.showSalePrice))
    values.push(["Lowest sale", money(t.lowest, e.currency)]); return <section className="stats" style={{ gridTemplateColumns: "repeat(" + Math.min(values.length, 6) + ",1fr)" }}>{values.map(([l, v, tone, emphasis]) => <div key={l} data-tone={tone} data-emphasis={emphasis || undefined}><p>{l}</p><strong style={{ "--value-length": String(v).length } as CSSProperties}>{v}</strong>{tone && <span className="stat-tone-label"><AlertTriangle size={11} aria-hidden="true"/>{toneLabel[tone]}</span>}</div>)}</section>; }
export function PoolCards({ data, admin = false }: any) { const e = data.event; if (!admin && !e.settings.showFlightPools)
    return null; return <section className="pools">{data.totals.pools.map((p: Row) => <article className="pool panel" key={p.id}><div className="section-title"><h2>{p.name}</h2><span className="pill">{p.sold} / {p.teams} sold</span></div><div className="pool-amount"><strong>{money(p.net, e.currency)}</strong><span>NET FLIGHT POOL</span></div><div className="pool-deduction"><span>Gross {money(p.gross, e.currency)}</span><span>House / charity −{money(p.deduction, e.currency)}</span></div>{(admin || e.settings.showPayouts) && <><p className="eyebrow projection-label">{e.status === "COMPLETED" ? "FINAL PURSES" : "PROJECTED PAYOUTS"}</p><div className="payouts">{p.payouts.map((r: Row) => <div key={r.place}><span>{r.place === 1 ? "1st" : r.place === 2 ? "2nd" : r.place === 3 ? "3rd" : r.place + "th"} <small>{r.percent / 100}%</small></span><strong>{money(r.amount, e.currency)}</strong></div>)}</div></>}</article>)}</section>; }
export default function Auction({ admin = false, tv = false, user }: any) {
    const [data, setData] = useState<Row | null>(null), [meta, setMeta] = useState<Row>({ events: [], audit: [], operators: [] }), [eventId, setEventId] = useState<string | null>(null), [offline, setOffline] = useState(false), [loaded, setLoaded] = useState(false), [filter, setFilter] = useState("all"), [search, setSearch] = useState(""), [status, setStatus] = useState("all"), [soldToast, setSoldToast] = useState<Row | null>(null);
    const current = useRef<Row | null>(null), lastSale = useRef<string | null>(null), inflight = useRef(false), generation = useRef(0);
    const selectedEvent = useRef<string | null>(null);
    const showEvent = useCallback((id: string) => {
        if (selectedEvent.current === id) return;
        // Invalidate responses immediately, before React renders the new selection.
        selectedEvent.current = id;
        generation.current++;
        current.current = null;
        lastSale.current = null;
        inflight.current = false;
        setData(null);
        setMeta({ events: [], audit: [], operators: [] });
        setLoaded(false);
        setSoldToast(null);
        setFilter('all'); setSearch(''); setStatus('all');
        setEventId(id);
    }, []);
    const selectEvent = useCallback((id: string, replace = false) => {
        const url = new URL(window.location.href);
        if (id) url.searchParams.set('event', id); else url.searchParams.delete('event');
        if (url.href !== window.location.href)
            window.history[replace ? 'replaceState' : 'pushState'](window.history.state, '', url.pathname + url.search + url.hash);
        showEvent(id);
    }, [showEvent]);
    useEffect(() => {
        const fromLocation = () => showEvent(new URLSearchParams(window.location.search).get('event') || '');
        fromLocation();
        window.addEventListener('popstate', fromLocation);
        return () => window.removeEventListener('popstate', fromLocation);
    }, [showEvent]);
    const refresh = useCallback(async (force = false) => {
        if (eventId === null || eventId !== selectedEvent.current) return;
        if (inflight.current && !force)
            return;
        inflight.current = true;
        const gen = generation.current;
        try {
            const prev = current.current;
            const params = new URLSearchParams();
            if (eventId)
                params.set("event", eventId);
            if (!admin && prev && !force) {
                params.set("cursorEvent", prev.event.id);
                params.set("revision", String(prev.event.revision));
                params.set("boardRevision", String(prev.event.boardRevision));
            }
            const r = await fetch((admin ? "/api/admin" : "/api/public") + "?" + params, { cache: "no-store" });
            if (gen !== generation.current || eventId !== selectedEvent.current) return;
            if (!r.ok)
                throw Error("Disconnected");
            if (r.status === 204) {
                setOffline(false);
                return;
            }
            const result: any = await r.json();
            if (gen !== generation.current)
                return;
            let d = admin ? result.data : result.empty ? null : result;
            // Resolve an unqualified entry once, then keep that event through reloads.
            if (!eventId && d?.event?.id) { selectEvent(d.event.id, true); return; }
            if (d?.light && prev)
                d = { ...prev, event: d.event, state: d.state };
            if (d) {
                if (!admin && lastSale.current && d.sales[0]?.id && lastSale.current !== d.sales[0].id && d.sales.length > (prev?.sales.length || 0)) {
                    setSoldToast(d.sales[0]);
                    setTimeout(() => setSoldToast(null), 4500);
                }
                lastSale.current = d.sales[0]?.id || null;
            }
            current.current = d;
            setData(d);
            if (admin)
                setMeta(result);
            setOffline(false);
            setLoaded(true);
        }
        catch {
            if (gen === generation.current) {
                setOffline(true);
                setLoaded(true);
            }
        }
        finally {
            if (gen === generation.current) inflight.current = false;
        }
    }, [admin, eventId, selectEvent]);
    useEffect(() => { generation.current++; current.current = null; void refresh(true); const timer = setInterval(() => void refresh(), 2000); const online = () => void refresh(true); window.addEventListener("online", online); return () => { clearInterval(timer); window.removeEventListener("online", online); generation.current++; }; }, [refresh]);
    useEffect(() => { const context = (document as any).modelContext; if (!context?.registerTool)
        return; const controller = new AbortController(); Promise.resolve(context.registerTool({ name: "read_auction_board", description: "Read the current public-safe auction board, then refresh the visible board from the authoritative server.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: async (input: any) => { if (!input || Object.keys(input).length)
            throw Error("No parameters are accepted."); const res = await fetch("/api/public" + (eventId ? "?event=" + encodeURIComponent(eventId) : "")); if (!res.ok)
            throw Error("Auction connection unavailable."); const result = await res.json(); await refresh(true); return result; } }, { signal: controller.signal })).catch(() => { }); return () => controller.abort(); }, [eventId, refresh]);
    const fullscreen = async () => { try {
        if (!document.fullscreenElement)
            await document.documentElement.requestFullscreen();
        else
            await document.exitFullscreen();
    }
    catch {
        toast.error("Fullscreen is unavailable in this browser. Open TV mode in a separate tab.");
    } };
    const theme = normalizeTheme(data?.event.settings.theme);
    useEffect(() => {
        // Root inheritance includes portals (dialogs, select menus and notifications).
        document.documentElement.dataset.theme = theme;
        return () => { delete document.documentElement.dataset.theme; };
    }, [theme]);
    // The public "Auction board" link only scrolls this same page down to the complete field, so it
    // is noise once that field is already on screen. It is kept (the board sits below the fold on a
    // phone and on a 1080p screen, where a jump link genuinely saves scrolling) but hides itself
    // while #board is in view, which is the specific complaint.
    const [boardInView, setBoardInView] = useState(false);
    useEffect(() => {
        if (tv || !data || typeof IntersectionObserver === 'undefined')
            return;
        const section = document.getElementById('board');
        if (!section)
            return;
        const watcher = new IntersectionObserver(([entry]) => setBoardInView(entry.isIntersecting));
        watcher.observe(section);
        return () => watcher.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tv, !!data]);
    const linkEventId = data?.event.id || eventId;
    if (admin)
        return <><AdminPanel data={data} meta={meta} user={user} selectedEventId={eventId} offline={offline} loaded={loaded} refresh={() => refresh(true)} selectEvent={selectEvent} fullscreen={fullscreen}/><Toaster richColors/></>;
    if (!data)
        return <main className="site"><header className="mast"><Brand eventId={linkEventId}/><a href={eventPath('/admin', linkEventId)}>Operator sign in</a></header><div className="empty-state"><Flag size={45}/><h1>{!loaded ? "Joining the clubhouse…" : offline ? "Reconnecting…" : "The auction is being prepared."}</h1><p>{offline ? "Your connection will retry automatically." : "The live board will appear here when the operator creates an event."}</p></div></main>;
    const e = data.event, s = e.settings;
    const upcoming = data.teams.filter((t: Row) => t.status === "UPCOMING").slice(0, tv ? 3 : 4);
    const board = data.teams.filter((t: Row) => (filter === "all" || t.flightId === filter) && (status === "all" || t.status === status) && (t.name + " " + t.players.join(" ")).toLowerCase().includes(search.toLowerCase()));
    return <main className={"site " + (tv ? "tv" : "")}><header className="mast"><Brand eventId={linkEventId}/><nav>{tv ? <><a href={eventPath('/', e.id)}><ArrowLeft /> Auction board</a><Button variant="outline" onClick={fullscreen}><Maximize /> Full screen</Button></> : <>{!boardInView && <a href="#board" title="Jump down to the complete field"><LayoutGrid /> Auction board</a>}<a href={eventPath('/tv', e.id)} title="TV mode"><Monitor /> TV mode</a><a href={eventPath('/admin', linkEventId)} title="Operator area"><ShieldCheck /> Operator</a></>}</nav></header><div className="page-head"><div><p className="eyebrow">{e.course || "THE CLUBHOUSE"} · {e.dates || "CALCUTTA AUCTION"}</p><h1>{e.calcuttaName}</h1></div><div className="head-status">{e.demo === 1 && <span className="pill">Demonstration event</span>}<span className={"connection " + (offline ? "offline" : "")} role="status">{offline ? <><WifiOff size={14}/> Reconnecting…</> : <><Radio size={14}/> {e.status === "LIVE" ? "Live updates" : "Connected"}</>}</span></div></div><div className="live-grid"><Block data={data}/>{s.showUpcoming && <aside className="next panel"><div className="section-title"><h2>Coming to the block</h2><ArrowUpRight size={21}/></div>{upcoming.length ? upcoming.map((t: Row) => <div className="queue-row" key={t.id}><span className="lot">{String(t.order + 1).padStart(2, "0")}</span><div><h3>{t.name}</h3><p>{data.flights.find((f: Row) => f.id === t.flightId)?.name}</p></div></div>) : <p className="muted">No teams waiting in the queue.</p>}<p className="fine">Auction order may change.</p></aside>}</div><Stats data={data}/>{!tv && <PoolCards data={data}/>}<section className="recent"><div className="section-title"><h2>Fresh off the block</h2><span className="eyebrow">RECENT SALES</span></div><div className="sales-strip">{data.sales.slice(0, tv ? 3 : 4).map((sale: Row) => <article key={sale.id}><span className="sold-label"><Check size={13}/> SOLD</span><h3>{data.teams.find((t: Row) => t.id === sale.teamId)?.name}</h3>{s.showBuyer && <p>{sale.buyer}</p>}{s.showSalePrice && <strong>{money(sale.amount, e.currency)}</strong>}</article>)}{!data.sales.length && <p className="muted">The first sale will appear here.</p>}</div></section>{!tv && <><section className="board" id="board"><div className="section-title"><div><p className="eyebrow muted">THE COMPLETE FIELD</p><h2>{e.status === "COMPLETED" ? "Final auction summary" : "Auction board"}</h2></div><span>{data.teams.length} teams</span></div><Tabs value={filter} onValueChange={setFilter} className="filter-tabs"><div className="board-tools"><TabsList variant="line" aria-label="Filter by flight"><TabsTrigger value="all">All flights</TabsTrigger>{data.flights.map((f: Row) => <TabsTrigger value={f.id} key={f.id}>{f.name}</TabsTrigger>)}</TabsList><div className="search"><Search size={17}/><Input aria-label="Search teams" placeholder="Find a team or player" value={search} onChange={ev => setSearch(ev.target.value)}/></div><Choice label="Team status" value={status} onChange={setStatus} items={[{ value: "all", label: "All statuses" }, ...["UPCOMING", "ON_BLOCK", "SOLD", "UNSOLD", "WITHDRAWN"].map(v => ({ value: v, label: v.replace("_", " ") }))]}/></div><TabsContent value={filter} tabIndex={-1}><div className="team-cards">{board.map((t: Row) => { const sale = data.sales.find((x: Row) => x.teamId === t.id); return <article className={"team-card panel " + (t.status === "ON_BLOCK" ? "on-block" : "")} key={t.id}><div className="team-meta"><span>{data.flights.find((f: Row) => f.id === t.flightId)?.name}</span><span className={"badge " + t.status.toLowerCase()}>{t.status.replace("_", " ")}</span></div><h3>{t.name}</h3><p>{t.players.join(" · ")}</p>{t.notes && <p className="team-note">{t.notes}</p>}{s.showHandicap && t.handicap != null && <p className="fine">Index {t.handicap}</p>}{sale && <div className="team-sale">{s.showBuyer && <span>{sale.buyer}</span>}{s.showSalePrice && <strong>{money(sale.amount, e.currency)}</strong>}</div>}{s.showBuyback && sale?.ownership && <p className="fine">{sale.ownership.filter((o: Row) => o.kind === "team").map((o: Row) => o.status === "Completed" ? "Team buyback " + o.percent / 100 + "%" : o.status).join(", ")}</p>}</article>; })}</div>{!board.length && <p className="empty-state">No teams match these filters.</p>}</TabsContent></Tabs></section><section className="rules-footer"><h2>House rules</h2><p>{e.rules}</p>{e.description && <p>{e.description}</p>}{s.buybackMode === 'track' && <p className="fine">Buyback ownership limit: {s.buybackMax / 100}%{s.buybackDeadline ? " · Deadline " + new Date(s.buybackDeadline).toLocaleString() : ""} · Ownership changes do not add to the auction pool.</p>}</section><footer className="page-footer"><Brand eventId={linkEventId}/><span>Recordkeeping & calculations only. Settlement occurs outside this application.</span></footer></>}{soldToast && <div className="sold-toast" role="status"><Check /> SOLD · {data.teams.find((t: Row) => t.id === soldToast.teamId)?.name}{s.showSalePrice ? " · " + money(soldToast.amount, e.currency) : ""}</div>}<Toaster richColors/></main>;
}
