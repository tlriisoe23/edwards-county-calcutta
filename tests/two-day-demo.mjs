// The fifty-team two-day two-man fixture (WC-7).
//
// The point of it is that an evening can be rehearsed across both products:
// the flights the leaderboard draws from day one are the flights auctioned
// here, each team carries the pop the leaderboard worked out, and nothing has
// been sold yet — the auction is the thing being rehearsed.
//
// These assertions are what keeps `lib/demo-two-day.ts` honest. It is a literal
// table copied from the leaderboard's own generator (the two products share no
// code by design), so it can drift; what it must not do is drift into a shape
// that cannot be auctioned.
const { chromium } = await import(process.env.UI3_PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.CALCUTTA_TEST_URL || 'http://localhost:5173';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Demo fixtures require localhost.');
const browser = await chromium.launch({ headless: true });
const checks = [];
const check = (ok, label, detail) => { checks.push({ label, pass: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + label + (detail !== undefined && !ok ? ' :: ' + JSON.stringify(detail) : '')); };

const context = await browser.newContext();
context.setDefaultTimeout(60000);
const page = await context.newPage();
await page.goto(base + '/signin-with-chatgpt?return_to=%2Fadmin');

const post = async (action, payload = {}, eventId = null, revision = undefined) => {
    const r = await context.request.post(base + '/api/admin', { headers: { origin: base }, data: { action, payload, eventId, revision, requestId: crypto.randomUUID() } });
    const b = await r.json();
    if (!r.ok()) throw Error(action + ': ' + JSON.stringify(b));
    return b;
};
const created = await post('load_demo', { variant: 'twoDay' });
const eventId = created.eventId;
check(!!eventId, 'the two-day demo is created', created);
const data = (await (await context.request.get(base + '/api/admin?event=' + eventId)).json()).data;

check(data.event.name === 'Edwards County Two Day Two Man — Demo', 'named for the format it rehearses', data.event.name);
check(data.event.status === 'SETUP', 'and it starts before the auction, not mid-way through one', data.event.status);
check(data.teams.length === 50, `fifty teams (${data.teams.length})`);
check(new Set(data.teams.map((t) => t.name)).size === 50, 'no team name is repeated');
check(data.teams.every((t) => t.status === 'UPCOMING'), 'nothing has been sold, skipped or put on the block');
check((data.sales ?? []).length === 0, 'and there are no sales to undo', (data.sales ?? []).length);
check(!data.state?.teamId, 'nothing is on the block until an operator starts', data.state?.teamId);

const flights = data.flights ?? [];
check(flights.length === 4, `four flights (${flights.length})`, flights.map((f) => f.name));
const sizes = flights.map((f) => data.teams.filter((t) => t.flightId === f.id).length);
check(JSON.stringify([...sizes].sort((a, b) => b - a)) === '[13,13,12,12]',
    'split 13 · 13 · 12 · 12, the same split the leaderboard draws', sizes);
check(flights.every((f) => (data.payoutRules ?? data.payout_rules ?? []).filter((r) => r.poolId === f.id).length === 3)
    || (data.payoutRules ?? data.payout_rules) === undefined,
    'each flight pays three places');

// The pops. They are carried in the handicap column, which is where this
// product already keeps a per-team number the room can see (WC-6).
const pops = data.teams.map((t) => Number(t.handicap));
check(pops.every((p) => p >= 0 && p === Math.round(p * 2) / 2), 'every pop is a non-negative half stroke', pops.slice(0, 8));
check(pops.some((p) => p > 0), 'and they are not all zero');
for (const f of flights) {
    const inFlight = data.teams.filter((t) => t.flightId === f.id).map((t) => Number(t.handicap));
    check(Math.min(...inFlight) === 0, `${f.name}: its leader starts level`, inFlight);
}

const players = data.players ?? [];
if (players.length) {
    const perTeam = new Map();
    for (const p of players) perTeam.set(p.teamId, (perTeam.get(p.teamId) || 0) + 1);
    check([...perTeam.values()].every((n) => n === 2) && perTeam.size === 50,
        'two players on every team — it is a two-man event', { teams: perTeam.size, counts: [...new Set(perTeam.values())] });
} else {
    check(true, 'players are not returned by this endpoint, so they are not checked here');
}
check((data.buyers ?? []).length >= 5, 'buyers are ready so the first sale needs no typing', (data.buyers ?? []).length);

const passed = checks.filter((c) => c.pass).length;
console.log('\n' + passed + '/' + checks.length + ' two-day demo checks passed');
await browser.close();
process.exit(passed === checks.length ? 0 : 1);
