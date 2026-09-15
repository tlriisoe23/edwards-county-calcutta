import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SQLiteDatabase } from '../portable/sqlite.mjs';

const directory = mkdtempSync(join(tmpdir(), 'calcutta-portable-'));
const filename = join(directory, 'test.sqlite');
const db = new SQLiteDatabase(filename);
let restored;
try {
  for (const migration of ['0000_tough_anita_blake.sql', '0001_normal_magdalene.sql'])
    db.connection.exec(readFileSync(new URL('../drizzle/' + migration, import.meta.url), 'utf8'));
  db.connection.exec('CREATE TABLE adapter_probe (id TEXT PRIMARY KEY, cents INTEGER CHECK(cents>=0), revision INTEGER DEFAULT 0);');
  const insert = db.prepare('INSERT INTO adapter_probe(id,cents) VALUES (?,?)');
  await db.batch([insert.bind('a', 101), insert.bind('b', 202)]);
  assert.equal(await db.prepare('SELECT SUM(cents) AS cents FROM adapter_probe').first('cents'), 303);
  await assert.rejects(db.batch([insert.bind('rolled-back', 100), insert.bind('bad', -1)]));
  assert.equal(await db.prepare('SELECT * FROM adapter_probe WHERE id=?').bind('rolled-back').first(), null);
  await assert.rejects(db.batch([db.prepare('UPDATE adapter_probe SET cents=999 WHERE id=?').bind('a'), insert.bind('b', 5)]));
  assert.equal(await db.prepare('SELECT cents FROM adapter_probe WHERE id=?').bind('a').first('cents'), 101);
  const guarded = db.prepare('UPDATE adapter_probe SET cents=?,revision=revision+1 WHERE id=? AND revision=?');
  const attempts = await Promise.all([db.batch([guarded.bind(111, 'a', 0)]), db.batch([guarded.bind(222, 'a', 0)])]);
  assert.deepEqual(attempts.map(r => r[0].meta.changes), [1, 0]);
  await assert.rejects(db.prepare('INSERT INTO players(id,teamId,name,"order") VALUES (?,?,?,?)').bind('orphan', 'missing', 'Test', 0).run());
  assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results, []);
  await db.backupTo(join(directory, 'restore.sqlite'));
  await assert.rejects(db.backupTo(join(directory, 'restore.sqlite')));
  restored = new SQLiteDatabase(join(directory, 'restore.sqlite'));
  const tables = (await db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()).results;
  for (const { name } of tables) {
    const quoted = '"' + name.replaceAll('"', '""') + '"';
    assert.deepEqual((await restored.prepare('SELECT * FROM ' + quoted).all()).results,
      (await db.prepare('SELECT * FROM ' + quoted).all()).results);
  }
  assert.deepEqual((await restored.prepare('PRAGMA integrity_check').all()).results, [{ integrity_check: 'ok' }]);
  db.close();
  const reopened = new SQLiteDatabase(filename);
  assert.equal(await reopened.prepare('SELECT cents FROM adapter_probe WHERE id=?').bind('a').first('cents'), 111);
  reopened.close();
  console.log(`Portable storage passed: schema, rollback, revision race, foreign keys, backup/restore of ${tables.length} tables, restart persistence.`);
} finally {
  try { db.close(); } catch {}
  restored?.close();
  rmSync(directory, { recursive: true, force: true });
}
