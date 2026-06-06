// Shared chrome — loaded on every page.
import './elements/site-header.js';
import './elements/site-preloader.js';
import { InfinityLoader } from './elements/infinity-loader.js';

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
  InfinityLoader.show();
  setTimeout(() => location.assign(link.href), TRANSITION_HOLD);
});

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
