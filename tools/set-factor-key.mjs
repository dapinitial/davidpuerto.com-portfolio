// Make ADMIN_FACTOR_KEY and store it as an encrypted secret on the DigitalOcean
// app (which redeploys): npm run admin:factor-key
//
// The key encrypts the authenticator secret and keys the recovery-code hashes, so
// changing it after the setup makes both unreadable (the passkey still works).
// That is why this refuses to replace a key that is already set, unless you pass
// --replace, and then the setup has to be done again. The key is never printed.
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const APP_ID = 'b0d2f2ad-49e3-4335-9f5f-e032c3f963ed'; // davidpuerto-com, .do/app.yaml
const replace = process.argv.includes('--replace');

const spec = JSON.parse(execFileSync('doctl', ['apps', 'spec', 'get', APP_ID, '--format', 'json'], { encoding: 'utf8' }));
const has = (spec.envs ?? []).some((e) => e.key === 'ADMIN_FACTOR_KEY') || (spec.services ?? []).some((s) => (s.envs ?? []).some((e) => e.key === 'ADMIN_FACTOR_KEY'));
if (has && !replace) {
  console.log('ADMIN_FACTOR_KEY is already set. Nothing changed. (--replace makes a new one and the setup starts over.)');
  process.exit(0);
}
spec.envs = (spec.envs ?? []).filter((e) => e.key !== 'ADMIN_FACTOR_KEY');
spec.envs.push({ key: 'ADMIN_FACTOR_KEY', value: randomBytes(32).toString('base64'), type: 'SECRET', scope: 'RUN_TIME' });
const dir = mkdtempSync(join(tmpdir(), 'dp-spec-'));
try {
  writeFileSync(join(dir, 'spec.json'), JSON.stringify(spec), { mode: 0o600 });
  execFileSync('doctl', ['apps', 'update', APP_ID, '--spec', join(dir, 'spec.json')], { stdio: 'ignore' });
} finally {
  rmSync(dir, { recursive: true, force: true });
}
console.log(`✔ ADMIN_FACTOR_KEY ${replace ? 'replaced' : 'set'} on DigitalOcean; the app redeploys with it in a few minutes`);
