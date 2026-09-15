import { passwordHash } from './sessions.mjs';
import { getDatabase } from './runtime.mjs';
const email = (process.argv[2] || '').trim().toLowerCase();
if (!(process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map(s => s.trim()).includes(email))
  throw Error('Specify an email already configured in ADMIN_EMAILS.');
if (!process.stdin.isTTY) throw Error('Run in an interactive terminal; passwords are never command arguments.');
async function hidden(prompt) {
  process.stdout.write(prompt);
  process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.setEncoding('utf8');
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = (error) => {
      process.stdin.off('data', onData); process.stdin.setRawMode(false); process.stdin.pause();
      process.stdout.write('\n'); error ? reject(error) : resolve(value);
    };
    const onData = chunk => {
      for (const c of chunk) {
        if (c === '\u0003') return finish(Error('Cancelled.'));
        if (c === '\r' || c === '\n') return finish();
        if (c === '\u007f' || c === '\b') value = value.slice(0, -1);
        else if (c >= ' ' && value.length < 1024) value += c;
      }
    };
    process.stdin.on('data', onData);
  });
}
try {
  const password = await hidden('Recovery password (14+ characters, hidden): ');
  const confirm = await hidden('Repeat password (hidden): ');
  if (password !== confirm) throw Error('Passwords did not match.');
  const hash = passwordHash(password), db = getDatabase().connection;
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('INSERT INTO portable_credentials VALUES (?,?) ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash').run(email, hash);
    db.prepare("DELETE FROM portable_sessions WHERE json_extract(body,'$.user.email')=?").run(email);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  console.log('Recovery credential saved; previous sessions for this owner revoked.');
} finally { try { getDatabase().close(); } catch {} }
