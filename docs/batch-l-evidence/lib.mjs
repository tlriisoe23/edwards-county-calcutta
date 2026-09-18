// Shared harness: local-only, disposable events, mock identity.
// Optional test tools live outside the application dependency tree; point this at any installed
// playwright, the same way tests/s1-browser.mjs takes S1_PLAYWRIGHT_MODULE.
export const PW = process.env.UI3_PLAYWRIGHT_MODULE || 'playwright';
export const BASE = process.env.CALCUTTA_TEST_URL || 'http://localhost:5173';
if (!['localhost', '127.0.0.1'].includes(new URL(BASE).hostname)) throw Error('Local only.');

export async function launch() {
  const { chromium } = await import(PW);
  const browser = await chromium.launch({ headless: true });
  return browser;
}

// Signs in through the local mock identity route and returns an API helper bound to the context.
export async function signIn(context) {
  const page = await context.newPage();
  await page.goto(BASE + '/signin-with-chatgpt?return_to=%2Fadmin');
  await page.waitForLoadState('networkidle').catch(() => {});
  return page;
}

export function api(context) {
  let eventId = null, data = null;
  async function read() {
    const r = await context.request.get(BASE + '/api/admin' + (eventId ? '?event=' + eventId : ''));
    if (!r.ok()) throw Error('read ' + r.status());
    const b = await r.json(); data = b.data; return b;
  }
  async function send(action, payload = {}) {
    if (eventId) await read();
    const r = await context.request.post(BASE + '/api/admin', {
      headers: { origin: BASE },
      data: { action, payload, eventId, revision: data?.event.revision, requestId: crypto.randomUUID() },
    });
    const b = await r.json();
    if (!r.ok()) throw Error(action + ': ' + JSON.stringify(b));
    if (b.eventId) eventId = b.eventId;
    await read();
    return b;
  }
  return { read, send, get eventId() { return eventId; }, set eventId(v) { eventId = v; }, get data() { return data; } };
}
