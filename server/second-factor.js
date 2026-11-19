// The admin's second step: after the admin password, a passkey (WebAuthn), with
// an authenticator code (TOTP) as the fallback and ten single-use recovery codes.
//
// What is stored (the admin_factors table, server/sql/admin_factors.sql):
//   passkey   its credential id and public key, and the signature counter
//   totp      the shared secret, AES-256-GCM encrypted with ADMIN_FACTOR_KEY,
//             and the last time step used, so a code works once
//   recovery  an HMAC of each code under ADMIN_FACTOR_KEY, and when it was used
// Nothing here is in the repo, and no private key ever leaves the passkey.
//
// A sign-in in progress lives in memory, keyed by a random id that travels in
// a signed, short-lived cookie (dp_second). It is single use: it ends when the
// second step passes, after five failures, or when it expires. Each challenge is
// single use and expires on its own clock. A restart ends every sign-in in
// progress, so the worst a deploy does is ask for the password again.
//
// The handlers return { status, body, pass }. pass means both factors are done,
// and only then does the server issue the admin and case-study cookies.
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';

/* ---------- TOTP (RFC 6238: SHA-1, six digits, 30 seconds) ---------- */
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const base32 = (buf) => {
  let bits = 0, value = 0, out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
};
const unbase32 = (s) => {
  let bits = 0, value = 0;
  const out = [];
  for (const ch of s.replace(/=+$/, '').toUpperCase()) {
    const i = B32.indexOf(ch);
    if (i < 0) throw new Error('bad base32');
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
};
export const STEP_MS = 30_000;
export const stepAt = (ms) => Math.floor(ms / STEP_MS);
export function totpCode(secretB32, step) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const mac = createHmac('sha1', unbase32(secretB32)).update(counter).digest();
  const off = mac[mac.length - 1] & 15;
  return String((mac.readUInt32BE(off) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}
const same = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};
// the step a code belongs to, one step either side for clock drift, or null
function matchStep(secretB32, code, ms) {
  const now = stepAt(ms);
  for (const s of [now - 1, now, now + 1]) if (same(totpCode(secretB32, s), code)) return s;
  return null;
}

/* ---------- stores ---------- */
// The columns every row carries, so a bulk insert has one shape (PostgREST asks for it).
const row = (r) => ({ kind: r.kind, credential_id: r.credential_id ?? null, public_key: r.public_key ?? null, counter: r.counter ?? 0, transports: r.transports ?? null, secret: r.secret ?? null, code_hash: r.code_hash ?? null, last_step: r.last_step ?? 0 });

// For tests and local runs: gone at every restart.
export function memoryStore() {
  const rows = [];
  let next = 1;
  const find = (id) => rows.find((r) => r.id === id);
  return {
    kind: 'memory',
    async list() { return rows.map((r) => ({ ...r })); },
    async insert(list) { for (const r of list) rows.push({ id: next++, used_at: null, ...row(r) }); },
    // each claim changes the row only if it is still unclaimed: the check and the write are one step
    async claimStep(id, step) { const r = find(id); if (!r || r.last_step >= step) return false; r.last_step = step; return true; },
    async claimRecovery(id, at) { const r = find(id); if (!r || r.used_at) return false; r.used_at = at; return true; },
    async setCounter(id, counter) { const r = find(id); if (r) r.counter = counter; },
  };
}

// Production: the admin_factors table in the visit log's Supabase project, read and
// written with the server-only secret key. The conditional PATCHes make a code's
// use atomic: two requests with the same code cannot both claim it.
export function supabaseStore(url, key) {
  const base = `${url}/rest/v1/admin_factors`;
  const headers = { apikey: key, ...(key.startsWith('eyJ') ? { authorization: `Bearer ${key}` } : {}), 'content-type': 'application/json' };
  const call = async (path, init = {}) => {
    const r = await fetch(`${base}${path}`, { ...init, headers: { ...headers, ...init.headers }, signal: AbortSignal.timeout(10_000) });
    if (!r.ok) throw new Error(`admin_factors ${r.status}: ${await r.text()}`);
    return r;
  };
  const claimed = async (path, body) => (await (await call(path, { method: 'PATCH', headers: { prefer: 'return=representation' }, body: JSON.stringify(body) })).json()).length === 1;
  return {
    kind: 'supabase',
    async list() { return (await call('?select=*&order=id')).json(); },
    async insert(list) { await call('', { method: 'POST', headers: { prefer: 'return=minimal' }, body: JSON.stringify(list.map(row)) }); },
    claimStep: (id, step) => claimed(`?id=eq.${Number(id)}&last_step=lt.${Number(step)}`, { last_step: step }),
    claimRecovery: (id, at) => claimed(`?id=eq.${Number(id)}&used_at=is.null`, { used_at: at }),
    async setCounter(id, counter) { await call(`?id=eq.${Number(id)}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ counter }) }); },
  };
}

/* ---------- the second step ---------- */
export const RECOVERY_COUNT = 10;
const RECOVERY_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // no 0/o, 1/l/i
const newRecoveryCode = () => [...randomBytes(10)].map((b) => RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length]).join('');
const showRecovery = (c) => `${c.slice(0, 5)}-${c.slice(5)}`;

export function createSecondFactor({
  store,
  key, // 32 bytes: encrypts the TOTP secret, keys the recovery-code hashes
  cookieSecret, // signs the dp_second cookie
  rpID,
  origins,
  now = Date.now,
  challengeTtl = 2 * 60_000,
  pendingTtl = 10 * 60_000,
  maxFails = 5,
  log = () => {}, // (ctx, event, detail): the forensic log
}) {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('ADMIN_FACTOR_KEY must be 32 bytes, base64');

  const encrypt = (plain) => {
    const iv = randomBytes(12);
    const c = createCipheriv('aes-256-gcm', key, iv).setAAD(Buffer.from('admin-totp'));
    const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
    return Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64url');
  };
  const decrypt = (blob) => {
    const buf = Buffer.from(blob, 'base64url');
    const d = createDecipheriv('aes-256-gcm', key, buf.subarray(0, 12)).setAAD(Buffer.from('admin-totp'));
    d.setAuthTag(buf.subarray(12, 28));
    return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8');
  };
  const codeHash = (code) => createHmac('sha256', key).update(`recovery.${code}`).digest('base64url');

  const pending = new Map(); // id -> { exp, fails, redirectTo, setup, challenge, challengeExp, totpSecret, newPasskey }
  const sig = (id) => createHmac('sha256', cookieSecret).update(`second.${id}`).digest('base64url');
  const sweep = () => { const t = now(); for (const [id, p] of pending) if (t > p.exp) pending.delete(id); };
  const session = (cookie) => {
    sweep();
    const [id, s] = String(cookie ?? '').split('.');
    if (!id || !s || !same(s, sig(id))) return null;
    return pending.get(id) ?? null;
  };

  const factors = async () => {
    const rows = await store.list();
    return {
      rows,
      passkeys: rows.filter((r) => r.kind === 'passkey'),
      totp: rows.find((r) => r.kind === 'totp') ?? null,
      recovery: rows.filter((r) => r.kind === 'recovery'),
    };
  };

  const noSession = (ctx, method) => {
    log(ctx, 'admin_second_fail', { method, reason: 'no sign-in in progress' });
    return { status: 401, body: { error: 'expired' } };
  };
  const fail = (p, ctx, method, reason) => {
    p.fails += 1;
    log(ctx, 'admin_second_fail', { method, reason, fails: p.fails });
    if (p.fails >= maxFails) {
      pending.delete(p.id);
      log(ctx, 'admin_locked', { method, fails: p.fails });
      return { status: 401, body: { error: 'locked' } };
    }
    return { status: 401, body: { error: reason } };
  };
  const pass = (p, ctx, method, extra = {}) => {
    pending.delete(p.id);
    log(ctx, 'admin_second_ok', { method });
    return { status: 200, body: { success: true, redirectTo: p.redirectTo, ...extra }, pass: true };
  };
  // a challenge is used once, whatever happens next, and only before it expires
  const takeChallenge = (p) => {
    const { challenge, challengeExp } = p;
    p.challenge = null;
    if (!challenge) return { error: 'no challenge' };
    if (now() > challengeExp) return { error: 'expired challenge' };
    return { challenge };
  };
  const setChallenge = (p, challenge) => { p.challenge = challenge; p.challengeExp = now() + challengeTtl; };

  return {
    pendingTtl,

    // The password passed. Start the second step, or the one-time setup when
    // nothing is enrolled yet. Returns the cookie value; no admin cookie yet.
    async start(redirectTo) {
      const { rows, passkeys, totp } = await factors();
      sweep();
      const id = randomBytes(18).toString('base64url');
      const setup = rows.length === 0;
      pending.set(id, { id, exp: now() + pendingTtl, fails: 0, redirectTo, setup, challenge: null, challengeExp: 0 });
      return { cookie: `${id}.${sig(id)}`, setup, methods: { passkey: passkeys.length > 0, code: Boolean(totp) } };
    },

    async passkeyOptions(cookie, ctx) {
      const p = session(cookie);
      if (!p || p.setup) return noSession(ctx, 'passkey');
      const { passkeys } = await factors();
      if (!passkeys.length) return { status: 400, body: { error: 'no passkey' } };
      const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: passkeys.map((r) => ({ id: r.credential_id, transports: r.transports ?? undefined })),
        userVerification: 'required',
        timeout: challengeTtl,
      });
      setChallenge(p, options.challenge);
      return { status: 200, body: options };
    },

    async passkey(cookie, response, ctx) {
      const p = session(cookie);
      if (!p || p.setup) return noSession(ctx, 'passkey');
      const { challenge, error } = takeChallenge(p);
      if (error) return fail(p, ctx, 'passkey', error);
      const { passkeys } = await factors();
      const cred = passkeys.find((r) => r.credential_id === response?.id);
      if (!cred) return fail(p, ctx, 'passkey', 'unknown passkey');
      let result;
      try {
        result = await verifyAuthenticationResponse({
          response,
          expectedChallenge: challenge,
          expectedOrigin: origins,
          expectedRPID: rpID,
          requireUserVerification: true,
          credential: { id: cred.credential_id, publicKey: new Uint8Array(Buffer.from(cred.public_key, 'base64url')), counter: Number(cred.counter), transports: cred.transports ?? undefined },
        });
      } catch {
        return fail(p, ctx, 'passkey', 'passkey did not verify');
      }
      if (!result.verified) return fail(p, ctx, 'passkey', 'passkey did not verify');
      await store.setCounter(cred.id, result.authenticationInfo.newCounter);
      return pass(p, ctx, 'passkey');
    },

    // An authenticator code (six digits) or a recovery code (ten letters and digits).
    async code(cookie, raw, ctx) {
      const p = session(cookie);
      const code = String(raw ?? '').replace(/[\s-]/g, '').toLowerCase();
      const method = /^\d{6}$/.test(code) ? 'code' : 'recovery';
      if (!p || p.setup) return noSession(ctx, method);
      const { totp, recovery } = await factors();
      if (method === 'code') {
        if (!totp) return fail(p, ctx, method, 'no authenticator');
        const step = matchStep(decrypt(totp.secret), code, now());
        if (step === null) return fail(p, ctx, method, 'wrong code');
        if (step <= Number(totp.last_step) || !(await store.claimStep(totp.id, step))) return fail(p, ctx, method, 'code already used');
        return pass(p, ctx, method);
      }
      if (code.length !== 10) return fail(p, ctx, method, 'wrong code');
      const hash = codeHash(code);
      const hit = recovery.find((r) => same(r.code_hash, hash));
      if (!hit) return fail(p, ctx, method, 'wrong code');
      if (hit.used_at || !(await store.claimRecovery(hit.id, new Date(now()).toISOString()))) return fail(p, ctx, method, 'code already used');
      const left = recovery.filter((r) => !r.used_at && r.id !== hit.id).length;
      return pass(p, ctx, method, { recoveryLeft: left });
    },

    /* ---------- one-time setup: only while nothing is enrolled ---------- */
    async setupStart(cookie, ctx) {
      const p = session(cookie);
      const enrolled = (await store.list()).length > 0;
      // once enrolled, the page says it is closed to anyone, signed in or not
      if (enrolled || (p && !p.setup)) return { status: 410, body: { error: 'closed' } };
      if (!p) return noSession(ctx, 'setup');
      p.totpSecret ??= base32(randomBytes(20));
      const label = encodeURIComponent('davidpuerto.com:admin');
      return {
        status: 200,
        body: { secret: p.totpSecret, uri: `otpauth://totp/${label}?secret=${p.totpSecret}&issuer=davidpuerto.com&algorithm=SHA1&digits=6&period=30`, passkey: Boolean(p.newPasskey) },
      };
    },

    async setupPasskeyOptions(cookie, ctx) {
      const p = session(cookie);
      if (!p) return noSession(ctx, 'setup');
      if (!p.setup) return { status: 410, body: { error: 'closed' } };
      const options = await generateRegistrationOptions({
        rpName: 'davidpuerto.com',
        rpID,
        userName: 'admin',
        userDisplayName: 'davidpuerto.com admin',
        attestationType: 'none',
        authenticatorSelection: { residentKey: 'preferred', userVerification: 'required' },
        timeout: challengeTtl,
      });
      setChallenge(p, options.challenge);
      return { status: 200, body: options };
    },

    async setupPasskey(cookie, response, ctx) {
      const p = session(cookie);
      if (!p) return noSession(ctx, 'setup');
      if (!p.setup) return { status: 410, body: { error: 'closed' } };
      const { challenge, error } = takeChallenge(p);
      if (error) return fail(p, ctx, 'setup', error);
      let result;
      try {
        result = await verifyRegistrationResponse({ response, expectedChallenge: challenge, expectedOrigin: origins, expectedRPID: rpID, requireUserVerification: true });
      } catch {
        return fail(p, ctx, 'setup', 'passkey did not verify');
      }
      if (!result.verified) return fail(p, ctx, 'setup', 'passkey did not verify');
      const { credential } = result.registrationInfo;
      p.newPasskey = { kind: 'passkey', credential_id: credential.id, public_key: Buffer.from(credential.publicKey).toString('base64url'), counter: credential.counter, transports: credential.transports ?? null };
      return { status: 200, body: { success: true } };
    },

    // The authenticator's first code proves it was set up right; then everything
    // is written at once and the ten recovery codes are shown, this once.
    async setupFinish(cookie, raw, ctx) {
      const p = session(cookie);
      if (!p) return noSession(ctx, 'setup');
      if (!p.setup) return { status: 410, body: { error: 'closed' } };
      if (!p.newPasskey) return { status: 400, body: { error: 'passkey first' } };
      if (!p.totpSecret) return { status: 400, body: { error: 'authenticator first' } };
      const step = matchStep(p.totpSecret, String(raw ?? '').replace(/\s/g, ''), now());
      if (step === null) return fail(p, ctx, 'setup', 'wrong code');
      if ((await store.list()).length) return { status: 410, body: { error: 'closed' } };
      const codes = Array.from({ length: RECOVERY_COUNT }, newRecoveryCode);
      await store.insert([
        p.newPasskey,
        { kind: 'totp', secret: encrypt(p.totpSecret), last_step: step },
        ...codes.map((c) => ({ kind: 'recovery', code_hash: codeHash(c) })),
      ]);
      pending.delete(p.id);
      log(ctx, 'admin_enrolled', { passkeys: 1, recovery: RECOVERY_COUNT });
      return { status: 200, body: { success: true, recoveryCodes: codes.map(showRecovery), redirectTo: '/admin/' }, pass: true };
    },
  };
}
