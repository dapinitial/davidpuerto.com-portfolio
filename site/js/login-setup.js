// The admin's one-time setup (server/second-factor.js). Reached from the login
// page after the admin password, only while nothing is enrolled. A passkey,
// then an authenticator proved by its first code, then the ten recovery codes,
// shown once. The server writes nothing until the last step passes.
import { startRegistration } from '@simplewebauthn/browser';
import qrcode from 'qrcode-generator';

const form = document.querySelector('.lg-setup');
const step = (name) => form.querySelector(`[data-step="${name}"]`);
const status = (name) => form.querySelector(`[data-status="${name}"]`);
const setup = (name) => form.querySelector(`[data-setup="${name}"]`);
const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });
const lead = setup('lead');

function closed(message, link) {
  lead.innerHTML = `${message} <a href="${link.href}">${link.text}</a>`;
  for (const s of form.querySelectorAll('.lg-step')) s.hidden = true;
}
const startOver = () => closed('This setup timed out, or had too many wrong tries.', { href: '/login/?redirectTo=%2Fadmin%2F', text: 'Sign in with the admin password again.' });

async function load() {
  const res = await post('/api/second/setup');
  if (res.status === 410) return closed('Setup is closed: a passkey and an authenticator are already set up.', { href: '/login/?redirectTo=%2Fadmin%2F', text: 'Sign in.' });
  if (res.status === 401) return closed('Sign in with the admin password first.', { href: '/login/?redirectTo=%2Fadmin%2F', text: 'Sign in.' });
  if (!res.ok) return closed('The setup is not available right now.', { href: '/', text: 'Home.' });
  const { secret, uri, passkey } = await res.json();
  const qr = qrcode(0, 'M');
  qr.addData(uri);
  qr.make();
  setup('qr').innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  setup('key').textContent = secret.match(/.{1,4}/g).join(' ');
  setup('uri').href = uri;
  step('passkey').hidden = false;
  if (passkey) passkeyDone();
}

function passkeyDone() {
  const s = status('passkey');
  s.textContent = 'Passkey saved.';
  s.classList.add('lg-done');
  form.querySelector('[data-action="passkey"]').disabled = true;
  step('code').hidden = false;
  form.code.focus();
}

form.querySelector('[data-action="passkey"]').addEventListener('click', async () => {
  const s = status('passkey');
  s.textContent = '';
  try {
    const opts = await post('/api/second/setup/passkey/options');
    if (opts.status === 401) return startOver();
    if (!opts.ok) { s.textContent = 'That did not start. Try again.'; return; }
    const response = await startRegistration({ optionsJSON: await opts.json() });
    const res = await post('/api/second/setup/passkey', { response });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return passkeyDone();
    if (data.error === 'locked' || data.error === 'expired') return startOver();
    s.textContent = data.error === 'expired challenge' ? 'That took too long. Try again.' : 'That passkey did not work. Try again.';
  } catch {
    s.textContent = 'The passkey was not made. Try again.';
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const s = status('code');
  s.textContent = '';
  if (!/^\d{6}$/.test(form.code.value.trim())) { s.textContent = 'Six digits.'; return form.code.focus(); }
  const res = await post('/api/second/setup/finish', { code: form.code.value.trim() });
  const data = await res.json().catch(() => ({}));
  if (res.ok) {
    step('passkey').hidden = true;
    step('code').hidden = true;
    lead.textContent = 'Done. You are signed in to the admin.';
    setup('codes').innerHTML = data.recoveryCodes.map((c) => `<li>${c}</li>`).join('');
    step('codes').hidden = false;
    form.dataset.codes = data.recoveryCodes.join('\n');
    return;
  }
  if (res.status === 429) s.textContent = 'Too many tries. Wait fifteen minutes.';
  else if (data.error === 'locked' || data.error === 'expired') startOver();
  else s.textContent = 'That is not the code. Try the next one it shows.';
});

form.querySelector('[data-action="copy"]').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(form.dataset.codes ?? '');
    status('codes').textContent = 'Copied.';
  } catch {
    status('codes').textContent = 'Copy them by hand.';
  }
});

load().catch(() => closed('Network trouble.', { href: '/login/setup/', text: 'Try again.' }));
