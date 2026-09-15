import { randomBytes, createHash, scryptSync, timingSafeEqual } from 'node:crypto';
import { getDatabase } from './runtime.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
export function safeReturn(value = '/') {
  try {
    const url = new URL(value, 'https://return.invalid');
    if (!value.startsWith('/') || url.origin !== 'https://return.invalid' ||
      /^\/(api\/auth|signin-with-chatgpt|signout-with-chatgpt)/.test(url.pathname)) return '/';
    return url.pathname + url.search + url.hash;
  } catch { return '/'; }
}
export function publicOrigin() {
  const url = new URL(process.env.PUBLIC_ORIGIN || '');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
    throw Error('PUBLIC_ORIGIN requires HTTPS except on loopback.');
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw Error('Invalid PUBLIC_ORIGIN.');
  return url.origin;
}
export function cookie(name, value, maxAge) {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${publicOrigin().startsWith('https:') ? '; Secure' : ''}`;
}
export function requestCookie(request, name) {
  return (request.headers.get('cookie') || '').split(';').map(s => s.trim()).find(s => s.startsWith(name + '='))?.slice(name.length + 1) || '';
}
export function createSession(body, seconds = 28800) {
  const db = getDatabase().connection, now = Date.now();
  const token = randomBytes(32).toString('hex');
  db.prepare('DELETE FROM portable_sessions WHERE expires<=?').run(now);
  db.prepare('INSERT INTO portable_sessions VALUES (?,?,?)').run(hash(token), JSON.stringify(body), now + seconds * 1000);
  return token;
}
export function readSession(token, consume = false) {
  if (!/^[a-f0-9]{64}$/.test(token || '')) return null;
  const db = getDatabase().connection;
  const row = consume
    ? db.prepare('DELETE FROM portable_sessions WHERE token=? RETURNING body,expires').get(hash(token))
    : db.prepare('SELECT body,expires FROM portable_sessions WHERE token=?').get(hash(token));
  return row && row.expires > Date.now() ? JSON.parse(row.body) : null;
}
export function passwordHash(password) {
  if (password.length < 14 || password.length > 1024) throw Error('Use a password between 14 and 1024 characters.');
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || password.length > 1024) return false;
  const parts = /^scrypt:([a-f0-9]{32}):([a-f0-9]{128})$/.exec(encoded || '');
  if (!parts) return false;
  return timingSafeEqual(scryptSync(password, parts[1], 64), Buffer.from(parts[2], 'hex'));
}
export function checkLocal(email, password) {
  const db = getDatabase().connection, now = Date.now();
  const owners = (process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map(s => s.trim());
  // One persistent bucket prevents bypass by changing submitted email or IP headers.
  const limit = db.prepare("SELECT * FROM portable_login_attempts WHERE identity='local'").get();
  if (limit && limit.until > now && limit.attempts >= 5) return false;
  db.prepare(`INSERT INTO portable_login_attempts VALUES ('local',1,?) ON CONFLICT(identity) DO UPDATE SET
    attempts=CASE WHEN until<=? THEN 1 ELSE attempts+1 END,
    until=CASE WHEN until<=? THEN excluded.until ELSE until END`).run(now + 900000, now, now);
  const row = db.prepare('SELECT password_hash FROM portable_credentials WHERE email=?').get(email);
  if (!owners.includes(email) || !row || !verifyPassword(password, row.password_hash)) return false;
  db.prepare("DELETE FROM portable_login_attempts WHERE identity='local'").run();
  return true;
}
