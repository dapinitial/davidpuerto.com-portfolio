// Shared chrome — loaded on every page.
import './lib/analytics.js';
import './elements/site-header.js';
import './elements/site-preloader.js';
import './elements/scroll-progress.js';
import { InfinityLoader } from './elements/infinity-loader.js';

// Inject the scroll-progress ring on every page EXCEPT the homepage —
// the zoom-scroll experience has its own dot indicator + snap navigation.
const isHomepage = document.querySelector('.indicator-nav');
if (!isHomepage && !document.querySelector('scroll-progress')) {
  document.body.append(document.createElement('scroll-progress'));
}

// Page-transition loader: cover internal navigations with the infinity loader
// (the old SPA's transition feel). Browsers don't repaint between click and
// navigation, so we hold the nav briefly — otherwise the loader never shows.
const TRANSITION_HOLD = 600; // one beat of the infinity loop

document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href]');
  if (!link || link.origin !== location.origin || link.target === '_blank') return;
  if (link.hash && link.pathname === location.pathname) return; // same-page anchor
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.defaultPrevented) return;
  if (link.hasAttribute('download')) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; // instant nav

  e.preventDefault();
  // Tell the destination page it's part of a transition, so its inline head
  // snippet covers it pre-paint (no flash before the loader appears there).
  try {
    sessionStorage.setItem('dp-arriving', '1');
  } catch {
    /* private mode etc. — transition still works, just without the cover */
  }
  InfinityLoader.show();
  setTimeout(() => location.assign(link.href), TRANSITION_HOLD);
});

// Arrival orchestration: if this page was reached via an internal transition,
// the boot snippet already covered it — backdrop AND spinner (the spinner is
// a data-URI in css/elements/infinity-loader.css, animating since first
// paint). Ride that cover until the page is fully loaded, then add
// .is-departing: the spinner hops away and the cover fades as the page shows.
try {
  if (sessionStorage.getItem('dp-arriving')) {
    sessionStorage.removeItem('dp-arriving');
    const html = document.documentElement;
    // The homepage has its own full preloader — don't stack loaders.
    if (html.classList.contains('is-arriving')) {
      const done = () => {
        clearTimeout(window.__arriveFailsafe);
        html.classList.add('is-departing');
        // hop (500ms) + cover fade tail (ends 600ms) — then drop the cover
        setTimeout(() => html.classList.remove('is-arriving', 'is-departing'), 650);
      };
      if (document.readyState === 'complete') done();
      else window.addEventListener('load', done, { once: true });
    }
  }
} catch {
  /* sessionStorage unavailable — nothing to orchestrate */
}

// A bfcache restore (iOS swipe-back) revives the page WITH the loader still
// in the DOM — clear any strays.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    document.querySelectorAll('infinity-loader').forEach((el) => el.remove());
    document.documentElement.classList.remove('is-arriving', 'is-departing');
  }
});

// Resize lid: pause all CSS transitions/animations while the window is
// actively resizing (see base.css html.is-resizing). Re-rasterizing the
// full-viewport blurred/translucent layers per frame is a perf nightmare.
let resizeSettle;
window.addEventListener('resize', () => {
  document.documentElement.classList.add('is-resizing');
  clearTimeout(resizeSettle);
  resizeSettle = setTimeout(
    () => document.documentElement.classList.remove('is-resizing'),
    150,
  );
});
