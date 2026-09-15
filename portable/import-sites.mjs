// Import a consistent, read-only snapshot of a Sites SQLite database into a NEW
// portable database. Derive the application table allowlist from our migrations.
import { DatabaseSync } from 'node:sqlite';
import { openSync, closeSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const sourcePath = process.argv[2], destination = process.env.DATABASE_PATH;
if (!sourcePath || !isAbsolute(sourcePath) || !existsSync(sourcePath) || !destination || !isAbsolute(destination) || resolve(sourcePath) === resolve(destination))
  throw Error('Provide an existing absolute source path and a different, new absolute DATABASE_PATH.');
mkdirSync(dirname(destination), { recursive: true });
closeSync(openSync(destination, 'wx', 0o600));
const migration = spawnSync(process.execPath, ['portable/migrate.mjs'], { encoding: 'utf8', env: process.env });
if (migration.status !== 0) throw Error(migration.stderr || 'Target initialization failed.');
const source = new DatabaseSync(sourcePath, { readOnly: true });
const target = new DatabaseSync(destination);
const quote = name => '"' + name.replaceAll('"', '""') + '"';
try {
  source.exec('BEGIN');
  target.exec('PRAGMA foreign_keys=ON; BEGIN IMMEDIATE; PRAGMA defer_foreign_keys=ON;');
  const tables = target.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'portable_%' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  const counts = {};
  for (const { name } of tables) {
    const fields = target.prepare('PRAGMA table_info(' + quote(name) + ')').all().map(c => c.name);
    const sourceFields = source.prepare('PRAGMA table_info(' + quote(name) + ')').all().map(c => c.name);
    if (JSON.stringify(fields) !== JSON.stringify(sourceFields)) throw Error('Schema mismatch for ' + name);
    const selected = fields.map(quote).join(',');
    const insert = target.prepare('INSERT INTO ' + quote(name) + ' (' + selected + ') VALUES (' + fields.map(() => '?').join(',') + ')');
    let count = 0;
    for (const row of source.prepare('SELECT ' + selected + ' FROM ' + quote(name) + ' ORDER BY rowid').iterate()) {
      insert.run(...fields.map(f => row[f])); count++;
    }
    counts[name] = count;
    if (target.prepare('SELECT COUNT(*) AS n FROM ' + quote(name)).get().n !== count) throw Error('Count mismatch for ' + name);
  }
  if (target.prepare('PRAGMA foreign_key_check').all().length) throw Error('Imported foreign key violations.');
  if (target.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw Error('Imported database integrity failed.');
  target.exec('COMMIT'); source.exec('COMMIT');
  console.log(JSON.stringify({ status: 'imported', counts, authentication: 'Configure owners and recovery credentials separately; no sessions imported.' }));
} catch (e) {
  try { target.exec('ROLLBACK'); } catch {}
  try { source.exec('ROLLBACK'); } catch {}
  throw e;
} finally { target.close(); source.close(); }
