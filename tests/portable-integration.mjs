import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, cpSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
const dir = mkdtempSync(join(tmpdir(), 'calcutta-integration-'));
const probe = createServer();
await new Promise(r => probe.listen(0, '127.0.0.1', r));
const port = probe.address().port;
await new Promise(r => probe.close(r));
const base = 'http://127.0.0.1:' + port;
process.env.DATABASE_PATH = join(dir, 'test.sqlite');
process.env.ADMIN_EMAILS = 'owner@example.com';
process.env.PUBLIC_ORIGIN = base;
process.env.CALCUTTA_TEST_URL = base;
process.env.CALCUTTA_TEST_EMAIL = 'owner@example.com';
process.env.CALCUTTA_TEST_PASSWORD = process.argv.includes('--hold') ? 'Synthetic UI fixture password only' : randomBytes(32).toString('hex');
const result = spawnSync(process.execPath, ['portable/migrate.mjs'], { encoding: 'utf8' });
assert.equal(result.status, 0, result.stderr);
const { getDatabase } = await import('../portable/runtime.mjs');
const { passwordHash } = await import('../portable/sessions.mjs');
getDatabase().connection.prepare('INSERT INTO portable_credentials VALUES (?,?)').run(process.env.CALCUTTA_TEST_EMAIL, passwordHash(process.env.CALCUTTA_TEST_PASSWORD));
getDatabase().close();
const standalone = resolve('.sites-runtime/portable-build/.next/standalone/.sites-runtime/portable-build');
cpSync('.sites-runtime/portable-build/.next/static', join(standalone, '.next/static'), { recursive: true });
cpSync('public', join(standalone, 'public'), { recursive: true });
const server = spawn(process.execPath, [join(standalone, 'server.js')], { env: { ...process.env, PORT: String(port), HOSTNAME: '127.0.0.1' }, stdio: ['ignore', 'pipe', 'pipe'] });
let log = ''; server.stdout.on('data', x => log += x); server.stderr.on('data', x => log += x);
try {
  let ready = false;
  for (let i=0;i<60;i++) {
    if (server.exitCode !== null) throw Error(log);
    try { const r = await fetch(base + '/api/public'); if (r.ok) { ready = true; break; } } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  assert(ready, log);
  for (const test of ['acceptance.mjs', 'refinement.mjs']) {
    const child = spawnSync(process.execPath, ['tests/' + test], { encoding: 'utf8' });
    process.stdout.write(child.stdout);
    assert.equal(child.status, 0, child.stderr + '\nServer: ' + log);
  }
  console.log('Portable HTTP acceptance and refinement suites passed.');
  const importedPath = join(dir, 'imported.sqlite');
  const imported = spawnSync(process.execPath, ['portable/import-sites.mjs', process.env.DATABASE_PATH], { encoding: 'utf8', env: { ...process.env, DATABASE_PATH: importedPath } });
  assert.equal(imported.status, 0, imported.stderr);
  const { SQLiteDatabase } = await import('../portable/sqlite.mjs');
  const before = new SQLiteDatabase(process.env.DATABASE_PATH), after = new SQLiteDatabase(importedPath);
  for (const { name } of (await before.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'portable_%' AND name NOT LIKE 'sqlite_%'").all()).results) {
    const sql = 'SELECT * FROM "' + name.replaceAll('"', '""') + '" ORDER BY rowid';
    assert.deepEqual((await after.prepare(sql).all()).results, (await before.prepare(sql).all()).results);
  }
  assert.equal(await after.prepare('SELECT COUNT(*) AS n FROM portable_sessions').first('n'), 0);
  before.close(); after.close();
  assert.notEqual(spawnSync(process.execPath, ['portable/import-sites.mjs', process.env.DATABASE_PATH], { env: { ...process.env, DATABASE_PATH: importedPath } }).status, 0);
  console.log('New-database import preserves every application row and refuses existing destinations.');
  if (process.argv.includes('--hold')) {
    console.log('Synthetic UI review: ' + base);
    await new Promise(r => { process.once('SIGINT', r); process.once('SIGTERM', r); });
  }
} finally {
  server.kill();
  await new Promise(r => server.exitCode !== null ? r() : server.once('exit', r));
  rmSync(dir, { recursive: true, force: true });
}
