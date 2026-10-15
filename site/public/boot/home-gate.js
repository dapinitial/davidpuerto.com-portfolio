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

// Climbs: the mountain photos behind the loader, page changes, menu, Contact
// and Login. On by default; ?climbs=0 turns them off on this browser
// (remembered), ?climbs=1 turns them back on.
(function () {
  try {
    var q = new URLSearchParams(location.search);
    if (q.has('climbs')) {
      if (q.get('climbs') === '0') localStorage.setItem('dp-climbs', 'off');
      else localStorage.removeItem('dp-climbs');
    }
    if (localStorage.getItem('dp-climbs') !== 'off') document.documentElement.classList.add('with-climbs');
  } catch (e) {
    document.documentElement.classList.add('with-climbs');
  }
})();
