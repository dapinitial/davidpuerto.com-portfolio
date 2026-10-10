// Microsoft case study — page-specific motion on top of the shared chapter
// frame: the pinned four-generations figure, expand-all, and the knight.
import { gsap, ScrollTrigger } from '../lib/gsap.js';
import { initChapterMotion } from './chapter-motion.js';

initChapterMotion();

const DECK = document.documentElement.classList.contains('deck');

if (!DECK && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const EASE = 'power1.inOut';
  // --- Pinned narration: the figure is CSS-sticky; each beat lights its node
  const pin = document.querySelector('.ms-pin');
  if (pin) {
    const nodes = pin.querySelectorAll('.ms-gen');
    const links = pin.querySelectorAll('.ms-gen-link');
    const light = (idx) => {
      nodes.forEach((g, i) => g.classList.toggle('is-active', i === idx));
      links.forEach((l, i) => l.classList.toggle('is-active', i < idx));
    };
    pin.querySelectorAll('.ms-pin-beat').forEach((beat) => {
      const idx = Number(beat.dataset.node);
      ScrollTrigger.create({
        trigger: beat,
        start: 'top 62%',
        end: 'bottom 38%',
        onEnter: () => light(idx),
        onEnterBack: () => light(idx),
      });
      gsap.fromTo(
        beat,
        { autoAlpha: 0.25, y: 20 },
        {
          autoAlpha: 1,
          y: 0,
          ease: EASE,
          scrollTrigger: { trigger: beat, start: 'top 85%', end: 'top 60%', scrub: true },
        },
      );
    });
    // The links draw themselves as the section is scrolled through.
    links.forEach((l) => {
      const len = l.getTotalLength ? l.getTotalLength() : 200;
      gsap.fromTo(
        l,
        { strokeDasharray: len, strokeDashoffset: len },
        {
          strokeDashoffset: 0,
          ease: 'none',
          scrollTrigger: { trigger: pin, start: 'top 60%', end: 'bottom 70%', scrub: true },
        },
      );
    });
  }

  // --- One record, five readings: arrows draw, readers fade in, hub first --
  const fig = document.querySelector('.ms-figure');
  if (fig) {
    const linksF = fig.querySelectorAll('.link');
    const readers = fig.querySelectorAll('.node:not(.hub)');
    const tl = gsap.timeline({
      defaults: { ease: EASE },
      scrollTrigger: { trigger: fig, start: 'top 80%', once: true },
    });
    tl.fromTo(fig.querySelector('.node.hub'), { autoAlpha: 0, y: -12 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 0);
    linksF.forEach((l, i) => {
      const len = l.getTotalLength ? l.getTotalLength() : 120;
      tl.fromTo(l, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.5 }, 0.3 + i * 0.08);
    });
    tl.fromTo(readers, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.08 }, 0.6);
  }

  // --- Reel: a gentle settle as it comes into view -------------------------
  const reel = document.querySelector('.ms-reel video');
  if (reel) {
    gsap.fromTo(
      reel,
      { scale: 0.96, autoAlpha: 0.6 },
      {
        scale: 1,
        autoAlpha: 1,
        ease: EASE,
        snap: { scale: 0.01 }, // rest at exactly 1.0 — a 0.99 layer stays bitmap-soft
        scrollTrigger: { trigger: reel, start: 'top 85%', end: 'top 50%', scrub: true },
      },
    );
  }
}

// --- Progressive disclosure: one control opens every reading and stage ------
// Works with or without motion; it is plain <details>.
const expandAll = document.querySelector('[data-expand-all]');
if (expandAll) {
  const all = () => document.querySelectorAll('.ms-chapter details');
  expandAll.addEventListener('click', () => {
    const open = expandAll.getAttribute('aria-expanded') !== 'true';
    all().forEach((d) => { d.open = open; });
    expandAll.setAttribute('aria-expanded', String(open));
    expandAll.textContent = open ? 'Collapse everything' : 'Expand everything';
    // Images landed and heights changed: let the scroll triggers re-measure.
    ScrollTrigger.refresh();
  });
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
