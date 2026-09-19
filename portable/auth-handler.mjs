import * as oidc from 'openid-client';
import { cookie, requestCookie, createSession, readSession, safeReturn, publicOrigin, checkLocal } from './sessions.mjs';
import { accountDocument, escapeHtml as escape } from './theme.mjs';
let configuration;
async function google() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) throw Error('Google sign-in is not configured.');
  configuration ??= oidc.discovery(new URL('https://accounts.google.com'), process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  try { return await configuration; } catch (e) { configuration = undefined; throw e; }
}
const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'same-origin', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'" };
// Every error state links somewhere useful; no page is a dead end.
const back = ' <a href="/signin-with-chatgpt">Return to sign-in</a>.';
function html(body, status = 200, setCookie, title = 'Operator sign-in') {
  return new Response(accountDocument(title, `<h1>${escape(title)}</h1>${status >= 400 ? `<section class="error" role="alert">${body}</section>` : body}`), { status, headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8', ...(setCookie ? { 'Set-Cookie': setCookie } : {}) } });
}
function redirect(path, setCookie) {
  return new Response(null, { status: 303, headers: { ...headers, Location: path, ...(setCookie ? { 'Set-Cookie': setCookie } : {}) } });
}
export async function GET(request) {
  try {
    const url = new URL(request.url), origin = publicOrigin();
    const returnTo = safeReturn(url.searchParams.get('return_to') || '/admin');
    if (url.pathname === '/signin-with-chatgpt') {
      const csrf = createSession({ kind: 'login', returnTo }, 600);
      return html(`<p>Sign in to run the auction and record sales.</p><a class="primary-action" href="/api/auth/google?return_to=${encodeURIComponent(returnTo)}">Continue with Google</a><details><summary>Local login</summary><p class="help">Use a local login if you cannot sign in with Google.</p><form method="post" action="/api/auth/local"><input type="hidden" name="csrf" value="${csrf}"><label>Username or email<input name="login" type="text" autocomplete="username" required maxlength="254"></label><label>Password<input name="password" type="password" autocomplete="current-password" required maxlength="1024"></label><button class="secondary">Sign in locally</button></form></details>`, 200, cookie('calcutta_login', csrf, 600));
    }
    if (url.pathname === '/signout-with-chatgpt') {
      const csrf = createSession({ kind: 'logout', returnTo }, 600);
      return html(`<p>Sign out of the operator desk? You will return to the public board.</p><form method="post" action="/api/auth/logout"><input type="hidden" name="csrf" value="${csrf}"><button>Confirm sign out</button></form><p><a href="/admin">Stay signed in</a></p>`, 200, cookie('calcutta_login', csrf, 600), 'Sign out');
    }
    if (url.pathname === '/api/auth/google') {
      const config = await google(), verifier = oidc.randomPKCECodeVerifier(), state = oidc.randomState(), nonce = oidc.randomNonce();
      const token = createSession({ kind: 'oidc', verifier, state, nonce, returnTo }, 600);
      const target = oidc.buildAuthorizationUrl(config, { redirect_uri: origin + '/api/auth/callback', scope: 'openid email profile', code_challenge: await oidc.calculatePKCECodeChallenge(verifier), code_challenge_method: 'S256', state, nonce });
      return redirect(target.href, cookie('calcutta_oidc', token, 600));
    }
    if (url.pathname === '/api/auth/callback') {
      const flow = readSession(requestCookie(request, 'calcutta_oidc'), true);
      if (flow?.kind !== 'oidc') return html('<p>Sign-in expired. <a href="/signin-with-chatgpt">Try again</a>.</p>', 400);
      const config = await google();
      const tokens = await oidc.authorizationCodeGrant(config, new URL('/api/auth/callback' + url.search, origin), { pkceCodeVerifier: flow.verifier, expectedState: flow.state, expectedNonce: flow.nonce, idTokenExpected: true });
      const claims = tokens.claims();
      if (!claims || claims.email_verified !== true || typeof claims.email !== 'string') return html('<p>A verified Google email is required.' + back + '</p>', 403);
      const user = { userId: claims.sub, email: claims.email.toLowerCase(), displayName: typeof claims.name === 'string' ? claims.name : claims.email, fullName: typeof claims.name === 'string' ? claims.name : null };
      return redirect(flow.returnTo, cookie('calcutta_session', createSession({ kind: 'user', user }), 28800));
    }
    return html('<p>Not found.' + back + '</p>', 404);
  } catch { return html('<p>Sign-in is unavailable or could not be verified.' + back + '</p>', 503); }
}
export async function POST(request) {
  try {
    if (request.headers.get('origin') !== publicOrigin()) return html('<p>Same-origin request required.' + back + '</p>', 403);
    if (!(request.headers.get('content-type') || '').startsWith('application/x-www-form-urlencoded')) return html('<p>Invalid form.' + back + '</p>', 400);
    const raw = await request.text();
    if (raw.length > 8192) return html('<p>Form too large.' + back + '</p>', 413);
    const form = new URLSearchParams(raw), token = requestCookie(request, 'calcutta_login');
    if (!token || form.get('csrf') !== token) return html('<p>This sign-in page had expired, so nothing happened.' + back + '</p>', 403);
    const flow = readSession(token, true), path = new URL(request.url).pathname;
    if (path === '/api/auth/logout' && flow?.kind === 'logout') {
      readSession(requestCookie(request, 'calcutta_session'), true);
      return redirect(flow.returnTo, cookie('calcutta_session', '', 0));
    }
    if (path !== '/api/auth/local' || flow?.kind !== 'login') return html('<p>This request had expired, so nothing happened.' + back + '</p>', 403);
    // `login` since WC-2; `email` is what older forms and the sibling's scripts still post.
    const login = String(form.get('login') || form.get('email') || '').trim().toLowerCase();
    const local = checkLocal(login, form.get('password') || '');
    if (!local) return html('<p>Sign-in failed or is temporarily limited. <a href="/signin-with-chatgpt">Try again</a>.</p>', 403);
    // A local operator's identity is its username; the optional email rides along for
    // display and records. The owner's recovery login is the owner's own address.
    const user = local.owner
      ? { userId: 'local:' + local.email, email: local.email, displayName: local.displayName, fullName: null }
      : { userId: 'local:' + local.username, email: local.email || local.username, username: local.username, displayName: local.displayName, fullName: null, local: true };
    return redirect(flow.returnTo, cookie('calcutta_session', createSession({ kind: 'user', user }), 28800));
  } catch { return html('<p>Sign-in is unavailable.' + back + '</p>', 503); }
}
