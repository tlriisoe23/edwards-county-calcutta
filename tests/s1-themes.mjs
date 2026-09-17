import assert from 'node:assert/strict';
import { defaultSettings, normalizeSettings } from '../lib/model.ts';
import { themeIds, normalizeTheme } from '../lib/themes.ts';
import { testSession } from './test-session.mjs';
const base = process.env.CALCUTTA_TEST_URL || 'http://localhost:5186';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Synthetic S1 tests require localhost.');
let checks = 0;
function check(ok, label) { assert.ok(ok, label); checks++; console.log('PASS ' + label); }
check(defaultSettings.theme === 'classic', 'New events default to Classic');
for (const value of [undefined, null, '', 'future-theme', {}, 42]) {
    check(normalizeTheme(value) === 'classic' && normalizeSettings({ theme: value }).theme === 'classic', 'Invalid/missing stored theme safely falls back: ' + JSON.stringify(value));
}
const cookie = await testSession(base);
let d, eventId;
async function read() {
    const r = await fetch(base + '/api/admin' + (eventId ? '?event=' + eventId : ''), { headers: { cookie } });
    assert.equal(r.status, 200); const b = await r.json(); d = b.data; return b;
}
async function send(action, payload = {}, expected = 200, extra = {}) {
    const r = await fetch(base + '/api/admin', { method: 'POST', headers: { cookie, origin: base, 'content-type': 'application/json' }, body: JSON.stringify({ action, payload, eventId, revision: d?.event.revision, requestId: crypto.randomUUID(), ...extra }) });
    const body = await r.json(); assert.equal(r.status, expected, JSON.stringify(body));
    if (body.eventId) eventId = body.eventId;
    await read(); return body;
}
function businessSnapshot() {
    const event = { ...d.event, settings: { ...d.event.settings } };
    delete event.settings.theme;
    for (const k of ['revision', 'boardRevision', 'updatedAt']) delete event[k];
    return JSON.stringify({ ...d, event });
}
await send('load_demo');
for (const status of ['LIVE', 'PAUSED', 'READY', 'SETUP']) {
    if (status !== d.event.status) await send('status', { status });
    for (const theme of themeIds) {
        const before = businessSnapshot(), revision = d.event.revision;
        await send('theme_update', { theme });
        check(d.event.settings.theme === theme, status + ': preset persists on fresh read: ' + theme);
        check(before === businessSnapshot(), status + ': theme preserves all auction data, settings and calculations');
        check(d.event.revision === revision + 1, 'Existing revision guard records presentation change');
        const publicData = await (await fetch(base + '/api/public?event=' + eventId)).json();
        check(publicData.event.settings.theme === theme, 'Public/TV projection carries saved preset');
        check(!JSON.stringify(publicData).includes('fictional@example.test'), 'Public projection still excludes private buyer contact');
    }
}
const beforeInvalid = JSON.stringify(d);
for (const payload of [{ theme: 'custom' }, {}, { theme: 'classic', bid: 1 }, { theme: null }]) {
    await send('theme_update', payload, 400);
    check(JSON.stringify(d) === beforeInvalid, 'Invalid theme payload writes nothing');
}
await send('theme_update', { theme: 'classic' }, 409, { revision: d.event.revision - 1 });
check(JSON.stringify(d) === beforeInvalid, 'Stale theme save writes nothing');
await send('theme_update', { theme: 'dark-event' });
const legacy = { ...d.event.settings }; delete legacy.theme;
await send('event_update', { ...d.event, settings: legacy });
check(d.event.settings.theme === 'dark-event', 'Legacy rules payload retains authoritative theme');
const themeBeforeUndo = d.event.settings.theme;
await send('theme_update', { theme: 'high-contrast' });
await send('undo');
check(d.event.settings.theme === themeBeforeUndo, 'Theme change participates in existing audit/undo');
const anonymous = await fetch(base + '/api/admin', { method: 'POST', headers: { origin: base, 'content-type': 'application/json' }, body: JSON.stringify({ action: 'theme_update', payload: { theme: 'classic' }, eventId, revision: d.event.revision, requestId: crypto.randomUUID() }) });
check(anonymous.status === 403, 'Anonymous theme mutation denied');
const meta = await read();
check(meta.audit.some(a => a.action === 'theme_update'), 'Theme changes remain visible in Activity audit');
console.log(`${checks} S1 checks passed; synthetic event ${eventId}`);
