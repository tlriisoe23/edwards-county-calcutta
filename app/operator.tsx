"use client";
import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { Gavel, Plus, Undo2, Pause, Play, ArrowUp, ArrowDown, GripVertical, ExternalLink, Search, Download, Users, Monitor, ShieldCheck, Pencil, MoreHorizontal, LogOut, Circle, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Wrench, KeyRound, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty } from '@/components/ui/combobox';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Brand, Block, Stats, PoolCards, Choice } from './auction';
import { money, csv, parsePaste, reorderVisible, type Row } from '@/lib/model';
import { eventPath, openTvWindow } from '@/lib/sharing';
import { Rules, Results } from './rules';
import Editors from './editors';
import { BuyerPicker, SoldDialog } from './auction-controls';
import { Settlement } from './settlement';
import { Exports } from './exports';
import { Sharing, AuctionHelp } from './sharing';
import { PrepareSteps } from './prepare-steps';
import { ControlTip } from './help-tooltip';
import { TooltipProvider } from '@/components/ui/tooltip';
import { describeUndo, lastUndoable } from '@/lib/audit';
// One sentence for both ways into Undo — the U key and the button used to give
// different follow-ons, the button's in language written for nobody (UI-CA-07).
const undoNote = 'The correction stays in the audit trail.';
import { normalizeTheme, themePresets } from '@/lib/themes';
export function Field({ label, children }: any) { return <label className="field"><span>{label}</span>{children}</label>; }
export function download(name: string, rows: any[][]) { const url = URL.createObjectURL(new Blob([csv(rows)], { type: 'text/csv;charset=utf-8;' })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
const statusNames = [{ value: 'UPCOMING', label: 'Upcoming' }, { value: 'ON_BLOCK', label: 'On the block' }, { value: 'SOLD', label: 'Sold' }, { value: 'UNSOLD', label: 'Unsold' }, { value: 'WITHDRAWN', label: 'Withdrawn' }];
// C1: readiness reflects saved event data only (flight/team/buyer counts), never mere navigation, and never blocks or alters auction rules.
const readinessMeta: Row = { 'not-started': [Circle, 'Not started'], attention: [AlertCircle, 'Needs attention'], complete: [CheckCircle2, 'Complete'] };
function NavStatus({ state }: { state: string }) { const [Icon, text] = readinessMeta[state]; return <span className={'nav-status nav-status-' + state}><Icon size={11} aria-hidden="true"/>{text}</span>; }
// One flat tab strip replaces the former RUN AUCTION / AFTER AUCTION groups: once these are tabs,
// the group captions and the note list that used to sit under them are redundant, so what each tab
// does is carried by a hover tip on the tab itself (ControlTip) instead.
function NavItem({ value, num, label, status, tip }: { value: string; num?: number; label: string; status?: string; tip: string }) {
    return <ControlTip text={tip}><TabsTrigger value={value}>{num != null && <span className="nav-num" aria-hidden="true">{num}</span>}<span>{label}</span>{status && <NavStatus state={status}/>}</TabsTrigger></ControlTip>;
}
type LocalUser = { username: string; email: string; display_name: string; enabled: number; created_by: string; created_at: string };
type LocalDraft = { username: string; displayName: string; email: string; password: string; confirmPassword: string };
const blankLocal: LocalDraft = { username: '', displayName: '', email: '', password: '', confirmPassword: '' };
// What still stands between the form and a login, said on screen as it is typed. The old form
// kept its button grey until the password reached 14 characters and never said so, which reads
// as a button that does not work (WC-2).
function localProblems(f: { username: string; password: string; confirmPassword: string }): string[] {
    const list: string[] = [];
    if (f.username.trim() && !/^[a-z0-9][a-z0-9._-]{1,39}$/i.test(f.username.trim())) list.push('Usernames are 2–40 letters, digits, dots, dashes or underscores.');
    if (f.password && f.password.length < 14) list.push(`Passwords need 14 characters or more — ${14 - f.password.length} to go.`);
    if (f.password && f.confirmPassword && f.password !== f.confirmPassword) list.push('Passwords do not match.');
    return list;
}
// Lightweight local login accounts (Tools -> Local Users): a username and a password, an email
// only if you want one on record; operator-level only, never owner (D-CAL-4/7). Password fields
// never round-trip a stored value; a reset always requires a fresh password rather than showing
// or reusing the existing hash.
function LocalUsersDialog({ open, onOpenChange, users, busy, act }: { open: boolean; onOpenChange: (open: boolean) => void; users: LocalUser[]; busy: boolean; act: (action: string, payload?: Row, options?: Row) => Promise<any> }) {
    const [form, setForm] = useState<LocalDraft>(blankLocal);
    const [tried, setTried] = useState(false);
    const [reset, setReset] = useState<{ username: string; password: string; confirmPassword: string } | null>(null);
    const filled = !!(form.username.trim() && form.displayName.trim() && form.password && form.confirmPassword);
    const problems = localProblems(form);
    const resetProblems = reset ? localProblems({ username: '', password: reset.password, confirmPassword: reset.confirmPassword }) : [];
    return <>
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="wide-dialog">
                <DialogHeader><DialogTitle><KeyRound size={19} aria-hidden="true"/> Local Users</DialogTitle><DialogDescription>A username and a password for someone without a Google account — no email needed. Local logins are always operator-level — never owner.</DialogDescription></DialogHeader>
                <form className="dialog-form" noValidate onSubmit={async ev => { ev.preventDefault(); setTried(true); if (!filled || problems.length) return;
                    const username = form.username.trim().toLowerCase();
                    if (await act('local_user_create', { username, displayName: form.displayName.trim(), email: form.email.trim(), password: form.password, confirmPassword: form.confirmPassword }, { message: form.displayName.trim() + ' can now sign in as ' + username })) { setForm(blankLocal); setTried(false); } }}>
                    <div className="form-grid">
                        <Field label="Username"><Input required autoComplete="off" autoCapitalize="none" spellCheck={false} value={form.username} onChange={ev => setForm(f => ({ ...f, username: ev.target.value }))} placeholder="frontdesk"/></Field>
                        <Field label="Display name"><Input required value={form.displayName} onChange={ev => setForm(f => ({ ...f, displayName: ev.target.value }))} placeholder="Front desk"/></Field>
                        <Field label="Email (optional)"><Input type="email" autoComplete="off" value={form.email} onChange={ev => setForm(f => ({ ...f, email: ev.target.value }))} placeholder="name@example.com"/></Field>
                        <Field label="Password"><Input type="password" required autoComplete="new-password" value={form.password} onChange={ev => setForm(f => ({ ...f, password: ev.target.value }))}/></Field>
                        <Field label="Confirm password"><Input type="password" required autoComplete="new-password" value={form.confirmPassword} onChange={ev => setForm(f => ({ ...f, confirmPassword: ev.target.value }))}/></Field>
                    </div>
                    {problems.map(problem => <p className="field-error" key={problem}>{problem}</p>)}
                    {tried && !filled && !problems.length && <p className="field-error">A username, a display name and the password twice are needed.</p>}
                    <p className="fine">They sign in with the username (or the email, if given); the email is otherwise only for your records. 14–1024 characters, stored as a salted scrypt hash — never as plain text, never shown again.</p>
                    <Button type="submit" disabled={busy}><Plus/> Create local login</Button>
                </form>
                <h3>Existing local users</h3>
                {users.map(u => <div className="access-row" key={u.username}>
                    <span>{u.display_name}<small>{u.username}{u.email ? ' · ' + u.email : ''} · Added by {u.created_by}{u.enabled ? '' : ' · Disabled'}</small></span>
                    <div className="actions">
                        <Button variant="outline" size="sm" disabled={busy} onClick={() => act('local_user_set_enabled', { username: u.username, enabled: !u.enabled }, { message: u.enabled ? 'Login disabled — any open session ended' : 'Login enabled' })}>{u.enabled ? 'Disable' : 'Enable'}</Button>
                        <Button variant="outline" size="sm" disabled={busy} onClick={() => setReset({ username: u.username, password: '', confirmPassword: '' })}>Reset password</Button>
                    </div>
                </div>)}
                {!users.length && <p className="muted">No local logins yet.</p>}
            </DialogContent>
        </Dialog>
        <Dialog open={!!reset} onOpenChange={open => { if (!open) setReset(null); }}>
            <DialogContent>
                <DialogHeader><DialogTitle>Reset password</DialogTitle><DialogDescription>{reset?.username}</DialogDescription></DialogHeader>
                <form className="dialog-form" noValidate onSubmit={async ev => { ev.preventDefault(); if (!reset || !reset.password || !reset.confirmPassword || resetProblems.length) return;
                    if (await act('local_user_reset_password', { username: reset.username, password: reset.password, confirmPassword: reset.confirmPassword }, { message: 'Password reset' })) setReset(null); }}>
                    <Field label="New password"><Input type="password" required autoComplete="new-password" value={reset?.password || ''} onChange={ev => setReset(r => r && ({ ...r, password: ev.target.value }))}/></Field>
                    <Field label="Confirm new password"><Input type="password" required autoComplete="new-password" value={reset?.confirmPassword || ''} onChange={ev => setReset(r => r && ({ ...r, confirmPassword: ev.target.value }))}/></Field>
                    {resetProblems.map(problem => <p className="field-error" key={problem}>{problem}</p>)}
                    <Button type="submit" disabled={busy}>Save new password</Button>
                </form>
            </DialogContent>
        </Dialog>
    </>;
}
// Prepare step 5. The operator has one device in hand and usually a second screen in the room;
// which of the two becomes the TV display changes what they can do next, so it is asked once,
// plainly, before the auction goes LIVE rather than discovered afterwards.
function StartAuctionDialog({ open, onOpenChange, busy, start }: { open: boolean; onOpenChange: (open: boolean) => void; busy: boolean; start: (where: 'here' | 'external') => void }) {
    return <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="start-dialog">
            <DialogHeader><DialogTitle><Monitor size={20} aria-hidden="true"/> Where should the TV display open?</DialogTitle><DialogDescription>Choose the screen the room will watch. The auction starts as soon as you choose.</DialogDescription></DialogHeader>
            <div className="start-choices">
                <button type="button" className="start-choice" disabled={busy} onClick={() => start('here')}>
                    <strong>Open TV/Display on this screen</strong>
                    <span>This window becomes the TV display. You will need to sign in to calcutta.edcogolf.org/admin from a different device to keep operating the auction.</span>
                </button>
                <button type="button" className="start-choice" disabled={busy} onClick={() => start('external')}>
                    <strong>Open on an external TV/Monitor<span className="start-choice-tag">Most operators</span></strong>
                    <span>The TV window that opens can be dragged to that screen and made full screen. You keep controlling everything from this device.</span>
                </button>
            </div>
        </DialogContent>
    </Dialog>;
}
// The compact-console override lives in localStorage, which exists only in the
// browser. It is exposed as an external store rather than component state so
// the server and the hydrating client agree on "auto" and the saved value
// arrives in the render after hydration (OC-9, D-CAL-29).
const compactKey = 'calcutta-compact-console';
type CompactChoice = 'auto' | 'on' | 'off';
const compactListeners = new Set<() => void>();
const compactServerChoice = (): CompactChoice => 'auto';
const readCompact = (): CompactChoice => { try {
    const saved = localStorage.getItem(compactKey);
    return saved === 'on' || saved === 'off' ? saved : 'auto';
} catch { return 'auto'; } };
const subscribeCompact = (changed: () => void) => { compactListeners.add(changed); window.addEventListener('storage', changed); return () => { compactListeners.delete(changed); window.removeEventListener('storage', changed); }; };
const writeCompact = (choice: CompactChoice) => { try {
    localStorage.setItem(compactKey, choice);
} catch { } for (const changed of compactListeners) changed(); };
// "3 teams" / "1 team": a confirmation that names what it is about to remove
// should not do it in the plural when there is one of something.
const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;
export default function AdminPanel({ data, meta, user, selectedEventId, offline, loaded, refresh, selectEvent, fullscreen }: any) {
    const [tab, setTab] = useState('console'), [busy, setBusy] = useState(false), [modal, storeModal] = useState<Row | null>(null), [confirm, setConfirm] = useState<Row | null>(null), [bid, setBid] = useState(''), [buyerId, setBuyerId] = useState<string | null>(null), [quick, setQuick] = useState({ name: '', p1: '', p2: '', flightId: '' }), [query, setQuery] = useState(''), [flightFilter, setFlightFilter] = useState('all'), [statusFilter, setStatusFilter] = useState('all'), [selected, setSelected] = useState<string[]>([]), [accessEmail, setAccessEmail] = useState(''), [reset, setReset] = useState('');
    const [advancedRequest, setAdvancedRequest] = useState(0);
    const [localUsersOpen, setLocalUsersOpen] = useState(false);
    const [saleDraft, setSaleDraft] = useState<Row | null>(null);
    const [startOpen, setStartOpen] = useState(false);
    const locking = useRef(false), bidInput = useRef<HTMLInputElement>(null), drag = useRef<string | null>(null), navTop = useRef<HTMLDivElement>(null);
    const e = data?.event, s = e?.settings, flights = data?.flights || [], teams = data?.teams || [], buyers = data?.buyers || [];
    const setModal = (value: any) => storeModal(typeof value === 'function' ? value : value ? { ...value, revision: e?.revision } : null);
    const current = teams.find((t: Row) => t.id === data?.state.teamId), next = teams.filter((t: Row) => t.status === 'UPCOMING').slice(0, 8);
    useEffect(() => { setBid(data?.state.bid ? String(data.state.bid / 100) : ''); setBuyerId(data?.state.buyerId || null); }, [data?.state.teamId, data?.state.bid, data?.state.buyerId, e?.id]);
    useEffect(() => { setSelected([]); setQuick(q => ({ ...q, flightId: flights[0]?.id || '' })); }, [e?.id, flights.length]);
    useEffect(()=>{setSaleDraft(null);storeModal(null);setConfirm(null);},[e?.id]);
    async function act(action: string, payload: Row = {}, options: Row = {}): Promise<any> {
        if (locking.current)
            return null;
        if (offline || !loaded) {
            toast.error('Wait for the auction connection to return before saving.');
            return null;
        }
        locking.current = true;
        setBusy(true);
        try {
            const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, payload, eventId: e?.id, revision: options.revision ?? e?.revision, requestId: crypto.randomUUID() }) });
            const result: any = await res.json();
            if (!res.ok)
                throw Error(result.error || 'Unable to save.');
            if (result.eventId)
                selectEvent(result.eventId);
            else
                await refresh();
            if (!options.quiet)
                toast.success(options.message || 'Saved');
            return result;
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : 'Unable to save. Your input has been kept.');
            await refresh();
            return null;
        }
        finally {
            locking.current = false;
            setBusy(false);
        }
    }
    // Does the leaderboard know something this roster does not? (WC-6.)
    //
    // Automatic detection, never automatic application. The effect only fetches;
    // the comparison below happens during render, so importing updates the line
    // immediately without going back to the leaderboard, and nothing is written
    // during render. Applying stays a button, because an import that fired by
    // itself could move a sold team's flight in the middle of a lot.
    const [leaderboardField, setLeaderboardField] = useState<{ rows: Row[]; from: string } | null>(null);
    useEffect(() => {
        // No leaderboard configured means no drift to detect (OC-7). Probing
        // anyway earns a 400 the server is right to send and an error in the
        // operator's console every time this tab opens, in an installation that
        // has no leaderboard by design.
        if (!e?.id || tab !== 'teams' || !meta.leaderboard) return;
        let live = true;
        (async () => {
            try {
                const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'leaderboard_field', payload: {}, requestId: crypto.randomUUID() }) });
                if (!res.ok) return;
                const result = await res.json() as { rows?: Row[]; event?: Row };
                if (live && result?.rows?.length) setLeaderboardField({ rows: result.rows, from: String(result.event?.name || 'the leaderboard') });
            } catch { /* the leaderboard being unreachable is not this page's problem */ }
        })();
        return () => { live = false; };
    }, [e?.id, tab, meta.leaderboard]);
    const drift = (() => {
        if (!leaderboardField) return null;
        const here = new Map((data.teams || []).map((t: Row) => [String(t.name).trim().toLowerCase(), t]));
        // A team the leaderboard sent before is known by that board's id, so a
        // rename there is a change to report, not a team "not here yet" (OC-8).
        const bySource = new Map((data.teams || []).filter((t: Row) => t.sourceId).map((t: Row) => [String(t.sourceId), t]));
        let added = 0, changed = 0;
        for (const r of leaderboardField.rows) {
            const mine = ((r.id ? bySource.get(String(r.id)) : undefined) || here.get(String(r.name).trim().toLowerCase())) as Row | undefined;
            if (!mine) { added++; continue; }
            const flightName = (flights.find((f: Row) => f.id === mine.flightId) || {}).name || '';
            if (String(flightName).toLowerCase() !== String(r.flight).toLowerCase() || Number(mine.handicap ?? 0) !== Number(r.pop ?? 0)) changed++;
        }
        return added || changed ? { added, changed, from: leaderboardField.from } : null;
    })();
    const ask = (title: string, description: string, action: string, payload: Row = {}, extra: Row = {}) => setConfirm({ title, description, action, payload, revision: e?.revision, ...extra });
    const hammer = () => { if (!current || !data.state.bid) { toast.error('Record an opening bid first.'); return; } setSaleDraft({teamId:current.id,teamName:current.name,amount:data.state.bid,buyerId:s.trackBidder ? data.state.buyerId || '' : '',revision:e.revision}); };
    async function submitBid(correction = false, amount?: number) { if (!current)
        return; const amountCents = amount ?? Math.round(Number(bid) * 100); const result = await act('bid', { teamId: current.id, buyerId: s.trackBidder ? buyerId : null, amount: amountCents, correction }, { quiet: true }); if (result)
        setBid(String(amountCents / 100)); }
    const skip = (t: Row) => ask('Skip this team for now?', t.name + ' will remain eligible for auction and move to the end of the current queue. No sale or financial record will be created.' + (t.id === current?.id ? ' Its current bid will be cleared and the next team brought onto the block.' : ''), 'team_skip', { id: t.id }, { label: 'Skip for now' });
    const increase = (inc: number) => { const amount = Math.max(s.minBid, (data.state.bid || 0) + inc); setBid(String(amount / 100)); void submitBid(false, amount); };
    // Once bidding starts the setup steps are done with: put the tab bar at the top of the viewport
    // so the prepare block and the event toolbar are scrolled out of the way. Runs after the compact
    // layout has had a frame to settle, since going LIVE also collapses the heading rows above it.
    const scrollToTabs = () => setTimeout(() => {
        const el = navTop.current;
        if (!el)
            return;
        const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        const mast = document.querySelector('.admin-site .mast');
        const sticky = mast && getComputedStyle(mast).position === 'sticky' ? mast.getBoundingClientRect().height : 0;
        window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - sticky - 8), behavior: smooth ? 'smooth' : 'auto' });
    }, 120);
    // `where` is only supplied by prepare step 5; the console Start/Resume button keeps working as a
    // plain start (it is also Resume and Restart, where the TV question has already been answered).
    // A popup must be opened synchronously inside the click to survive the popup blocker, so the TV
    // window is opened before the status write is awaited.
    async function startAuction(where?: 'here' | 'external') {
        const path = eventPath('/tv', e?.id || selectedEventId);
        if (where === 'external')
            openTvWindow(path);
        const result = await act('status', { status: 'LIVE' });
        setStartOpen(false);
        if (!result)
            return;
        if (where === 'here') {
            window.location.assign(path);
            return;
        }
        scrollToTabs();
    }
    useEffect(() => { const key = (ev: KeyboardEvent) => { if (tab !== 'console' || modal || confirm || saleDraft || busy || !data)
        return; const target = ev.target as HTMLElement; if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.getAttribute('role') === 'combobox' || ev.ctrlKey || ev.metaKey || ev.altKey)
        return; if (ev.key.toLowerCase() === 'b') {
        ev.preventDefault();
        bidInput.current?.focus();
        // Select, so typing replaces the current bid rather than appending to it.
        bidInput.current?.select();
    } if (ev.key.toLowerCase() === 's') {
        ev.preventDefault();
        hammer();
    } if (ev.key === '+') {
        ev.preventDefault();
        increase(s.increment);
    } if (ev.key.toLowerCase() === 'u') {
        ev.preventDefault();
        if (!lastUndoable(meta.audit)) return;
        ask('Undo last action?', describeUndo(meta.audit, data, undoNote), 'undo');
    } }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); });
    const flightOptions = flights.map((f: Row) => ({ value: f.id, label: f.name }));
    // `visible` is the list the arrows actually appear in ("Next up", or the filtered roster) —
    // see reorderVisible: swapping raw neighbours renumbered lots without moving anything on screen.
    const move = (id: string, delta: number, visible: Row[]) => {
        const ids = reorderVisible(teams, visible.map((t: Row) => t.id), id, delta);
        if (!ids)
            return;
        void act('team_reorder', { ids }, { quiet: true });
    };
    function exportTeams() { download('calcutta-teams.csv', [['Team Name', 'Player 1', 'Player 2', 'Flight', 'Handicap', 'Player 3', 'Player 4'], ...teams.map((t: Row) => [t.name, t.players[0], t.players[1], flights.find((f: Row) => f.id === t.flightId)?.name, t.handicap, t.players[2], t.players[3]])]); }
    function exportSales() { download('calcutta-auction-records.csv', [['Team', 'Flight', 'Buyer', 'Sale Amount', 'Status', 'Sold At', 'Buyback Status', 'Team Ownership Percent', 'Buyback Consideration'], ...data.sales.map((x: Row) => { const t = teams.find((t: Row) => t.id === x.teamId), o = data.ownership.find((o: Row) => o.saleId === x.id && o.kind === 'team'); return [t?.name, flights.find((f: Row) => f.id === t?.flightId)?.name, buyers.find((b: Row) => b.id === x.buyerId)?.name, (x.amount / 100).toFixed(2), x.status, x.createdAt, o?.status, o ? o.percent / 100 : 0, o ? (o.consideration / 100).toFixed(2) : '0.00']; })]); }
    const filtered = teams.filter((t: Row) => (flightFilter === 'all' || t.flightId === flightFilter) && (statusFilter === 'all' || t.status === statusFilter) && (t.name + ' ' + t.players.join(' ')).toLowerCase().includes(query.toLowerCase()));
    function openTeam(t?: Row) { setModal({ type: 'team', ...(t ? { ...t, players: [...t.players] } : { name: '', players: ['', ''], flightId: flights[0]?.id || '', handicap: '', seed: '', notes: '', privateNotes: '', order: teams.length }) }); }
    const activeSales = data?.sales.filter((x: Row) => x.status === 'ACTIVE') || [];
    // C1 readiness: derived only from saved flights/teams/buyers counts — visiting a tab never marks it complete.
    const teamsFlightsStatus = !flights.length ? 'not-started' : !teams.length ? 'attention' : 'complete';
    const buyersStatus = buyers.length ? 'complete' : 'not-started';
    const phase = e?.status === 'COMPLETED' ? 'after' : e?.status === 'LIVE' || e?.status === 'PAUSED' ? 'run' : 'prepare';
    // Compact console: automatic while LIVE/PAUSED (where vertical space matters most), with a
    // persistent manual override. Never derived from or fed back into auction status itself.
    const autoCompact = e?.status === 'LIVE' || e?.status === 'PAUSED';
    // The saved override is a browser value the server cannot see, so it is read
    // through `useSyncExternalStore` with `compactServerChoice` as the server
    // snapshot (OC-9). Reading it in a `useState` initialiser made the first
    // client render disagree with the server's on every signed-in load of the
    // desk — React error #418, minified, in production. Both saved values
    // differed visibly: "on" changes the console's layout class, and "off",
    // which looks identical, still adds the Auto button that appears only once
    // the override is manual. Hydration now matches the server, and the saved
    // choice is applied in the render immediately after it.
    const compactOverride = useSyncExternalStore(subscribeCompact, readCompact, compactServerChoice);
    const setCompactOverride = writeCompact;
    const [navExpanded, setNavExpanded] = useState(false);
    const compact = compactOverride === 'off' ? false : compactOverride === 'on' ? true : autoCompact;
    const prepareBlock = <div className="prepare-block"><div className="prepare-block-head"><h2 className="eyebrow">PREPARE</h2>{phase === 'prepare' && <span className="nav-current-tag">Current phase</span>}<p className="fine">The five things to do before the room fills up.</p></div><PrepareSteps steps={[
    { num: 1, label: 'Event & rules', current: tab === 'rules', help: 'Name the event and set the money rules: minimum bid, increments, house deduction and payouts.', onClick: () => { setAdvancedRequest(0); setTab('rules'); } },
    { num: 2, label: 'Teams & flights', current: tab === 'teams', status: <NavStatus state={teamsFlightsStatus}/>, help: 'Add a flight first, then add or import your teams and players.', onClick: () => { setAdvancedRequest(0); setTab('teams'); } },
    { num: 3, label: 'Buyers', current: tab === 'buyers', status: <NavStatus state={buyersStatus}/>, help: 'Optional — you can add a buyer during the sale instead.', onClick: () => { setAdvancedRequest(0); setTab('buyers'); } },
    { num: 4, label: 'TV / Display Settings', current: tab === 'sharing', help: 'Opens Display & sharing: the public board link, the QR code and what the TV screen shows.', onClick: () => setTab('sharing') },
    { num: 5, label: 'Start Auction', current: false, help: 'Asks which screen the TV display should open on, then puts the auction LIVE and takes you to the Auction console.', onClick: () => setStartOpen(true) },
]}/></div>;
 const mainTabs = <TabsList variant="line" aria-label="Operator sections" className="op-tabs">
    <NavItem value="console" label="Auction console" tip="Run live bidding: the team on the block, the current bid and Hammer / sold."/>
    <NavItem value="sales" label="View and Edit Sales" tip="Every hammer on record — go here to correct a price, reopen or void a sale."/>
    <NavItem value="results" label="Results" tip="Enter final finishing positions after the tournament. This drives payouts, not the auction."/>
    <NavItem value="settlement" label="Settlement" tip="Track money received and paid out. Records only — the app never moves money."/>
    <NavItem value="exports" label="Exports" tip="Download CSVs and printable summaries of teams, sales and settlement."/>
 </TabsList>;
    // Compact view and the event theme live in the masthead so they stay reachable whatever the
    // compact state, the scroll position or the open tab. "Auto" only appears once the operator has
    // overridden the automatic behaviour, and says plainly what clicking it restores.
    const headerControls = <div className="mast-controls">
        {e && <ControlTip text={describeUndo(meta.audit, data)}><Button variant="outline" size="sm" disabled={busy || offline || !lastUndoable(meta.audit)} onClick={() => ask('Undo last action?', describeUndo(meta.audit, data, undoNote), 'undo')}><Undo2 /> Undo</Button></ControlTip>}
        {e && <div className="theme-quick-picker"><Choice label="Event theme" value={normalizeTheme(e.settings.theme)} onChange={(theme: string) => act('theme_update', { theme }, { message: 'Theme saved for this event' })} items={themePresets.map(p => ({ value: p.id, label: p.name }))}/></div>}
        <ControlTip text="Hides the heading rows and shrinks the navigation so more of the auction console fits on screen. Follows the auction status automatically unless you set it here."><label className="compact-toggle"><Switch checked={compact} onCheckedChange={(v: boolean) => setCompactOverride(v ? 'on' : 'off')} aria-label="Compact view"/> Compact view</label></ControlTip>
        {compactOverride !== 'auto' && <ControlTip text="Compact view is manually set — click to let it follow the auction status automatically again."><Button type="button" variant="ghost" size="sm" className="compact-auto" onClick={() => setCompactOverride('auto')}>Auto</Button></ControlTip>}
    </div>;
    const phaseLabel = phase === 'run' ? 'Run auction' : phase === 'after' ? 'After auction' : 'Prepare';
    return <TooltipProvider delayDuration={320}><main className={'site admin-site ' + (tab === 'console' ? 'console-active ' : '') + (compact ? 'compact' : '')}><header className="mast"><Brand eventId={e?.id || selectedEventId}/><nav><ControlTip text="Opens the guests' read-only board in a new tab — the same page the QR code points at."><a href={eventPath('/', e?.id || selectedEventId)} target="_blank" rel="noreferrer"><ExternalLink /> Public board</a></ControlTip><ControlTip text="Opens the big-screen display in its own window, which you can drag to a second monitor and make full screen. This console keeps working."><a href={eventPath('/tv', e?.id || selectedEventId)} rel="noreferrer" onClick={ev => { ev.preventDefault(); openTvWindow(eventPath('/tv', e?.id || selectedEventId)); }}><Monitor /> Launch TV Display</a></ControlTip><DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="header-help tools-menu-trigger" aria-label="Tools menu"><Wrench size={15} aria-hidden="true"/> Tools<ChevronDown size={13} aria-hidden="true"/></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="tools-menu">
{/* A menu item describes itself on the line below its label: a tooltip here would cover the
    neighbouring items the operator is reading past, which is the opposite of helpful. */}
