// Nordstrom case study — the shared chapter motion (counters, beats, headings)
// plus the results graph, whose expected and actual lines draw in. In the deck,
// deck.js draws them as ink when their slide arrives; in the long read they scrub
// with the scroll, the port of the old React useEffect.
import { gsap } from '../lib/gsap.js';
import { initChapterMotion } from './chapter-motion.js';

initChapterMotion();

const DECK = document.documentElement.classList.contains('deck'); // deck.js draws the graph itself
const lines = document.querySelectorAll('.graph-section .expected-line, .graph-section .actual-line');

if (!DECK && lines.length && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  gsap.set(lines, { strokeDasharray: 1000, strokeDashoffset: 1000 });

  for (const line of lines) {
    gsap.to(line, {
      strokeDashoffset: 0,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: line,
        start: 'top 80%',
        end: 'bottom 60%',
        scrub: true,
      },
    });
  }
}

// --- The knight: load three.js only when the chapter opener is near ---------
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
