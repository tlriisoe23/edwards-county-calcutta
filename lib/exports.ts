import { csv, type Row } from './model.ts';
import { settlement } from './settlement.ts';
const decimal = (n: number) => (n / 100).toFixed(2);
export const exportKinds = ['auction', 'settlement', 'teams', 'payouts', 'ownership', 'payments', 'backup'] as const;
export function exportRows(data: Row, kind: string): any[][] {
    const e = data.event, accounts = settlement(data);
    const team = (id: string) => data.teams.find((r: Row) => r.id === id), buyer = (id: string) => data.buyers.find((r: Row) => r.id === id);
    const flight = (t: Row) => data.flights.find((f: Row) => f.id === t?.flightId);
    const pool = (t: Row) => e.settings.poolMode === 'combined' || e.settings.poolMode === 'custom' && !flight(t)?.ownPool ? 'Combined Calcutta' : flight(t)?.name;
    switch(kind) {
        case 'auction': return [['Event','Currency','Flight','Pool','Auction Order','Team','Players','Buyer','Sale Price','Sale Status','Sold At','Sale ID'], ...data.sales.map((r: Row) => {const t=team(r.teamId);return [e.name,e.currency,flight(t)?.name,pool(t),t.order+1,t.name,t.players.join(' / '),buyer(r.buyerId)?.name,decimal(r.amount),r.status,r.createdAt,r.id];})];
        case 'teams': return [['Event','Flight','Pool','Auction Order','Team','Players','Handicap','Seed','Status','Finishing Position'], ...data.teams.map((t: Row) => [e.name,flight(t)?.name,pool(t),t.order+1,t.name,t.players.join(' / '),t.handicap,t.seed,t.status,t.finish])];
        case 'settlement': return [['Event','Currency','Buyer','Purchased Teams','Purchase Total','Payments Received','Remaining Balance','Status'], ...accounts.receipts.map((r: Row) => [e.name,e.currency,r.name,r.purchases.map((s: Row) => team(s.teamId)?.name).join(' / '),decimal(r.due),decimal(r.paid),decimal(r.balance),r.status])];
        case 'payouts': return [['Event','Currency','Flight','Team','Finishing Position','Pool','Payout Percentage','Calculated Team Payout','Ownership Percentage','Entitled Party','Party Type','Entitled Amount','Party Total Entitlement','Party Payouts Recorded','Party Remaining Due','Party Payout Status'], ...data.totals.entitlements.map((r: Row) => {const a=accounts.payables.find((p: Row) => p.id===r.partyId&&p.kind===r.partyKind)!;return [e.name,e.currency,r.flight,r.team,r.place,r.pool,r.payoutPercent/100,decimal(r.prize),r.percent/100,r.party,r.partyKind,decimal(r.amount),decimal(a.due),decimal(a.paid),decimal(a.balance),a.status];})];
        case 'ownership': return [['Event','Currency','Team','Sale Status','Sale Price','Owner','Owner Type','Ownership Percentage','Agreement Status','Private Buyback Consideration'], ...data.sales.flatMap((s: Row) => data.ownership.filter((o: Row)=>o.saleId===s.id).map((o: Row)=>[e.name,e.currency,team(s.teamId)?.name,s.status,decimal(s.amount),o.party,o.kind,o.percent/100,o.status,o.kind==='team'?decimal(o.consideration):'']))];
        case 'payments': return [['Event','Currency','Direction','Party','Entry ID','Amount','Date / Time','Method','Note / Reference','Recorded By','Recorded At','Reversal Of'], ...[['Receipt',data.payments],['Payout',data.disbursements]].flatMap(([direction,rows]: any) => rows.map((r: Row)=>[e.name,e.currency,direction,r.buyerId?buyer(r.buyerId)?.name:team(r.teamId)?.name,r.id,decimal(r.amount),r.occurredAt,r.method,r.note,r.actor,r.createdAt,r.reversalOf]))];
        default: throw Error('Unknown export.');
    }
}
export function eventCsv(data: Row, kind: string) { return csv(exportRows(data,kind)); }
