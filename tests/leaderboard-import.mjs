// Importing the flighted field from the leaderboard (WC-6).
//
// The point of these checks is not that rows arrive — it is what happens the
// SECOND time they arrive, which is the realistic case: a score is corrected
// after the flights are drawn and the list is brought over again, possibly with
// the auction already under way.
//
//   * a repeat import must update, never duplicate
//   * a sold team must be left exactly as it was, and named in the result
//   * what it did must be reported, not implied by a row count
//
// Needs a leaderboard to read from: LEADERBOARD_URL on the server, and an event
// there with a flighted Calcutta field.
const { chromium } = await import(process.env.UI3_PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.CALCUTTA_TEST_URL || 'http://localhost:5173';
const leaderboard = process.env.LEADERBOARD_TEST_URL || 'http://localhost:5191';
for (const url of [base, leaderboard])
  if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw Error('Import fixtures require localhost.');

const browser = await chromium.launch({ headless: true });
const checks = [];
const check = (ok, label, detail) => { checks.push({ label, pass: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + label + (detail !== undefined && !ok ? ' :: ' + JSON.stringify(detail) : '')); };

const context = await browser.newContext();
context.setDefaultTimeout(60000);
const page = await context.newPage();
await page.goto(base + '/signin-with-chatgpt?return_to=%2Fadmin');

let eventId = null, revision = undefined;
const read = async () => (await (await context.request.get(base + '/api/admin?event=' + eventId)).json()).data;
const post = async (action, payload = {}) => {
  const r = await context.request.post(base + '/api/admin', { headers: { origin: base },
    data: { action, payload, eventId, revision, requestId: crypto.randomUUID() } });
  const b = await r.json();
  if (!r.ok()) throw Error(action + ': ' + JSON.stringify(b));
  if (b.revision !== undefined) revision = b.revision;
  return b;
};

// ---- A leaderboard event with a flighted field to read.
const seed = await (await fetch(leaderboard + '/api/board', { method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ action: 'demo', variant: 'twoDay', name: 'Import source ' + Date.now() }) })).json();
check(seed.event?.competitors?.length === 50, `the leaderboard has a 50-team flighted event (${seed.event?.competitors?.length})`);

// ---- The pull itself.
const created = await post('load_demo', { variant: 'twoDay' });
eventId = created.eventId;
const fresh = await read();
revision = fresh.event.revision;
const pulled = await post('leaderboard_field', { slug: seed.event.slug });
check(pulled.rows?.length === 50, `it reads fifty teams back (${pulled.rows?.length})`, pulled.note);
const sample = pulled.rows?.[0];
check(sample?.name && sample.players?.length === 2 && sample.flight,
  'each row carries a team, two players and a flight', sample);
check(pulled.rows.some((r) => r.pop > 0), 'and the pops come across', pulled.rows.slice(0, 3));

