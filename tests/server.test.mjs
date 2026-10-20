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
import { existsSync } from 'node:fs';
import bcrypt from 'bcryptjs';

const PORT = 3939;
const BASE = `http://127.0.0.1:${PORT}`;
const PASSWORD = randomBytes(12).toString('base64url');
const ADMIN_PASSWORD = randomBytes(12).toString('base64url');
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

test('the admin password opens the admin and the case studies', async () => {
  const res = await login(ADMIN_PASSWORD, '10.4.4.4', '/admin/');
  assert.equal(res.status, 200);
  const cookie = cookiesOf(res);
  assert.match(cookie, /dp_admin=/);
  assert.equal((await get('/admin/', { headers: { cookie } })).status, 200, 'admin page');
  assert.notEqual((await get('/case-studies/apple/', { headers: { cookie } })).status, 302, 'case study');
});
