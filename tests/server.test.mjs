// Server contract tests: the gate, the path guard, the headers, the forms.
// Runs the real server against the built site (npm run build first) with a
// throwaway password and cookie secret. CONTENT_KEY comes from the
// environment; without it the decrypt test is skipped, never faked.
//
//   npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readdirSync } from 'node:fs';
import bcrypt from 'bcryptjs';
import { totpCode, stepAt } from '../server/second-factor.js';
import { softPasskey } from './lib/authenticator.mjs';

const PORT = 3939;
const BASE = `http://127.0.0.1:${PORT}`;
const PASSWORD = randomBytes(12).toString('base64url');
const ADMIN_PASSWORD = randomBytes(12).toString('base64url');
// the admin's second step, against a software passkey; a short challenge life for the expiry test
const FACTOR = { rpID: 'localhost', origin: 'http://localhost:5173' };
const CHALLENGE_TTL_MS = 400;
let server;

before(async () => {
  assert.ok(existsSync('dist/index.html'), 'build the site first: npm run build');
  server = spawn('node', ['server/index.js'], {
    env: {
      PATH: process.env.PATH,
      PORT: String(PORT),
      NODE_ENV: 'production',
      COOKIE_SECRET: randomBytes(32).toString('base64'),
      PASSWORD_HASH: bcrypt.hashSync(PASSWORD, 4),
      ADMIN_PASSWORD_HASH: bcrypt.hashSync(ADMIN_PASSWORD, 4),
      ADMIN_FACTOR_STORE: 'memory',
      ADMIN_FACTOR_KEY: randomBytes(32).toString('base64'),
      ADMIN_RP_ID: FACTOR.rpID,
      ADMIN_ORIGINS: FACTOR.origin,
      ADMIN_CHALLENGE_TTL_MS: String(CHALLENGE_TTL_MS),
      ...(process.env.CONTENT_KEY && { CONTENT_KEY: process.env.CONTENT_KEY }),
    },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  for (let i = 0; i < 50; i++) {
    try { await fetch(BASE); return; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  throw new Error('server did not start');
});
after(() => server?.kill());

const get = (path, opts = {}) => fetch(BASE + path, { redirect: 'manual', ...opts });
const login = (password, ip = '10.0.0.1', redirectTo) =>
  fetch(`${BASE}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json', 'do-connecting-ip': ip }, body: JSON.stringify({ password, redirectTo }) });
const cookiesOf = (res) => res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');

test('public pages answer 200', async () => {
  for (const p of ['/', '/about-me/', '/contact/', '/login/', '/resume/', '/privacy/', '/terms/', '/since-2004/']) assert.equal((await get(p)).status, 200, p);
});

test('gated studies redirect to login without the cookie', async () => {
  for (const p of ['/case-studies/apple/', '/case-studies/microsoft/', '/case-studies/review/']) {
    const res = await get(p);
    assert.equal(res.status, 302, p);
    assert.match(res.headers.get('location'), /\/login/, p);
  }
});

test('path traversal and encoded slashes are refused', async () => {
  for (const p of [
    '/assets/..%2Fcase-studies%2Fapple%2Findex.html',
    '/assets/..%2F..%2Fserver%2Findex.js',
    '/admin%2Findex.html',
    '/assets/%',
    '/assets/%5c..%5cserver',
    '/assets/%00',
    '//admin/',
    '///admin/',
    '//admin/index.html',
    '//case-studies/apple/',
    '/case-studies//apple/',
  ]) assert.equal((await get(p)).status, 400, p);
});

test('every page carries the security headers and lets GA4 through', async () => {
  const res = await get('/');
  const csp = res.headers.get('content-security-policy');
  assert.ok(res.headers.get('strict-transport-security'), 'HSTS');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.match(csp, /object-src 'none'/);
  for (const host of ['https://\\*\\.googletagmanager\\.com', 'https://\\*\\.google-analytics\\.com', 'https://www\\.google\\.com'])
    assert.match(csp, new RegExp(`connect-src[^;]*${host}`), `connect-src allows ${host}`);
  assert.match(csp, /script-src[^;]*https:\/\/\*\.googletagmanager\.com/);
});

test('every page carries the live GA4 measurement id', async () => {
  for (const p of ['/', '/about-me/', '/contact/']) {
    const html = await (await get(p)).text();
    assert.match(html, /name="ga-id" content="G-EFR802Z0LM"/, p);
  }
});

test('a wrong password is refused, and the sixth try is rate limited', async () => {
  const ip = '10.9.9.9';
  for (let i = 0; i < 5; i++) assert.equal((await login('nope', ip)).status, 401);
  assert.equal((await login('nope', ip)).status, 429);
});

test('the right password opens the gated study', { skip: !process.env.CONTENT_KEY && 'no CONTENT_KEY' }, async () => {
  const res = await login(PASSWORD, '10.1.1.1');
  assert.equal(res.status, 200);
  const cookie = res.headers.get('set-cookie').split(';')[0];
  const page = await get('/case-studies/apple/', { headers: { cookie } });
  assert.equal(page.status, 200);
  assert.match(await page.text(), /<title>Apple/);
});

test('contact refuses malformed input without crashing', async () => {
  const res = await fetch(`${BASE}/api/contact`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'do-connecting-ip': '10.2.2.2' },
    body: JSON.stringify({ name: ['x'], email: 'a@b.c', message: { $gt: '' } }),
  });
  assert.ok([400, 503].includes(res.status), `got ${res.status}`);
  assert.equal((await get('/')).status, 200, 'server still up');
});

test('the shared case-study password never opens the admin', async () => {
  const res = await login(PASSWORD, '10.3.3.3');
  assert.equal(res.status, 200);
  const cookie = cookiesOf(res);
  assert.equal((await get('/admin/', { headers: { cookie } })).status, 302, 'admin page');
  assert.equal((await get('/api/admin/stats', { headers: { cookie } })).status, 401, 'admin data');
  assert.equal((await login(PASSWORD, '10.3.3.4', '/admin/')).status, 401, 'asking for the admin with it');
});

const post = (path, body, { cookie = '', ip = '10.0.0.1' } = {}) =>
  fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json', 'do-connecting-ip': ip, ...(cookie && { cookie }) }, body: JSON.stringify(body ?? {}) });
// the admin password: the first factor, which leaves only the dp_second cookie
const adminPassword = async (ip) => {
  const res = await login(ADMIN_PASSWORD, ip, '/admin/');
  assert.equal(res.status, 200);
  return { cookie: cookiesOf(res), body: await res.json() };
};
const enrolled = {}; // the passkey, the authenticator secret and the recovery codes, from the setup test
const wrongCode = () => {
  const now = stepAt(Date.now());
  const good = new Set([now - 1, now, now + 1].map((s) => totpCode(enrolled.secret, s)));
  return ['000000', '111111', '222222', '999999'].find((c) => !good.has(c));
};

test('the admin password alone opens nothing: no admin or case-study cookie until the second step', async () => {
  const { cookie, body } = await adminPassword('10.4.4.4');
  assert.equal(body.setup, true, 'nothing enrolled yet, so the setup opens');
  assert.match(cookie, /dp_second=/);
  assert.doesNotMatch(cookie, /dp_admin=|cs_auth=/);
  assert.equal((await get('/admin/', { headers: { cookie } })).status, 302, 'admin page');
  assert.equal((await get('/api/admin/stats', { headers: { cookie } })).status, 401, 'admin data');
  assert.equal((await get('/case-studies/apple/', { headers: { cookie } })).status, 302, 'case study');
});

test('the one-time setup enrols a passkey and an authenticator, shows ten recovery codes once, then closes', async () => {
  const ip = '10.4.4.5';
  const { cookie } = await adminPassword(ip);
  const setup = await post('/api/second/setup', {}, { cookie, ip });
  assert.equal(setup.status, 200);
  assert.match(setup.headers.get('cache-control'), /no-store/);
  const { secret } = await setup.json();
  const key = softPasskey(FACTOR);
  const regOpts = await (await post('/api/second/setup/passkey/options', {}, { cookie, ip })).json();
  assert.equal((await post('/api/second/setup/passkey', { response: key.register(regOpts) }, { cookie, ip })).status, 200);
  const done = await post('/api/second/setup/finish', { code: totpCode(secret, stepAt(Date.now())) }, { cookie, ip });
  assert.equal(done.status, 200);
  const { recoveryCodes } = await done.json();
  assert.equal(recoveryCodes.length, 10);
  const signedIn = cookiesOf(done);
  assert.match(signedIn, /dp_admin=/);
  assert.match(signedIn, /cs_auth=/);
  assert.equal((await get('/admin/', { headers: { cookie: signedIn } })).status, 200, 'admin page');
  assert.notEqual((await get('/case-studies/apple/', { headers: { cookie: signedIn } })).status, 302, 'case study');
  Object.assign(enrolled, { key, secret, recoveryCodes });
  // one time only: the next sign-in is a second step, and the setup refuses
  const again = await adminPassword('10.4.4.6');
  assert.equal(again.body.setup, false);
  assert.deepEqual(again.body.second, { passkey: true, code: true });
  assert.equal((await post('/api/second/setup', {}, { cookie: again.cookie, ip: '10.4.4.6' })).status, 410);
});

test('a wrong authenticator code is refused, and no cookie is issued', async () => {
  const ip = '10.7.0.1';
  const { cookie } = await adminPassword(ip);
  const res = await post('/api/second/code', { code: wrongCode() }, { cookie, ip });
  assert.equal(res.status, 401);
  assert.equal((await res.json()).error, 'wrong code');
  assert.doesNotMatch(cookiesOf(res), /dp_admin=|cs_auth=/);
});

test('a replayed authenticator code is refused', async () => {
  const code = totpCode(enrolled.secret, stepAt(Date.now()) + 1);
  const first = await adminPassword('10.7.0.2');
  const ok = await post('/api/second/code', { code }, { cookie: first.cookie, ip: '10.7.0.2' });
  assert.equal(ok.status, 200);
  assert.match(cookiesOf(ok), /dp_admin=/);
  const second = await adminPassword('10.7.0.3');
  const replay = await post('/api/second/code', { code }, { cookie: second.cookie, ip: '10.7.0.3' });
  assert.equal(replay.status, 401);
  assert.equal((await replay.json()).error, 'code already used');
  assert.doesNotMatch(cookiesOf(replay), /dp_admin=/);
});

test('an expired passkey challenge is refused; a fresh one signs in', async () => {
  const ip = '10.7.0.4';
  const { cookie } = await adminPassword(ip);
  const stale = await (await post('/api/second/passkey/options', {}, { cookie, ip })).json();
  await new Promise((r) => setTimeout(r, CHALLENGE_TTL_MS + 150));
  const late = await post('/api/second/passkey', { response: enrolled.key.sign(stale) }, { cookie, ip });
  assert.equal(late.status, 401);
  assert.equal((await late.json()).error, 'expired challenge');
  assert.doesNotMatch(cookiesOf(late), /dp_admin=/);
  const fresh = await (await post('/api/second/passkey/options', {}, { cookie, ip })).json();
  const ok = await post('/api/second/passkey', { response: enrolled.key.sign(fresh) }, { cookie, ip });
  assert.equal(ok.status, 200);
  assert.match(cookiesOf(ok), /dp_admin=/);
});

test('lockout: five wrong codes end the sign-in, and the sixth try is rate limited', async () => {
  const ip = '10.7.0.5';
  const { cookie } = await adminPassword(ip);
  for (let i = 0; i < 4; i++) assert.equal((await (await post('/api/second/code', { code: wrongCode() }, { cookie, ip })).json()).error, 'wrong code');
  assert.equal((await (await post('/api/second/code', { code: wrongCode() }, { cookie, ip })).json()).error, 'locked');
  const sixth = await post('/api/second/code', { code: totpCode(enrolled.secret, stepAt(Date.now()) + 1) }, { cookie, ip });
  assert.equal(sixth.status, 429);
  assert.doesNotMatch(cookiesOf(sixth), /dp_admin=/);
});

test('a recovery code signs in once', async () => {
  const [code] = enrolled.recoveryCodes;
  const a = await adminPassword('10.7.0.6');
  const ok = await post('/api/second/code', { code }, { cookie: a.cookie, ip: '10.7.0.6' });
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).recoveryLeft, 9);
  const b = await adminPassword('10.7.0.7');
  assert.equal((await (await post('/api/second/code', { code }, { cookie: b.cookie, ip: '10.7.0.7' })).json()).error, 'code already used');
});

test('locked asset chunks need the cookie: the public repo lists their names', { skip: !process.env.CONTENT_KEY && 'no CONTENT_KEY' }, async (t) => {
  const chunk = readdirSync('content-locked/assets').map((f) => f.replace(/\.enc$/, '')).find((f) => f.endsWith('.js') && !existsSync(`dist/assets/${f}`));
  // every locked chunk is also in this build: nothing to prove here until a build leaves one out
  if (!chunk) return t.skip('no chunk is locked-only in this build');
  assert.equal((await get(`/assets/${chunk}`)).status, 404, 'without the cookie');
  const cookie = cookiesOf(await login(PASSWORD, '10.5.5.5'));
  const res = await get(`/assets/${chunk}`, { headers: { cookie } });
  assert.equal(res.status, 200, 'with the cookie');
  assert.match(res.headers.get('cache-control'), /^private/);
});

test('a cross-site post is refused; our own page and scripts get through', async () => {
  const post = (headers) => fetch(`${BASE}/api/contact`, { method: 'POST', headers: { 'content-type': 'application/json', 'do-connecting-ip': '10.6.6.6', ...headers }, body: '{}' });
  assert.equal((await post({ origin: 'https://evil.example' })).status, 403, 'another origin');
  assert.equal((await post({ 'sec-fetch-site': 'cross-site' })).status, 403, 'cross-site fetch');
  assert.equal((await post({ origin: BASE })).status, 400, 'our own origin reaches validation');
  assert.equal((await post({})).status, 400, 'no origin reaches validation');
});
