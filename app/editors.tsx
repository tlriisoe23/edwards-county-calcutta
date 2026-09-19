"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';
import { Choice } from './auction';
import { Field } from './operator';
import { money, parsePaste, type Row } from '@/lib/model';
export default function Editors({ modal, setModal, data, busy, act, setBuyerId }: any) {
    const [bulk, setBulk] = useState(''), [preview, setPreview] = useState<Row[]>([]);
    const e = data?.event, s = e?.settings, flights = data?.flights || [], buyers = data?.buyers || [], flightOptions = flights.map((f: Row) => ({ value: f.id, label: f.name }));
    const modalField = (key: string, value: any) => setModal((m: Row) => m ? { ...m, [key]: value } : m);
    // D-CAL-3: every condition that blocks the atomic import is named on its row.
    const issues = (r: Row): string[] => { const list: string[] = [], players = r.players.map((p: string) => p.trim()).filter(Boolean); if (!r.name.trim()) list.push('name required'); if (!r.flightId) list.push('flight not found' + (r.flightText ? ' (' + r.flightText + ')' : '')); if (!players.length) list.push('player required'); if (players.length > 4) list.push('at most 4 players'); if (Number.isNaN(r.handicap)) list.push('index must be a number'); return list; };
    const attention = preview.filter(r => issues(r).length).length;
    // Pull the flighted field straight from the leaderboard (WC-6). It fills the
    // same preview the paste box fills, so everything after this point — the
    // per-row problems, the edits, the atomic commit — is one path, not two.
    const [pulling, setPulling] = useState(false);
    async function importFromLeaderboard() {
        setPulling(true);
        try {
            const result = await act('leaderboard_field', {}, { quiet: true });
            if (!result) return;
            if (result.note) { toast.error(result.note); return; }
            const rows = (result.rows as Row[]).map((r, i) => ({
                name: r.name, players: r.players, flightText: r.flight,
                flightId: flights.find((f: Row) => f.name.toLowerCase() === String(r.flight).toLowerCase())?.id || '',
                handicap: r.pop, seed: null, notes: '', privateNotes: '', source: i + 1,
            }));
            setPreview(rows);
            // Fifty rows each saying "pick a flight" is not a useful way to learn
            // that the flights have different names here. Say it once, up front.
            const missing = [...new Set(rows.filter(r => !r.flightId).map(r => r.flightText))].filter(Boolean);
            if (missing.length) toast.error(`No flight here is called ${missing.join(' or ')}. Add ${missing.length === 1 ? 'it' : 'them'} under Event & rules, then import again.`);
            else toast.success(`${rows.length} teams from ${result.event.name}${result.event.locked ? '' : ' — these flights are not locked there yet'}.`);
        } finally { setPulling(false); }
    }
    function parseImport() { try {
        setPreview(parsePaste(bulk).map((r, i) => ({ name: r[0] || '', players: [r[1], r[2], r[5], r[6]].filter(Boolean), flightId: flights.find((f: Row) => f.name.toLowerCase() === (r[3] || '').toLowerCase())?.id || '', flightText: r[3] || '', handicap: r[4] ? Number(r[4]) : null, seed: null, notes: '', privateNotes: '', source: i + 1 })));
    }
    catch (err) {
        toast.error((err as Error).message);
    } }
    return <Dialog open={!!modal} onOpenChange={open => { if (!open && !busy)
        setModal(null); }}><DialogContent className={modal?.type === 'import' ? 'wide-dialog' : ''}><DialogHeader><DialogTitle>{({ team: modal?.id ? 'Edit team' : 'Add a team', buyer: modal?.id ? 'Edit buyer' : 'Add a buyer', event: 'Create an event', import: 'Bulk team entry', sale: 'Correct sale', buyback: 'Record team buyback', flight: 'Flight details' } as any)[modal?.type || '']}</DialogTitle><DialogDescription>{modal?.type === 'import' ? 'Paste a spreadsheet or choose CSV. Review and correct each row before importing.' : modal?.type === 'buyback' ? 'Buyback consideration is arranged directly with the purchaser and never increases the auction pool.' : 'Changes are saved to the event and recorded in its audit trail.'}</DialogDescription></DialogHeader>
 {modal?.type === 'team' && <form className="dialog-form" onSubmit={async (ev) => { ev.preventDefault(); const { type, ...v } = modal; if (await act('team_save', { ...v, players: v.players.map((p: string) => p.trim()).filter(Boolean), handicap: v.handicap === '' || v.handicap == null ? null : Number(v.handicap), seed: v.seed === '' || v.seed == null ? null : Number(v.seed), order: Number(v.order) }))
        setModal(null); }}><Field label="Team name"><Input required value={modal.name} onChange={ev => modalField('name', ev.target.value)}/></Field><div className="form-grid">{[0, 1, 2, 3].map(i => <Field label={'Player ' + (i + 1) + (i > 0 ? ' (optional)' : '')} key={i}><Input required={i === 0} value={modal.players[i] || ''} onChange={ev => { const names = [...modal.players]; names[i] = ev.target.value; modalField('players', names); }}/></Field>)}</div><Field label="Flight"><Choice label="Team flight" value={modal.flightId} items={flightOptions} onChange={(v: string) => modalField('flightId', v)}/></Field><div className="form-grid"><Field label="Handicap / index"><Input type="number" step=".1" value={modal.handicap ?? ''} onChange={ev => modalField('handicap', ev.target.value)}/></Field><Field label="Rank / seed"><Input type="number" min="1" value={modal.seed ?? ''} onChange={ev => modalField('seed', ev.target.value)}/></Field></div><Field label="Auction order (first team is 1)"><Input type="number" min="1" value={Number(modal.order) + 1} onChange={ev => modalField('order', Number(ev.target.value) - 1)}/></Field><Field label="Public notes"><Textarea value={modal.notes} onChange={ev => modalField('notes', ev.target.value)}/></Field><Field label="Private operator notes"><Textarea value={modal.privateNotes} onChange={ev => modalField('privateNotes', ev.target.value)}/></Field><Button disabled={busy || !modal.flightId}>Save team</Button></form>}
 {modal?.type === 'buyer' && <form className="dialog-form" onSubmit={async (ev) => { ev.preventDefault(); const { type, ...v } = modal; const result = await act('buyer_save', v); if (result) {
        if (!v.id)
            setBuyerId(result.recordId);
        setModal(null);
    } }}><Field label="Buyer display name"><Input required value={modal.name} onChange={ev => modalField('name', ev.target.value)}/></Field><Field label="Syndicate / group (optional)"><Input value={modal.group} onChange={ev => modalField('group', ev.target.value)}/></Field><Field label="Contact details (private)"><Input value={modal.contact} onChange={ev => modalField('contact', ev.target.value)}/></Field><Field label="Private notes"><Textarea value={modal.privateNotes} onChange={ev => modalField('privateNotes', ev.target.value)}/></Field><Button disabled={busy}>Save buyer</Button></form>}
 {modal?.type === 'event' && <form className="dialog-form" onSubmit={async (ev) => { ev.preventDefault(); const { type, ...v } = modal; if (await act('create_event', v))
        setModal(null); }}>{[['name', 'Tournament name'], ['calcuttaName', 'Calcutta name (optional)'], ['course', 'Course'], ['dates', 'Tournament dates'], ['auctionAt', 'Auction date / time']].map(([k, l]) => <Field key={k} label={l}><Input required={k === 'name'} type={k === 'auctionAt' ? 'datetime-local' : 'text'} value={modal[k]} onChange={ev => modalField(k, ev.target.value)}/></Field>)}<Button disabled={busy}>Create tournament</Button></form>}
 {modal?.type === 'flight' && <form className="dialog-form" onSubmit={async (ev) => { ev.preventDefault(); const { type, ...v } = modal; if (await act('flight_save', v))
        setModal(null); }}><Field label="Flight name"><Input required value={modal.name} onChange={ev => modalField('name', ev.target.value)}/></Field><Field label="Accent color"><Input type="color" value={modal.color} onChange={ev => modalField('color', ev.target.value)}/></Field><label className="switch-row"><Switch checked={modal.ownPool} onCheckedChange={v => modalField('ownPool', v)}/><span>Own pool when using custom configuration</span></label><Button disabled={busy}>Save flight</Button></form>}
 {modal?.type === 'import' && <div className="dialog-form"><Textarea rows={6} aria-label="Paste team rows" placeholder="Smith / Jones | John Smith | Mike Jones | Championship Flight | 8.4" value={bulk} onChange={ev => { setBulk(ev.target.value); setPreview([]); }}/><div className="actions"><Input type="file" accept=".csv,text/csv,text/plain" aria-label="Import CSV file" onChange={async (ev) => { const file = ev.target.files?.[0]; if (file) {
        if (file.size > 150000) {
            toast.error('Choose a file under 150 KB.');
            return;
        }
        setBulk(await file.text());
        setPreview([]);
    } }}/><Button variant="outline" onClick={parseImport}>Preview rows</Button><Button disabled={busy || pulling} onClick={importFromLeaderboard}>{pulling ? 'Reading the leaderboard…' : 'Import from the leaderboard'}</Button></div><p className="fine">Columns: team name, player 1, player 2, flight, handicap, optional player 3, optional player 4. Tabs, pipes and quoted CSV are supported.</p>{preview.length > 0 && <><div className="import-preview"><Table><TableHeader><TableRow><TableHead>Team</TableHead><TableHead>Players (one per line)</TableHead><TableHead>Flight</TableHead><TableHead>Index</TableHead><TableHead /></TableRow></TableHeader><TableBody>{preview.map((r, i) => { const problems = issues(r); return <TableRow key={i} className={problems.length ? 'import-row-attention' : ''}><TableCell><Input aria-label={'Import team ' + (i + 1)} aria-invalid={!r.name.trim() || undefined} aria-describedby={problems.length ? 'import-issue-' + i : undefined} value={r.name} onChange={ev => setPreview(rows => rows.map((v, j) => i === j ? { ...v, name: ev.target.value } : v))}/>{problems.length > 0 && <small className="import-issue" id={'import-issue-' + i}>Row {i + 1}: {problems.join(' · ')}</small>}</TableCell><TableCell><Textarea aria-label={'Import players ' + (i + 1)} value={r.players.join('\n')} onChange={ev => setPreview(rows => rows.map((v, j) => i === j ? { ...v, players: ev.target.value.split('\n') } : v))}/></TableCell><TableCell><Choice label={'Import flight ' + (i + 1)} value={r.flightId} items={flightOptions} onChange={(flightId: string) => setPreview(rows => rows.map((v, j) => i === j ? { ...v, flightId } : v))}/></TableCell><TableCell><Input aria-label={'Import index ' + (i + 1)} type="number" step=".1" aria-invalid={Number.isNaN(r.handicap) || undefined} value={Number.isNaN(r.handicap) ? '' : r.handicap ?? ''} onChange={ev => setPreview(rows => rows.map((v, j) => i === j ? { ...v, handicap: ev.target.value === '' ? null : Number(ev.target.value) } : v))}/></TableCell><TableCell><Button variant="ghost" onClick={() => setPreview(rows => rows.filter((_, j) => i !== j))}>Remove</Button></TableCell></TableRow>; })}</TableBody></Table></div><Button disabled={busy || attention > 0} onClick={async () => { const outcome = await act('team_import', { teams: preview.map(v => ({ name: v.name, players: v.players.map((p: string) => p.trim()).filter(Boolean), flightId: v.flightId, handicap: v.handicap, seed: v.seed, notes: v.notes, privateNotes: v.privateNotes })) }); if (outcome) {
        // Say what it did. An import that matches on name can add, update or
        // decline to touch a team, and "imported 50 teams" would describe all
        // three — including the one case that matters, a sold team left alone.
        const r = outcome.imported;
        if (r) {
            const parts = [r.created && `${r.created} added`, r.updated && `${r.updated} updated`].filter(Boolean);
            if (r.refused?.length) toast.error(`${parts.join(' · ') || 'Nothing changed'}. Left alone because ${r.refused.length === 1 ? 'it is' : 'they are'} sold or on the block: ${r.refused.join(', ')}.`, { duration: 12000 });
            else toast.success(parts.join(' · ') || 'Nothing changed.');
        }
        setModal(null);
        setBulk('');
        setPreview([]);
    } }}>Import {preview.length} teams{attention > 0 && ' · ' + attention + (attention === 1 ? ' row needs attention' : ' rows need attention')}</Button></>}</div>}
 {modal?.type === 'sale' && <form className="dialog-form" onSubmit={async (ev) => { ev.preventDefault(); if (await act('sale_edit', { id: modal.id, amount: Math.round(Number(modal.amount) * 100), buyerId: modal.buyerId, notes: modal.notes }))
        setModal(null); }}><Field label="Sale price"><Input type="number" step=".01" min=".01" required value={modal.amount} onChange={ev => modalField('amount', ev.target.value)}/></Field><Field label="Winning buyer"><Choice label="Winning buyer" value={modal.buyerId} items={buyers.map((b: Row) => ({ value: b.id, label: b.name }))} onChange={(v: string) => modalField('buyerId', v)}/></Field><Field label="Correction notes"><Textarea value={modal.notes} onChange={ev => modalField('notes', ev.target.value)}/></Field><p className="notice">Changing the price recalculates the pool and proportional buyback consideration. Ownership percentages are preserved.</p><Button disabled={busy}>Save correction</Button></form>}
 {modal?.type === 'buyback' && <form className="dialog-form" onSubmit={async (ev) => { ev.preventDefault(); if (await act('buyback', { saleId: modal.saleId, percent: Math.round(Number(modal.percent) * 100), status: modal.status }))
        setModal(null); }}><h3>{modal.team} · {money(modal.amount, e.currency)}</h3><Field label="Buyback status"><Choice value={modal.status} onChange={(v: string) => modalField('status', v)} label="Buyback status" items={['Pending Buyback', 'Declined', 'Completed', 'Not Offered', 'Not Applicable']}/></Field><Field label={'Team ownership (%) · maximum ' + s.buybackMax / 100 + '%'}><Input type="number" min="0" max={s.buybackMax / 100} step=".01" value={modal.percent} onChange={ev => modalField('percent', ev.target.value)}/></Field><div className="notice"><p>Team: {modal.status === 'Completed' ? modal.percent : 0}% · Purchaser: {100 - (modal.status === 'Completed' ? Number(modal.percent) : 0)}%</p><p>Buyback consideration: {money(modal.status === 'Completed' ? (s.buybackPriceMode === 'fixed' ? s.buybackFixed : Math.round(modal.amount * Number(modal.percent) / 100)) : 0, e.currency)}</p><strong>Auction pool contribution stays {money(modal.amount, e.currency)}.</strong></div><Button disabled={busy}>Save buyback</Button></form>}
 </DialogContent></Dialog>;
}
