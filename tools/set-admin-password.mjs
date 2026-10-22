// Set a password: npm run admin:password (the /admin dashboard)
//              or npm run cs:password    (the NDA case studies)
// Asks twice without echoing, stores only a bcrypt hash: in .env for local
// runs and as an encrypted secret on the DigitalOcean app (which redeploys).
// The password itself is never written anywhere or shown.
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import bcrypt from 'bcryptjs';

const APP_ID = 'b0d2f2ad-49e3-4335-9f5f-e032c3f963ed'; // davidpuerto-com, .do/app.yaml
const CS = process.argv.includes('--case-studies');
const KEY = CS ? 'PASSWORD_HASH' : 'ADMIN_PASSWORD_HASH';
const WHAT = CS ? 'case-study' : 'admin';

const ask = (prompt) =>
  new Promise((resolve) => {
    process.stdout.write(prompt);
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';
    const onData = (ch) => {
      if (ch === '\r' || ch === '\n') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.off('data', onData);
        process.stdout.write('\n');
        resolve(value);
      } else if (ch === '\u0003') {
        process.exit(130);
      } else if (ch === '\u007f') {
        value = value.slice(0, -1);
      } else {
        value += ch;
      }
    };
    stdin.on('data', onData);
  });

if (!process.stdin.isTTY) {
  console.error(`Run this in a terminal: npm run ${CS ? 'cs' : 'admin'}:password`);
  process.exit(1);
}

const first = await ask(`New ${WHAT} password (at least 12 characters): `);
if (first.length < 12) {
  console.error('Too short. Nothing changed.');
  process.exit(1);
}
if ((await ask('Again: ')) !== first) {
  console.error("They don't match. Nothing changed.");
  process.exit(1);
}
const hash = bcrypt.hashSync(first, 12);

// 1. local .env
const env = existsSync('.env') ? readFileSync('.env', 'utf8') : '';
const line = `${KEY}='${hash}'`;
const re = new RegExp(`^${KEY}=.*$`, 'm');
writeFileSync('.env', re.test(env) ? env.replace(re, line) : `${env.trimEnd()}\n${line}\n`);
console.log('✔ .env updated');

// 2. the DigitalOcean app: add or replace the encrypted secret, then redeploy
const spec = JSON.parse(execFileSync('doctl', ['apps', 'spec', 'get', APP_ID, '--format', 'json'], { encoding: 'utf8' }));
spec.envs = (spec.envs ?? []).filter((e) => e.key !== KEY);
spec.envs.push({ key: KEY, value: hash, type: 'SECRET', scope: 'RUN_TIME' });
const dir = mkdtempSync(join(tmpdir(), 'dp-spec-'));
try {
  writeFileSync(join(dir, 'spec.json'), JSON.stringify(spec));
  execFileSync('doctl', ['apps', 'update', APP_ID, '--spec', join(dir, 'spec.json')], { stdio: 'ignore' });
} finally {
  rmSync(dir, { recursive: true, force: true });
}
console.log('✔ DigitalOcean secret set; the app redeploys with it in a few minutes');
