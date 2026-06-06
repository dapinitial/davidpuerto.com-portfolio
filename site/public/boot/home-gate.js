// Homepage pre-paint gate (external file: CSP script-src 'self' compliant).
// 1. scroll restoration off (no mid-page frame on hard refresh)
// 2. .is-enhanced hides the fixed-stack sections pre-paint
// 3. .is-covered paints an opaque cover until the preloader takes over
// Failsafe: if home.js never boots, unhide after 3s.
(function () {
  try { history.scrollRestoration = 'manual'; scrollTo(0, 0); } catch (e) {}
  if (matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    var c = document.documentElement.classList;
    c.add('is-enhanced', 'is-covered');
    window.__enhanceFailsafe = setTimeout(function () {
      c.remove('is-enhanced', 'is-covered');
    }, 3000);
  }
})();
