import { money, type Row } from './model.ts';
// Names the action the server's `undo` would actually restore, so the confirmation can say what it
// is about to undo instead of "the previous auction state". This mirrors the server's own
// selection exactly (`app/api/admin/route.ts`, case "undo"): the most recent audit entry for this
// event that still has a before-snapshot, is not itself an undo, and has not already been undone.
// `create_event`/`load_demo` rows are written without a before-snapshot (`lib/store.ts`
// `freshEvent`), so they are excluded here the same way `before IS NOT NULL` excludes them there.
const notUndoable = ['undo', 'create_event', 'load_demo'];
export function lastUndoable(audit: Row[] = []): Row | null {
    return audit.find(a => !a.undone && !notUndoable.includes(a.action)) || null;
}
const actionNames: Record<string, string> = {
    bid: 'Bid recorded', sale: 'Sale recorded', sale_reopen: 'Sale reopened', sale_void: 'Sale voided',
    block: 'Team put on the block', team_save: 'Team saved', team_delete: 'Team deleted',
    team_status: 'Team status changed', team_flight: 'Team moved to another flight',
    team_reorder: 'Auction order changed', team_skip: 'Team skipped for now',
    buyer_save: 'Buyer saved', buyer_delete: 'Buyer deleted', buyback: 'Buyback recorded',
    flight_save: 'Flight saved', flight_delete: 'Flight deleted', event_update: 'Event & rules saved',
    theme_update: 'Event theme changed', status: 'Auction status changed', finish: 'Finishing positions saved',
    settlement_payment: 'Payment recorded', settlement_disbursement: 'Payout recorded',
    reset_demo: 'Demonstration data reset', operator_add: 'Operator access granted', operator_remove: 'Operator access revoked',
};
// The record a given audit row points at, named the way the operator knows it.
function recordName(entry: Row, data: Row | null): string {
    if (!data || !entry.recordId) return '';
    const team = data.teams?.find((t: Row) => t.id === entry.recordId);
    if (team) return team.name;
    const buyer = data.buyers?.find((b: Row) => b.id === entry.recordId);
    if (buyer) return buyer.name;
    const flight = data.flights?.find((f: Row) => f.id === entry.recordId);
    if (flight) return flight.name;
    const sale = data.sales?.find((x: Row) => x.id === entry.recordId);
    if (sale) {
        const t = data.teams?.find((t: Row) => t.id === sale.teamId);
        return [t?.name, money(sale.amount, data.event?.currency)].filter(Boolean).join(' · ');
    }
    return '';
}
// `note` is the caller's follow-on sentence (version check, audit trail). It is only appended when
// there is actually something to undo — otherwise "there is nothing to undo" would be followed by a
// reassurance about a correction that is not going to happen.
export function describeUndo(audit: Row[] = [], data: Row | null = null, note = ''): string {
    const entry = lastUndoable(audit);
    if (!entry)
        return 'There is no recorded action to undo yet.';
    const what = actionNames[entry.action] || entry.action.replaceAll('_', ' ');
    const name = recordName(entry, data);
    const when = entry.createdAt ? new Date(entry.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
    const described = 'This will undo: ' + what + (name ? ' — ' + name : '') + [when && ', recorded ' + when, entry.actor && ' by ' + entry.actor].filter(Boolean).join('') + '.';
    return note ? described + ' ' + note : described;
}
