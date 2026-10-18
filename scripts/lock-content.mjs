// Content lock: encrypts the NDA-gated case studies (built pages, their
// asset chunks, and their images) into content-locked/ so the repo can be
// public while client work travels as ciphertext. The server decrypts at
// request time for password-authenticated visitors (CONTENT_KEY env).
//
// Usage: npm run lock   (builds first, then locks; commit content-locked/)
// Key:   openssl rand -base64 32  -> CONTENT_KEY in .env + platform secrets
import { createCipheriv, createHmac, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const out = path.join(root, 'content-locked');

const STUDIES = ['apple', 'microsoft', 'facebook', 'nordstrom', 'sonosite', 'zillow', 'review'];

const keyB64 = process.env.CONTENT_KEY;
if (!keyB64) {
  console.error('CONTENT_KEY missing. Generate: openssl rand -base64 32 (set in .env)');
  process.exit(1);
}
const key = Buffer.from(keyB64, 'base64');
if (key.length !== 32) {
  console.error('CONTENT_KEY must be 32 bytes base64 (AES-256).');
  process.exit(1);
}

// AES-256-GCM: [12-byte iv][16-byte auth tag][ciphertext]
const encrypt = (buf) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(buf), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]);
};

// Incremental: a file whose plaintext has not changed keeps its existing
// ciphertext, so a ship rewrites only what changed (and the repo stops
// growing by the whole gated set every time). The manifest stores a keyed
// HMAC of each plaintext, never a bare hash, so it reveals nothing.
const manifestPath = path.join(out, '.manifest.json');
let manifest = {};
try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); } catch {}
const nextManifest = {};
let rewritten = 0;
const fingerprint = (buf) => createHmac('sha256', key).update(buf).digest('base64url');

const lock = (absSrc, relDest) => {
  const dest = path.join(out, `${relDest}.enc`);
  const buf = readFileSync(absSrc);
  const fp = fingerprint(buf);
  nextManifest[relDest] = fp;
  if (manifest[relDest] === fp && existsSync(dest)) return relDest;
  mkdirSync(path.dirname(dest), { recursive: true });
  writeFileSync(dest, encrypt(buf));
  rewritten++;
  return relDest;
};

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

mkdirSync(out, { recursive: true });
const locked = [];

// 1. Built case-study pages + every /assets/ chunk they reference.
//    Shared chunks usually exist in cloud builds too (content-hashed names);
//    the server only consults the locked store on misses, so overlap is fine.
const assetRefs = new Set();
for (const s of STUDIES) {
  const page = path.join(dist, 'case-studies', s, 'index.html');
  const html = readFileSync(page, 'utf8');
  for (const [, ref] of html.matchAll(/["'(](\/assets\/[^"')]+)["')]/g)) assetRefs.add(ref);
  locked.push(lock(page, `case-studies/${s}/index.html`));
}
// Follow chunk-to-chunk references too (static imports, dynamic import(),
// CSS url()): a chunk reached only through another chunk, like the three.js
// renderer behind a dynamic import, is otherwise absent from the store and
// hashed differently by the cloud build, so the page 404s on it.
const queue = [...assetRefs];
while (queue.length) {
  const ref = queue.shift();
  const abs = path.join(dist, ref.slice(1));
  let text;
  try {
    text = /\.(js|css)$/.test(ref) ? readFileSync(abs, 'utf8') : null;
  } catch {
    continue;
  }
  if (!text) continue;
  for (const [, name] of text.matchAll(/["'(](?:\.\/|\/assets\/)([\w.-]+\.(?:js|css|woff2?|png|jpe?g|webp|svg|glb))["')]/g)) {
    const next = `/assets/${name}`;
    if (!assetRefs.has(next)) {
      assetRefs.add(next);
      queue.push(next);
    }
  }
}
for (const ref of assetRefs) {
  const abs = path.join(dist, ref.slice(1));
  try {
    locked.push(lock(abs, ref.slice(1)));
  } catch {
    console.warn(`  (skipped missing asset ${ref})`);
  }
}

// 2. NDA images (from source — they're copied verbatim into builds).
const imgRoot = path.join(root, 'site/public/images/case-studies');
for (const abs of walk(imgRoot)) {
  locked.push(lock(abs, path.join('images/case-studies', path.relative(imgRoot, abs))));
}

// Remove ciphertext for files no longer in the gated set.
const keep = new Set(locked.map((r) => path.join(out, `${r}.enc`)));
let removed = 0;
for (const abs of walk(out)) {
  if (abs.endsWith('.enc') && !keep.has(abs)) { rmSync(abs); removed++; }
}
writeFileSync(manifestPath, JSON.stringify(nextManifest, null, 0));

console.log(`locked ${locked.length} files into content-locked/ (${rewritten} rewritten, ${locked.length - rewritten} unchanged, ${removed} removed)`);
