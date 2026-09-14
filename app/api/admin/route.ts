import { z } from "zod";
import { db, statement, insert, update, read, freshEvent, identity } from "@/lib/store";
import { defaultSettings, type Row } from "@/lib/model";
export const dynamic = "force-dynamic";
const text = z.string().trim().min(1).max(150), note = z.string().max(4000).default(""), id = text;
const cents = z.number().int().min(0).max(100000000);
const percent = z.number().int().min(0).max(10000);
const player = z.string().trim().min(1).max(100);
const teamSchema = z.object({ id: id.optional(), name: text, players: z.array(player).min(1).max(4), flightId: id, handicap: z.number().min(-20).max(100).nullable().default(null), seed: z.number().int().min(1).max(1000).nullable().default(null), notes: note, privateNotes: note, order: z.number().int().min(0).max(100000).optional() });
const buyerSchema = z.object({ id: id.optional(), name: text, group: z.string().max(150).default(""), contact: z.string().max(500).default(""), privateNotes: note });
const timestamp = () => new Date().toISOString();
function requireThat(condition: any, message: string) { if (!condition)
    throw Error(message); }
function settingsSchema() { return z.object({ trackBidder: z.boolean(), quickStarts: z.array(cents.refine(v => v > 0)).min(1).max(8), buybackMode: z.enum(["off", "calculate", "track"]), buybackSuggested: percent, minBid: cents, increment: cents.refine(v => v > 0), quickIncrements: z.array(cents.refine(v => v > 0)).min(1).max(8), poolMode: z.enum(["separate", "combined", "custom"]), deductionType: z.enum(["none", "percent", "fixed"]), deduction: cents, buybackMax: percent, buybackPriceMode: z.enum(["proportional", "fixed"]), buybackFixed: cents, buybackDeadline: z.string().max(40), autoAdvance: z.boolean(), showBidder: z.boolean(), showBid: z.boolean(), showBuyer: z.boolean(), showSalePrice: z.boolean(), showUpcoming: z.boolean(), showHandicap: z.boolean(), showPayouts: z.boolean(), showBuyback: z.boolean(), showTotalPool: z.boolean(), showFlightPools: z.boolean() }).superRefine((s, c) => { if (s.deductionType === "percent" && s.deduction > 10000)
    c.addIssue({ code: "custom", message: "Deduction cannot exceed 100%." }); if (s.buybackDeadline && !Number.isFinite(Date.parse(s.buybackDeadline)))
    c.addIssue({ code: "custom", message: "Enter a valid buyback deadline." }); }); }
