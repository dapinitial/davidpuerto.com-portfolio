// The admin's second step, on its own: a memory store, a clock the test moves,
// and a forensic log the test reads. The HTTP side is in server.test.mjs.
//
//   npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createSecondFactor, memoryStore, totpCode, stepAt, STEP_MS, RECOVERY_COUNT } from '../server/second-factor.js';
import { softPasskey } from './lib/authenticator.mjs';

const RP = { rpID: 'localhost', origin: 'http://localhost:5173' };
const START = Date.UTC(2026, 10, 19, 12, 0, 0);

function rig({ challengeTtl = 60_000 } = {}) {
  let t = START;
  const events = [];
  const store = memoryStore();
  const sf = createSecondFactor({
    store,
    key: randomBytes(32),
    cookieSecret: 'test-secret',
    rpID: RP.rpID,
    origins: [RP.origin],
    now: () => t,
    challengeTtl,
    log: (ctx, event, detail) => events.push({ event, ...detail }),
  });
  return { sf, store, events, tick: (ms) => { t += ms; }, now: () => t };
}

// Enrol through the real setup: passkey, then the authenticator's first code.
async function enrol(r) {
  const key = softPasskey(RP);
  const { cookie, setup } = await r.sf.start('/admin/');
  assert.equal(setup, true, 'nothing enrolled, so the setup opens');
  const { body: info } = await r.sf.setupStart(cookie);
  const { body: regOpts } = await r.sf.setupPasskeyOptions(cookie);
  assert.equal((await r.sf.setupPasskey(cookie, key.register(regOpts))).status, 200);
  const s0 = stepAt(r.now());
  const done = await r.sf.setupFinish(cookie, totpCode(info.secret, s0));
  assert.equal(done.status, 200);
  assert.equal(done.pass, true);
  return { key, secret: info.secret, s0, codes: done.body.recoveryCodes };
}
const signIn = async (r) => (await r.sf.start('/admin/')).cookie;
const failures = (r) => r.events.filter((e) => e.event === 'admin_second_fail');

test('setup stores only public keys, an encrypted secret and hashed codes, then closes', async () => {
  const r = rig();
  const { secret, codes } = await enrol(r);
  assert.equal(codes.length, RECOVERY_COUNT);
  const rows = await r.store.list();
  const dump = JSON.stringify(rows);
  assert.ok(!dump.includes(secret), 'the authenticator secret is never stored as itself');
  for (const c of codes) assert.ok(!dump.includes(c.replace('-', '')), 'no recovery code is stored as itself');
  assert.equal(rows.filter((x) => x.kind === 'passkey').length, 1);
  assert.ok(r.events.some((e) => e.event === 'admin_enrolled'));
  // the page is one-time: the next sign-in is a second step, and the setup refuses
  const { cookie, setup } = await r.sf.start('/admin/');
  assert.equal(setup, false);
  assert.equal((await r.sf.setupStart(cookie)).status, 410);
});

test('a passkey passes the second step, and the success is logged', async () => {
  const r = rig();
  const { key } = await enrol(r);
  const cookie = await signIn(r);
  const { body: opts } = await r.sf.passkeyOptions(cookie);
  const out = await r.sf.passkey(cookie, key.sign(opts));
  assert.equal(out.status, 200);
  assert.equal(out.pass, true);
  assert.deepEqual(r.events.at(-1), { event: 'admin_second_ok', method: 'passkey' });
  // the sign-in in progress is single use
  assert.equal((await r.sf.code(cookie, '123456')).body.error, 'expired');
});

test('a wrong authenticator code is refused and logged, never passing', async () => {
  const r = rig();
  const { secret } = await enrol(r);
  const cookie = await signIn(r);
  const now = stepAt(r.now());
  const good = new Set([now - 1, now, now + 1].map((s) => totpCode(secret, s)));
  const wrong = ['000000', '111111', '222222', '999999'].find((c) => !good.has(c));
  const out = await r.sf.code(cookie, wrong);
  assert.equal(out.status, 401);
  assert.equal(out.pass, undefined);
  assert.equal(failures(r).at(-1).reason, 'wrong code');
  assert.ok(!JSON.stringify(r.events).includes(wrong), 'the log never holds what was typed');
});

