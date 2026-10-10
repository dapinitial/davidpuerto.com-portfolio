// Shared motion for the chapter frame every case study carries:
// counters, the five beats, chapter headings, the readings figure, the reel.
// Same GSAP runtime the homepage uses. Every effect ends at the element's
// resting state, so reduced motion (or no JS) simply shows that state.
import { gsap, ScrollTrigger } from '../lib/gsap.js';

export function initChapterMotion() {
  if (document.documentElement.classList.contains('deck')) return; // deck.js owns the screen
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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

}
