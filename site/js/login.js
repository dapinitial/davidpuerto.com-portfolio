// Login page: POST /api/login, then hard-redirect to the gated destination.
import { track } from './lib/analytics.js';

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
      location.assign(dest);
    } else if (res.status === 429) {
      status.textContent = 'Too many tries. Wait fifteen minutes, or ask me for it.';
    } else {
      status.textContent = 'That is not it. Try again, or ask me for it.';
    }
  } catch {
    status.textContent = 'Network trouble. Try again in a moment.';
  }
});