test('a replayed authenticator code is refused, even in its own 30 seconds', async () => {
  const r = rig();
  const { secret, s0 } = await enrol(r);
  // the setup itself used the code for s0
  assert.equal((await r.sf.code(await signIn(r), totpCode(secret, s0))).body.error, 'code already used');
  // the next code works once
  const next = totpCode(secret, s0 + 1);
  assert.equal((await r.sf.code(await signIn(r), next)).status, 200);
  const again = await r.sf.code(await signIn(r), next);
  assert.equal(again.status, 401);
  assert.equal(again.body.error, 'code already used');
  // and a code from before the last one used is no good either, though still in the window
  r.tick(STEP_MS);
  assert.equal((await r.sf.code(await signIn(r), totpCode(secret, s0))).body.error, 'code already used');
  assert.equal(failures(r).filter((f) => f.reason === 'code already used').length, 3);
});

test('an expired passkey challenge is refused and logged', async () => {
  const r = rig({ challengeTtl: 60_000 });
  const { key } = await enrol(r);
  const cookie = await signIn(r);
  const { body: opts } = await r.sf.passkeyOptions(cookie);
  r.tick(60_001);
  const out = await r.sf.passkey(cookie, key.sign(opts));
  assert.equal(out.status, 401);
  assert.equal(out.body.error, 'expired challenge');
  assert.equal(failures(r).at(-1).reason, 'expired challenge');
});

test('a challenge works once: answering it twice fails the second time', async () => {
  const r = rig();
  const { key } = await enrol(r);
  const cookie = await signIn(r);
  const { body: opts } = await r.sf.passkeyOptions(cookie);
  const signed = key.sign(opts);
  // a different sign-in can't use this one's challenge
  assert.equal((await r.sf.passkey(await signIn(r), signed)).body.error, 'no challenge');
  assert.equal((await r.sf.passkey(cookie, signed)).status, 200);
});

test('a passkey answer with an old counter is refused, the way a cloned key would be', async () => {
  const r = rig();
  const { key } = await enrol(r);
  const first = await signIn(r);
  assert.equal((await r.sf.passkey(first, key.sign((await r.sf.passkeyOptions(first)).body))).status, 200);
  const second = await signIn(r);
  const out = await r.sf.passkey(second, key.sign((await r.sf.passkeyOptions(second)).body, { counter: 1 }));
  assert.equal(out.body.error, 'passkey did not verify');
});

test('five failures lock the sign-in out; even the right code is then refused', async () => {
  const r = rig();
  const { secret, s0 } = await enrol(r);
  const cookie = await signIn(r);
  for (let i = 0; i < 4; i++) assert.equal((await r.sf.code(cookie, 'aaaaa-aaaaa')).body.error, 'wrong code');
  assert.equal((await r.sf.code(cookie, 'aaaaa-aaaaa')).body.error, 'locked');
  assert.ok(r.events.some((e) => e.event === 'admin_locked'));
  const late = await r.sf.code(cookie, totpCode(secret, s0 + 1));
  assert.equal(late.body.error, 'expired');
  assert.equal(late.pass, undefined);
});

test('a recovery code works once, and says how many are left', async () => {
  const r = rig();
  const { codes } = await enrol(r);
  const out = await r.sf.code(await signIn(r), codes[3].toUpperCase());
  assert.equal(out.status, 200);
  assert.equal(out.body.recoveryLeft, RECOVERY_COUNT - 1);
  assert.deepEqual(r.events.at(-1), { event: 'admin_second_ok', method: 'recovery' });
  assert.equal((await r.sf.code(await signIn(r), codes[3])).body.error, 'code already used');
});

test('a forged or stale sign-in cookie gets nothing', async () => {
  const r = rig();
  await enrol(r);
  const cookie = await signIn(r);
  const [id] = cookie.split('.');
  assert.equal((await r.sf.code(`${id}.forged`, '123456')).body.error, 'expired');
  r.tick(11 * 60_000); // past the ten minutes a sign-in lasts
  assert.equal((await r.sf.passkeyOptions(cookie)).body.error, 'expired');
});

test('the setup needs the authenticator to prove itself, and a wrong first code counts as a failure', async () => {
  const r = rig();
  const key = softPasskey(RP);
  const { cookie } = await r.sf.start('/admin/');
  const { body: info } = await r.sf.setupStart(cookie);
  assert.equal((await r.sf.setupFinish(cookie, totpCode(info.secret, stepAt(r.now())))).body.error, 'passkey first');
  const { body: regOpts } = await r.sf.setupPasskeyOptions(cookie);
  await r.sf.setupPasskey(cookie, key.register(regOpts));
  assert.equal((await r.sf.setupFinish(cookie, '00000x')).body.error, 'wrong code');
  assert.equal((await r.store.list()).length, 0, 'nothing is written until the setup passes');
});
