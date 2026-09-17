// Read/verify a provisioned local mock role; never changes host auth configuration.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { testSession } from './test-session.mjs';
const { chromium } = await import(process.env.S1_PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.CALCUTTA_TEST_URL || 'http://localhost:5186';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local role fixtures only.');
const role = process.argv[2];
assert.ok(['owner', 'operator', 'outsider'].includes(role));
const cookie = process.env.S1_SESSION_COOKIE || await testSession(base), checks = [];
function check(ok, label) { assert.ok(ok, label); checks.push({ label, pass: true }); }
const response = await fetch(base + '/api/admin', { headers: { cookie } });
const payload = role === 'outsider' ? null : await response.json();
check(response.status === (role === 'outsider' ? 403 : 200), role + ' API read boundary');
const send = (action, value) => fetch(base + '/api/admin', { method: 'POST', headers: { cookie, origin: base, 'content-type': 'application/json' }, body: JSON.stringify({ action, payload: value, eventId: payload?.data.event.id, revision: payload?.data.event.revision, requestId: crypto.randomUUID() }) });
if (payload) check(payload.user.owner === (role === 'owner'), 'Server exposes correct owner flag');
if (role === 'operator') {
    check(payload.operators.length === 0, 'Operator cannot read owner Access list');
    const denied = await send('operator_add', { email: 's1-forbidden@sites.test' });
    check(denied.status === 400 && (await denied.json()).error === 'Only the owner can manage operator access.', 'Operator cannot grant Access');
    check((await send('theme_update', { theme: 'classic' })).status === 200, 'Authorized non-owner can save theme');
}
if (role === 'outsider') check((await send('theme_update', { theme: 'classic' })).status === 403, 'Signed-in non-operator cannot save theme');
const browser = await chromium.launch({ headless: true, ...(process.env.S1_CHROMIUM ? { executablePath: process.env.S1_CHROMIUM } : {}) });
try {
    const context = await browser.newContext();
    const [name, ...value] = cookie.split('=');
    await context.addCookies([{ name, value: value.join('='), url: base }]);
    const page = await context.newPage(); await page.goto(base + '/admin');
    if (role !== 'outsider') await page.getByRole('tab', { name: 'Event & rules', exact: false }).waitFor();
    check(await page.getByRole('tab', { name: 'Access', exact: true }).count() === (role === 'owner' ? 1 : 0), 'Access tab remains owner-only');
    if (role === 'outsider') check(await page.getByRole('tab').count() === 0, 'Non-operator cannot reach settings UI');
} finally { await browser.close(); }
const out = process.env.S1_EVIDENCE || 'docs/s1-evidence'; fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(`${out}/roles-${role}.json`, JSON.stringify({ role, environment: process.env.S1_SESSION_COOKIE ? 'Isolated portable database and synthetic sessions; no real identities' : 'Local Sites mock only; no real identities', checks }, null, 2));
console.log(`${checks.length} ${role} role checks passed`);
