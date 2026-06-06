// Login page: POST /api/login, then hard-redirect to the gated destination.
const form = document.querySelector('.login-form');
const status = form.querySelector('.form-status');

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
      location.assign(data.redirectTo || '/case-studies/microsoft/');
    } else if (res.status === 429) {
      status.textContent = 'Too many attempts — try again in 15 minutes.';
    } else {
      status.textContent = 'Invalid credentials, please try again.';
    }
  } catch {
    status.textContent = 'Network trouble — please try again.';
  }
});