// ---- An event with no flights at all: the case the owner actually hit.
//
// Every row arrives with a flight this event has never heard of, so the import
// is right to refuse — but the remedy must not be "retype five names exactly".
{
    const bare = await post('create_event', { name: 'Bare event ' + Date.now(), course: 'Edwards County Golf Course' });
    const keep = { eventId, revision };
    eventId = bare.eventId; revision = (await read()).event.revision;
    const empty = await read();
    check(empty.flights.length === 0, 'the event starts with no flights at all', empty.flights.length);

    const pull = await post('leaderboard_field', { slug: seed.event.slug });
    check(Array.isArray(pull.flights) && pull.flights.length >= 4,
        'the pull names the leaderboard flights, in its order', pull.flights);

    const made = await post('flight_import', { names: pull.flights });
    const withFlights = await read();
    check(withFlights.flights.length === pull.flights.length,
        `it creates every missing flight (${withFlights.flights.length})`, withFlights.flights.map((f) => f.name));
    check(withFlights.flights.map((f) => f.name).join('|') === pull.flights.join('|'),
        'in the leaderboard order, not alphabetical', withFlights.flights.map((f) => f.name));
    check(withFlights.flights.every((f) => withFlights.payoutRules.filter((r) => r.poolId === f.id).length === 3),
        'each paying three places, like one added by hand');
    check(withFlights.flights.every((f) => f.ownPool), 'and each with its own pool');
    void made;

    // Importing again must not make a second set.
    const again = await context.request.post(base + '/api/admin', { headers: { origin: base },
        data: { action: 'flight_import', payload: { names: pull.flights }, eventId, revision: (await read()).event.revision, requestId: crypto.randomUUID() } });
    check(!again.ok(), 'creating the same flights twice is refused rather than duplicated', await again.json());

    // And now the rows resolve.
    const map = new Map(withFlights.flights.map((f) => [f.name.toLowerCase(), f.id]));
    const unresolved = pull.rows.filter((r) => !map.get(String(r.flight).toLowerCase()));
    check(unresolved.length === 0, 'every imported row now has a flight to land in', unresolved.slice(0, 3));
    revision = (await read()).event.revision;
    const landed = await post('team_import', { teams: pull.rows.map((r) => ({ name: r.name, players: r.players, flightId: map.get(String(r.flight).toLowerCase()), handicap: r.pop, seed: null, notes: '', privateNotes: '' })) });
    check(landed.imported?.created === pull.rows.length, `all ${pull.rows.length} teams import into the new flights`, landed.imported);

    eventId = keep.eventId; revision = (await read()).event.revision;
}

// ---- Import into an event whose flights match by name.
const flights = new Map(fresh.flights.map((f) => [f.name.toLowerCase(), f.id]));
const asTeams = (rows) => rows.map((r) => ({ name: r.name, players: r.players, flightId: flights.get(r.flight.toLowerCase()) || fresh.flights[0].id, handicap: r.pop, seed: null, notes: '', privateNotes: '' }));
const before = (await read()).teams.length;
const first = await post('team_import', { teams: asTeams(pulled.rows) });
const afterFirst = await read();
check(first.imported?.updated === 50 && first.imported?.created === 0,
  `the first import matches the fifty already there rather than adding more (created=${first.imported?.created} updated=${first.imported?.updated})`);
check(afterFirst.teams.length === before,
  `the roster is still ${before} teams, not ${before * 2}`, afterFirst.teams.length);

// ---- The second import is the one that matters.
const second = await post('team_import', { teams: asTeams(pulled.rows) });
const afterSecond = await read();
check(afterSecond.teams.length === before, `importing the same field twice does not duplicate it (${afterSecond.teams.length})`);
check(second.imported?.created === 0, 'nothing is created the second time', second.imported);

// ---- A sold team is left alone, and said so.
await post('status', { status: 'LIVE' });
// Going live brings a team onto the block by itself, so sell whichever one the
// auction actually put there rather than insisting on a particular row.
const live = await read();
const victim = live.teams.find((t) => t.id === live.state?.teamId) || live.teams.find((t) => t.status === 'UPCOMING');
if (!live.state?.teamId) await post('block', { id: victim.id });
await post('bid', { teamId: victim.id, amount: 50000 });
const buyer = (await read()).buyers[0];
await post('sell', { teamId: victim.id, buyerId: buyer.id, amount: 50000 });
const sold = (await read()).teams.find((t) => t.id === victim.id);
check(sold.status === 'SOLD' || (await read()).sales.some((s) => s.teamId === victim.id), `${victim.name} is sold`, sold.status);

const movedFlight = fresh.flights.find((f) => f.id !== victim.flightId).name;
const meddling = asTeams(pulled.rows).map((t) => t.name === victim.name
  ? { ...t, flightId: flights.get(movedFlight.toLowerCase()), handicap: 99 } : t);
const third = await post('team_import', { teams: meddling });
const afterThird = await read();
const unchanged = afterThird.teams.find((t) => t.id === victim.id);
check(third.imported?.refused?.includes(victim.name),
  'an import that would move a sold team refuses, and names it', third.imported);
