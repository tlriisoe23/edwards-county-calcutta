import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';

const filename = process.env.DATABASE_PATH;
if (!filename || !isAbsolute(filename)) throw Error('Set an absolute DATABASE_PATH.');
mkdirSync(dirname(filename), { recursive: true });
const db = new DatabaseSync(filename);
try {
  db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; BEGIN IMMEDIATE;');
  db.exec('CREATE TABLE IF NOT EXISTS portable_migrations(name TEXT PRIMARY KEY, digest TEXT NOT NULL);');
  for (const name of readdirSync(resolve('drizzle')).filter(n => n.endsWith('.sql')).sort()) {
    const sql = readFileSync(resolve('drizzle', name), 'utf8');
    // Git may check out SQL as CRLF on Windows and LF on Linux.
    const digest = createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex');
    const previous = db.prepare('SELECT digest FROM portable_migrations WHERE name=?').get(name);
    if (previous && previous.digest !== digest) throw Error('Migration checksum changed: ' + name);
    if (!previous) {
      db.exec(sql);
      db.prepare('INSERT INTO portable_migrations VALUES (?,?)').run(name, digest);
    }
  }
  db.exec(`CREATE TABLE IF NOT EXISTS portable_sessions(token TEXT PRIMARY KEY, body TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS portable_login_attempts(identity TEXT PRIMARY KEY, attempts INTEGER NOT NULL, until INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS portable_credentials(email TEXT PRIMARY KEY, password_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS portable_local_users(email TEXT PRIMARY KEY, display_name TEXT NOT NULL, password_hash TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, created_by TEXT NOT NULL, created_at TEXT NOT NULL);`);
  if (db.prepare('PRAGMA foreign_key_check').all().length) throw Error('Foreign key violations.');
  db.exec('COMMIT');
  console.log('Portable schema is current.');
} catch (e) { try { db.exec('ROLLBACK'); } catch {} throw e; }
finally { db.close(); }
