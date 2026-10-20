// Contact page: the locator (live Mountain clock, decoded coordinates) and the
// form submission to /api/contact.
import { track } from './lib/analytics.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// --- live local time (Mountain: Las Cruces), ticking every second ---------
const clock = document.querySelector('[data-clock]');
const tzEl = document.querySelector('[data-tz]');
if (clock) {
  const time = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const zone = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', timeZoneName: 'short' });
  const tick = () => {
    clock.textContent = time.format(new Date());
    const tz = zone.formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value;
    if (tzEl && tz) tzEl.textContent = tz;
  };
  tick();
  setInterval(tick, 1000);
}

// --- TechWeek LA: link to today's events, by today's date in Pacific time ---
const techweek = document.querySelector('[data-techweek]');
if (techweek) {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const url = new URL(techweek.href);
  url.searchParams.set('day', day);
  techweek.href = url.toString();
}

// --- the coordinates decode in, digit by digit, once ---------------------
const scramble = document.querySelector('[data-scramble]');
if (scramble && !reduced) {
  const target = scramble.textContent;
  const digits = '0123456789';
  let frame = 0;
  const total = 26;
  const step = () => {
    frame++;
    const settled = Math.floor((frame / total) * target.length);
    scramble.textContent = [...target].map((ch, i) => (i < settled || !/\d/.test(ch) ? ch : digits[(Math.random() * 10) | 0])).join('');
    if (frame < total) setTimeout(step, 45);
    else scramble.textContent = target;
  };
  setTimeout(step, 500);
}

// --- the transmission ----------------------------------------------------
const form = document.querySelector('.contact-form');
const status = form.querySelector('.form-status');
const button = form.querySelector('button[type="submit"]');
const say = (text, kind = '') => { status.textContent = text; status.className = `form-status ${kind}`; };

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;

  const data = Object.fromEntries(new FormData(form));
  button.disabled = true;
  say('Transmitting…');

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      form.reset();
      say('Received. Talk soon.', 'ok');
      track('contact_submit');
    } else if (res.status === 429) {
      say('Easy there. Try again in a bit.', 'err');
    } else {
      say('Something hiccuped. Email me directly: me@davidpuerto.com', 'err');
    }
  } catch {
    say('Network trouble. Email me directly: me@davidpuerto.com', 'err');
  } finally {
    button.disabled = false;
  }
});
