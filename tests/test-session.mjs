// Portable suites use an explicitly provisioned synthetic recovery credential.
// Existing Sites suites retain their local dispatcher sign-in when it is absent.
export async function testSession(base) {
  const response = await fetch(base + '/signin-with-chatgpt?return_to=%2Fadmin', { redirect: 'manual' });
  const cookie = response.headers.get('set-cookie')?.split(';')[0];
  if (!process.env.CALCUTTA_TEST_PASSWORD) return cookie;
  if (!cookie?.startsWith('calcutta_login=')) throw Error('Expected portable login CSRF cookie.');
  const login = await fetch(base + '/api/auth/local', { method: 'POST', redirect: 'manual',
    headers: { cookie, origin: base },
    body: new URLSearchParams({ csrf: cookie.split('=')[1], email: process.env.CALCUTTA_TEST_EMAIL, password: process.env.CALCUTTA_TEST_PASSWORD }) });
  if (login.status !== 303) throw Error('Synthetic recovery login failed.');
  return login.headers.get('set-cookie')?.split(';')[0];
}
