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
      // pick the loop up where the old page left it, to the nearest eighth
      var t0 = +sessionStorage.getItem('dp-loop-t0');
      if (t0) document.documentElement.dataset.loop = String(Math.round(((Date.now() - t0) % 1000) / 125) % 8);
      window.__arriveFailsafe = setTimeout(function () {
        // Same graceful exit main.js runs at load — hop out, then drop.
        var html = document.documentElement;
        html.classList.add('is-departing');
        setTimeout(function () {
          html.classList.remove('is-arriving', 'is-departing');
        }, 520);
      }, 3000);
    }
  } catch (e) {}
})();

// Deck pages: the deck lays itself out from a module, after the parser could
// already have painted the long read. Predict the deck the way deck.js
// decides it and hold the page (the dark ground shows) until it has; deck.js
// lifts .deck-pending. Failsafe: never hold longer than 2.5s.
(function () {
  try {
    var q = new URLSearchParams(location.search);
    var deckPage = /^\/(about-me|case-studies\/(apple|microsoft|review|nordstrom|sonosite|facebook))\/?$/.test(location.pathname);
    var stage = matchMedia('(min-width: 900px) and (pointer: fine), (min-width: 744px) and (min-height: 600px) and (pointer: coarse)').matches;
    if (deckPage && (q.get('deck') === '1' || q.get('talk') === '1' || (q.get('read') !== '1' && stage))) {
      var html = document.documentElement;
      html.classList.add('deck-pending');
      setTimeout(function () { html.classList.remove('deck-pending'); }, 2500);
    }
  } catch (e) {}
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
