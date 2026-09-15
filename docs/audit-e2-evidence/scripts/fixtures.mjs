// Creates disposable synthetic audit events on the LOCAL dev database only.
import fs from 'node:fs';
import { session, client } from './api.mjs';
const cookie = await session();
const out = {};
const stamp = '2026-09-14 audit E2';
const first = ['Alex', 'Ben', 'Cal', 'Dan', 'Eli', 'Finn', 'Gus', 'Hal', 'Ian', 'Jon', 'Kip', 'Lee', 'Max', 'Ned', 'Oli', 'Pat', 'Quin', 'Rex', 'Sam', 'Tom'];
const last = ['Archer', 'Baker', 'Carver', 'Dawson', 'Ellis', 'Foster', 'Garner', 'Hayes', 'Irwin', 'Jensen', 'Keller', 'Lowry', 'Mercer', 'Nolan', 'Oakes', 'Porter', 'Quincy', 'Rowe', 'Sutton', 'Tate'];
const name = (i, j) => first[i % 20] + ' ' + last[(i * 7 + j) % 20];
const team = (i, flightId, extra = {}) => ({ name: last[(i * 3) % 20] + ' / ' + last[(i * 5 + 1) % 20], players: [name(i, 0), name(i + 1, 1)], flightId, ...extra });

// 1. Live event: four flights, 16 teams (two long names), buyers, sales, current bid.
{
  const c = client(cookie);
  await c.send('create_event', { name: 'AUDIT-E2 Live · ' + stamp, course: 'Fictional Audit Course', calcuttaName: 'Audit Live Calcutta', dates: 'Sept 19–20, 2026', auctionAt: '2026-09-18T18:00' });
  out.live = c.eventId;
  const flights = [];
  for (const [n, color] of [['Championship', '#b79a59'], ['First Flight', '#889b75'], ['Second Flight', '#6f8fa8'], ['Third Flight', '#a87f6f']]) { await c.send('flight_save', { name: n, color, ownPool: true }); flights.push(c.d.flights.at(-1).id); }
  const teams = [];
  for (let i = 0; i < 16; i++) teams.push(team(i, flights[i % 4]));
  teams[2] = { name: 'Christopher Montgomery-Wellington / Alexander Richardson-Harrington', players: ['Christopher Montgomery-Wellington', 'Alexander Richardson-Harrington'], flightId: flights[2] };
  teams[7] = { name: 'Bartholomew Featherstonehaugh / Maximilian Oppenheimer-Schulz', players: ['Bartholomew Featherstonehaugh', 'Maximilian Oppenheimer-Schulz'], flightId: flights[3], notes: 'Defending champions. Public note visible on the board.' };
  await c.send('team_import', { teams });
  const buyers = [];
  for (const [n, group] of [['The Johnson Group', 'Table 4'], ['Taylor Syndicate', ''], ['Weekend Club', 'Bar'], ['Table Six Syndicate', 'Table 6']]) { await c.send('buyer_save', { name: n, group, contact: 'fictional@example.test', privateNotes: 'Synthetic audit buyer' }); buyers.push(c.d.buyers.find(b => b.name === n).id); }
  await c.send('status', { status: 'LIVE' });
  const sale = async (amount, buyerIdx) => { const t = c.d.state.teamId; await c.send('bid', { teamId: t, amount }); await c.send('sell', { teamId: t, amount, buyerId: buyers[buyerIdx] }); };
  await sale(45000, 0); await sale(70000, 1); await sale(125000, 2); await sale(95000, 3); await sale(160000, 0); await sale(52500, 1);
  await c.send('bid', { teamId: c.d.state.teamId, amount: 125000 });
  out.liveCurrentTeam = c.d.state.teamId;
}

