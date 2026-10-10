// Apple case study — the shared chapter motion (counters, beats, headings,
// the loop figure) plus a reveal for the fourteen-into-one figure.
import { gsap } from '../lib/gsap.js';
import { initChapterMotion } from './chapter-motion.js';

initChapterMotion();

const DECK = document.documentElement.classList.contains('deck'); // deck.js draws the figure itself
if (!DECK && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const fig = document.querySelector('.ap-figure');
  if (fig) {
    const panels = fig.querySelectorAll('.ap-panel');
    const links = fig.querySelectorAll('.ap-link');
    const surface = fig.querySelector('.ap-surface-group');
    const tl = gsap.timeline({
      defaults: { ease: 'power1.inOut' },
      scrollTrigger: { trigger: fig, start: 'top 80%', once: true },
    });
    tl.fromTo(panels, { autoAlpha: 0, y: -8 }, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.04 }, 0);
    links.forEach((l, i) => {
      const len = l.getTotalLength ? l.getTotalLength() : 160;
      tl.fromTo(l, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.5 }, 0.5 + i * 0.03);
    });
    if (surface) tl.fromTo(surface, { autoAlpha: 0, scale: 0.96, transformOrigin: '50% 50%' }, { autoAlpha: 1, scale: 1, duration: 0.6 }, 1.0);
  }
}

// --- The rook: load three.js only when the chapter opener is near -----------
// A WebGL-less browser or a failed load leaves the opener as copy alone.
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
    piece.setAttribute('data-error', '');
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        import('../elements/glass-piece.js').catch(() => piece.setAttribute('data-error', ''));
      },
      { rootMargin: '800px 0px' },
    );
    io.observe(piece);
  }
}
