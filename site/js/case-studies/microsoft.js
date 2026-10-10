// Microsoft case study — motion for the chapter frame + the 2026 chapter.
// Same GSAP runtime the homepage uses (lib/gsap.js registers ScrollTrigger).
// Every effect ends at the element's resting state, so with reduced motion
// (or no JS) the page simply shows that state.
import { gsap, ScrollTrigger } from '../lib/gsap.js';

if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const EASE = 'power1.inOut';

  // --- Counters: the executive numbers count up once, when they arrive ----
  document.querySelectorAll('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count);
    const state = { n: 0 };
    el.textContent = '0';
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () =>
        gsap.to(state, {
          n: target,
          duration: 1.4,
          ease: 'power2.out',
          onUpdate: () => {
            el.textContent = String(Math.round(state.n));
          },
          onComplete: () => {
            el.textContent = String(target);
          },
        }),
    });
  });

  // --- The five beats: numeral comes in from a blur, copy rises -----------
  document.querySelectorAll('.ms-beat').forEach((beat) => {
    const n = beat.querySelector('.ms-beat-n');
    const body = beat.querySelector('.ms-beat-body');
    gsap
      .timeline({
        defaults: { ease: EASE },
        scrollTrigger: { trigger: beat, start: 'top 90%', end: 'top 68%', scrub: true },
      })
      .fromTo(n, { filter: 'blur(14px)', scale: 1.25, autoAlpha: 0 }, { filter: 'blur(0px)', scale: 1, autoAlpha: 1 }, 0)
      .fromTo(body, { y: 28, autoAlpha: 0 }, { y: 0, autoAlpha: 1 }, 0);
  });

  // --- Chapter headings: blur-to-sharp, like the homepage h2s -------------
  document.querySelectorAll('.ms-chapter > header h2, .ms-chapter .ms-close').forEach((h) => {
    gsap.fromTo(
      h,
      { filter: 'blur(18px)', autoAlpha: 0, y: 16 },
      {
        filter: 'blur(0px)',
        autoAlpha: 1,
        y: 0,
        ease: EASE,
        scrollTrigger: { trigger: h, start: 'top 92%', end: 'top 68%', scrub: true },
      },
    );
  });

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