check(unchanged.flightId === victim.flightId && Number(unchanged.handicap) === Number(victim.handicap),
  'and that team\'s flight and pop are exactly as they were', { was: [victim.flightId, victim.handicap], now: [unchanged.flightId, unchanged.handicap] });
check(afterThird.teams.length === before, 'while the rest of the field still imports', afterThird.teams.length);

// ---- An unreachable leaderboard says so rather than failing silently.
const broken = await context.request.post(base + '/api/admin', { headers: { origin: base },
  data: { action: 'leaderboard_field', payload: { slug: 'no-such-event-anywhere' }, eventId, revision, requestId: crypto.randomUUID() } });
const brokenBody = await broken.json();
check(!broken.ok() || brokenBody.note || brokenBody.rows?.length === 0,
  'asking for an event the leaderboard does not have is refused or reported, never silent', brokenBody);

// ---- The path through the actual dialog, on an event with no flights.
//
// Every defect this feature had lived here rather than in the API: rows resolved
// against a stale flight list; and the dialog, which deliberately commits
// against the revision it was opened at, invalidated itself by creating the
// flights. Both are invisible to an API-level test.
{
    const ui = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
    const up = await ui.newPage();
    const rejected = [];
    up.on('response', async (r) => {
        if (r.url().endsWith('/api/admin') && r.request().method() === 'POST' && r.status() >= 400)
            rejected.push(JSON.parse(r.request().postData() || '{}').action + ' ' + r.status());
    });
    await up.goto(base + '/signin-with-chatgpt?return_to=%2Fadmin');
    const bare = await (await ui.request.post(base + '/api/admin', { headers: { origin: base },
        data: { action: 'create_event', payload: { name: 'Dialog path ' + Date.now(), course: 'Edwards County' }, requestId: crypto.randomUUID() } })).json();
    await up.goto(base + '/admin?event=' + bare.eventId);
    await up.waitForTimeout(1200);
    await up.getByRole('button', { name: /^Teams & flights/ }).click();
    await up.waitForTimeout(800);
    await up.getByRole('button', { name: 'Import teams' }).click();
    await up.waitForTimeout(600);
    await up.getByRole('button', { name: 'Import from the leaderboard' }).click();
    await up.waitForTimeout(3000);
    const picker = up.getByLabel('Leaderboard event to import from');
    check(await picker.count() === 1, 'the dialog lets you choose which leaderboard event to read');
    await picker.selectOption(seed.event.slug);
    await up.waitForTimeout(3500);

    const offer = up.getByRole('button', { name: /Create all \d+ and import/ });
    check(await offer.count() === 1, 'an event with no matching flights is offered them, not just told');
    await offer.click();
    await up.waitForTimeout(3000);
    check(await up.locator('.import-row-attention').count() === 0,
        'creating them resolves every row immediately, without waiting for a refresh',
        await up.locator('.import-row-attention').count());

    const commit = up.getByRole('button', { name: /^Import \d+ teams/ });
    check(await commit.isEnabled(), 'and the import is ready to commit');
    await commit.click();
    await up.waitForTimeout(5000);
    const landed = await (await ui.request.get(base + '/api/admin?event=' + bare.eventId)).json();
    check(landed.data.teams.length === 50, `all fifty teams land (${landed.data.teams.length})`);
    check(landed.data.flights.length === 4, `in the four flights it created (${landed.data.flights.length})`);
    check(rejected.length === 0,
        'and nothing was rejected on the way — the dialog carries its own change forward rather than invalidating itself', rejected);
    check(landed.data.teams.filter((t) => Number(t.handicap) > 0).length > 0, 'with pops attached');
    await ui.close();
}

const passed = checks.filter((c) => c.pass).length;
console.log('\n' + passed + '/' + checks.length + ' leaderboard import checks passed');
await browser.close();
process.exit(passed === checks.length ? 0 : 1);
