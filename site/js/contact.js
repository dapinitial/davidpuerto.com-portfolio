// Contact page: elements + form submission to /api/contact.
import './elements/rain-fall.js';
import './elements/neon-text.js';

const form = document.querySelector('.contact-form');
const status = form.querySelector('.form-status');
const button = form.querySelector('button[type="submit"]');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;

  const data = Object.fromEntries(new FormData(form));
  button.disabled = true;
  status.textContent = 'Sending…';

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      form.reset();
      status.textContent = 'Sent — talk soon. ✌️';
    } else if (res.status === 429) {
      status.textContent = 'Easy there — try again in a bit.';
    } else {
      status.textContent = 'Something hiccuped. Email me directly: me@davidpuerto.com';
    }
  } catch {
    status.textContent = 'Network trouble. Email me directly: me@davidpuerto.com';
  } finally {
    button.disabled = false;
  }
});
