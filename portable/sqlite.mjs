import { DatabaseSync, backup } from 'node:sqlite';
import { openSync, closeSync } from 'node:fs';

// The application uses this deliberately small subset of D1. Batches execute
// synchronously inside one transaction: no request can interleave on this handle.
export class SQLiteDatabase {
  constructor(filename) {
    this.connection = new DatabaseSync(filename);
    this.connection.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;');
  }
  prepare(sql) { return new SQLiteStatement(this, sql); }
  async batch(statements) {
    if (statements.some(s => !(s instanceof SQLiteStatement) || s.database !== this))
      throw Error('Batch statements must belong to this database.');
    this.connection.exec('BEGIN IMMEDIATE');
    try {
      const results = statements.map(s => s.execute());
      this.connection.exec('COMMIT');
      return results;
    } catch (error) {
      this.connection.exec('ROLLBACK');
      throw error;
    }
  }
  async backupTo(filename) {
    // Reserve exclusively so concurrent backup attempts cannot overwrite one another.
    closeSync(openSync(filename, 'wx', 0o600));
    await backup(this.connection, filename);
  }
  close() { this.connection.close(); }
}

class SQLiteStatement {
  constructor(database, sql, values = []) {
    this.database = database; this.sql = sql; this.values = values;
  }
  bind(...values) { return new SQLiteStatement(this.database, this.sql, values); }
  execute() {
    const statement = this.database.connection.prepare(this.sql);
    const before = this.database.connection.prepare('SELECT total_changes() AS n').get().n;
    const results = statement.all(...this.values).map(row => ({ ...row }));
    const after = this.database.connection.prepare('SELECT total_changes() AS n').get().n;
    return { success: true, results, meta: { changes: after - before } };
  }
  async all() { return this.execute(); }
  async run() { return this.execute(); }
  async first(column) {
    const row = this.database.connection.prepare(this.sql).get(...this.values);
    if (!row) return null;
    if (column === undefined) return { ...row };
    if (!Object.hasOwn(row, column)) throw Error('Requested column does not exist.');
    return row[column];
  }
}
