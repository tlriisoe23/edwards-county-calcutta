import { themeIds } from '@/lib/themes';
import { z } from "zod";
import { db, statement, insert, insertMany, update, read, freshEvent, identity, ownerEmails, leaderboardUrl } from "@/lib/store";
import { defaultSettings, type Row, tournamentDates } from "@/lib/model";
import { twoDayFlights, twoDayTeams } from "@/lib/demo-two-day";
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
// PORTABLE-STUB-START
// Local user accounts (Tools -> Local Users) exist only in the self-hosted portable deployment
// (portable/sessions.mjs, scrypt-hashed, operator-level only per D-CAL-4). scripts/stage-portable.mjs
// replaces this block with a real import at staging time, mirroring the existing publicOrigin()
// precedent above. The plain Sites/ChatGPT build keeps these throwing stubs so it still compiles;
// that deployment target is not production (see AGENTS.md) and local accounts are out of scope for it.
function portableOnly(): never { throw Error("Local accounts require the portable deployment."); }
const createLocalUser: (username: string, displayName: string, password: string, createdBy: string, email?: string) => void = portableOnly;
const listLocalUsers: () => { username: string; email: string; display_name: string; enabled: number; created_by: string; created_at: string }[] = portableOnly;
const setLocalUserEnabled: (username: string, enabled: boolean) => void = portableOnly;
const resetLocalUserPassword: (username: string, password: string) => void = portableOnly;
// PORTABLE-STUB-END
function settingsSchema() { return z.object({ theme: z.enum(themeIds).optional(), trackBidder: z.boolean(), quickStarts: z.array(cents.refine(v => v > 0)).min(1).max(8), buybackMode: z.enum(["off", "calculate", "track"]), buybackSuggested: percent, minBid: cents, increment: cents.refine(v => v > 0), quickIncrements: z.array(cents.refine(v => v > 0)).min(1).max(8), poolMode: z.enum(["separate", "combined", "custom"]), deductionType: z.enum(["none", "percent", "fixed"]), deduction: cents, buybackMax: percent, buybackPriceMode: z.enum(["proportional", "fixed"]), buybackFixed: cents, buybackDeadline: z.string().max(40), autoAdvance: z.boolean(), showBidder: z.boolean(), showBid: z.boolean(), showBuyer: z.boolean(), showSalePrice: z.boolean(), showUpcoming: z.boolean(), showHandicap: z.boolean(), showPayouts: z.boolean(), showBuyback: z.boolean(), showTotalPool: z.boolean(), showFlightPools: z.boolean() }).superRefine((s, c) => { if (s.deductionType === "percent" && s.deduction > 10000)
    c.addIssue({ code: "custom", message: "Deduction cannot exceed 100%." });
    // D-CAL-2: a positive opening bid is required, and "no house cut" is only ever the None type — never a blank or zero amount.
    if (s.minBid < 100) c.addIssue({ code: "custom", message: "Enter a minimum starting bid of at least $1.00" });
    if (s.deductionType !== "none" && s.deduction <= 0) c.addIssue({ code: "custom", message: "Enter a house deduction greater than 0, or choose None." });
    if (s.buybackDeadline && !Number.isFinite(Date.parse(s.buybackDeadline)))
    c.addIssue({ code: "custom", message: "Enter a valid buyback deadline." }); }); }
