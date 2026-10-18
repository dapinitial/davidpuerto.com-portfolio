// About page: rain + the clipped image/video reveal.
import './elements/rain-fall.js';
import './elements/neon-text.js';
import './elements/clipped-image.js';

// --- The piece: load three.js only when a glass piece is near ---------------
// A WebGL-less browser or a failed load leaves the slide as copy alone.
const piece = document.querySelector('glass-piece');
if (piece) {
  const hasGL = (() => {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      return false;
    }
  })();
  if (!hasGL) {
    document.querySelectorAll('glass-piece').forEach((p) => p.setAttribute('data-error', ''));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        import('./elements/glass-piece.js').catch(() => document.querySelectorAll('glass-piece').forEach((p) => p.setAttribute('data-error', '')));
      },
      { rootMargin: '800px 0px' },
    );
    io.observe(piece);
  }
}

// --- The guide's Live Photo: it autoplays and loops like the hero video;
// anyone who asked for less motion gets the poster frame instead -----------
const live = document.querySelector('.guide-live video');
if (live && matchMedia('(prefers-reduced-motion: reduce)').matches) {
  live.removeAttribute('autoplay');
  live.pause();
} else if (live && !document.documentElement.classList.contains('deck')) {
  // the long read (phones): mobile browsers hold back off-screen autoplay, so
  // start it when it scrolls into view and rest it when it leaves
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !document.documentElement.hasAttribute('data-videos-paused')) live.play().catch(() => {});
    else live.pause();
  }, { threshold: 0.3 }).observe(live);
}

// --- Pause control for the looping background videos (WCAG 2.2.2): hidden
// until a keyboard reaches it, so mouse users see the page unchanged ----------
const loops = () => document.querySelectorAll('clipped-image video, .guide-live video');
if (loops().length) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'video-pause';
  btn.textContent = 'Pause background video';
  btn.setAttribute('aria-pressed', 'false');
  btn.addEventListener('click', () => {
    const paused = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(paused));
    btn.textContent = paused ? 'Play background video' : 'Pause background video';
    document.documentElement.toggleAttribute('data-videos-paused', paused);
    loops().forEach((v) => (paused ? v.pause() : v.play().catch(() => {})));
  });
  (document.querySelector('main') || document.body).prepend(btn);
}
