import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
const directory = mkdtempSync(join(tmpdir(), 'calcutta-local-users-'));
process.env.DATABASE_PATH = join(directory, 'local-users.sqlite');
process.env.ADMIN_EMAILS = 'owner@example.com';
process.env.PUBLIC_ORIGIN = 'http://localhost:5182';

// An installation from before 2026-09-19 keyed local logins by email. Lay one
// down the old way first, so the migration has something to convert.
{
  const old = new DatabaseSync(process.env.DATABASE_PATH);
  old.exec(`CREATE TABLE portable_local_users(email TEXT PRIMARY KEY, display_name TEXT NOT NULL, password_hash TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, created_by TEXT NOT NULL, created_at TEXT NOT NULL);
    INSERT INTO portable_local_users VALUES ('Legacy@Example.test','Legacy Desk','scrypt:0123456789abcdef0123456789abcdef:${'0'.repeat(128)}',1,'owner@example.com','2026-09-01T00:00:00.000Z');`);
  old.close();
}
assert.equal(spawnSync(process.execPath, ['portable/migrate.mjs'], { encoding: 'utf8' }).status, 0);
assert.equal(spawnSync(process.execPath, ['portable/migrate.mjs'], { encoding: 'utf8' }).status, 0, 'migrating twice is harmless');
const { getDatabase } = await import('../portable/runtime.mjs');
const { checkLocal, createLocalUser, listLocalUsers, setLocalUserEnabled, resetLocalUserPassword, createSession, readSession, normalizeUsername } = await import('../portable/sessions.mjs');
const { GET, POST } = await import('../portable/auth-handler.mjs');
try {
  const legacy = listLocalUsers();
  assert.equal(legacy.length, 1);
  assert.equal(legacy[0].username, 'legacy@example.test', 'an older email-keyed login becomes a username, in lower case');
  assert.equal(legacy[0].email, 'Legacy@Example.test', 'and keeps its address on the row');
  assert.equal(legacy[0].display_name, 'Legacy Desk');

  const password = 'a genuinely long fixture password';
  // Creating a local user never touches the owner allowlist or path, and needs no email.
  assert.equal(createLocalUser('FrontDesk', 'Front Desk Operator', password, 'owner@example.com'), 'frontdesk', 'usernames are stored in lower case');
  assert(checkLocal('frontdesk', password)?.displayName === 'Front Desk Operator', 'local login succeeds and returns the stored display name');
  assert(checkLocal('FRONTDESK', password), 'and the username is not case-sensitive');
  assert.equal(checkLocal('frontdesk', password).owner, false, 'a local login is never the owner');
  assert.equal(checkLocal('frontdesk', 'wrong password'), null, 'wrong password is rejected');
  assert.equal(checkLocal('nobody', password), null, 'unknown username is rejected');

  // An email is optional, and when given it is a second way in.
  createLocalUser('scorer', 'Scorer', password, 'owner@example.com', 'Scorer@Example.test');
  assert(checkLocal('scorer', password), 'signs in by username');
  assert(checkLocal('scorer@example.test', password), 'and by the email on the account');
  assert.equal(checkLocal('scorer', password).email, 'scorer@example.test', 'the session will carry that email');

  const rows = listLocalUsers();
  assert.deepEqual(rows.map(r => r.username), ['frontdesk', 'legacy@example.test', 'scorer']);
  assert.equal(rows.find(r => r.username === 'frontdesk').email, '', 'no email means an empty email, not an invented one');
  assert.equal(rows[0].enabled, 1);
  assert.equal(rows[0].created_by, 'owner@example.com');
  assert(!('password_hash' in rows[0]), 'the listing never includes the password hash');

  assert.throws(() => createLocalUser('frontdesk', 'Duplicate', password, 'owner@example.com'), /already has a local login/, 'a duplicate username is rejected, not silently overwritten');
  assert.throws(() => createLocalUser('other', 'Duplicate email', password, 'owner@example.com', 'scorer@example.test'), /already on another local login/, 'a duplicate email is rejected too');
  assert.throws(() => createLocalUser('a', 'Too short', password, 'owner@example.com'), /2–40 letters/, 'a one-character username is refused');
  assert.throws(() => createLocalUser('front desk', 'Spaces', password, 'owner@example.com'), /2–40 letters/, 'spaces are refused');
  assert.throws(() => createLocalUser('nomail', 'Bad email', password, 'owner@example.com', 'not-an-address'), /does not look right/, 'a malformed email is refused');
  assert.equal(normalizeUsername('  Front.Desk-2 '), 'front.desk-2');

  // Disabling ends the person's open sessions as well as future sign-ins.
  const token = createSession({ kind: 'user', user: { userId: 'local:frontdesk', email: 'frontdesk', displayName: 'Front Desk Operator', local: true } });
  assert(readSession(token), 'a session exists before the login is disabled');
  setLocalUserEnabled('frontdesk', false);
  assert.equal(checkLocal('frontdesk', password), null, 'a disabled local account cannot sign in even with the correct password');
  assert.equal(readSession(token), null, 'and its open session is gone');
  setLocalUserEnabled('frontdesk', true);
  assert(checkLocal('frontdesk', password), 're-enabling restores sign-in');

  resetLocalUserPassword('frontdesk', 'a completely different fixture password');
  assert.equal(checkLocal('frontdesk', password), null, 'the old password no longer works after a reset');
  assert(checkLocal('frontdesk', 'a completely different fixture password'), 'the new password works after a reset');

  // The full HTTP local-login flow (mirrors the owner-recovery flow already covered by
  // tests/portable-auth.mjs) — a created local user can actually sign in through the real form.
  const req = (path, options = {}) => new Request(process.env.PUBLIC_ORIGIN + path, options);
  const page = await GET(req('/signin-with-chatgpt?return_to=/admin'));
  assert((await page.text()).includes('name="login"'), 'the form asks for a username or email, not an email');
  const loginCookie = page.headers.get('set-cookie').split(';')[0];
  const csrf = loginCookie.split('=')[1];
  const body = new URLSearchParams({ csrf, login: 'FrontDesk', password: 'a completely different fixture password' });
  const signedIn = await POST(req('/api/auth/local', { method: 'POST', headers: { origin: process.env.PUBLIC_ORIGIN, cookie: loginCookie }, body }));
  assert.equal(signedIn.status, 303, 'a working local operator account can sign in through the real HTTP form');
  const sessionCookie = signedIn.headers.get('set-cookie').split(';')[0];
  const session = readSession(sessionCookie.split('=')[1]);
  assert.equal(session.user.userId, 'local:frontdesk');
  assert.equal(session.user.username, 'frontdesk');
  assert.equal(session.user.email, 'frontdesk', 'with no email on the account, the username stands in as the identity');
  assert.equal(session.user.local, true, 'the session says it is a local operator account');
  assert.equal(session.user.displayName, 'Front Desk Operator');
  assert.notEqual(session.user.email, 'owner@example.com', 'a local operator session is never the owner identity');

  // An older form, or the sibling's scripts, still post `email`; it still works.
  const page2 = await GET(req('/signin-with-chatgpt?return_to=/admin'));
  const cookie2 = page2.headers.get('set-cookie').split(';')[0];
  const legacyForm = new URLSearchParams({ csrf: cookie2.split('=')[1], email: 'scorer@example.test', password });
  const signedIn2 = await POST(req('/api/auth/local', { method: 'POST', headers: { origin: process.env.PUBLIC_ORIGIN, cookie: cookie2 }, body: legacyForm }));
  assert.equal(signedIn2.status, 303, 'the email field is still accepted, and an account email signs its owner in');
  const session2 = readSession(signedIn2.headers.get('set-cookie').split(';')[0].split('=')[1]);
  assert.equal(session2.user.userId, 'local:scorer');
  assert.equal(session2.user.email, 'scorer@example.test');

  console.log('Portable local users passed: migration from email-keyed rows, create/list/duplicate-reject by username and email, enable/disable with session revocation, password reset, and real HTTP sign-ins by username, by email and through the older field.');
} finally { getDatabase().close(); rmSync(directory, { recursive: true, force: true }); }
