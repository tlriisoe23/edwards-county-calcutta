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
// Returns the signed-in display name on success (owner recovery or an operator-level local
// account), or null. Never returns which of the two paths matched — both fail identically.
export function checkLocal(login, password) {
  const db = getDatabase().connection, now = Date.now();
  const owners = (process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map(s => s.trim());
  const identifier = String(login || '').trim().toLowerCase();
  // One persistent bucket prevents bypass by changing submitted login or IP headers.
  const limit = db.prepare("SELECT * FROM portable_login_attempts WHERE identity='local'").get();
  if (limit && limit.until > now && limit.attempts >= 5) return null;
  db.prepare(`INSERT INTO portable_login_attempts VALUES ('local',1,?) ON CONFLICT(identity) DO UPDATE SET
    attempts=CASE WHEN until<=? THEN 1 ELSE attempts+1 END,
    until=CASE WHEN until<=? THEN excluded.until ELSE until END`).run(now + 900000, now, now);
  if (owners.includes(identifier)) {
    const row = db.prepare('SELECT password_hash FROM portable_credentials WHERE email=?').get(identifier);
    if (!row || !verifyPassword(password, row.password_hash)) return null;
    db.prepare("DELETE FROM portable_login_attempts WHERE identity='local'").run();
    return { displayName: identifier, email: identifier, owner: true };
  }
  // Operator-level local accounts (Tools -> Local Users, D-CAL-4): keyed by a username since
  // WC-2, signed in with it or with the optional email on the account. Never checked against
  // the owner allowlist, and never able to become one — owner stays exclusively ADMIN_EMAILS-derived.
  const row = db.prepare("SELECT username,email,display_name,password_hash,enabled FROM portable_local_users WHERE username=? OR (email<>'' AND lower(email)=?)").get(identifier, identifier);
  if (!row || !row.enabled || !verifyPassword(password, row.password_hash)) return null;
  db.prepare("DELETE FROM portable_login_attempts WHERE identity='local'").run();
  return { displayName: row.display_name, username: row.username, email: row.email, owner: false };
}
export function normalizeUsername(value) {
  const username = String(value || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{1,39}$/.test(username)) throw Error('Use a username of 2–40 letters, digits, dots, dashes or underscores.');
  return username;
}
function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error('That email address does not look right.');
  if (email.length > 254) throw Error('That email address is too long.');
  return email;
}
export function createLocalUser(username, displayName, password, createdBy, email = '') {
  const db = getDatabase().connection, name = normalizeUsername(username), address = normalizeEmail(email);
  if (db.prepare('SELECT username FROM portable_local_users WHERE username=?').get(name)) throw Error(name + ' already has a local login.');
  if (address && db.prepare("SELECT username FROM portable_local_users WHERE email<>'' AND lower(email)=?").get(address)) throw Error(address + ' is already on another local login.');
  db.prepare('INSERT INTO portable_local_users (username,email,display_name,password_hash,enabled,created_by,created_at) VALUES (?,?,?,?,1,?,?)')
    .run(name, address, displayName, passwordHash(password), createdBy, new Date().toISOString());
  return name;
}
export function listLocalUsers() {
  return getDatabase().connection.prepare('SELECT username,email,display_name,enabled,created_by,created_at FROM portable_local_users ORDER BY username').all();
}
// Disabling a login also ends its sessions: a person shown the door should
// not keep the desk open for the rest of the day on a cookie they already hold.
export function setLocalUserEnabled(username, enabled) {
  const db = getDatabase().connection, name = normalizeUsername(username);
  const changes = db.prepare('UPDATE portable_local_users SET enabled=? WHERE username=?').run(enabled ? 1 : 0, name).changes;
  if (!changes) throw Error('No local login for ' + name + '.');
  if (!enabled) db.prepare("DELETE FROM portable_sessions WHERE json_extract(body,'$.user.userId')=?").run('local:' + name);
}
export function resetLocalUserPassword(username, password) {
  const name = normalizeUsername(username);
  const changes = getDatabase().connection.prepare('UPDATE portable_local_users SET password_hash=? WHERE username=?').run(passwordHash(password), name).changes;
  if (!changes) throw Error('No local login for ' + name + '.');
}
