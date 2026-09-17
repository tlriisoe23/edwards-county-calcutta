import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const directory = mkdtempSync(join(tmpdir(), 'calcutta-local-users-'));
process.env.DATABASE_PATH = join(directory, 'local-users.sqlite');
process.env.ADMIN_EMAILS = 'owner@example.com';
process.env.PUBLIC_ORIGIN = 'http://localhost:5182';
assert.equal(spawnSync(process.execPath, ['portable/migrate.mjs'], { encoding: 'utf8' }).status, 0);
const { getDatabase } = await import('../portable/runtime.mjs');
const { checkLocal, createLocalUser, listLocalUsers, setLocalUserEnabled, resetLocalUserPassword } = await import('../portable/sessions.mjs');
const { GET, POST } = await import('../portable/auth-handler.mjs');
try {
  const password = 'a genuinely long fixture password';
  // Creating a local user never touches the owner allowlist or path.
  createLocalUser('operator@example.test', 'Front Desk Operator', password, 'owner@example.com');
  assert(checkLocal('operator@example.test', password)?.displayName === 'Front Desk Operator', 'local login succeeds and returns the stored display name, not the raw email');
  assert.equal(checkLocal('operator@example.test', 'wrong password'), null, 'wrong password is rejected');
  assert.equal(checkLocal('nobody@example.test', password), null, 'unknown local email is rejected');

  const rows = listLocalUsers();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].email, 'operator@example.test');
  assert.equal(rows[0].enabled, 1);
  assert.equal(rows[0].created_by, 'owner@example.com');
  assert(!('password_hash' in rows[0]), 'the listing never includes the password hash');

  assert.throws(() => createLocalUser('operator@example.test', 'Duplicate', password, 'owner@example.com'), /already has a local login/, 'duplicate email is rejected, not silently overwritten');

  setLocalUserEnabled('operator@example.test', false);
  assert.equal(checkLocal('operator@example.test', password), null, 'a disabled local account cannot sign in even with the correct password');
  setLocalUserEnabled('operator@example.test', true);
  assert(checkLocal('operator@example.test', password), 're-enabling restores sign-in');

  resetLocalUserPassword('operator@example.test', 'a completely different fixture password');
  assert.equal(checkLocal('operator@example.test', password), null, 'the old password no longer works after a reset');
  assert(checkLocal('operator@example.test', 'a completely different fixture password'), 'the new password works after a reset');

  // The full HTTP local-login flow (mirrors the owner-recovery flow already covered by
  // tests/portable-auth.mjs) — a created local user can actually sign in through the real form.
  const req = (path, options = {}) => new Request(process.env.PUBLIC_ORIGIN + path, options);
  const page = await GET(req('/signin-with-chatgpt?return_to=/admin'));
  const loginCookie = page.headers.get('set-cookie').split(';')[0];
  const csrf = loginCookie.split('=')[1];
  const body = new URLSearchParams({ csrf, email: 'operator@example.test', password: 'a completely different fixture password' });
  const signedIn = await POST(req('/api/auth/local', { method: 'POST', headers: { origin: process.env.PUBLIC_ORIGIN, cookie: loginCookie }, body }));
  assert.equal(signedIn.status, 303, 'a working local operator account can sign in through the real HTTP form');
  const sessionCookie = signedIn.headers.get('set-cookie').split(';')[0];
  const { readSession } = await import('../portable/sessions.mjs');
  const session = readSession(sessionCookie.split('=')[1]);
  assert.equal(session.user.email, 'operator@example.test');
  assert.equal(session.user.displayName, 'Front Desk Operator');
  assert.equal(session.user.userId, 'local:operator@example.test');
  assert.notEqual(session.user.email, 'owner@example.com', 'a local operator session is never the owner identity');

  console.log('Portable local users passed: create/list/duplicate-reject, enable/disable, password reset, and a real HTTP sign-in as a non-owner local operator.');
} finally { getDatabase().close(); rmSync(directory, { recursive: true, force: true }); }