// The leaderboard's anonymous board endpoint, over the private wire (D-CAL-17).
// Read-only, one direction, and only when an operator asks — never a poll.
// Everything this product imports is on it, and only while that event's
// Calcutta board is switched on, which is exactly when a Calcutta is being
// run. That is the permission check, and it enforces itself.
async function readLeaderboard(slug?: string): Promise<Row> {
    const base = leaderboardUrl();
    requireThat(base, "No leaderboard is configured for this installation. Paste the rows instead.");
    let r: Response;
    try {
        r = await fetch(base + "/api/board" + (slug ? "?event=" + encodeURIComponent(slug) : ""), { signal: AbortSignal.timeout(8000), headers: { accept: "application/json" } });
    } catch (error) {
        const why = error instanceof Error && error.name === "TimeoutError" ? "did not answer in time" : "could not be reached";
        throw Error(`The leaderboard ${why}. Paste the rows instead.`);
    }
    requireThat(r.ok, `The leaderboard answered ${r.status}. Paste the rows instead.`);
    const board = await r.json() as Row;
    const event = board.event as Row | null;
    requireThat(event, "That leaderboard event no longer exists.");
    const field = (event!.calcutta?.field ?? []) as Row[];
    const competitors = (event!.competitors ?? []) as Row[];
    const pops = new Map(field.map((a) => [a.id as string, a]));
    // Only teams the leaderboard actually placed in a flight: anybody it left
    // out did not qualify, and inventing a flight for them here would be this
    // product deciding something that is not its to decide.
    const rows = competitors
        .filter((c) => pops.has(c.id as string))
        .map((c) => {
            const a = pops.get(c.id as string)!;
            return {
                name: String(c.name ?? "").trim(),
                players: String(c.members ?? "").split("·").map((x) => x.trim()).filter(Boolean),
                flight: String(a.flight ?? "").trim(),
                pop: Number(a.pop ?? 0),
            };
        });
    return {
        event: { name: String(event!.name ?? ""), slug: event!.slug, locked: !!event!.calcutta?.locked, course: String(event!.course ?? ""), start: String(event!.start ?? ""), end: String(event!.end ?? ""), status: String(event!.status ?? "") },
        // In the leaderboard's own order, so flights created from this list
        // come out in the order the board prints them rather than
        // alphabetically or in whatever order the field happened to be ranked.
        flights: ((event!.flights ?? []) as string[]).filter(Boolean),
        events: ((board.events ?? []) as Row[]).map((e) => ({ slug: e.slug, name: e.name, status: e.status })),
        rows,
        // Said plainly rather than left as an empty list: an event whose
        // Calcutta is switched off looks identical to one with no teams.
        note: rows.length === 0 ? "That event has no flighted Calcutta field yet. Draw the flights on the leaderboard first." : "",
    };
}