// 2. Completed event with results, receipts, reversal, overpayment, disbursements.
{
  const c = client(cookie);
  await c.send('create_event', { name: 'AUDIT-E2 Completed · ' + stamp, course: 'Fictional Audit Course', calcuttaName: 'Audit Completed Calcutta', dates: 'Sept 12–13, 2026' });
  out.completed = c.eventId;
  const flights = [];
  for (const n of ['Championship', 'First Flight']) { await c.send('flight_save', { name: n, color: '#b79a59', ownPool: true }); flights.push(c.d.flights.at(-1).id); }
  await c.send('team_import', { teams: Array.from({ length: 8 }, (_, i) => team(i + 20, flights[i % 2])) });
  const buyers = [];
  for (const n of ['Paid In Full LLC', 'Partial Payer', 'Overpaid Buyer', 'Owes Everything']) { await c.send('buyer_save', { name: n }); buyers.push(c.d.buyers.find(b => b.name === n).id); }
  await c.send('status', { status: 'LIVE' });
  const amounts = [100000, 150000, 200000, 250000, 30000, 40000, 50000, 60000];
  const saleIds = [];
  for (let i = 0; i < 8; i++) { const t = c.d.state.teamId; await c.send('bid', { teamId: t, amount: amounts[i] }); await c.send('sell', { teamId: t, amount: amounts[i], buyerId: buyers[i % 4] }); saleIds.push(c.d.sales[0].id); }
  await c.send('status', { status: 'COMPLETED' });
  const ts = c.d.teams;
  await c.send('results', { rows: ts.map((t, i) => ({ teamId: t.id, finish: t.flightId === flights[0] ? [1, 2, 3, null][ts.filter(x => x.flightId === flights[0]).indexOf(t)] : [1, 2, 3, null][ts.filter(x => x.flightId === flights[1]).indexOf(t)] })) });
  const rec = (partyId, amount, method = 'Cash', note = '') => c.send('settlement_record', { kind: 'receipt', partyKind: 'buyer', partyId, amount, occurredAt: new Date().toISOString(), method, note });
  const acct = id => c.d.settlement.receipts.find(r => r.id === id);
  await rec(buyers[0], acct(buyers[0]).balance, 'Check', 'Check #1042');
  await rec(buyers[1], 50000, 'Cash', 'First instalment');
  const r = await rec(buyers[1], 20000, 'Venmo', 'Wrong amount');
  await c.send('settlement_reverse', { kind: 'receipt', id: r.result.recordId, note: 'Entered twice by mistake' });
  await rec(buyers[2], acct(buyers[2]).balance, 'Cash', 'Paid at the bar');
  const overSale = c.d.sales.find(s => s.buyerId === buyers[2]);
  await c.send('sale_edit', { id: overSale.id, amount: overSale.amount - 10000, buyerId: buyers[2], notes: 'Price corrected after the hammer' });
  const payee = c.d.settlement.payables[0];
  await c.send('settlement_record', { kind: 'payout', partyKind: payee.kind, partyId: payee.id, amount: Math.round(payee.balance / 2), occurredAt: new Date().toISOString(), method: 'Check', note: 'First half' });
}

// 3. Empty event.
{
  const c = client(cookie);
  await c.send('create_event', { name: 'AUDIT-E2 Empty · ' + stamp });
  out.empty = c.eventId;
}

// 4. Large event: 100 teams, six flights, 30 sales, live with a bid.
{
  const c = client(cookie);
  await c.send('create_event', { name: 'AUDIT-E2 Large · ' + stamp, course: 'Fictional Audit Course', calcuttaName: 'Audit Large Calcutta' });
  out.large = c.eventId;
  const flights = [];
  for (const n of ['Championship', 'First Flight', 'Second Flight', 'Third Flight', 'Fourth Flight', 'Senior Flight']) { await c.send('flight_save', { name: n, color: '#889b75', ownPool: true }); flights.push(c.d.flights.at(-1).id); }
  await c.send('team_import', { teams: Array.from({ length: 100 }, (_, i) => ({ name: 'Audit Team ' + String(i + 1).padStart(3, '0'), players: [name(i, 2), name(i + 3, 4)], flightId: flights[i % 6], handicap: Math.round((4 + i * 0.3) * 10) / 10 })) });
  const buyers = [];
  for (let i = 0; i < 6; i++) { await c.send('buyer_save', { name: 'Large Buyer ' + (i + 1) }); buyers.push(c.d.buyers.at(-1).id); }
  await c.send('status', { status: 'LIVE' });
  for (let i = 0; i < 30; i++) { const t = c.d.state.teamId, amount = 20000 + i * 2500; await c.send('bid', { teamId: t, amount }); await c.send('sell', { teamId: t, amount, buyerId: buyers[i % 6] }); }
  await c.send('bid', { teamId: c.d.state.teamId, amount: 300000 });
}

// 5. Demo event via the product's own loader.
{
  const c = client(cookie);
  await c.send('load_demo');
  out.demo = c.eventId;
}
out.createdAt = new Date().toISOString();
fs.writeFileSync(new URL('./fixtures.json', import.meta.url), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
