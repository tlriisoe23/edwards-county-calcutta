import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { SQLiteDatabase } from './sqlite.mjs';
import { passwordHash } from './sessions.mjs';
const image = process.argv[2] || 'ecgc-calcutta:portable-rehearsal';
const directory = mkdtempSync(join(tmpdir(), 'calcutta-container-test-'));
const original = join(directory, 'original'), restored = join(directory, 'restored');
mkdirSync(original); mkdirSync(restored);
const docker = (...args) => {
  const result = spawnSync('docker', args, { encoding: 'utf8' });
  if (result.status !== 0) throw Error(result.stderr || result.stdout);
  return result.stdout.trim();
};
const probe = createServer(); await new Promise(r => probe.listen(0, '127.0.0.1', r));
const port = probe.address().port; await new Promise(r => probe.close(r));
const base = 'http://127.0.0.1:' + port;
const password = randomBytes(32).toString('hex'), email = 'owner@example.com';
const settings = ['-e', 'PUBLIC_ORIGIN=' + base, '-e', 'ADMIN_EMAILS=' + email];
docker('run', '--rm', '-v', original + ':/data', ...settings, image, 'node', 'portable/migrate.mjs');
const db = new SQLiteDatabase(join(original, 'calcutta.sqlite'));
await db.prepare('INSERT INTO portable_credentials VALUES (?,?)').bind(email, passwordHash(password)).run();
db.close();
let container;
async function start(data) {
  container = docker('run', '-d', '--memory=512m', '--cpus=1', '-p', '127.0.0.1:' + port + ':3000', '-v', data + ':/data', ...settings, image);
  for (let i=0;i<60;i++) {
    try { if ((await fetch(base + '/api/public')).ok) return; } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw Error(docker('logs', container));
}
function stop() { if (container) { docker('rm', '-f', container); container = undefined; } }
async function login() {
  const page = await fetch(base + '/signin-with-chatgpt'), csrfCookie = page.headers.get('set-cookie').split(';')[0];
  const signed = await fetch(base + '/api/auth/local', { method: 'POST', redirect: 'manual', headers: { cookie: csrfCookie, origin: base }, body: new URLSearchParams({ csrf: csrfCookie.split('=')[1], email, password }) });
  assert.equal(signed.status, 303);
  return signed.headers.get('set-cookie').split(';')[0];
}
try {
  await start(original);
  assert.equal((await fetch(base + '/api/admin')).status, 403);
  assert.equal((await fetch(base + '/api/admin', { headers: { 'oai-authenticated-user-id': 'forged', 'oai-authenticated-user-email': email } })).status, 403);
  const cookie = await login();
  const created = await fetch(base + '/api/admin', { method: 'POST', headers: { cookie, origin: base, 'content-type': 'application/json' }, body: JSON.stringify({ action: 'load_demo', payload: {}, requestId: crypto.randomUUID() }) });
  assert.equal(created.status, 200, await created.clone().text());
  const id = (await created.json()).eventId;
  const board = await (await fetch(base + '/api/public?event=' + id)).json();
  assert(board.teams.length > 0);
  const source = new SQLiteDatabase(join(original, 'calcutta.sqlite'));
  await source.backupTo(join(restored, 'calcutta.sqlite'));
  const destination = new SQLiteDatabase(join(restored, 'calcutta.sqlite'));
  const tables = (await source.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()).results;
  for (const { name } of tables) {
    const sql = 'SELECT * FROM "' + name.replaceAll('"', '""') + '" ORDER BY rowid';
    assert.deepEqual((await source.prepare(sql).all()).results, (await destination.prepare(sql).all()).results);
  }
  assert.deepEqual((await destination.prepare('PRAGMA integrity_check').all()).results, [{ integrity_check: 'ok' }]);
  source.close(); destination.close();
  const imported = join(directory, 'imported'); mkdirSync(imported);
  docker('run', '--rm', '-v', original + ':/source:ro', '-v', imported + ':/data', ...settings, image, 'node', 'portable/import-sites.mjs', '/source/calcutta.sqlite');
  stop(); await start(original);
  assert.deepEqual(await (await fetch(base + '/api/public?event=' + id)).json(), board);
  stop(); await start(restored);
  assert.deepEqual(await (await fetch(base + '/api/public?event=' + id)).json(), board);
  const restoredCookie = await login();
  assert.equal((await fetch(base + '/api/admin?event=' + id, { headers: { cookie: restoredCookie } })).status, 200);
  stop(); await start(imported);
  assert.deepEqual(await (await fetch(base + '/api/public?event=' + id)).json(), board);
  assert.equal((await fetch(base + '/api/admin')).status, 403);
  console.log('Containerized import reproduced the public board with operator access locked until separately configured.');
  console.log(JSON.stringify({ status: 'passed', checks: ['anonymous and forged-header denial', 'local recovery login', 'demo creation', 'all-table backup equality', 'database integrity', 'container replacement persistence', 'restored public board equality', 'restored operator login'], tables: tables.length, image, syntheticData: directory }));
} finally { stop(); }
