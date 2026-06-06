// Arrival pre-paint cover (external file: CSP script-src 'self' compliant).
// If this page was reached via an internal transition, cover it before first
// paint; js/main.js rides the infinity loader until load, then lifts it.
(function () {
  try {
    if (
      sessionStorage.getItem('dp-arriving') &&
      matchMedia('(prefers-reduced-motion: no-preference)').matches
    ) {
      document.documentElement.classList.add('is-arriving');
      window.__arriveFailsafe = setTimeout(function () {
        document.documentElement.classList.remove('is-arriving');
      }, 3000);
    }
  } catch (e) {}
})();
