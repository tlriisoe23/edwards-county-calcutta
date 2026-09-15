import { isAbsolute } from 'node:path';
import { getDatabase } from './runtime.mjs';
const destination = process.argv[2];
if (!destination || !isAbsolute(destination)) throw Error('Specify a new absolute backup file path.');
try {
  await getDatabase().backupTo(destination);
  console.log('Consistent SQLite backup created. Protect this file as private data.');
} finally { getDatabase().close(); }
