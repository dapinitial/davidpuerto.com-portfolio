// Login page: POST /api/login, then hard-redirect to the gated destination.
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
      const dest = data.redirectTo || '/case-studies/microsoft/';
      track('case_study_unlock', { study: dest });
      // the same page change as every other link: the loop comes up over Login,
      // and the study arrives behind the same cover (js/main.js, boot/arriving.js)
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return location.assign(dest);
      try {
        sessionStorage.setItem('dp-arriving', '1');
        sessionStorage.setItem('dp-loop-t0', String(Date.now()));
      } catch { /* private mode: the loader still shows */ }
      InfinityLoader.show();
      setTimeout(() => location.assign(dest), 420);
    } else if (res.status === 429) {
      status.textContent = 'Too many tries. Wait fifteen minutes, or ask me for it.';
    } else {
      status.textContent = 'That is not it. Try again, or ask me for it.';
    }
  } catch {
    status.textContent = 'Network trouble. Try again in a moment.';
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
