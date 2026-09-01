// Content lock: encrypts the NDA-gated case studies (built pages, their
// asset chunks, and their images) into content-locked/ so the repo can be
// public while client work travels as ciphertext. The server decrypts at
// request time for password-authenticated visitors (CONTENT_KEY env).
//
// Usage: npm run lock   (builds first, then locks; commit content-locked/)
// Key:   openssl rand -base64 32  -> CONTENT_KEY in .env + platform secrets
import { createCipheriv, randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const out = path.join(root, 'content-locked');

const STUDIES = ['apple', 'microsoft', 'facebook', 'nordstrom', 'sonosite', 'zillow'];

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

const lock = (absSrc, relDest) => {
  const dest = path.join(out, `${relDest}.enc`);
  mkdirSync(path.dirname(dest), { recursive: true });
  writeFileSync(dest, encrypt(readFileSync(absSrc)));
  return relDest;
};

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

rmSync(out, { recursive: true, force: true });
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

console.log(`locked ${locked.length} files into content-locked/`);
