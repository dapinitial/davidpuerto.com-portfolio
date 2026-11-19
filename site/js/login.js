// Login page: POST /api/login, then hard-redirect to the gated destination.
// The admin password leads to a second step on the same card: a passkey, or an
// authenticator or recovery code (server/second-factor.js), and the very first
// time to the one-time setup page.
import { startAuthentication } from '@simplewebauthn/browser';
import { note, track } from './lib/analytics.js';
import { InfinityLoader } from './elements/infinity-loader.js';

const form = document.querySelector('.login-form');
const status = form.querySelector('.form-status');
const input = form.password;

// which study they asked for, so the page says what is behind it
const STUDIES = {
  '/case-studies/microsoft/': 'Microsoft · Preview Sites',
  '/case-studies/apple/': 'Apple · Project Studio',
  '/case-studies/review/': 'The review deck',
  '/case-studies/facebook/': 'Facebook',
  '/case-studies/nordstrom/': 'Nordstrom',
  '/case-studies/sonosite/': 'SonoSite',
  '/case-studies/zillow/': 'Zillow',
};
// a path without its trailing slash still names the study
const wanted = (new URLSearchParams(location.search).get('redirectTo') || '').split(/[?#]/)[0].replace(/([^/])$/, '$1/');
const forEl = form.querySelector('[data-for]');
if (STUDIES[wanted] && forEl) {
  forEl.innerHTML = `Requested <b>${STUDIES[wanted]}</b>`;
  forEl.hidden = false;
}

// show or hide what was typed
const show = form.querySelector('.lg-show');
show.addEventListener('click', () => {
  const on = input.type === 'password';
  input.type = on ? 'text' : 'password';
  show.textContent = on ? 'Hide' : 'Show';
  show.setAttribute('aria-pressed', String(on));
  show.setAttribute('aria-label', on ? 'Hide password' : 'Show password');
  input.focus();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  status.textContent = '';

  const redirectTo = new URLSearchParams(location.search).get('redirectTo') || '';
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: form.password.value, redirectTo }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.setup) return location.assign('/login/setup/');
      if (data.second) return showSecond(data.second);
      arrive(data.redirectTo);
    } else if (res.status === 503) {
      status.textContent = 'The admin is closed for a moment. Try again later.';
    } else if (res.status === 429) {
      status.textContent = 'Too many tries. Wait fifteen minutes, or ask me for it.';
    } else {
      // only that a try failed: what was typed is never sent anywhere but the check above
      note('login_fail');
      status.textContent = 'That is not it. Try again, or ask me for it.';
    }
  } catch {
    status.textContent = 'Network trouble. Try again in a moment.';
  }
});

// In to the study or the admin: the same page change as every other link. The
// loop comes up over Login, and the page arrives behind the same cover
// (js/main.js, boot/arriving.js).
function arrive(to) {
  const dest = to || '/case-studies/microsoft/';
  track('case_study_unlock', { study: dest });
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return location.assign(dest);
  try {
    sessionStorage.setItem('dp-arriving', '1');
    sessionStorage.setItem('dp-loop-t0', String(Date.now()));
  } catch { /* private mode: the loader still shows */ }
  InfinityLoader.show();
  setTimeout(() => location.assign(dest), 420);
}

// The second step. Every answer from the server is one of: in, a wrong try,
// locked or expired (start over with the password), or too many tries.
const second = document.querySelector('.lg-second');
const sStatus = second.querySelector('.form-status');
const passkeyButton = second.querySelector('.lg-passkey');
const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });

function showSecond({ passkey }) {
  form.hidden = true;
  document.querySelector('.lg-request')?.setAttribute('hidden', '');
  second.hidden = false;
  passkeyButton.closest('.lg-actions').hidden = !passkey;
  (passkey ? passkeyButton : second.code).focus();
}
function startOver(message) {
  sStatus.textContent = message;
  setTimeout(() => {
    second.hidden = true;
    form.hidden = false;
    status.textContent = message;
    input.value = '';
    input.focus();
  }, 1600);
}
async function answer(res) {
  const data = await res.json().catch(() => ({}));
  if (res.ok) {
    // a recovery code was spent: say how many are left before going on
    if (data.recoveryLeft == null) return arrive(data.redirectTo);
    sStatus.textContent = `In. ${data.recoveryLeft} recovery ${data.recoveryLeft === 1 ? 'code' : 'codes'} left.`;
    return setTimeout(() => arrive(data.redirectTo), 1800);
  }
  if (res.status === 429) sStatus.textContent = 'Too many tries. Wait fifteen minutes.';
  else if (data.error === 'locked') startOver('Too many wrong tries. Start again with the password.');
  else if (data.error === 'expired') startOver('That took too long. Start again with the password.');
  else if (data.error === 'expired challenge') sStatus.textContent = 'The passkey took too long. Try it again.';
  else if (data.error === 'code already used') sStatus.textContent = 'That code was already used. Wait for the next one.';
  else sStatus.textContent = 'That did not work. Try again.';
}

passkeyButton.addEventListener('click', async () => {
  sStatus.textContent = '';
  passkeyButton.disabled = true;
  try {
    const res = await post('/api/second/passkey/options');
    if (!res.ok) return answer(res);
    const response = await startAuthentication({ optionsJSON: await res.json() });
    await answer(await post('/api/second/passkey', { response }));
  } catch {
    // the passkey sheet was closed, or this device has none for the site
    sStatus.textContent = 'No passkey. Use a code instead.';
    second.code.focus();
  } finally {
    passkeyButton.disabled = false;
  }
});

second.addEventListener('submit', async (e) => {
  e.preventDefault();
  sStatus.textContent = '';
  if (!second.code.value.trim()) return second.code.focus();
  try {
    await answer(await post('/api/second/code', { code: second.code.value }));
  } catch {
    sStatus.textContent = 'Network trouble. Try again in a moment.';
  }
});

// Ask for the password: a small form under the login, through the same
// pipeline as the contact form. The visit log hears about it too.
const ask = document.querySelector('.lg-ask');
const request = document.querySelector('.lg-request');
if (ask && request) {
  ask.addEventListener('click', () => {
    const open = request.hidden;
    request.hidden = !open;
    ask.setAttribute('aria-expanded', String(open));
    if (open) request.from.focus();
  });
  const rStatus = request.querySelector('.form-status');
  const rButton = request.querySelector('button[type="submit"]');
  request.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!request.from.value.includes('@')) { rStatus.textContent = 'An email address, so I can send it.'; request.from.focus(); return; }
    rButton.disabled = true;
    rStatus.textContent = 'Sending…';
    const study = wanted.match(/^\/case-studies\/([a-z]+)/)?.[1] || '';
    try {
      const res = await fetch('/api/access-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: request.name.value, from: request.from.value, note: request.note.value, study, company: request.company.value }),
      });
      if (res.ok) {
        note('access_request', { study: STUDIES[wanted] || study || 'a study' });
        rStatus.textContent = 'Sent. I will reply with it.';
        request.querySelectorAll('input').forEach((i) => { i.disabled = true; });
      } else if (res.status === 429) {
        rStatus.textContent = 'Too many asks from here. Email me instead.';
        rButton.disabled = false;
      } else {
        rStatus.textContent = 'That did not send. Email me instead.';
        rButton.disabled = false;
      }
    } catch {
      rStatus.textContent = 'Network trouble. Try again, or email me.';
      rButton.disabled = false;
    }
  });
}