<DropdownMenuItem onSelect={() => { setAdvancedRequest(0); setTab('sharing'); }}>Display & sharing<small>Public board link, QR code and what the TV screen shows</small></DropdownMenuItem>
<DropdownMenuItem onSelect={() => { setAdvancedRequest(0); setTab('help'); }}>Help<small>Auction-night checklist and how each part of the app works</small></DropdownMenuItem>
<DropdownMenuItem onSelect={() => { setAdvancedRequest(0); setTab('activity'); }}>Activity<small>The audit trail: every change, who made it and when</small></DropdownMenuItem>
{user.owner && <DropdownMenuItem onSelect={() => { setAdvancedRequest(0); setTab('access'); }}>Access<small>Grant or revoke operator access for this site</small></DropdownMenuItem>}
{user.owner && <DropdownMenuItem onSelect={() => setLocalUsersOpen(true)}>Local Users<small>Create a local sign-in for someone without a Google account</small></DropdownMenuItem>}
<DropdownMenuItem onSelect={() => { setAdvancedRequest(n => n + 1); setTab('rules'); }}>Advanced settings<small>Opens Event & rules with the advanced section expanded</small></DropdownMenuItem>
<DropdownMenuItem disabled={busy || offline} onSelect={() => ask('Load a demonstration event?', 'Create a separate fictional event with 12 teams and sample sales. Existing events will be kept.', 'load_demo')}>Load demo<small>Creates a separate fictional event to practise on — your events are kept</small></DropdownMenuItem>
                                    <DropdownMenuItem disabled={busy || offline} onSelect={() => ask('Load the two-day two-man demo?', 'Create a separate fictional event with the 50 teams of a two-day, two-man tournament — four flights drawn from day one, each team carrying its pop, and no sales yet, so the auction can be rehearsed from the first lot. Existing events will be kept.', 'load_demo', { variant: 'twoDay' }, { label: 'Load 50-team demo' })}>Load 50-team demo<small>The format we actually run, ready to auction — the same 50 teams as the leaderboard</small></DropdownMenuItem>
{e?.demo === 1 && <DropdownMenuItem disabled={busy || offline} onSelect={() => { setReset(''); ask('Reset demo data?', 'This clears all records in the current demonstration event. Other events are kept.', 'reset_demo', {}, { reset: true }); }}>Reset demo data<small>Clears this demonstration event’s teams, buyers and sales</small></DropdownMenuItem>}
</DropdownMenuContent></DropdownMenu><a href={'/signout-with-chatgpt?return_to=' + encodeURIComponent(eventPath('/', e?.id || selectedEventId))} target="_top" title="Sign out"><LogOut /> Sign out</a>{headerControls}</nav></header><div className="admin-heading"><div><p className="eyebrow">AUCTION OPERATIONS</p><h1>The operator’s desk</h1></div><div className="admin-identity"><span>{user.email}{user.email.endsWith("@sites.test") ? " · Local sign-in simulation" : ""}</span><span className={'connection ' + (offline ? 'offline' : '')}>{offline ? 'Reconnecting…' : 'Connected'}</span></div></div><div className="event-toolbar"><div className="event-picker">{meta.events?.length > 0 && <Choice label="Current event" value={e?.id || selectedEventId || meta.events[0].id} onChange={selectEvent} items={meta.events.map((x: Row) => ({ value: x.id, label: x.name + (x.demo ? ' · Demo' : '') }))}/>}</div>{user.owner && e && <ControlTip text="Removes this event and everything in it — teams, flights, buyers, sales and its audit trail. An event holding a sale, a settlement payment or a payout is refused; a demo can always be deleted."><Button variant="outline" disabled={busy || offline} onClick={() => ask('Delete this event?', `${e.name} will be permanently removed, along with its ${plural(teams.length, 'team')}, ${plural(flights.length, 'flight')}, ${plural(buyers.length, 'buyer')}, ${plural((data.sales || []).length, 'sale')} and its audit trail. This cannot be undone.` + (e.demo ? '' : ' An event that holds a sale, a settlement payment or a payout will be refused.'), 'event_delete', { eventId: e.id }, { label: 'Delete event', message: e.name + ' was deleted.', onComplete: (r: Row) => { if (!r?.eventId) selectEvent(''); } })}><Trash2 /> Delete event</Button></ControlTip>}{meta.leaderboard && <ControlTip text="Creates the event from a tournament on the leaderboard — its name, course and dates, its flights, and every team with its pop — over the private wire, with nothing to export. The recommended way to set up."><Button disabled={busy || offline} onClick={async () => { const board = await act('leaderboard_field', {}, { quiet: true }); if (board) setModal({ type: 'leaderboard', auctionAt: '', board }); }}><Download /> Import event from the leaderboard</Button></ControlTip>}<ControlTip text="Starts a brand new event with an empty field. Your current event is kept and stays selectable above."><Button variant="outline" onClick={() => setModal({ type: 'event', name: '', course: '', calcuttaName: '', dates: '', auctionAt: '' })}><Plus /> New event</Button></ControlTip></div>
 {!data ? <div className="empty-state"><Gavel size={42}/><h2>{!loaded ? 'Loading your desk…' : 'Ready for your next auction.'}</h2><p>Create an event to start with a clean field, or load the demonstration event.</p></div> : <><Tabs value={tab} onValueChange={value => { setAdvancedRequest(0); setTab(value); }}><Collapsible open={compact && navExpanded} onOpenChange={setNavExpanded}>{compact ? <div className="op-nav op-nav-compact" aria-label="Operator sections"><div ref={navTop} className="op-nav-bar"><span className="nav-current-tag">{phaseLabel}</span>{mainTabs}<CollapsibleTrigger asChild><ControlTip text={navExpanded ? 'Hides the numbered prepare steps again.' : 'Shows the numbered prepare steps (event & rules, teams, buyers, TV display, start).'}><Button type="button" variant="outline" size="sm" className="nav-expand" aria-label={navExpanded ? 'Hide setup steps' : 'Show setup steps'}>{navExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>} Setup steps</Button></ControlTip></CollapsibleTrigger></div><CollapsibleContent className="nav-group-collapsed"><div className="op-nav op-nav-expanded">{prepareBlock}</div></CollapsibleContent></div> : <nav className="op-nav" aria-label="Operator sections">{prepareBlock}<div ref={navTop} className="op-nav-bar">{mainTabs}</div></nav>}</Collapsible>
 <TabsContent value="console"><div className="console-toolbar"><span className={'badge ' + e.status.toLowerCase()}>{e.status}</span><span className="muted">{current ? (() => { const flight = flights.find((f: Row) => f.id === current.flightId); const poolId = s.poolMode === "combined" || s.poolMode === "custom" && !flight?.ownPool ? "combined" : current.flightId; const pool = data.totals.pools.find((p: Row) => p.id === poolId); return "Current pool " + money(pool?.net || 0, e.currency) + " · " + data.totals.sold + " sold"; })() : e.calcuttaName}</span><div className="spacer"/>{e.status === 'LIVE' ? <Button variant="outline" disabled={busy} onClick={() => act('status', { status: 'PAUSED' })}><Pause /> Pause</Button> : <ControlTip text={e.status === 'PAUSED' ? 'Resumes bidding and brings the tab bar back to the top of the screen.' : e.status === 'COMPLETED' ? 'Reopens a completed auction so bidding can continue. Recorded sales are kept.' : 'Puts the auction LIVE. Prepare step 5 does the same thing and also asks where the TV display should open.'}><Button disabled={busy} onClick={() => e.status === 'COMPLETED' ? ask('Reopen the completed auction?', 'The public board goes back to live bidding and the hammer is enabled again. Recorded sales are kept.', 'status', { status: 'LIVE' }, { label: 'Reopen auction' }) : void startAuction()}><Play />{e.status === 'PAUSED' ? 'Resume auction' : e.status === 'COMPLETED' ? 'Restart auction' : 'Start auction'}</Button></ControlTip>}<ControlTip text="Makes this browser window full screen on the device you are using now. It does not open the TV display."><Button variant="outline" onClick={fullscreen}><Monitor /> Full screen</Button></ControlTip>{e.status !== 'COMPLETED' && <ControlTip text="Ends the auction: the public board turns into a final summary and any team still upcoming stays unsold. You can restart it afterwards."><Button variant="outline" onClick={() => ask('Complete this auction?', 'The public board becomes a final summary. Upcoming or unsold teams remain unsold.', 'status', { status: 'COMPLETED' })}>Complete</Button></ControlTip>}</div><div className="console-grid"><div><Block data={data} admin/><section className="bid-controls panel"><form onSubmit={ev => { ev.preventDefault(); void submitBid(); }}><div className="bid-entry"><Field label="Bid amount"><div className="money-input"><span>$</span><Input ref={bidInput} inputMode="decimal" type="number" min={s.minBid / 100} step=".01" value={bid} onChange={ev => setBid(ev.target.value)} onFocus={ev => ev.target.select()} aria-label="Bid amount"/></div></Field>{s.trackBidder && <Field label="Current bidder (optional)"><BuyerPicker label="Current bidder" buyers={buyers} value={buyerId} onChange={setBuyerId}/></Field>}<Button type="submit" disabled={busy || offline || !current || e.status !== 'LIVE'}>Record bid</Button></div></form><div className="quick-bid-heading"><strong>{data.state.bid ? 'Increase bid' : 'Start bid'}</strong><span>{data.state.bid ? 'One click adds to the current bid' : 'One click records the opening amount'}</span></div><div className="increments">{(data.state.bid ? s.quickIncrements : s.quickStarts).map((amount: number, i: number) => <Button key={i} variant="outline" disabled={busy || offline || !current || e.status !== 'LIVE' || (data.state.bid ? amount < s.increment : amount < s.minBid)} onClick={() => data.state.bid ? increase(amount) : submitBid(false, amount)}>{data.state.bid ? '+' : ''}{money(amount, e.currency)}</Button>)}<Button variant="ghost" disabled={busy || !current} onClick={() => ask('Correct the current bid?', 'Record ' + money(Math.round(Number(bid) * 100), e.currency) + '. This can lower a mistaken bid.', 'bid', {teamId:current?.id,buyerId:s.trackBidder ? buyerId : null,amount:Math.round(Number(bid)*100),correction:true})}>Correct bid</Button></div><div className="hammer-row"><Button className="hammer" disabled={busy || offline || !current || e.status !== 'LIVE'} onClick={hammer}><Gavel size={25}/> Hammer / sold</Button><ControlTip text="No one bid: takes this team off the queue without a sale. You can put it back from Teams & flights later."><Button variant="outline" disabled={busy || !current} onClick={() => ask('Mark this team unsold?', 'Remove this team from the active queue without a sale. Return it from Teams when ready.', 'team_status', { id: current?.id, status: 'UNSOLD' })}>Mark unsold</Button></ControlTip><ControlTip text="Moves this team to the end of the queue and brings up the next one. No sale is recorded and the team stays eligible."><Button variant="ghost" disabled={busy || !current} onClick={() => skip(current)}>Skip for now</Button></ControlTip></div><p className="fine">Keyboard: B focus bid · + minimum increment · S hammer · U undo · Enter records a bid</p></section></div><aside className="console-queue panel"><div className="section-title"><h2>Next up</h2><span>{next.length} in view</span></div>{next.map((t: Row) => <div className="queue-admin" key={t.id}><div><span className="lot">{String(t.order + 1).padStart(2, '0')}</span><div><h3>{t.name}</h3><p>{flights.find((f: Row) => f.id === t.flightId)?.name}</p></div></div><div className="queue-actions"><Button size="icon" variant="ghost" aria-label={'Move ' + t.name + ' up'} onClick={() => move(t.id, -1, next)}><ArrowUp /></Button><Button size="icon" variant="ghost" aria-label={'Move ' + t.name + ' down'} onClick={() => move(t.id, 1, next)}><ArrowDown /></Button><ControlTip text="Brings this team up for bidding now. Whoever is on the block returns to the queue and the current bid is cleared."><Button size="sm" variant="outline" disabled={busy} onClick={() => current ? ask('Change the team on the block?', 'The current bid will be cleared and ' + current.name + ' will return to the queue.', 'block', { id: t.id }) : act('block', { id: t.id })}>On block</Button></ControlTip><ControlTip text="Moves this team to the end of the queue. No sale is recorded and the team stays eligible."><Button size="sm" variant="ghost" disabled={busy} onClick={() => skip(t)}>Skip for now</Button></ControlTip></div></div>)}{!next.length && <p className="muted">The upcoming queue is empty. Return unsold teams from the Teams tab.</p>}</aside></div><Stats data={data} admin/><PoolCards data={data} admin/></TabsContent>
 <TabsContent value="teams"><div className="section-title"><div><h2>Your field, ready to go.</h2><p className="muted">{teams.length} teams · Drag rows or use arrows to set auction order.</p></div><div className="actions"><Button variant="outline" onClick={exportTeams}><Download /> CSV</Button><Button variant="outline" onClick={() => setModal({ type: 'import' })}>Import teams</Button><Button onClick={() => openTeam()} disabled={!flights.length}><Plus /> Full team editor</Button></div></div><form className="quick-add panel" onSubmit={async (ev) => { ev.preventDefault(); const result = await act('team_save', { name: quick.name, players: [quick.p1, quick.p2].filter(Boolean), flightId: quick.flightId }, { quiet: true }); if (result) {
            setQuick(q => ({ ...q, name: '', p1: '', p2: '' }));
            (document.getElementById('quick-team') as HTMLInputElement)?.focus();
        } }}><Field label="Team name"><Input id="quick-team" required placeholder="Smith / Jones" value={quick.name} onChange={ev => setQuick({ ...quick, name: ev.target.value })}/></Field><Field label="Player 1"><Input required placeholder="John Smith" value={quick.p1} onChange={ev => setQuick({ ...quick, p1: ev.target.value })}/></Field><Field label="Player 2"><Input placeholder="Mike Jones" value={quick.p2} onChange={ev => setQuick({ ...quick, p2: ev.target.value })}/></Field><Field label="Flight"><Choice label="Quick add flight" value={quick.flightId} onChange={(v: string) => setQuick({ ...quick, flightId: v })} items={flightOptions}/></Field><Button disabled={busy || !quick.flightId} type="submit"><Plus /> Add another</Button></form>{!flights.length && <p className="notice">Add a flight in <button type="button" className="notice-link" onClick={() => setTab('rules')}>Event & rules</button> before adding teams.</p>}{drift && <p className="notice">{[drift.added && `${drift.added} team${drift.added === 1 ? '' : 's'} not here yet`, drift.changed && `${drift.changed} with a different flight or pop`].filter(Boolean).join(' · ')} on <strong>{drift.from}</strong>. <button type="button" className="notice-link" onClick={() => setModal({ type: 'import' })}>Import from the leaderboard</button> — sold teams are left alone.</p>}<div className="board-tools"><div className="search"><Search size={17}/><Input aria-label="Search team roster" placeholder="Search teams or players" value={query} onChange={ev => setQuery(ev.target.value)}/></div><Choice label="Filter flight" value={flightFilter} onChange={setFlightFilter} items={[{ value: 'all', label: 'All flights' }, ...flightOptions]}/><Choice label="Filter status" value={statusFilter} onChange={setStatusFilter} items={[{ value: 'all', label: 'All statuses' }, ...statusNames]}/><span className="muted">Sort order:</span>{['name', 'flight', 'handicap'].map(sort => <Button variant="ghost" key={sort} disabled={busy} onClick={() => act('team_reorder', { ids: [...teams].sort((a: Row, b: Row) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'flight' ? (flights.find((f: Row) => f.id === a.flightId)?.name || '').localeCompare(flights.find((f: Row) => f.id === b.flightId)?.name || '') : ((a.handicap ?? 999) - (b.handicap ?? 999))).map(t => t.id) })}>{sort}</Button>)}</div>{selected.length > 0 && <div className="bulk-bar"><strong>{selected.length} selected</strong><Choice label="Assign selected teams to flight" value="" onChange={(flightId: string) => ask('Move selected teams?', 'All ' + selected.length + ' selected teams will move. Existing sales will count toward the destination flight pool.', 'team_flight', { ids: selected, flightId })} items={flightOptions}/><Button variant="ghost" onClick={() => setSelected([])}>Clear selection</Button></div>}<div className="panel roster"><Table label="Team roster table"><TableHeader><TableRow><TableHead><Checkbox aria-label="Select visible teams" checked={filtered.length > 0 && filtered.every((t: Row) => selected.includes(t.id))} onCheckedChange={checked => setSelected(checked ? filtered.map((t: Row) => t.id) : [])}/></TableHead><TableHead>Order</TableHead><TableHead>Team / players</TableHead><TableHead>Flight</TableHead><TableHead>Index</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>{filtered.map((t: Row) => <TableRow key={t.id} draggable onDragStart={() => { drag.current = t.id; }} onDragOver={ev => ev.preventDefault()} onDrop={ev => { ev.preventDefault(); const ids = teams.map((t: Row) => t.id); if (drag.current && drag.current !== t.id) {
            ids.splice(ids.indexOf(drag.current), 1);
            ids.splice(ids.indexOf(t.id), 0, drag.current);
            void act('team_reorder', { ids }, { quiet: true });
        } drag.current = null; }}><TableCell><Checkbox aria-label={'Select ' + t.name} checked={selected.includes(t.id)} onCheckedChange={checked => setSelected(old => checked ? [...old, t.id] : old.filter(v => v !== t.id))}/></TableCell><TableCell><span className="order-cell"><GripVertical size={15}/>{t.order + 1}<span><Button variant="ghost" size="icon" aria-label={'Move ' + t.name + ' earlier'} onClick={() => move(t.id, -1, filtered)}><ArrowUp size={14}/></Button><Button variant="ghost" size="icon" aria-label={'Move ' + t.name + ' later'} onClick={() => move(t.id, 1, filtered)}><ArrowDown size={14}/></Button></span></span></TableCell><TableCell><button className="team-edit" onClick={() => openTeam(t)}>{t.name}<Pencil size={13}/></button><p className="fine">{t.players.join(' · ')}</p></TableCell><TableCell><Choice label={'Flight for ' + t.name} value={t.flightId} onChange={(flightId: string) => ask('Move team to another flight?', t.name + ' and its sale will count toward the new flight pool.', 'team_flight', { ids: [t.id], flightId })} items={flightOptions}/></TableCell><TableCell>{t.handicap ?? '—'}</TableCell><TableCell><span className={'badge ' + t.status.toLowerCase()}>{t.status.replace('_', ' ')}</span></TableCell><TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={'Actions for ' + t.name}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onSelect={() => openTeam(t)}>Edit team</DropdownMenuItem><DropdownMenuItem onSelect={() => { const { id, ...copy } = t; setModal({ type: 'team', ...copy, name: t.name + ' (copy)', order: teams.length }); }}>Duplicate team</DropdownMenuItem>{['UPCOMING', 'UNSOLD'].includes(t.status) && <DropdownMenuItem onSelect={() => current ? ask('Change team on block?', 'Clear the current bid and move ' + t.name + ' onto the block.', 'block', { id: t.id }) : act('block', { id: t.id })}>Put on block</DropdownMenuItem>}<DropdownMenuItem onSelect={() => act('team_status', { id: t.id, status: 'UPCOMING' })}>Return to queue</DropdownMenuItem><DropdownMenuItem onSelect={() => ask('Mark unsold?', t.name + ' will be removed from the upcoming queue.', 'team_status', { id: t.id, status: 'UNSOLD' })}>Mark unsold</DropdownMenuItem><DropdownMenuItem onSelect={() => ask('Withdraw team?', t.name + ' will remain in the records as withdrawn. Active sales must be voided first.', 'team_status', { id: t.id, status: 'WITHDRAWN' })}>Withdraw</DropdownMenuItem><DropdownMenuItem onSelect={() => ask('Delete team?', t.name + ' will be deleted. Teams with sale history cannot be deleted.', 'team_delete', { id: t.id })}>Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>)}</TableBody></Table></div></TabsContent>
 <TabsContent value="buyers"><div className="section-title"><div><h2>Buyers & syndicates</h2><p className="muted">Individuals, families, tables and groups. Contact details remain private.</p></div><Button onClick={() => setModal({ type: 'buyer', name: '', group: '', contact: '', privateNotes: '' })}><Plus /> Add buyer</Button></div><div className="buyer-grid">{buyers.map((b: Row) => <article key={b.id} className="panel buyer-card"><div className="section-title"><Users size={23}/><Button variant="ghost" size="icon" aria-label={'Edit ' + b.name} onClick={() => setModal({ type: 'buyer', ...b })}><Pencil /></Button></div><h2>{b.name}</h2><p>{b.group || 'Individual / group buyer'}</p><p className="fine">{b.contact || 'No contact on file'}</p><p className="fine">{b.privateNotes}</p><div className="buyer-total"><span>{activeSales.filter((x: Row) => x.buyerId === b.id).length} teams bought</span><strong>{money(activeSales.filter((x: Row) => x.buyerId === b.id).reduce((n: number, x: Row) => n + x.amount, 0), e.currency)}</strong></div></article>)}</div>{!buyers.length && <p className="empty-state">Add your first buyer, or create one directly from the auction console.</p>}</TabsContent>
 <TabsContent value="sales"><div className="section-title"><div><h2>Every hammer, on record.</h2><p className="muted">Corrections recalculate the pool. Buybacks only change ownership.</p></div><Button variant="outline" onClick={exportSales}><Download /> Export auction records</Button></div><div className="panel roster"><Table label="Sales table"><TableHeader><TableRow><TableHead>Team</TableHead><TableHead>Buyer</TableHead><TableHead>Sale price</TableHead><TableHead>{s.buybackMode === "calculate" ? "Suggested calculation" : "Ownership"}</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>{data.sales.map((x: Row) => { const t = teams.find((t: Row) => t.id === x.teamId), o = data.ownership.find((o: Row) => o.saleId === x.id && o.kind === 'team'); return <TableRow key={x.id}><TableCell><strong>{t?.name}</strong><p className="fine">{new Date(x.createdAt).toLocaleString()}</p></TableCell><TableCell>{buyers.find((b: Row) => b.id === x.buyerId)?.name}</TableCell><TableCell className="amount">{money(x.amount, e.currency)}</TableCell><TableCell>{s.buybackMode === "calculate" && x.status === "ACTIVE" && <p className="fine">Suggested buyback calculation: {s.buybackSuggested / 100}% = {money(Math.round(x.amount * s.buybackSuggested / 10000), e.currency)}. Private agreement; not owed to the club.</p>}<p>{o?.status || 'Purchaser 100%'}{o?.status === 'Completed' ? ' · Team ' + o.percent / 100 + '%' : ''}</p>{o?.status === 'Completed' && <p className="fine">Consideration {money(o.consideration, e.currency)} · Purchaser {(10000 - o.percent) / 100}%</p>}</TableCell><TableCell><span className="badge">{x.status}</span></TableCell><TableCell><div className="actions">{x.status === 'ACTIVE' && <><Button size="sm" variant="outline" onClick={() => setModal({ type: 'sale', ...x, amount: String(x.amount / 100) })}>Correct</Button>{s.buybackMode === "track" && <Button size="sm" variant="outline" onClick={() => setModal({ type: 'buyback', saleId: x.id, team: t?.name, amount: x.amount, percent: o?.status === 'Completed' ? o.percent / 100 : s.buybackMax / 100, status: o?.status || 'Pending Buyback' })}>Buyback</Button>}<DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={'More sale actions for ' + t?.name}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onSelect={() => ask('Reopen this sale?', 'Remove ' + money(x.amount, e.currency) + ' from the pool and return ' + t?.name + ' to the queue. Old ownership will no longer count.', 'sale_reopen', { id: x.id, notes: 'Reopened by operator' })}>Reopen sale</DropdownMenuItem><DropdownMenuItem onSelect={() => ask('Void this sale?', 'Remove ' + money(x.amount, e.currency) + ' from the pool and mark ' + t?.name + ' unsold. Old ownership will no longer count.', 'sale_void', { id: x.id, notes: 'Voided by operator' })}>Void sale</DropdownMenuItem></DropdownMenuContent></DropdownMenu></>}</div></TableCell></TableRow>; })}</TableBody></Table></div><p className="notice">The pool uses original active sale prices only. No buyback consideration is added. This application does not process payments.</p></TabsContent>
 <TabsContent value="rules"><Rules key={e.id} advancedRequest={advancedRequest} data={data} busy={busy} act={act} ask={ask} setModal={setModal}/></TabsContent>
 <TabsContent value="results"><Results key={e.id} data={data} busy={busy} act={act} ask={ask}/></TabsContent>
 <TabsContent value="settlement"><Settlement key={e.id} data={data} busy={busy} act={act}/></TabsContent><TabsContent value="exports"><Exports data={data}/></TabsContent><TabsContent value="sharing"><Sharing data={data} busy={busy} act={act}/></TabsContent><TabsContent value="help"><AuctionHelp data={data}/></TabsContent>
 <TabsContent value="activity"><div className="section-title"><div><h2>The audit trail</h2><p className="muted">Significant changes, corrections and the operator who made them.</p></div><Button variant="outline" onClick={() => download('calcutta-audit.csv', [['Time', 'Operator', 'Action', 'Record', 'Undone'], ...meta.audit.map((a: Row) => [a.createdAt, a.actor, a.action, a.recordId, a.undone ? 'Yes' : 'No'])])}><Download /> Export recent audit</Button></div><div className="panel roster"><Table label="Audit trail table"><TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Operator</TableHead><TableHead>Action</TableHead><TableHead>Correction</TableHead></TableRow></TableHeader><TableBody>{meta.audit.map((a: Row) => <TableRow key={a.id}><TableCell>{new Date(a.createdAt).toLocaleString()}</TableCell><TableCell>{a.actor}</TableCell><TableCell>{a.action.replaceAll('_', ' ')}</TableCell><TableCell>{a.undone ? 'Undone — retained in history' : ''}</TableCell></TableRow>)}</TableBody></Table></div><p className="fine">Showing the latest 100 actions. Full before/after records are retained in storage.</p></TabsContent>
 {user.owner && <TabsContent value="access"><section className="panel settings-card"><ShieldCheck size={28}/><h2>Operator access</h2><p>The owner allowlist is protected in Sites settings. Grant or revoke additional operator access here. Operators can run auctions and edit records; only owners can manage access.</p><form className="access-form" onSubmit={async (ev) => { ev.preventDefault(); if (await act('operator_add', { email: accessEmail }))
            setAccessEmail(''); }}><Field label="Operator’s ChatGPT email"><Input type="email" required value={accessEmail} onChange={ev => setAccessEmail(ev.target.value)} placeholder="name@example.com"/></Field><Button type="submit" disabled={busy}><Plus /> Grant operator access</Button></form><h3>Owners</h3>{(meta.owners?.length ? meta.owners : [user.email]).map((email: string) => <div className="owner-row" key={email}><span>{email}<small>{email === user.email ? 'You · ' : ''}Owner access comes from the site settings and cannot be granted or revoked here.</small></span><span className="badge">Owner</span></div>)}<h3>Operators</h3>{meta.operators.map((o: Row) => <div className="access-row" key={o.email}><span>{o.email}<small>Added by {o.addedBy}</small></span><Button variant="outline" disabled={busy} onClick={() => ask('Revoke operator access?', o.email + ' will lose access on their next request.', 'operator_remove', { email: o.email })}>Revoke</Button></div>)}{!meta.operators.length && <p className="muted">No additional operators have been granted access.</p>}</section></TabsContent>}
 </Tabs></>}
 <StartAuctionDialog open={startOpen} onOpenChange={setStartOpen} busy={busy} start={where => void startAuction(where)}/>
 {user.owner && <LocalUsersDialog open={localUsersOpen} onOpenChange={setLocalUsersOpen} users={meta.localUsers || []} busy={busy} act={act}/>}
 {saleDraft && data && <SoldDialog key={saleDraft.teamId} sale={saleDraft} setSale={setSaleDraft} data={data} act={act} busy={busy} onClosed={() => bidInput.current?.focus()}/>}
 <Editors modal={modal} setModal={setModal} data={data} busy={busy} act={(action: string, payload: Row, opts: Row = {}) => act(action, payload, { ...opts, revision: modal?.revision })} setBuyerId={setBuyerId}/>
 <AlertDialog open={!!confirm} onOpenChange={open => { if (!open && !busy)
        setConfirm(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{confirm?.title}</AlertDialogTitle><AlertDialogDescription>{confirm?.description}</AlertDialogDescription></AlertDialogHeader>{confirm?.reset && <Field label="Type RESET DEMO DATA to continue"><Input value={reset} onChange={ev => setReset(ev.target.value)}/></Field>}<AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><AlertDialogAction disabled={busy || confirm?.reset && reset !== 'RESET DEMO DATA'} onClick={async (ev) => { ev.preventDefault(); const c = confirm; const result = c && await act(c.action, c.reset ? { confirmation: reset } : c.payload, { revision: c.revision, message: c.message }); if (result) { c.onComplete?.(result);
        setConfirm(null);
        if (c.sale) {
            setBid('');
            setBuyerId(null);
        }
    } }}>{busy ? 'Saving…' : confirm?.label || 'Confirm'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 <footer className="operator-footer">Recordkeeping & calculations only. No money is processed or transferred.</footer></main></TooltipProvider>;
}
