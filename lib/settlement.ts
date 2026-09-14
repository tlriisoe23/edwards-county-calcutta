import type { Row } from './model';
export function settlement(data: Row) {
    const sales = data.sales.filter((s: Row) => s.status === 'ACTIVE');
    const status = (due: number, paid: number) => paid > due ? 'Overpaid' : due === paid ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid';
    const receipts = data.buyers.map((b: Row) => {
        const purchases = sales.filter((s: Row) => s.buyerId === b.id), entries = (data.payments || []).filter((p: Row) => p.buyerId === b.id);
        const due = purchases.reduce((n: number, s: Row) => n + s.amount, 0), paid = entries.reduce((n: number, p: Row) => n + p.amount, 0);
        return { id: b.id, kind: 'buyer', name: b.name, purchases, entries, due, paid, balance: due - paid, status: status(due, paid) };
    }).filter((b: Row) => b.purchases.length || b.entries.length);
    const parties = new Map<string, Row>();
    for (const r of data.totals.entitlements) {
        const key = r.partyKind + ':' + r.partyId;
        if (!parties.has(key)) parties.set(key, { id: r.partyId, kind: r.partyKind, name: r.party, due: 0, entitlements: [] });
        const p = parties.get(key)!; p.due += r.amount; p.entitlements.push(r);
    }
    for (const r of data.disbursements || []) {
        const kind = r.buyerId ? 'buyer' : 'team', id = r.buyerId || r.teamId, key = kind + ':' + id;
        if (!parties.has(key)) parties.set(key, { id, kind, name: (kind === 'buyer' ? data.buyers : data.teams).find((p: Row) => p.id === id)?.name || 'Recorded payee', due: 0, entitlements: [] });
    }
    const payables: Row[] = [...parties.values()].map(p => {
        const entries = (data.disbursements || []).filter((r: Row) => (p.kind === 'buyer' ? r.buyerId : r.teamId) === p.id), paid = entries.reduce((n: number, r: Row) => n + r.amount, 0);
        return { ...p, entries, paid, balance: p.due - paid, status: status(p.due, paid) };
    });
    const sum = (rows: Row[], k: string) => rows.reduce((n, r) => n + r[k], 0);
    const outstanding = (rows: Row[]) => rows.reduce((n, r) => n + Math.max(0, r.balance), 0);
    const overpaid = (rows: Row[]) => rows.reduce((n, r) => n + Math.max(0, -r.balance), 0);
    return { receipts, payables, purchases: sum(receipts, 'due'), received: sum(receipts, 'paid'), receivable: outstanding(receipts), receiptOverpayments: overpaid(receipts), netReceivable: sum(receipts, 'balance'), entitled: sum(payables, 'due'), disbursed: sum(payables, 'paid'), payable: outstanding(payables), payoutOverpayments: overpaid(payables), netPayable: sum(payables, 'balance') };
}
