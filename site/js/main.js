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
// the inline snippet already covered it. Ride the infinity loader until the
// page is fully loaded, then bounce out and lift the cover.
try {
  if (sessionStorage.getItem('dp-arriving')) {
    sessionStorage.removeItem('dp-arriving');
    // The homepage has its own full preloader — don't stack loaders.
    if (document.documentElement.classList.contains('is-arriving')) {
      const el = InfinityLoader.show();
      const done = () => {
        document.documentElement.classList.remove('is-arriving');
        clearTimeout(window.__arriveFailsafe);
        el.hide();
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
  if (e.persisted) document.querySelectorAll('infinity-loader').forEach((el) => el.remove());
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
