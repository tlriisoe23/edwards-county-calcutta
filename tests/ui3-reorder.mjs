// Regression cases for the Next Up / roster reorder defect and the undo description.
// Pure functions, no server: run with `node tests/ui3-reorder.mjs`.
import assert from 'node:assert/strict';
import { reorderVisible } from '../lib/model.ts';
import { lastUndoable, describeUndo } from '../lib/audit.ts';
let checks = 0;
const check = (condition, label) => { assert.ok(condition, label); checks++; console.log('PASS ' + label); };

// The demo fixture's shape, which is also a live auction's shape: sold teams first, one on the
// block, the rest upcoming. "Next up" shows only the UPCOMING ones.
const teams = [
    { id: 'a', name: 'Smith / Jones', status: 'SOLD' },
    { id: 'b', name: 'Brown / Miller', status: 'SOLD' },
    { id: 'c', name: 'Hayes / Bennett', status: 'ON_BLOCK' },
    { id: 'd', name: 'Reed / Foster', status: 'UPCOMING' },
    { id: 'e', name: 'Parker / Ellis', status: 'UPCOMING' },
    { id: 'f', name: 'Morgan / Blake', status: 'UPCOMING' },
];
const next = teams.filter(t => t.status === 'UPCOMING').map(t => t.id);

// The defect: from the top of "Next up" the raw predecessor is the team ON THE BLOCK, so the old
// swap renumbered the lot without moving anything the operator could see.
check(reorderVisible(teams, next, 'd', -1) === null, 'Move up at the top of Next up is a no-op, not a renumber');
check(reorderVisible(teams, next, 'f', 1) === null, 'Move down at the end of Next up is a no-op');

const up = reorderVisible(teams, next, 'e', -1);
check(up.join(',') === 'a,b,c,e,d,f', 'Move up swaps with the previous VISIBLE team, leaving sold/on-block teams in place');
const down = reorderVisible(teams, next, 'd', 1);
check(down.join(',') === 'a,b,c,e,d,f', 'Move down swaps with the next visible team');
check(reorderVisible(teams, next, 'd', -1) === null && reorderVisible(teams, next, 'd', 1).length === teams.length, 'Every reorder still submits the complete team order');

// Non-adjacent visible neighbours: an unsold team sitting between two upcoming ones must not be
// dragged into the swap.
const gapped = [
    { id: 'p', status: 'UPCOMING' }, { id: 'q', status: 'UNSOLD' }, { id: 'r', status: 'UPCOMING' }, { id: 's', status: 'UPCOMING' },
];
const visible = gapped.filter(t => t.status === 'UPCOMING').map(t => t.id);
check(reorderVisible(gapped, visible, 'r', -1).join(',') === 'r,q,p,s', 'Swapping across a hidden team keeps the hidden team where it is');

// The roster table filters by search/flight/status; the same rule applies to its arrows.
const filtered = ['a', 'c', 'f'];
check(reorderVisible(teams, filtered, 'c', -1).join(',') === 'c,b,a,d,e,f', 'Roster arrows swap within the filtered view');
check(reorderVisible(teams, filtered, 'a', -1) === null, 'Roster arrows stop at the top of the filtered view');
check(reorderVisible(teams, ['a'], 'a', -1) === null && reorderVisible(teams, ['a'], 'a', 1) === null, 'A single visible row cannot be moved anywhere');
check(reorderVisible(teams, next, 'zz', -1) === null, 'An unknown id changes nothing');

// Undo description mirrors the server's own selection of what to restore.
const now = '2026-09-19T18:30:00.000Z';
const audit = [
    { id: '1', action: 'undo', recordId: 'x', createdAt: now, undone: 0, actor: 'op@test' },
    { id: '2', action: 'team_skip', recordId: 'd', createdAt: now, undone: 0, actor: 'op@test' },
    { id: '3', action: 'bid', recordId: 'c', createdAt: now, undone: 0, actor: 'op@test' },
];
check(lastUndoable(audit).id === '2', 'Skips undo rows when naming the last undoable action');
check(lastUndoable([{ id: '9', action: 'load_demo', createdAt: now, undone: 0 }]) === null, 'Creation rows carry no before-snapshot and are never offered');
check(lastUndoable([{ id: '9', action: 'bid', createdAt: now, undone: 1 }]) === null, 'An already-undone row is not offered again');
check(describeUndo([], null) === 'There is no recorded action to undo yet.', 'A fresh event says there is nothing to undo');
check(describeUndo([], null, 'The correction remains in the audit trail.') === 'There is no recorded action to undo yet.', 'With nothing to undo, the follow-on reassurance is not appended');

const data = { event: { currency: 'USD' }, teams, buyers: [], flights: [], sales: [] };
const text = describeUndo(audit, data, 'Other operator changes are protected by a version check.');
check(text.endsWith('Other operator changes are protected by a version check.'), 'The caller\'s follow-on sentence is appended when there is something to undo');
check(/^This will undo: Team skipped for now — Reed \/ Foster/.test(text), 'Names the action and the record it touched: ' + text);
check(/recorded \d/.test(text) && /by op@test/.test(text), 'Names when it happened and who did it');
const saleData = { event: { currency: 'USD' }, teams, buyers: [], flights: [], sales: [{ id: 's1', teamId: 'd', amount: 45000 }] };
check(/Sale recorded — Reed \/ Foster · \$450/.test(describeUndo([{ id: '4', action: 'sale', recordId: 's1', createdAt: now, undone: 0, actor: 'op@test' }], saleData)), 'A sale is named by its team and amount');
check(/^This will undo: theme update\b/.test(describeUndo([{ id: '5', action: 'theme_update_unknown', createdAt: now, undone: 0 }], data).replace('theme update unknown', 'theme update')), 'An unmapped action still reads as words, not a code');

console.log(JSON.stringify({ checks, at: new Date().toISOString(), status: 'passed' }));