export async function GET(request: Request) { try {
    const who = await identity();
    if (!who?.operator)
        return Response.json({ error: "Operator access required." }, { status: 403 });
    const q = new URL(request.url).searchParams;
    const events = (await db().prepare('SELECT id,name,demo,status FROM events ORDER BY createdAt DESC').all()).results;
    const data = await read(q.get("event") || undefined);
    const audit = data ? (await statement('SELECT id,actor,action,recordId,createdAt,undone FROM audit WHERE eventId=? ORDER BY createdAt DESC LIMIT 100', data.event.id).all()).results : [];
    const operators = who.owner ? (await db().prepare('SELECT email,addedBy,createdAt FROM operators ORDER BY email').all()).results : [];
    return Response.json({ data, events, audit, operators, user: { email: who.email, owner: who.owner } }, { headers: { "Cache-Control": "private, no-store" } });
}
catch (e) {
    console.error(e);
    return Response.json({ error: "Auction storage is temporarily unavailable." }, { status: 503 });
} }
export async function POST(request: Request) {
    try {
        const origin = request.headers.get("origin");
        if (origin !== new URL(request.url).origin)
            return Response.json({ error: "Same-origin request required." }, { status: 403 });
        const who = await identity();
        if (!who?.operator)
            return Response.json({ error: "Operator access required." }, { status: 403 });
        requireThat(request.headers.get("content-type")?.includes("application/json"), "JSON request required.");
        const raw = await request.text();
        requireThat(raw.length < 200000, "Request is too large.");
        const body = JSON.parse(raw);
        const action = text.parse(body.action), p = body.payload || {}, requestId = z.string().uuid().parse(body.requestId);
        if (action === "operator_add" || action === "operator_remove") {
            requireThat(who.owner, "Only the owner can manage operator access.");
            const email = z.string().trim().email().max(254).parse(p.email).toLowerCase();
            if (action === "operator_add")
                await statement('INSERT INTO operators (email,addedBy,createdAt) VALUES (?,?,?) ON CONFLICT(email) DO NOTHING', email, who.email, timestamp()).run();
            else
                await statement('DELETE FROM operators WHERE email=?', email).run();
            if (body.eventId)
                await insert("audit", { id: requestId, eventId: id.parse(body.eventId), actor: who.email, action: action + " " + email, createdAt: timestamp() }).run();
            return Response.json({ ok: true });
        }
        if (action === "create_event" || action === "load_demo") {
            const input = action === "load_demo" ? { name: "Edwards County Calcutta Invitational", course: "Edwards County Golf Course", dates: "September 19–20, 2026", auctionAt: "2026-09-18T18:00" } : z.object({ name: text, course: z.string().max(150).default(""), calcuttaName: z.string().max(150).optional(), dates: z.string().max(100).optional(), auctionAt: z.string().max(40).optional(), description: note }).parse(p);
            const created = freshEvent(input, who.email, action === "load_demo");
            const cmds = created.commands;
            if (action === "load_demo") {
                const f1 = crypto.randomUUID(), f2 = crypto.randomUUID();
                [["Championship Flight", f1], ["First Flight", f2]].forEach(([name, f], i) => { cmds.push(insert("flights", { id: f, eventId: created.id, name, order: i, color: i ? "#889b75" : "#b79a59", ownPool: 1 })); [5000, 3000, 2000].forEach((percent, j) => cmds.push(insert("payout_rules", { id: crypto.randomUUID(), eventId: created.id, poolId: f, place: j + 1, percent }))); });
                const names = ["The Johnson Group", "Taylor Syndicate", "The Weekend Club", "Table Six Syndicate", "Smith Family"], buyerIds = names.map(() => crypto.randomUUID());
                names.forEach((name, i) => cmds.push(insert("buyers", { id: buyerIds[i], eventId: created.id, name, group: i === 3 ? "Table 6" : "", contact: "fictional@example.test", privateNotes: "Fictional demonstration buyer" })));
                const teams = [["Smith / Jones", "John Smith", "Mike Jones"], ["Brown / Miller", "Tom Brown", "Jake Miller"], ["Wilson / Clark", "Ryan Wilson", "Bob Clark"], ["Davis / Cooper", "Evan Davis", "Noah Cooper"], ["Anderson / Brooks", "Alex Anderson", "Sam Brooks"], ["Hayes / Bennett", "Daniel Hayes", "Owen Bennett"], ["Reed / Foster", "Lucas Reed", "James Foster"], ["Parker / Ellis", "Mason Parker", "Henry Ellis"], ["Morgan / Blake", "Eli Morgan", "Finn Blake"], ["Walsh / Turner", "Ben Walsh", "Jack Turner"], ["Carter / Lewis", "Leo Carter", "Adam Lewis"], ["Ross / Mitchell", "Max Ross", "Luke Mitchell"]];
                const teamIds = teams.map(() => crypto.randomUUID());
                teams.forEach((t, i) => {
                    cmds.push(insert("teams", { id: teamIds[i], eventId: created.id, flightId: [0, 1, 4, 5, 6, 9].includes(i) ? f1 : f2, name: t[0], handicap: Math.round((6.2 + i * 1.1) * 10) / 10, seed: i + 1, notes: "", privateNotes: "Demonstration team", order: i, status: i < 5 ? "SOLD" : i === 5 ? "ON_BLOCK" : "UPCOMING" }));
                    t.slice(1).forEach((name, j) => cmds.push(insert("players", { id: crypto.randomUUID(), teamId: teamIds[i], name, order: j })));
                    if (i < 5) {
                        const saleId = crypto.randomUUID(), amount = [45000, 70000, 95000, 125000, 160000][i];
                        cmds.push(insert("sales", { id: saleId, eventId: created.id, teamId: teamIds[i], buyerId: buyerIds[i], amount, status: "ACTIVE", createdAt: new Date(Date.now() - (6 - i) * 180000).toISOString(), notes: "Demo sale" }), insert("ownership", { id: crypto.randomUUID(), saleId, party: names[i], percent: 10000, consideration: amount, status: "Completed", kind: "buyer" }));
                    }
                });
                cmds.push(update("auction_state", { teamId: teamIds[5], bid: 125000, buyerId: buyerIds[3], startedAt: timestamp() }, "eventId", created.id), update("events", { status: "LIVE" }, "id", created.id));
            }
            await db().batch(cmds);
            return Response.json({ ok: true, eventId: created.id });
        }
        const eventId = id.parse(body.eventId), revision = z.number().int().nonnegative().parse(body.revision);
        const duplicate = await statement('SELECT id FROM audit WHERE id=? AND eventId=?', requestId, eventId).first();
        if (duplicate)
            return Response.json({ ok: true, duplicate: true });
        const d = await read(eventId);
        requireThat(d, "Event not found.");
        requireThat(d!.event.revision === revision, "Another operator changed this event. Refresh and try again.");
        const data = d!, e = data.event, s = e.settings, now = timestamp();
        const cmds: D1PreparedStatement[] = [
            statement('INSERT INTO mutation_guards(id,ok) VALUES (?,COALESCE((SELECT revision=? FROM events WHERE id=?),0))', requestId, revision, eventId),
            statement('UPDATE events SET revision=revision+1,boardRevision=boardRevision+?,updatedAt=? WHERE id=?', action === "bid" ? 0 : 1, now, eventId)
        ];
        let recordId: string | null = null;
        let before = JSON.stringify(data);
        const team = (tid: string) => { const t = data.teams.find((t: Row) => t.id === tid); requireThat(t, "Team not found."); return t; };
        const buyer = (bid: string) => { const b = data.buyers.find((b: Row) => b.id === bid); requireThat(b, "Buyer not found."); return b; };
        const flight = (fid: string) => { const f = data.flights.find((f: Row) => f.id === fid); requireThat(f, "Flight not found."); return f; };
        const sale = (sid: string) => { const a = data.sales.find((x: Row) => x.id === sid && x.status === "ACTIVE"); requireThat(a, "Active sale not found."); return a; };
        const setBlock = (t: Row | null) => { cmds.push(statement("UPDATE teams SET status='UPCOMING' WHERE eventId=? AND status='ON_BLOCK'", eventId)); if (t)
            cmds.push(update("teams", { status: "ON_BLOCK" }, "id", t.id)); cmds.push(update("auction_state", { teamId: t?.id || null, bid: 0, buyerId: null }, "eventId", eventId)); };
        switch (action) {
            case "event_update": {
                const v = z.object({ name: text, calcuttaName: text, course: z.string().max(150), dates: z.string().max(100), auctionAt: z.string().max(40), description: note, rules: note, currency: z.enum(["USD", "CAD", "GBP", "EUR", "AUD"]), settings: settingsSchema() }).parse(p);
                if (v.settings.poolMode !== s.poolMode)
                    requireThat(!data.teams.some((t: Row) => t.finish), "Clear finishing positions before changing the pool configuration.");
                cmds.push(update("events", { ...v, settings: JSON.stringify(v.settings) }, "id", eventId));
                if (!v.settings.trackBidder) cmds.push(update("auction_state", { buyerId: null }, "eventId", eventId));
                break;
            }
            case "flight_save": {
                const v = z.object({ id: id.optional(), name: text, color: z.string().regex(/^#[a-fA-F0-9]{6}$/), ownPool: z.boolean() }).parse(p);
                if (v.id) {
                    const priorFlight = flight(v.id);
                    if (!!priorFlight.ownPool !== v.ownPool)
                        requireThat(!data.teams.some((t: Row) => t.finish), "Clear finishing positions before changing pool membership.");
                    cmds.push(update("flights", { name: v.name, color: v.color, ownPool: +v.ownPool }, "id", v.id));
                }
                else {
                    const fid = crypto.randomUUID();
                    cmds.push(insert("flights", { id: fid, eventId, name: v.name, color: v.color, ownPool: +v.ownPool, order: data.flights.length }));
                    [5000, 3000, 2000].forEach((percent, i) => cmds.push(insert("payout_rules", { id: crypto.randomUUID(), eventId, poolId: fid, place: i + 1, percent })));
                }
                break;
            }
            case "payout_save": {
                const poolId = id.parse(p.poolId);
                if (poolId !== "combined")
                    flight(poolId);
                const values = z.array(percent).min(1).max(10).parse(p.percent);
                requireThat(values.reduce((a, b) => a + b, 0) === 10000, "Payout percentages must total 100%.");
                cmds.push(statement('DELETE FROM payout_rules WHERE eventId=? AND poolId=?', eventId, poolId));
                values.forEach((percent, i) => cmds.push(insert("payout_rules", { id: crypto.randomUUID(), eventId, poolId, place: i + 1, percent })));
                break;
            }
            case "team_save":
            case "team_import": {
                const list = action === "team_import" ? z.array(teamSchema).min(1).max(100).parse(p.teams) : [teamSchema.parse(p)];
                requireThat(data.teams.length + list.filter(t => !t.id).length <= 500, "An event supports up to 500 teams.");
                list.forEach((v, i) => {
                    flight(v.flightId);
                    if (v.id) {
                        const old = team(v.id);
                        if (v.flightId !== old.flightId)
                            requireThat(!old.finish, "Clear the finishing position before moving this team to another flight.");
                    }
                    const tid = v.id || crypto.randomUUID();
                    recordId = tid;
                    const { players, id: _, ...fields } = v;
                    const row = { ...fields, order: v.order ?? (v.id ? team(v.id).order : data.teams.length + i) };
                    if (v.id) {
                        cmds.push(statement("UPDATE ownership SET party=? WHERE kind='team' AND saleId IN (SELECT id FROM sales WHERE teamId=?)", v.name, tid));
                        cmds.push(update("teams", row, "id", tid), statement('DELETE FROM players WHERE teamId=?', tid));
                    }
                    else
                        cmds.push(insert("teams", { ...row, id: tid, eventId, status: "UPCOMING" }));
                    players.forEach((name, j) => cmds.push(insert("players", { id: crypto.randomUUID(), teamId: tid, name, order: j })));
                    if (action === "team_save" && v.order !== undefined) {
                        const ordered = data.teams.filter((t: Row) => t.id !== tid).map((t: Row) => t.id);
                        ordered.splice(Math.min(v.order, ordered.length), 0, tid);
                        ordered.forEach((id: string, index: number) => cmds.push(update("teams", { order: index }, "id", id)));
                    }
                });
                break;
            }
            case "team_delete": {
                const tid = id.parse(p.id), t = team(tid);
                requireThat(t.status !== "ON_BLOCK", "Move another team onto the block first.");
                requireThat(!data.sales.some((x: Row) => x.teamId === tid), "Teams with sale history must be withdrawn, not deleted.");
                cmds.push(statement('DELETE FROM teams WHERE id=?', tid));
                recordId = tid;
                break;
            }
            case "team_status": {
                const tid = id.parse(p.id), t = team(tid), status = z.enum(["UPCOMING", "UNSOLD", "WITHDRAWN"]).parse(p.status);
                requireThat(!data.sales.some((x: Row) => x.teamId === tid && x.status === "ACTIVE"), "Void or reopen the active sale before changing this team. The pool must be corrected explicitly.");
                if (t.status === "ON_BLOCK")
                    cmds.push(update("auction_state", { teamId: null, bid: 0, buyerId: null }, "eventId", eventId));
                cmds.push(update("teams", { status, finish: null }, "id", tid));
                recordId = tid;
                break;
            }
            case "team_skip": {
                const t = team(id.parse(p.id));
                requireThat(["UPCOMING", "ON_BLOCK"].includes(t.status), "Only a team in the active queue can be skipped for now.");
                const ordered = data.teams.filter((r: Row) => r.id !== t.id).map((r: Row) => r.id); ordered.push(t.id);
                ordered.forEach((tid: string, order: number) => cmds.push(update("teams", { order }, "id", tid)));
                if (t.status === "ON_BLOCK") setBlock(data.teams.find((r: Row) => r.status === "UPCOMING" && r.id !== t.id) || null);
                recordId = t.id; break;
            }
            case "team_reorder": {
                const ids = z.array(id).parse(p.ids);
                requireThat(ids.length === data.teams.length && new Set(ids).size === ids.length && ids.every(tid => data.teams.some((t: Row) => t.id === tid)), "The order must include every team exactly once.");
                ids.forEach((tid, i) => cmds.push(update("teams", { order: i }, "id", tid)));
                break;
            }
            case "team_flight": {
                flight(id.parse(p.flightId));
                const ids = z.array(id).min(1).max(500).parse(p.ids);
                ids.forEach(tid => { requireThat(!team(tid).finish, "Clear finishing positions before changing flights."); cmds.push(update("teams", { flightId: p.flightId }, "id", tid)); });
                break;
            }
            case "buyer_save": {
                const v = buyerSchema.parse(p);
                const exists = data.buyers.find((b: Row) => b.name.toLowerCase() === v.name.toLowerCase() && b.id !== v.id);
                requireThat(!exists, "That buyer already exists. Select or edit the existing buyer.");
                const bid = v.id || crypto.randomUUID();
                if (v.id) {
                    buyer(v.id);
                    cmds.push(update("buyers", { name: v.name, group: v.group, contact: v.contact, privateNotes: v.privateNotes }, "id", bid));
                    for (const x of data.sales.filter((x: Row) => x.buyerId === bid))
                        cmds.push(statement("UPDATE ownership SET party=? WHERE saleId=? AND kind='buyer'", v.name, x.id));
                }
                else
                    cmds.push(insert("buyers", { ...v, id: bid, eventId }));
                recordId = bid;
                break;
            }
            case "status": {
                const status = z.enum(["SETUP", "READY", "LIVE", "PAUSED", "COMPLETED"]).parse(p.status);
                if (["READY", "LIVE"].includes(status))
                    requireThat(data.teams.length && data.flights.length, "Add flights and teams first.");
                if (status === "COMPLETED")
                    requireThat(!data.state.teamId, "Sell or mark the current team unsold before completing the auction.");
                cmds.push(update("events", { status }, "id", eventId), update("auction_state", { paused: status === "PAUSED" ? 1 : 0, ...(status === "LIVE" && !data.state.startedAt ? { startedAt: now } : {}) }, "eventId", eventId));
                if (status === "LIVE" && !data.state.teamId)
                    setBlock(data.teams.find((t: Row) => t.status === "UPCOMING") || null);
                break;
            }
            case "block": {
                requireThat(e.status !== "COMPLETED", "Restart the auction before putting a team on the block.");
                const t = team(id.parse(p.id));
                requireThat(["UPCOMING", "UNSOLD"].includes(t.status), "Only upcoming or unsold teams can go on the block.");
                setBlock(t);
                recordId = t.id;
                break;
            }
            case "bid": {
                requireThat(e.status === "LIVE" && !data.state.paused, "Resume the auction before entering bids.");
                requireThat(data.state.teamId === p.teamId, "The team on the block has changed.");
                z.boolean().optional().parse(p.correction);
                const amount = cents.parse(p.amount);
                const trackedBuyer = s.trackBidder && p.buyerId ? buyer(id.parse(p.buyerId)).id : null;
                requireThat(amount > 0 && amount >= s.minBid, "Bid is below the starting minimum.");
                if (!p.correction && data.state.bid > 0 && amount !== data.state.bid)
                    requireThat(amount >= data.state.bid + s.increment, "Bid must meet the minimum increment. Use Correct bid to lower it.");
                cmds.push(update("auction_state", { bid: amount, buyerId: trackedBuyer }, "eventId", eventId));
                recordId = p.teamId;
                break;
            }
            case "sell": {
                requireThat(e.status === "LIVE" && !data.state.paused, "Resume the auction before selling.");
                requireThat(data.state.teamId === p.teamId, "The team on the block has changed.");
                const t = team(id.parse(p.teamId));
                requireThat(t.status === "ON_BLOCK" && data.state.bid >= s.minBid && data.state.bid > 0, "Enter a valid bid before selling.");
                requireThat(data.state.bid === p.amount, "The bid changed. Review the sale again.");
                const b = buyer(id.parse(p.buyerId)), sid = crypto.randomUUID();
                cmds.push(insert("sales", { id: sid, eventId, teamId: t.id, buyerId: b.id, amount: data.state.bid, status: "ACTIVE", createdAt: now, notes: "" }), insert("ownership", { id: crypto.randomUUID(), saleId: sid, party: b.name, percent: 10000, consideration: data.state.bid, status: "Completed", kind: "buyer" }));
                const next = s.autoAdvance ? data.teams.find((x: Row) => x.status === "UPCOMING") : null;
                setBlock(next || null);
                cmds.push(update("teams", { status: "SOLD" }, "id", t.id));
                recordId = sid;
                break;
            }
            case "sale_edit": {
                const x = sale(id.parse(p.id)), amount = cents.refine(v => v > 0).parse(p.amount), b = buyer(id.parse(p.buyerId));
                cmds.push(update("sales", { amount, buyerId: b.id, notes: note.parse(p.notes) }, "id", x.id), statement("UPDATE ownership SET party=?,consideration=? WHERE saleId=? AND kind='buyer'", b.name, amount, x.id));
                if (s.buybackPriceMode === "proportional")
                    cmds.push(statement("UPDATE ownership SET consideration=CAST(round(?*percent/10000.0) AS INTEGER) WHERE saleId=? AND kind='team'", amount, x.id));
                recordId = x.id;
                break;
            }
            case "sale_void":
            case "sale_reopen": {
                const x = sale(id.parse(p.id));
                cmds.push(update("sales", { status: action === "sale_void" ? "VOID" : "REOPENED", notes: note.parse(p.notes) }, "id", x.id), update("teams", { status: action === "sale_void" ? "UNSOLD" : "UPCOMING", finish: null }, "id", x.teamId));
                recordId = x.id;
                break;
            }
            case "buyback": {
                requireThat(s.buybackMode === "track", "Enable Track ownership to record a private buyback.");
                const x = sale(id.parse(p.saleId)), pct = percent.parse(p.percent), status = z.enum(["Pending Buyback", "Declined", "Completed", "Not Offered", "Not Applicable"]).parse(p.status);
                requireThat(pct <= s.buybackMax, "Buyback exceeds the maximum in house rules.");
                if (status === "Completed") {
                    requireThat(pct > 0, "A completed buyback needs an ownership percentage.");
                    requireThat(!s.buybackDeadline || Date.now() <= Date.parse(s.buybackDeadline), "The buyback deadline has passed.");
                }
                const actual = status === "Completed" ? pct : 0, consideration = status === "Completed" ? (s.buybackPriceMode === "fixed" ? s.buybackFixed : Math.round(x.amount * pct / 10000)) : 0;
                cmds.push(statement('DELETE FROM ownership WHERE saleId=?', x.id), insert("ownership", { id: crypto.randomUUID(), saleId: x.id, party: buyer(x.buyerId).name, percent: 10000 - actual, consideration: x.amount, status: "Completed", kind: "buyer" }), insert("ownership", { id: crypto.randomUUID(), saleId: x.id, party: team(x.teamId).name, percent: actual, consideration, status, kind: "team" }));
                recordId = x.id;
                break;
            }
            case "settlement_record":
            case "settlement_reverse": {
                const kind = z.enum(["receipt", "payout"]).parse(p.kind), table = kind === "receipt" ? "settlement_payments" : "payout_disbursements";
                const entries = kind === "receipt" ? data.payments : data.disbursements;
                if (action === "settlement_reverse") {
                    const original = entries.find((r: Row) => r.id === id.parse(p.id));
                    requireThat(original && original.amount > 0, "Choose an existing positive payment to reverse.");
                    requireThat(!entries.some((r: Row) => r.reversalOf === original.id), "This entry has already been reversed.");
                    const reason = z.string().trim().min(1).max(1000).parse(p.note);
                    recordId = crypto.randomUUID();
                    cmds.push(insert(table, { ...original, id: recordId, amount: -original.amount, reversalOf: original.id, occurredAt: now, createdAt: now, actor: who.email, note: reason }));
                } else {
                    const partyKind = kind === "receipt" ? "buyer" : z.enum(["buyer", "team"]).parse(p.partyKind), partyId = id.parse(p.partyId);
                    (partyKind === "buyer" ? buyer : team)(partyId);
                    const account = (kind === "receipt" ? data.settlement.receipts : data.settlement.payables).find((r: Row) => r.id === partyId && r.kind === partyKind);
                    requireThat(account, "No purchases or payout entitlement exists for this party.");
                    if (kind === "payout") requireThat(e.status === "COMPLETED", "Complete the auction and enter results before recording payouts.");
                    const amount = cents.refine(v => v > 0).parse(p.amount);
                    requireThat(amount <= account.balance, "Amount exceeds the remaining balance. Review the account before recording.");
                    const occurredAt = z.string().datetime().parse(p.occurredAt), method = z.enum(["Cash", "Check", "Venmo", "Other"]).parse(p.method);
                    recordId = crypto.randomUUID();
                    cmds.push(insert(table, { id: recordId, eventId, buyerId: partyKind === "buyer" ? partyId : null, ...(kind === "payout" ? { teamId: partyKind === "team" ? partyId : null } : {}), amount, occurredAt, method, note: z.string().max(1000).parse(p.note || ""), createdAt: now, actor: who.email }));
                }
                break;
            }
            case "results": {
                requireThat(e.status === "COMPLETED", "Complete the auction before recording finishing positions.");
                const rows = z.array(z.object({ teamId: id, finish: z.number().int().min(1).max(500).nullable() })).max(500).parse(p.rows);
                const positions = new Set<string>();
                for (const r of rows) {
                    const t = team(r.teamId);
                    if (r.finish) {
                        requireThat(t.status !== "WITHDRAWN", "Withdrawn teams cannot place.");
                        const f = flight(t.flightId), pool = s.poolMode === "combined" || s.poolMode === "custom" && !f.ownPool ? "combined" : f.id, key = pool + ":" + r.finish;
                        requireThat(!positions.has(key), "Each payout pool needs unique finishing positions. Resolve ties before entering results.");
                        positions.add(key);
                    }
                }
                requireThat(rows.length === data.teams.length && new Set(rows.map(r => r.teamId)).size === rows.length, "Submit finishing positions for every team.");
                rows.forEach(r => cmds.push(update("teams", { finish: r.finish }, "id", r.teamId)));
                break;
            }
            case "reset_demo": {
                requireThat(e.demo && p.confirmation === "RESET DEMO DATA", "Type RESET DEMO DATA to clear this demonstration event.");
                cmds.push(statement('DELETE FROM settlement_payments WHERE eventId=?', eventId), statement('DELETE FROM payout_disbursements WHERE eventId=?', eventId), update("auction_state", { teamId: null, bid: 0, buyerId: null, startedAt: null, paused: 0 }, "eventId", eventId), statement('DELETE FROM ownership WHERE saleId IN (SELECT id FROM sales WHERE eventId=?)', eventId), statement('DELETE FROM sales WHERE eventId=?', eventId), statement('DELETE FROM teams WHERE eventId=?', eventId), statement('DELETE FROM buyers WHERE eventId=?', eventId), statement('DELETE FROM payout_rules WHERE eventId=?', eventId), statement('DELETE FROM flights WHERE eventId=?', eventId), update("events", { status: "SETUP", demo: 0 }, "id", eventId));
                break;
            }
            case "undo": {
                const last = await statement("SELECT * FROM audit WHERE eventId=? AND before IS NOT NULL AND undone=0 AND action<>'undo' ORDER BY createdAt DESC LIMIT 1", eventId).first<Row>();
                requireThat(last, "There is no action to undo.");
                const snapshot = JSON.parse(last!.before);
                before = JSON.stringify(data);
                // Preserve the transaction trail through ordinary auction undo. Settlement undo appends a compensation.
                const payments = last!.action === "reset_demo" ? (snapshot.payments || []) : data.payments;
                const disbursements = last!.action === "reset_demo" ? (snapshot.disbursements || []) : data.disbursements;
                for (const r of [...payments, ...disbursements]) {
                    requireThat(!r.buyerId || snapshot.buyers.some((b: Row) => b.id === r.buyerId), "This buyer has settlement history. Reverse payments and use an explicit correction instead of removing the buyer.");
                    requireThat(!r.teamId || snapshot.teams.some((t: Row) => t.id === r.teamId), "This team has payout history and cannot be removed by undo.");
                }
                cmds.push(statement('DELETE FROM settlement_payments WHERE eventId=?', eventId), statement('DELETE FROM payout_disbursements WHERE eventId=?', eventId));
                cmds.push(update("auction_state", { teamId: null, bid: 0, buyerId: null }, "eventId", eventId), statement('DELETE FROM ownership WHERE saleId IN (SELECT id FROM sales WHERE eventId=?)', eventId), statement('DELETE FROM sales WHERE eventId=?', eventId), statement('DELETE FROM players WHERE teamId IN (SELECT id FROM teams WHERE eventId=?)', eventId), statement('DELETE FROM teams WHERE eventId=?', eventId), statement('DELETE FROM buyers WHERE eventId=?', eventId), statement('DELETE FROM payout_rules WHERE eventId=?', eventId), statement('DELETE FROM flights WHERE eventId=?', eventId));
                for (const f of snapshot.flights)
                    cmds.push(insert("flights", f));
                for (const t of snapshot.teams) {
                    const { players, ...row } = t;
                    cmds.push(insert("teams", row));
                }
                for (const p of snapshot.players)
                    cmds.push(insert("players", p));
                for (const b of snapshot.buyers)
                    cmds.push(insert("buyers", b));
                for (const x of snapshot.sales)
                    cmds.push(insert("sales", x));
                for (const o of snapshot.ownership)
                    cmds.push(insert("ownership", o));
                for (const r of snapshot.payoutRules)
                    cmds.push(insert("payout_rules", r));
                for (const r of payments) cmds.push(insert("settlement_payments", r));
                for (const r of disbursements) cmds.push(insert("payout_disbursements", r));
                if (last!.action.startsWith("settlement_")) {
                    const payload = JSON.parse(last!.after), isReceipt = payload.kind === "receipt", entries = isReceipt ? payments : disbursements;
                    const original = entries.find((r: Row) => r.id === last!.recordId);
                    requireThat(original && !entries.some((r: Row) => r.reversalOf === original.id), "That payment was already corrected. Use Settlement to review its history.");
                    cmds.push(insert(isReceipt ? "settlement_payments" : "payout_disbursements", { ...original, id: crypto.randomUUID(), amount: -original.amount, reversalOf: original.id, occurredAt: now, createdAt: now, actor: who.email, note: "Undo: " + last!.action.replaceAll("_", " ") }));
                }
                const { id: _, revision: rv, boardRevision: br, ...eventFields } = snapshot.event;
                cmds.push(update("events", { ...eventFields, settings: JSON.stringify(snapshot.event.settings), updatedAt: now }, "id", eventId), update("auction_state", snapshot.state, "eventId", eventId), update("audit", { undone: 1 }, "id", last!.id));
                recordId = last!.id;
                break;
            }
            default: throw Error("Unknown auction action.");
        }
        cmds.push(insert("audit", { id: requestId, eventId, actor: who.email, action, recordId, before: action === "undo" ? null : before, after: JSON.stringify(p), createdAt: now }), statement('DELETE FROM mutation_guards WHERE id=?', requestId));
        await db().batch(cmds);
        return Response.json({ ok: true, recordId, revision: revision + 1 });
    }
    catch (error) {
        console.error("Auction write rejected", error);
        let message = error instanceof z.ZodError ? error.issues.map(i => i.message).join(" ") : error instanceof Error ? error.message : "Unable to save.";
        const conflict = /revision_must_match|UNIQUE constraint|Another operator|changed/.test(message);
        if (/D1_ERROR|SQLITE|constraint|database/i.test(message))
            message = conflict ? "Another operator changed this event. Refresh and try again." : "The change could not be saved. No partial change was applied.";
        return Response.json({ error: message }, { status: conflict ? 409 : 400 });
    }
}
