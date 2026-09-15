import { launch, base, fixtures as F, signIn, settle, shot, log } from './lib.mjs';
const phase = process.argv[2]; const L = log('roles-' + phase + '.json'); const b = await launch();
for (const [w, h] of [[390, 844], [1280, 720]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } }); await signIn(ctx); const p = await ctx.newPage(); await p.goto(base + '/admin?event=' + F.live); await p.waitForSelector('.admin-tabs, .access-screen', { timeout: 20000 }); await settle(p, 900);
  const access = await p.locator('.access-screen').count();
  if (phase === 'A') {
    L.add({ check: 'signed-in non-operator sees access-required screen (' + w + 'px)', result: access ? 'PASS' : 'FAIL', detail: { text: await p.locator('.access-screen').textContent().catch(() => null), link: await p.locator('.access-screen a').getAttribute('href').catch(() => null) } });
    L.add({ note: 'screenshot', detail: await shot(p, 'access-required-' + w) });
    const api = await p.evaluate(async () => ({ admin: (await fetch('/api/admin')).status, exportPayments: (await fetch('/api/export?event=' + new URLSearchParams(location.search).get('event') + '&kind=payments')).status, publicRead: (await fetch('/api/public')).status }));
    L.add({ check: 'non-operator API denial', result: api.admin === 403 && api.exportPayments === 403 && api.publicRead === 200 ? 'PASS' : 'FAIL', detail: api });
  } else {
    const tabs = await p.locator('[data-slot=tabs-trigger]').allTextContents();
    L.add({ check: 'operator (non-owner) desk without Access tab (' + w + 'px)', result: !access && tabs.length && !tabs.includes('Access') ? 'PASS' : 'FAIL', detail: { tabs, accessScreen: access } });
    if (w === 1280) {
      const api = await p.evaluate(async () => { const eventId = new URLSearchParams(location.search).get('event'); const post = async (action, payload) => { const r = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, payload, eventId, revision: 0, requestId: crypto.randomUUID() }) }); return { status: r.status, body: await r.json() }; }; return { operatorAdd: await post('operator_add', { email: 'should-not-work@example.test' }), operatorRemove: await post('operator_remove', { email: 'seedy@sites.test' }), exportBackup: (await fetch('/api/export?event=' + eventId + '&kind=backup')).status, exportPayments: (await fetch('/api/export?event=' + eventId + '&kind=payments')).status, adminMeta: await fetch('/api/admin?event=' + eventId).then(r => r.json()).then(b => ({ owner: b.user.owner, operatorsExposed: b.operators.length })) }; });
      L.add({ check: 'non-owner operator cannot change access; exports allowed', result: api.operatorAdd.status === 400 && /owner/i.test(api.operatorAdd.body.error) && api.operatorRemove.status === 400 && api.exportBackup === 200 && api.adminMeta.owner === false && api.adminMeta.operatorsExposed === 0 ? 'PASS' : 'FAIL', detail: api });
      L.add({ note: 'screenshot', detail: await shot(p, 'operator-desk-non-owner') });
    }
  }
  await ctx.close();
}
await b.close();
