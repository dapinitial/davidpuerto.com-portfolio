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
        // Same graceful exit main.js runs at load — hop out, then drop.
        var html = document.documentElement;
        html.classList.add('is-departing');
        setTimeout(function () {
          html.classList.remove('is-arriving', 'is-departing');
        }, 650);
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
    var deckPage = /^\/(about-me|case-studies\/(apple|microsoft|review))\/?$/.test(location.pathname);
    var stage = matchMedia('(min-width: 900px) and (pointer: fine)').matches;
    if (deckPage && (q.get('deck') === '1' || q.get('talk') === '1' || (q.get('read') !== '1' && stage))) {
      var html = document.documentElement;
      html.classList.add('deck-pending');
      setTimeout(function () { html.classList.remove('deck-pending'); }, 2500);
    }
  } catch (e) {}
})();