export async function GET(request: Request) { try {
    const who = await identity();
    if (!who?.operator)
        return Response.json({ error: "Operator access required." }, { status: 403 });
    const q = new URL(request.url).searchParams;
    const events = (await db().prepare('SELECT id,name,demo,status FROM events ORDER BY createdAt DESC').all()).results;
    const data = await read(q.get("event") || undefined);
    const audit = data ? (await statement('SELECT id,actor,action,recordId,createdAt,undone FROM audit WHERE eventId=? ORDER BY createdAt DESC LIMIT 100', data.event.id).all()).results : [];
    const operators = who.owner ? (await db().prepare('SELECT email,addedBy,createdAt FROM operators ORDER BY email').all()).results : [];
    const owners = who.owner ? ownerEmails() : [];
    let localUsers: Row[] = [];
    if (who.owner) { try { localUsers = listLocalUsers(); } catch { /* not the portable deployment target */ } }
    return Response.json({ data, events, audit, operators, owners, localUsers, leaderboard: !!leaderboardUrl(), user: { email: who.email, owner: who.owner } }, { headers: { "Cache-Control": "private, no-store" } });
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
            const requestedEventId = body.eventId == null ? undefined : id.parse(body.eventId);
            const auditAction = action + " " + email;
            const replay = async () => {
                const prior = await statement('SELECT eventId,actor,action FROM audit WHERE id=?', requestId).first<Row>();
                if (!prior) return false;
                requireThat(prior.actor === who.email && prior.action === auditAction && (!requestedEventId || prior.eventId === requestedEventId), "This request ID changed its action, operator or event. Submit a new request.");
                return true;
            };
            if (await replay()) return Response.json({ ok: true, duplicate: true });
            if (action === "operator_add") {
                // D-CAL-4: owners are never stored as operators, and a repeated grant changes nothing — so neither writes an audit entry.
                requireThat(!ownerEmails().includes(email), email + " is already an owner. Owners are managed in the site settings, not here.");
                if (await statement('SELECT email FROM operators WHERE email=?', email).first()) {
                    // A concurrent retry of the same request may have committed the row between the replay check and here.
                    if (await replay()) return Response.json({ ok: true, duplicate: true });
                    throw Error(email + " already has access.");
                }
            }
            // Access is global, but every change needs a valid, durable audit context.
            const auditEvent = await (requestedEventId
                ? statement('SELECT id FROM events WHERE id=?', requestedEventId)
                : db().prepare('SELECT id FROM events ORDER BY createdAt DESC LIMIT 1')).first<Row>();
            requireThat(auditEvent, requestedEventId ? "Event not found. Refresh before changing operator access." : "Create an event before managing operator access.");
            const now = timestamp();
            try {
                await db().batch([
                    insert("audit", { id: requestId, eventId: auditEvent!.id, actor: who.email, action: auditAction, after: JSON.stringify({ email }), createdAt: now }),
                    action === "operator_add"
                        ? statement('INSERT INTO operators (email,addedBy,createdAt) VALUES (?,?,?) ON CONFLICT(email) DO NOTHING', email, who.email, now)
                        : statement('DELETE FROM operators WHERE email=?', email)
                ]);
            } catch (error) {
                // Concurrent retries can reach the unique audit ID together. A matching
                // committed entry proves both statements completed; never reapply it.
                if (await replay()) return Response.json({ ok: true, duplicate: true });
                throw error;
            }
            return Response.json({ ok: true });
        }
        if (action === "local_user_create" || action === "local_user_set_enabled" || action === "local_user_reset_password") {
            requireThat(who.owner, "Only the owner can manage local user accounts.");
            const username = z.string().trim().min(2).max(40).regex(/^[a-z0-9][a-z0-9._-]{1,39}$/i, "Use a username of 2–40 letters, digits, dots, dashes or underscores.").parse(p.username).toLowerCase();
            const email = z.string().trim().max(254).default("").parse(p.email ?? "").toLowerCase();
            requireThat(!email || z.string().email().safeParse(email).success, "That email address does not look right.");
            requireThat(!ownerEmails().includes(username) && !ownerEmails().includes(email), "The owner cannot also have a separate local login.");
            const auditAction = action + " " + username;
            const replay = async () => {
                const prior = await statement('SELECT actor,action FROM audit WHERE id=?', requestId).first<Row>();
                if (!prior)
                    return false;
                requireThat(prior.actor === who.email && prior.action === auditAction, "This request ID changed its action or operator. Submit a new request.");
                return true;
            };
            if (await replay())
                return Response.json({ ok: true, duplicate: true });
            const auditEvent = await db().prepare('SELECT id FROM events ORDER BY createdAt DESC LIMIT 1').first<Row>();
            requireThat(auditEvent, "Create an event before managing local user accounts.");
            const now = timestamp();
            // Local accounts live in the portable runtime's own SQLite connection, a separate API
            // surface from the D1-style statements batched elsewhere in this route (see D-CAL-7 /
            // BATCH-CAL-UI2.md) — the account write and the audit entry are two sequential steps,
            // not one atomic batch. The account change is the source of truth for sign-in; a lost
            // audit row on a rare mid-request failure is a traceability gap, not a security issue.
            let after: Row;
            if (action === "local_user_create") {
                const displayName = z.string().trim().min(1).max(150).parse(p.displayName);
                const password = z.string().min(14, "Use a password between 14 and 1024 characters.").max(1024).parse(p.password);
                requireThat(password === p.confirmPassword, "Passwords do not match.");
                try {
                    createLocalUser(username, displayName, password, who.email, email);
                }
                catch (e) {
                    if (await replay())
                        return Response.json({ ok: true, duplicate: true });
                    throw e;
                }
                after = { username, email, displayName };
            }
            else if (action === "local_user_set_enabled") {
                const enabled = z.boolean().parse(p.enabled);
                setLocalUserEnabled(username, enabled);
                after = { username, enabled };
            }
            else {
                const password = z.string().min(14, "Use a password between 14 and 1024 characters.").max(1024).parse(p.password);
                requireThat(password === p.confirmPassword, "Passwords do not match.");
                resetLocalUserPassword(username, password);
                after = { username };
            }
            await insert("audit", { id: requestId, eventId: auditEvent!.id, actor: who.email, action: auditAction, after: JSON.stringify(after), createdAt: now }).run();
            return Response.json({ ok: true });
        }
        if (action === "create_event" || action === "load_demo") {
            // Which demo: the twelve-team one mid-auction, for practising the
            // console, or the fifty-team two-day two-man the club actually runs
            // (WC-7), which starts before the first lot so the evening itself
            // can be rehearsed.
            const twoDay = action === "load_demo" && z.object({ variant: z.string().optional() }).parse(p).variant === "twoDay";
            const input = action === "load_demo" ? (twoDay
                ? { name: "Edwards County Two Day Two Man — Demo", course: "Edwards County Golf Course", dates: "September 26–27, 2026", auctionAt: "2026-09-26T18:00" }
                : { name: "Edwards County Calcutta Invitational", course: "Edwards County Golf Course", dates: "September 19–20, 2026", auctionAt: "2026-09-18T18:00" }) : z.object({ name: text, course: z.string().max(150).default(""), calcuttaName: z.string().max(150).optional(), dates: z.string().max(100).optional(), auctionAt: z.string().max(40).optional(), description: note }).parse(p);
            const replay = async () => {
                const prior = await statement('SELECT eventId,actor,action,"after" FROM audit WHERE id=?', requestId).first<Row>();
                if (!prior) return null;
                requireThat(prior.actor === who.email && prior.action === action && prior.after === JSON.stringify(input), "This request ID changed its action, operator or creation details. Submit a new request.");
                return prior.eventId as string;
            };
            const existing = await replay();
            if (existing) return Response.json({ ok: true, duplicate: true, eventId: existing });
            const created = freshEvent(input, who.email, action === "load_demo", requestId);
            const cmds = created.commands;
            if (twoDay) {
                // Four flights, the same split the leaderboard drew from day one,
                // and no sales: the auction has not happened yet, which is the
                // whole point of rehearsing against it.
                // Grouped into one statement per table: a hundred and seventy
                // separate inserts is enough to make the local D1 runner drop
                // the connection, and this batch has to commit as a unit.
                const flightIds = twoDayFlights.map(() => crypto.randomUUID());
                cmds.push(...insertMany("flights", twoDayFlights.map((name, i) =>
                    ({ id: flightIds[i], eventId: created.id, name, order: i, color: ["#b79a59", "#889b75", "#6f8aa6", "#9b7f95"][i], ownPool: 1 }))));
                cmds.push(...insertMany("payout_rules", twoDayFlights.flatMap((_, i) =>
                    [5000, 3000, 2000].map((percent, j) =>
                        ({ id: crypto.randomUUID(), eventId: created.id, poolId: flightIds[i], place: j + 1, percent })))));
                const teamIds = twoDayTeams.map(() => crypto.randomUUID());
                cmds.push(...insertMany("teams", twoDayTeams.map(([name, , , flight, pop], i) => ({
                    id: teamIds[i], eventId: created.id, flightId: flightIds[flight], name,
                    // The pop, carried where this product already keeps a
                    // per-team number the room can see.
                    handicap: pop,
                    seed: i + 1, notes: "", privateNotes: "Demonstration team", order: i, status: "UPCOMING",
                }))));
                cmds.push(...insertMany("players", twoDayTeams.flatMap(([, one, two], i) =>
                    [one, two].map((name, j) => ({ id: crypto.randomUUID(), teamId: teamIds[i], name, order: j })))));
                // Buyers who would already be in the room, so the first sale can
                // be recorded without typing a name first. No sales: nothing has
                // been bought yet.
                cmds.push(...insertMany("buyers", ["The Johnson Group", "Taylor Syndicate", "The Weekend Club", "Table Six Syndicate", "Smith Family", "Back Nine Partners", "Clubhouse Table 4", "The Cart Barn"].map((name, i) =>
                    ({ id: crypto.randomUUID(), eventId: created.id, name, group: i === 3 ? "Table 6" : "", contact: "fictional@example.test", privateNotes: "Fictional demonstration buyer" }))));
            } else if (action === "load_demo") {
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
            try {
                // Event, initial records and request result commit together. A racing
                // retry loses the unique audit ID and its entire batch rolls back.
                await db().batch(cmds);
            } catch (error) {
                const committed = await replay();
                if (committed) return Response.json({ ok: true, duplicate: true, eventId: committed });
                throw error;
            }
            return Response.json({ ok: true, eventId: created.id });
        }
        // Read the flighted field from the leaderboard (WC-6): the rows the
        // team import previews, for the event the board is showing or the one
        // named.
        if (action === "leaderboard_field") {
            const slug = z.string().max(120).optional().parse(p.slug);
            return Response.json({ ok: true, ...(await readLeaderboard(slug)) });
        }
        // Create an event from a tournament on the leaderboard (WC-10): its
        // name, course and dates, its flights in its order, and every flighted
        // team with its pop — one request, nothing exported. The recommended
        // way to set up, because every field it fills is one an operator would
        // otherwise retype, and retyping is where the defects have lived.
        if (action === "event_from_leaderboard") {
            const input = z.object({ slug: z.string().max(120).optional(), auctionAt: z.string().max(40).optional() }).parse(p);
            const replay = async () => {
                const prior = await statement('SELECT eventId,actor,action,"after" FROM audit WHERE id=?', requestId).first<Row>();
                if (!prior) return null;
                requireThat(prior.actor === who.email && prior.action === action && prior.after === JSON.stringify(input), "This request ID changed its action, operator or details. Submit a new request.");
                return prior.eventId as string;
            };
            const existing = await replay();
            if (existing) return Response.json({ ok: true, duplicate: true, eventId: existing });
            const board = await readLeaderboard(input.slug);
            const source = board.event as Row, rows = board.rows as Row[];
            const key = (n: string) => n.trim().toLowerCase();
            const names = (board.flights as string[]).filter((n, i, all) => all.findIndex((m) => key(m) === key(n)) === i);
            requireThat(source.name.trim(), "That leaderboard event has no name.");
            requireThat(names.length <= 30, "An event supports up to 30 flights.");
            requireThat(rows.length <= 500, "An event supports up to 500 teams.");
            // The money rules are the club's, not the tournament's: carry them
            // from the most recent real event so nothing is set twice. A club
            // with no event yet gets the defaults, as New event does.
            const last = await db().prepare('SELECT name,settings FROM events WHERE demo=0 ORDER BY updatedAt DESC LIMIT 1').first<Row>();
            const created = freshEvent(
                { name: source.name.trim().slice(0, 150), course: source.course.trim().slice(0, 150), dates: tournamentDates(source.start, source.end), auctionAt: input.auctionAt || "" },
                who.email, false, requestId, { action, after: input });
            const cmds = created.commands;
            if (last?.settings) cmds.push(update("events", { settings: last.settings }, "id", created.id));
            // The same palette and the same three places `flight_import` and
            // `flight_save` give a flight: a board built this way must not
            // settle differently because it arrived differently.
            const palette = ["#b79a59", "#889b75", "#6f8aa6", "#9b7f95", "#8a9b6f", "#a6866f"];
            const flightIds = new Map(names.map((n) => [key(n), crypto.randomUUID()]));
            cmds.push(...insertMany("flights", names.map((name, i) => ({ id: flightIds.get(key(name))!, eventId: created.id, name: name.trim().slice(0, 150), order: i, color: palette[i % palette.length], ownPool: 1 }))));
            cmds.push(...insertMany("payout_rules", names.flatMap((name) => [5000, 3000, 2000].map((percent, place) => ({ id: crypto.randomUUID(), eventId: created.id, poolId: flightIds.get(key(name))!, place: place + 1, percent })))));
            // Every flighted team, in the leaderboard's order, carrying its pop
            // where this product keeps a per-team number the room can see. A
            // competitor listed without players is an individual event's, and
            // the player is the name.
            const teams = rows.map((r, i) => {
                const fid = flightIds.get(key(String(r.flight)));
                requireThat(fid, `${r.name} is in a flight the leaderboard does not list (${r.flight}).`);
                const players = ((r.players as string[]).length ? (r.players as string[]) : [String(r.name)]).slice(0, 4).map((x) => x.slice(0, 100));
                const row = { id: crypto.randomUUID(), eventId: created.id, flightId: fid!, name: String(r.name).slice(0, 150), handicap: Number.isFinite(Number(r.pop)) ? Number(r.pop) : null, seed: null, notes: "", privateNotes: "", order: i, status: "UPCOMING" };
                return { row, players };
            });
            cmds.push(...insertMany("teams", teams.map((t) => t.row)));
            cmds.push(...insertMany("players", teams.flatMap((t) => t.players.map((name, j) => ({ id: crypto.randomUUID(), teamId: t.row.id, name, order: j })))));
            try {
                // Event, flights, teams and the request result commit together. A
                // racing retry loses the unique audit ID and its whole batch rolls back.
                await db().batch(cmds);
            } catch (error) {
                const committed = await replay();
                if (committed) return Response.json({ ok: true, duplicate: true, eventId: committed });
                throw error;
            }
            return Response.json({ ok: true, eventId: created.id, created: { flights: names.length, teams: teams.length }, from: { name: source.name, slug: source.slug }, rulesFrom: last?.name ?? "", note: board.note });
        }
        // Delete an event outright (WC-4). Eventless like `create_event`, and for
        // the same reason: the event-scoped path below reads the event, holds it
        // at a revision and writes an audit row against it, and none of the three
        // survives the row being removed.
        //
        // The refusal is the guard, not the confirmation: an event holding any
        // sale, settlement payment or payout disbursement cannot be deleted at
        // all unless it is a demo. The counts are read fresh here — never from
        // the caller — and asserted again inside the deleting batch, so a sale
        // recorded between the count and the delete rolls the whole thing back
        // rather than disappearing with it.
        if (action === "event_delete") {
            requireThat(who.owner, "Only the owner can delete an event.");
            const target = id.parse(p.eventId ?? body.eventId);
            const auditAction = "event_delete " + target;
            const newest = async () => (await db().prepare('SELECT id FROM events ORDER BY createdAt DESC LIMIT 1').first<Row>())?.id;
            const replay = async () => {
                const prior = await statement('SELECT actor,action FROM audit WHERE id=?', requestId).first<Row>();
                if (!prior) return false;
                requireThat(prior.actor === who.email && prior.action === auditAction, "This request ID changed its action, operator or event. Submit a new request.");
                return true;
            };
            if (await replay()) return Response.json({ ok: true, duplicate: true, eventId: await newest() });
            const event = await statement('SELECT id,name,demo FROM events WHERE id=?', target).first<Row>();
            // Deleting what is already gone is not an error. It is how a retried
            // request settles when the deleted event was the last one and there
            // was no other event left to anchor an audit entry to.
            if (!event) return Response.json({ ok: true, duplicate: true, eventId: await newest() });
            const counts = await db().batch([
                statement('SELECT COUNT(*) AS n FROM sales WHERE eventId=?', target),
                statement('SELECT COUNT(*) AS n FROM settlement_payments WHERE eventId=?', target),
                statement('SELECT COUNT(*) AS n FROM payout_disbursements WHERE eventId=?', target)
            ]);
            const [sales, payments, disbursements] = counts.map((r) => Number(((r.results as Row[])[0] || {}).n || 0));
            const demo = Number(event.demo) === 1;
            if (!demo) {
                const held = [
                    sales && `${sales} recorded sale${sales === 1 ? "" : "s"}`,
                    payments && `${payments} settlement payment${payments === 1 ? "" : "s"}`,
                    disbursements && `${disbursements} payout disbursement${disbursements === 1 ? "" : "s"}`
                ].filter(Boolean);
                requireThat(!held.length, `This event holds ${held.join(" and ")}; settlement records are never deleted.`);
            }
            // The audit table hangs off the event, so this event's trail cannot
            // outlive it. The record of the deletion therefore lives with the
            // event that remains — the same anchoring `operator_add` already
            // uses for a change that is not about any one event — naming the
            // deleted event's id, name and what it held. When nothing remains
            // there is nowhere durable to put it, and the deletion still happens:
            // an installation cannot be left unable to remove its last demo.
            const survivor = await statement('SELECT id FROM events WHERE id<>? ORDER BY createdAt DESC LIMIT 1', target).first<Row>();
            const now = timestamp();
            // Children are deleted explicitly, in reference order, rather than
            // left to ON DELETE CASCADE. Both runtimes do enforce foreign keys —
            // `portable/sqlite.mjs` sets `PRAGMA foreign_keys=ON` and the local
            // D1 connection reports it on — but sales, payments and disbursements
            // point at teams and buyers with ON DELETE NO ACTION, so the order a
            // cascade happens to unwind in is doing load-bearing work no schema
            // states. This order is stated.
            const cmds = [
                ...(demo ? [] : [statement('INSERT INTO mutation_guards(id,ok) VALUES (?,(SELECT ((SELECT COUNT(*) FROM sales WHERE eventId=?)+(SELECT COUNT(*) FROM settlement_payments WHERE eventId=?)+(SELECT COUNT(*) FROM payout_disbursements WHERE eventId=?))=0))', requestId, target, target, target)]),
                statement('DELETE FROM ownership WHERE saleId IN (SELECT id FROM sales WHERE eventId=?)', target),
                statement('DELETE FROM players WHERE teamId IN (SELECT id FROM teams WHERE eventId=?)', target),
                statement('DELETE FROM auction_state WHERE eventId=?', target),
                statement('DELETE FROM settlement_payments WHERE eventId=?', target),
                statement('DELETE FROM payout_disbursements WHERE eventId=?', target),
                statement('DELETE FROM sales WHERE eventId=?', target),
                statement('DELETE FROM payout_rules WHERE eventId=?', target),
                statement('DELETE FROM teams WHERE eventId=?', target),
                statement('DELETE FROM buyers WHERE eventId=?', target),
                statement('DELETE FROM flights WHERE eventId=?', target),
                statement('DELETE FROM audit WHERE eventId=?', target),
                statement('DELETE FROM events WHERE id=?', target),
                statement('DELETE FROM mutation_guards WHERE id=?', requestId)
            ];
            if (survivor) cmds.push(insert("audit", { id: requestId, eventId: survivor.id, actor: who.email, action: auditAction, recordId: target, before: JSON.stringify({ name: event.name, demo: event.demo, sales, payments, disbursements }), createdAt: now }));
            try {
                await db().batch(cmds);
            } catch (error) {
                if (await replay()) return Response.json({ ok: true, duplicate: true, eventId: await newest() });
                throw error;
            }
            return Response.json({ ok: true, deleted: event.name, ...(survivor ? { eventId: survivor.id as string } : {}) });
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
        // What an import did, reported back so the operator sees it rather than
        // guessing from a row count.
        let importCreated = 0, importUpdated = 0, importRefused: string[] = [];
        // Flights this request created, handed back so the caller can resolve
        // rows against them immediately. Waiting for the next data refresh
        // instead is a race, and the losing side of it silently leaves fifty
        // rows saying "pick a flight" right after creating their flights.
        const importedFlights: { id: string; name: string }[] = [];
        let before = JSON.stringify(data);
        const team = (tid: string) => { const t = data.teams.find((t: Row) => t.id === tid); requireThat(t, "Team not found."); return t; };
        const buyer = (bid: string) => { const b = data.buyers.find((b: Row) => b.id === bid); requireThat(b, "Buyer not found."); return b; };
        const flight = (fid: string) => { const f = data.flights.find((f: Row) => f.id === fid); requireThat(f, "Flight not found."); return f; };
        const sale = (sid: string) => { const a = data.sales.find((x: Row) => x.id === sid && x.status === "ACTIVE"); requireThat(a, "Active sale not found."); return a; };
        const setBlock = (t: Row | null) => { cmds.push(statement("UPDATE teams SET status='UPCOMING' WHERE eventId=? AND status='ON_BLOCK'", eventId)); if (t)
            cmds.push(update("teams", { status: "ON_BLOCK" }, "id", t.id)); cmds.push(update("auction_state", { teamId: t?.id || null, bid: 0, buyerId: null }, "eventId", eventId)); };
        switch (action) {
            case "theme_update": {
                const { theme } = z.object({ theme: z.enum(themeIds) }).strict().parse(p);
                // Presentation-only save: retain every auction setting and live record.
                cmds.push(update("events", { settings: JSON.stringify({ ...s, theme }) }, "id", eventId));
                break;
            }
            case "event_update": {
                const v = z.object({ name: text, calcuttaName: text, course: z.string().max(150), dates: z.string().max(100), auctionAt: z.string().max(40), description: note, rules: note, currency: z.enum(["USD", "CAD", "GBP", "EUR", "AUD"]), settings: settingsSchema() }).parse(p);
                if (v.settings.poolMode !== s.poolMode)
                    requireThat(!data.teams.some((t: Row) => t.finish), "Clear finishing positions before changing the pool configuration.");
                cmds.push(update("events", { ...v, settings: JSON.stringify({ ...v.settings, theme: v.settings.theme ?? s.theme }) }, "id", eventId));
                if (!v.settings.trackBidder) cmds.push(update("auction_state", { buyerId: null }, "eventId", eventId));
                break;
            }
            // Create the flights an import needs but this event does not have
            // (WC-6). Without it the remedy for "no flight here is called
            // Championship" is to retype five names by hand, exactly, in the
            // right order — which is the sort of transcription this import
            // exists to remove.
            //
            // Only ever additive: a name that already exists is left completely
            // alone, so this can never rename, recolour or re-pool a flight
            // teams have been bought in.
            case "flight_import": {
                const names = z.array(text).min(1).max(30).parse(p.names);
                const here = new Set(data.flights.map((f: Row) => String(f.name).trim().toLowerCase()));
                const missing = names.filter((n, i) => !here.has(n.trim().toLowerCase()) && names.findIndex(m => m.trim().toLowerCase() === n.trim().toLowerCase()) === i);
                requireThat(missing.length, "Every one of those flights already exists here.");
                requireThat(data.flights.length + missing.length <= 30, "An event supports up to 30 flights.");
                // The same palette the demo fixtures use, so a board built this
                // way looks like one built by hand.
                const palette = ["#b79a59", "#889b75", "#6f8aa6", "#9b7f95", "#8a9b6f", "#a6866f"];
                missing.forEach((name, i) => {
                    const fid = crypto.randomUUID();
                    recordId = fid;
                    cmds.push(insert("flights", { id: fid, eventId, name, color: palette[(data.flights.length + i) % palette.length], ownPool: 1, order: data.flights.length + i }));
                    importedFlights.push({ id: fid, name });
                    // Same three places `flight_save` gives a flight added by
                    // hand: this must not produce a flight that settles
                    // differently just because it arrived differently.
                    [5000, 3000, 2000].forEach((percent, place) => cmds.push(insert("payout_rules", { id: crypto.randomUUID(), eventId, poolId: fid, place: place + 1, percent })));
                });
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
                let list = action === "team_import" ? z.array(teamSchema).min(1).max(100).parse(p.teams) : [teamSchema.parse(p)];
                if (action === "team_import") {
                    // An import carries no ids, so without this a second import of
                    // the same field creates a second copy of every team — which is
                    // exactly what happens when a score is corrected after the
                    // flights are drawn and the list is brought over again. The team
                    // name is what the room calls a team and what the board prints,
                    // so it is the identity to match on.
                    const byName = new Map<string, Row>(data.teams.map((t: Row) => [String(t.name).trim().toLowerCase(), t]));
                    list = list.map(v => {
                        const existing = v.id ? null : byName.get(v.name.trim().toLowerCase());
                        return existing ? { ...v, id: existing.id as string } : v;
                    });
                    // A sold team's flight and pop are part of a financial record:
                    // its price was agreed under them, and its pool is settled by
                    // them. An import arriving mid-auction must leave it alone and
                    // say so, rather than quietly re-pricing what someone has bought.
                    const protectedTeams = new Set(data.teams
                        .filter((t: Row) => t.status === "ON_BLOCK" || data.sales.some((x: Row) => x.teamId === t.id))
                        .map((t: Row) => t.id as string));
                    importRefused = list.filter(v => v.id && protectedTeams.has(v.id)).map(v => v.name);
                    list = list.filter(v => !(v.id && protectedTeams.has(v.id)));
                    importCreated = list.filter(v => !v.id).length;
                    importUpdated = list.length - importCreated;
                    requireThat(list.length > 0 || importRefused.length > 0, "Nothing to import.");
                }
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
        return Response.json({ ok: true, recordId, revision: revision + 1, ...(action === "team_import" ? { imported: { created: importCreated, updated: importUpdated, refused: importRefused } } : {}), ...(importedFlights.length ? { flights: importedFlights } : {}) });
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
