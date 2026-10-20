// Connect the visit log to its database: npm run visits:connect
// Reads the davidpuerto-visits project's secret key from the Supabase CLI (or
// asks for it without echoing), then stores it in .env for local runs and as
// an encrypted secret on the DigitalOcean app (which redeploys). The key is
// never printed.
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const APP_ID = 'b0d2f2ad-49e3-4335-9f5f-e032c3f963ed'; // davidpuerto-com, .do/app.yaml
const REF = 'rrayjhtbzeyaglpfijfj'; // Supabase project davidpuerto-visits
const URL = `https://${REF}.supabase.co`;

const ask = (prompt) =>
  new Promise((resolve) => {
    process.stdout.write(prompt);
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off('data', onData);
          process.stdout.write('\n');
          return resolve(value.trim());
        }
        if (ch === '\u0003') process.exit(130);
        value = ch === '\u007f' ? value.slice(0, -1) : value + ch;
      }
    };
    stdin.on('data', onData);
  });

let key = '';
try {
  const keys = JSON.parse(execFileSync('supabase', ['projects', 'api-keys', '--project-ref', REF, '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  key = keys.find((k) => k.type === 'secret')?.api_key ?? keys.find((k) => k.name === 'service_role')?.api_key ?? '';
} catch {}
if (key) console.log('✔ secret key read from the Supabase CLI');
else {
  if (!process.stdin.isTTY) {
    console.error('Run this in a terminal: npm run visits:connect');
    process.exit(1);
  }
  key = await ask('Paste the secret key (Supabase → davidpuerto-visits → Settings → API keys): ');
}
if (!key || key.includes(' ')) {
  console.error('No key. Nothing changed.');
  process.exit(1);
}

// check it works before storing it anywhere
const probe = await fetch(`${URL}/rest/v1/hits?select=id&limit=1`, {
  headers: { apikey: key, ...(key.startsWith('eyJ') ? { authorization: `Bearer ${key}` } : {}) },
});
if (!probe.ok) {
  console.error(`The database refused that key (${probe.status}). Nothing changed.`);
  process.exit(1);
}
console.log('✔ the visit log answers');

// 1. local .env
let env = existsSync('.env') ? readFileSync('.env', 'utf8') : '';
for (const [k, v] of [['VISITS_URL', URL], ['VISITS_KEY', key]]) {
  const line = `${k}='${v}'`;
  const re = new RegExp(`^${k}=.*$`, 'm');
  env = re.test(env) ? env.replace(re, line) : `${env.trimEnd()}\n${line}\n`;
}
writeFileSync('.env', env);
console.log('✔ .env updated');

// 2. the DigitalOcean app: add or replace both, then redeploy
const spec = JSON.parse(execFileSync('doctl', ['apps', 'spec', 'get', APP_ID, '--format', 'json'], { encoding: 'utf8' }));
spec.envs = (spec.envs ?? []).filter((e) => e.key !== 'VISITS_URL' && e.key !== 'VISITS_KEY');
spec.envs.push({ key: 'VISITS_URL', value: URL, scope: 'RUN_TIME' });
spec.envs.push({ key: 'VISITS_KEY', value: key, type: 'SECRET', scope: 'RUN_TIME' });
const dir = mkdtempSync(join(tmpdir(), 'dp-spec-'));
try {
  writeFileSync(join(dir, 'spec.json'), JSON.stringify(spec));
  execFileSync('doctl', ['apps', 'update', APP_ID, '--spec', join(dir, 'spec.json')], { stdio: 'ignore' });
} finally {
  rmSync(dir, { recursive: true, force: true });
}
console.log('✔ DigitalOcean secret set; the app redeploys with it in a few minutes');
