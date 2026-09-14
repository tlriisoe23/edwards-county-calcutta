export type Row = Record<string, any>;
export const defaultSettings = {
    minBid: 10000, increment: 2500, quickIncrements: [2500, 5000, 10000, 25000], poolMode: "separate",
    deductionType: "percent", deduction: 1000, buybackMax: 5000, buybackPriceMode: "proportional", buybackFixed: 0, buybackDeadline: "",
    autoAdvance: true, showBidder: true, showBid: true, showBuyer: true, showSalePrice: true, showUpcoming: true, showHandicap: true, showPayouts: true, showBuyback: false, showTotalPool: true, showFlightPools: true
};
export const publicFlags = ["showBidder", "showBid", "showBuyer", "showSalePrice", "showUpcoming", "showHandicap", "showPayouts", "showBuyback", "showTotalPool", "showFlightPools"];
export function splitCents(total: number, weights: number[]) { const base = weights.map(w => Math.floor(total * w / 10000)); let left = total - base.reduce((a, b) => a + b, 0); const order = weights.map((w, i) => ({ i, r: (total * w) % 10000 })).sort((a, b) => b.r - a.r || a.i - b.i); for (let j = 0; j < left; j++)
    base[order[j % order.length].i]++; return base; }
export function compute(data: Row) {
    const settings = data.event.settings, active = data.sales.filter((s: Row) => s.status === "ACTIVE");
    const poolFor = (f: Row) => settings.poolMode === "combined" || settings.poolMode === "custom" && !f.ownPool ? "combined" : f.id;
    const pools: Row[] = [];
    for (const f of data.flights) {
        const id = poolFor(f);
        if (!pools.some(p => p.id === id))
            pools.push({ id, name: id === "combined" ? "Combined Calcutta" : f.name, color: f.color, gross: 0, sold: 0, teams: 0 });
    }
    for (const t of data.teams) {
        const f = data.flights.find((x: Row) => x.id === t.flightId);
        const p = pools.find(p => p.id === poolFor(f));
        if (p && t.status !== "WITHDRAWN")
            p.teams++;
    }
    for (const s of active) {
        const t = data.teams.find((x: Row) => x.id === s.teamId);
        const f = data.flights.find((x: Row) => x.id === t.flightId);
        const p = pools.find(p => p.id === poolFor(f));
        if (p) {
            p.gross += s.amount;
            p.sold++;
        }
        ;
    }
    const gross = active.reduce((a: number, s: Row) => a + s.amount, 0);
    const deduction = Math.min(gross, settings.deductionType === "percent" ? Math.round(gross * settings.deduction / 10000) : settings.deductionType === "fixed" ? settings.deduction : 0);
    let allocated = 0;
    const shares = pools.map(p => { const exact = gross ? deduction * p.gross / gross : 0; const floor = Math.floor(exact); allocated += floor; return { id: p.id, amount: floor, remainder: exact - floor }; });
    shares.sort((a, b) => b.remainder - a.remainder || a.id.localeCompare(b.id));
    for (let i = 0; i < deduction - allocated; i++)
        shares[i % shares.length].amount++;
    for (const p of pools) {
        p.deduction = shares.find(s => s.id === p.id)?.amount || 0;
        p.net = p.gross - p.deduction;
        const rules = data.payoutRules.filter((r: Row) => r.poolId === p.id).sort((a: Row, b: Row) => a.place - b.place);
        const effective = rules.length ? rules : [{ place: 1, percent: 5000 }, { place: 2, percent: 3000 }, { place: 3, percent: 2000 }];
        const amounts = splitCents(p.net, effective.map((r: Row) => r.percent));
        p.payouts = effective.map((r: Row, i: number) => ({ ...r, amount: amounts[i] }));
    }
    const entitlements: Row[] = [];
    for (const s of active) {
        const t = data.teams.find((x: Row) => x.id === s.teamId);
        if (!t.finish)
            continue;
        const f = data.flights.find((x: Row) => x.id === t.flightId), p = pools.find(p => p.id === poolFor(f));
        const prize = p?.payouts.find((r: Row) => r.place === t.finish)?.amount || 0;
        const owners = data.ownership.filter((o: Row) => o.saleId === s.id && o.status === "Completed");
        const portions = splitCents(prize, owners.map((o: Row) => o.percent));
        owners.forEach((o: Row, i: number) => entitlements.push({ team: t.name, flight: f.name, place: t.finish, party: o.party, percent: o.percent, amount: portions[i] }));
    }
    return { gross, deduction, net: gross - deduction, sold: active.length, remaining: data.teams.filter((t: Row) => ["UPCOMING", "ON_BLOCK", "UNSOLD"].includes(t.status)).length, average: active.length ? Math.round(gross / active.length) : 0, highest: Math.max(0, ...active.map((s: Row) => s.amount)), lowest: active.length ? Math.min(...active.map((s: Row) => s.amount)) : 0, pools, entitlements };
}
export function money(cents: number, currency = "USD") { return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100); }
export function csv(rows: any[][]) { return rows.map(row => row.map(v => { let s = String(v ?? ""); if (/^[=+@\-\t\r]/.test(s))
    s = "'" + s; return '"' + s.replaceAll('"', '""') + '"'; }).join(",")).join("\r\n"); }
export function parsePaste(text: string) { const lines: string[][] = []; let row: string[] = [], cell = "", quoted = false; const delimiter = text.includes("\t") ? "\t" : text.includes("|") ? "|" : ","; for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
        if (quoted && text[i + 1] === '"') {
            cell += '"';
            i++;
        }
        else
            quoted = !quoted;
    }
    else if (c === delimiter && !quoted) {
        row.push(cell.trim());
        cell = "";
    }
    else if ((c === "\n" || c === "\r") && !quoted) {
        if (c === "\r" && text[i + 1] === "\n")
            i++;
        row.push(cell.trim());
        if (row.some(Boolean))
            lines.push(row);
        row = [];
        cell = "";
    }
    else
        cell += c;
} if (quoted)
    throw Error("Close the quoted field before importing."); row.push(cell.trim()); if (row.some(Boolean))
    lines.push(row); if (lines[0]?.[0].toLowerCase().replaceAll(" ", "") === "teamname")
    lines.shift(); return lines; }
