import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { compute, defaultSettings, normalizeSettings, type Row } from "./model";
import { settlement } from './settlement';
export function db(): D1Database { if (!env.DB)
    throw Error("Auction storage is unavailable."); return env.DB; }
// Owners come only from the ADMIN_EMAILS allowlist; the operators table never holds an owner (D-CAL-4).
export function ownerEmails(): string[] { return (env.ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean); }
export async function identity() { const user = await getChatGPTUser(); if (!user)
    return null; const owners = ownerEmails(); const email = user.email.toLowerCase(); const owner = owners.includes(email); const operator = owner || !!await db().prepare('SELECT email FROM operators WHERE email=?').bind(email).first(); return { ...user, email, owner, operator }; }
export const tableNames = ["flights", "teams", "players", "buyers", "auction_state", "sales", "ownership", "payout_rules"] as const;
export function statement(sql: string, ...args: any[]) { return db().prepare(sql).bind(...args.map(x => x === undefined ? null : x)); }
export function insert(table: string, row: Row) { const keys = Object.keys(row); return statement('INSERT INTO "' + table + '" (' + keys.map(k => '"' + k + '"').join(",") + ') VALUES (' + keys.map(() => "?").join(",") + ')', ...keys.map(k => row[k])); }
export function update(table: string, row: Row, key: string, value: any) { return statement('UPDATE "' + table + '" SET ' + Object.keys(row).map(k => '"' + k + '"=?').join(",") + ' WHERE "' + key + '"=?', ...Object.values(row), value); }
export async function read(eventId?: string): Promise<Row | null> {
    if (!eventId) {
        const event = await db().prepare('SELECT id FROM events ORDER BY createdAt DESC LIMIT 1').first<Row>();
        if (!event)
            return null;
        eventId = event.id;
    }
    const results = await db().batch([
        statement('SELECT * FROM events WHERE id=?', eventId),
        statement('SELECT * FROM flights WHERE eventId=? ORDER BY "order",id', eventId),
        statement('SELECT * FROM teams WHERE eventId=? ORDER BY "order",id', eventId),
        statement('SELECT p.* FROM players p JOIN teams t ON p.teamId=t.id WHERE t.eventId=? ORDER BY p."order"', eventId),
        statement('SELECT * FROM buyers WHERE eventId=? ORDER BY name', eventId),
        statement('SELECT * FROM auction_state WHERE eventId=?', eventId),
        statement('SELECT * FROM sales WHERE eventId=? ORDER BY createdAt DESC,id', eventId),
        statement('SELECT o.* FROM ownership o JOIN sales s ON o.saleId=s.id WHERE s.eventId=?', eventId),
        statement('SELECT * FROM payout_rules WHERE eventId=? ORDER BY place', eventId),
        statement('SELECT * FROM settlement_payments WHERE eventId=? ORDER BY createdAt,id', eventId),
        statement('SELECT * FROM payout_disbursements WHERE eventId=? ORDER BY createdAt,id', eventId)
    ]);
    const rows = results.map(r => r.results as Row[]);
    if (!rows[0][0])
        return null;
    const event = { ...rows[0][0], settings: normalizeSettings(JSON.parse(rows[0][0].settings)) };
    const data: Row = { event, flights: rows[1], teams: rows[2].map(t => ({ ...t, players: rows[3].filter(p => p.teamId === t.id).map(p => p.name) })), players: rows[3], buyers: rows[4], state: rows[5][0], sales: rows[6], ownership: rows[7], payoutRules: rows[8] };
    data.totals = compute(data);
    data.payments = rows[9]; data.disbursements = rows[10]; data.settlement = settlement(data);
    return data;
}
export async function readLive(eventId: string): Promise<Row | null> {
    const r = await db().batch([
        statement('SELECT * FROM events WHERE id=?', eventId),
        statement('SELECT * FROM auction_state WHERE eventId=?', eventId),
        statement('SELECT t.* FROM teams t JOIN auction_state a ON a.teamId=t.id WHERE a.eventId=?', eventId),
        statement('SELECT p.* FROM players p JOIN auction_state a ON p.teamId=a.teamId WHERE a.eventId=? ORDER BY p."order"', eventId),
        statement('SELECT b.id,b.name FROM buyers b JOIN auction_state a ON a.buyerId=b.id WHERE a.eventId=?', eventId)
    ]);
    const rows = r.map(x => x.results as Row[]);
    if (!rows[0][0])
        return null;
    return { event: { ...rows[0][0], settings: normalizeSettings(JSON.parse(rows[0][0].settings)) }, state: rows[1][0], teams: rows[2].map(t => ({ ...t, players: rows[3].map(p => p.name) })), buyers: rows[4] };
}
export function publicView(d: Row, light = false) {
    const s = d.event.settings;
    const { privateNotes: _p, ...ignore } = d.event;
    const event = { id: d.event.id, name: d.event.name, calcuttaName: d.event.calcuttaName, course: d.event.course, dates: d.event.dates, auctionAt: d.event.auctionAt, status: d.event.status, description: d.event.description, rules: d.event.rules, currency: d.event.currency, demo: d.event.demo, revision: d.event.revision, boardRevision: d.event.boardRevision, updatedAt: d.event.updatedAt, settings: Object.fromEntries(Object.entries(s).filter(([k]) => k.startsWith("show") || ["theme", "trackBidder", "buybackMode", "buybackSuggested", "poolMode", "buybackMax", "buybackDeadline", "buybackPriceMode", "buybackFixed", "deductionType", "deduction"].includes(k))) };
    const cleanTeam = (t: Row) => ({ id: t.id, flightId: t.flightId, name: t.name, players: t.players, status: t.status, order: s.showUpcoming ? t.order : undefined, handicap: s.showHandicap ? t.handicap : undefined, seed: s.showHandicap ? t.seed : undefined, notes: t.notes, finish: t.finish });
    const current = d.teams.find((t: Row) => t.id === d.state?.teamId);
    const state = { teamId: d.state?.teamId, bid: s.showBid ? d.state?.bid : undefined, buyer: s.showBidder && s.trackBidder ? d.buyers.find((b: Row) => b.id === d.state?.buyerId)?.name : undefined, team: current ? cleanTeam(current) : null, paused: d.state?.paused };
    if (light)
        return { event, state, light: true };
    const totals = { sold: d.totals.sold, remaining: d.totals.remaining, ...(s.showTotalPool ? { gross: d.totals.gross, deduction: d.totals.deduction, net: d.totals.net } : {}), ...(s.showSalePrice ? { average: d.totals.average, highest: d.totals.highest, lowest: d.totals.lowest } : {}), pools: s.showFlightPools ? d.totals.pools.map((p: Row) => ({ id: p.id, name: p.name, color: p.color, sold: p.sold, teams: p.teams, gross: p.gross, net: p.net, deduction: p.deduction, payouts: s.showPayouts ? p.payouts.map((r: Row) => ({ place: r.place, percent: r.percent, amount: r.amount })) : [] })) : [] };
    return { event, state, flights: d.flights.map((f: Row) => ({ id: f.id, name: f.name, color: f.color, ownPool: f.ownPool })), teams: d.teams.map(cleanTeam).sort((a: Row, b: Row) => s.showUpcoming ? a.order - b.order : a.name.localeCompare(b.name)), sales: d.sales.filter((x: Row) => x.status === "ACTIVE").map((x: Row) => ({ id: x.id, teamId: x.teamId, createdAt: x.createdAt, amount: s.showSalePrice ? x.amount : undefined, buyer: s.showBuyer ? d.buyers.find((b: Row) => b.id === x.buyerId)?.name : undefined, ownership: s.showBuyback && s.buybackMode === "track" ? d.ownership.filter((o: Row) => o.saleId === x.id).map((o: Row) => ({ party: o.kind === "buyer" && !s.showBuyer ? "Purchaser" : o.party, percent: o.percent, status: o.status, kind: o.kind })) : undefined })), totals };
}
export function freshEvent(input: Row, actor: string, demo: boolean, requestId: string) {
    const now = new Date().toISOString(), id = crypto.randomUUID();
    const event = { id, name: input.name, calcuttaName: input.calcuttaName || input.name, course: input.course || "", dates: input.dates || "", auctionAt: input.auctionAt || "", status: "SETUP", description: input.description || "", rules: "Bids are called in the room. Sales are recorded by the operator. Buybacks are arranged directly with the buyer; they do not increase the pool. Payments are handled outside this application and may be recorded manually by the operator.", currency: "USD", settings: JSON.stringify(demo ? { ...defaultSettings, trackBidder: true, buybackMode: "track" } : defaultSettings), demo: demo ? 1 : 0, revision: 0, boardRevision: 0, createdAt: now, updatedAt: now };
    return { id, event, commands: [insert("events", event), insert("auction_state", { eventId: id, bid: 0, paused: 0 }), insert("audit", { id: requestId, eventId: id, actor, action: demo ? "load_demo" : "create_event", after: JSON.stringify(input), createdAt: now })] };
}
