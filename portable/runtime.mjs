import { SQLiteDatabase } from './sqlite.mjs';
import { existsSync } from 'node:fs';
import { isAbsolute } from 'node:path';

let database;
export function getDatabase() {
  if (!database) {
    const filename = process.env.DATABASE_PATH;
    if (!filename || !isAbsolute(filename) || !existsSync(filename))
      throw Error('DATABASE_PATH must identify an initialized absolute SQLite path.');
    database = new SQLiteDatabase(filename);
  }
  return database;
}
export const env = {
  get DB() { return getDatabase(); },
  get ADMIN_EMAILS() { return process.env.ADMIN_EMAILS || ''; },
  // Where the leaderboard lives, for importing a flighted field (WC-6). Empty
  // in an installation that has no leaderboard, which is a supported shape: the
  // import falls back to the paste box.
  get LEADERBOARD_URL() { return process.env.LEADERBOARD_URL || ''; },
};
