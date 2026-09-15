// Local-only API helper for synthetic audit fixtures. Mirrors tests/refinement.mjs.
import assert from 'node:assert/strict';
export const base = process.env.CALCUTTA_TEST_URL || 'http://localhost:5173';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Audit writes require localhost.');
export async function session() {
  const r = await fetch(base + '/signin-with-chatgpt?return_to=%2Fadmin', { redirect: 'manual' });
  const cookie = r.headers.get('set-cookie')?.split(';')[0];
  if (!cookie) throw Error('No local sign-in cookie');
  return cookie;
}
export function client(cookie) {
  let eventId = null, d = null;
  const c = {
    get eventId() { return eventId; }, set eventId(v) { eventId = v; }, get d() { return d; },
    async read(id = eventId) { const r = await fetch(base + '/api/admin' + (id ? '?event=' + id : ''), { headers: { cookie } }); assert.equal(r.status, 200); const body = await r.json(); d = body.data; return body; },
    async send(action, payload = {}, opts = {}) {
      const body = { action, payload, eventId, revision: d?.event.revision, requestId: crypto.randomUUID(), ...opts };
      const r = await fetch(base + '/api/admin', { method: 'POST', headers: { cookie, origin: base, 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const result = await r.json();
      assert.equal(r.status, opts.expected || 200, action + ': ' + JSON.stringify(result));
      if (result.eventId) eventId = result.eventId;
      await c.read();
      return { result, body };
    },
    async settings(p) { await c.send('event_update', { ...d.event, settings: { ...d.event.settings, ...p } }); },
    async pub(q = '') { return await (await fetch(base + '/api/public?event=' + eventId + q)).json(); },
    async exportText(kind) { const r = await fetch(base + '/api/export?event=' + eventId + '&kind=' + kind, { headers: { cookie } }); return { status: r.status, text: await r.text(), disposition: r.headers.get('content-disposition') }; },
  };
  return c;
}
