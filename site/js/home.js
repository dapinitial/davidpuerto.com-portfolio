// Homepage zoom-scroll — one GSAP code path for every browser.
// Replaces the pen's CSS scroll-driven animations (Chrome-only, per its own
// README) and its broken Safari fallbacks with ScrollTrigger: scrub + snap.
//
// Geometry note: each section's animation is split into IN and OUT triggers,
// both anchored at "section top hits viewport top" — the exact spot snap
// lands on. That keeps the section perfectly in view at rest on ANY viewport
// (iOS address-bar collapse makes viewport height !== section height, which
// is what broke the naive symmetric-range version).
import { gsap, ScrollTrigger } from './lib/gsap.js';

const root = document.documentElement;

// Safari renders blur bleed and shape-outside alpha tracing differently —
// a couple of treatments fork on this (Chrome keeps the full effect).
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
root.classList.toggle('is-safari', isSafari);

const sections = gsap.utils.toArray('.section');
const indicator = document.querySelector('.indicator');
const dots = gsap.utils.toArray('.indicator li');
const glows = gsap.utils.toArray('.glow i');

// Exact sRGB values of the per-section --color-highlight oklch palette
// (hex so GSAP interpolates cleanly) — same values as base.css fallbacks.
const SECTION_COLORS = ['#34c98b', '#fb836d', '#edb417', '#ab65c0', '#00a3bb', '#1277e1'];

// iOS address-bar collapse fires height-only resizes; refreshing mid-scroll
// would shift every trigger. Width changes (rotation) still refresh.
ScrollTrigger.config({ ignoreMobileResize: true });

const mm = gsap.matchMedia();

mm.add(
  {
    reduced: '(prefers-reduced-motion: reduce)',
    motion: '(prefers-reduced-motion: no-preference)',
    desktop: '(min-width: 64rem) and (pointer: fine)',
  },
  (ctx) => {
    const { reduced, desktop } = ctx.conditions;

    if (reduced) {
      // Plain document flow, everything readable, no motion.
      root.classList.remove('is-enhanced');
      return;
    }

    // The inline <head> script already added this pre-paint (no flash of
    // plain-flow content); re-adding covers matchMedia condition flips.
    // Clear its failsafe — we booted fine.
    clearTimeout(window.__enhanceFailsafe);
    root.classList.add('is-enhanced');

    // Crossing the desktop boundary mid-scroll can strand a half-blurred
    // frame from the outgoing context — strip filters when blur isn't ours.
    if (!desktop) {
      gsap.set(document.querySelectorAll('.section h2'), {
        clearProps: 'filter',
      });
    }

    // The pen's zoom-scroll keyframes ran with ease-in-out — content punches
    // into focus and holds. Linear scrub reads mushy; ease each phase instead.
    const EASE = 'power1.inOut';

    sections.forEach((section, i) => {
      const content = section.querySelector('.content');
      // Blur the hero elements — never .content itself (an ancestor filter
      // rasterizes the whole subtree, glass button included -> smudge).
      // Safari only: skip the IMG — its blur bleed renders as a ghost glow
      // there; Chrome keeps the full image+headline melt.
      const blurEls = desktop
        ? section.querySelectorAll(isSafari ? 'h2' : 'h2, .text img')
        : [];

      // IN: section top travels viewport bottom -> viewport top.
      // Ends at identity exactly where snap rests.
      const inTl = gsap.timeline({
        defaults: { ease: EASE },
        scrollTrigger: { trigger: section, start: 'top bottom', end: 'top top', scrub: true },
      });
      inTl.fromTo(
        content,
        { scale: 0, autoAlpha: 0 },
        // snap: quantizes the scrubbed value so rest lands on EXACTLY 1.0 —
        // a 0.999 scale leaves the layer permanently bitmap-blurred.
        { scale: 1, autoAlpha: 1, immediateRender: false, snap: { scale: 0.01 } },
        0,
      );
      if (blurEls.length) {
        inTl.fromTo(
          blurEls,
          { filter: 'blur(48px)' },
          { filter: 'blur(0px)', immediateRender: false },
          0,
        );
      }

      // OUT: section top leaves viewport top until section bottom exits.
      const outTl = gsap.timeline({
        defaults: { ease: EASE },
        scrollTrigger: { trigger: section, start: 'top top', end: 'bottom top', scrub: true },
      });
      outTl.fromTo(
        content,
        { scale: 1, autoAlpha: 1 },
        { scale: 1.5, autoAlpha: 0, immediateRender: false, snap: { scale: 0.01 } },
        0,
      );
      if (blurEls.length) {
        outTl.fromTo(
          blurEls,
          { filter: 'blur(0px)' },
          { filter: 'blur(32px)', immediateRender: false },
          0,
        );
      }

      // Background glow "pop": the section's accent color breathes with it.
      // Opacity-only on a static gradient layer — GPU-cheap everywhere.
      if (glows[i]) {
        gsap.fromTo(
          glows[i],
          { autoAlpha: 0 },
          {
            autoAlpha: 1,
            ease: EASE,
            immediateRender: false,
            scrollTrigger: { trigger: section, start: 'top bottom', end: 'top top', scrub: true },
          },
        );
        gsap.fromTo(
          glows[i],
          { autoAlpha: 1 },
          {
            autoAlpha: 0,
            ease: EASE,
            immediateRender: false,
            scrollTrigger: { trigger: section, start: 'top top', end: 'bottom top', scrub: true },
          },
        );
      }
    });

    // Snapping is native CSS scroll-snap (see home.css .is-enhanced) — the
    // pen's exact mechanics, supported everywhere. GSAP does visuals only.

    // --- Dot indicator (replaces @keyframes indicate) --------------------
    const travel = () =>
      dots.length > 1 ? dots[dots.length - 1].offsetTop - dots[0].offsetTop : 0;

    // Dot starts on section 1's coral and scrubs through the palette —
    // fromTo (not keyframes-from-current) so scroll position 0 is exact.
    gsap.set(indicator, { '--color-indicator': SECTION_COLORS[0] });
    gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: 'main',
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        invalidateOnRefresh: true,
      },
    })
      .fromTo(indicator, { '--indicator-y': '0px' }, { '--indicator-y': () => `${travel()}px`, duration: 1 }, 0)
      .to(
        indicator,
        { keyframes: SECTION_COLORS.slice(1).map((c) => ({ '--color-indicator': c })), duration: 1 },
        0,
      );

    // --- Zillow finale: the dot takes the shot ---------------------------
    // Arriving at Zillow: the traveling dot becomes a 🏀, drops through a
    // mini hoop (net swoosh included), the confetti burst is the crowd, and
    // the ball settles back in as the Zillow-blue dot.
    const lastDot = dots[dots.length - 1];
    const BURST_COLORS = [...SECTION_COLORS, '#ffffff', '#fb836d'];
    let lastBurst = 0;

    const burst = () => {
      const ring = document.createElement('span');
      ring.className = 'burst-particle';
      ring.style.cssText = 'width:12px;height:12px;border:2px solid #1277e1;';
      lastDot.appendChild(ring);
      ring
        .animate(
          [
            { transform: 'scale(0.3)', opacity: 1 },
            { transform: 'scale(3.5)', opacity: 0 },
          ],
          { duration: 500, easing: 'ease-out' },
        )
        .finished.then(() => ring.remove(), () => ring.remove());

      BURST_COLORS.forEach((color, i, all) => {
        const particle = document.createElement('span');
        particle.className = 'burst-particle';
        particle.style.background = color;
        lastDot.appendChild(particle);

        const angle = (i / all.length) * 2 * Math.PI - Math.PI / 2;
        const distance = 22 + (i % 2) * 8;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;

        particle
          .animate(
            [
              { transform: 'translate(0, 0) scale(1)', opacity: 1 },
              { transform: `translate(${x}px, ${y}px) scale(0.2)`, opacity: 0 },
            ],
            { duration: 600, easing: 'cubic-bezier(0.16, 0.8, 0.4, 1)' },
          )
          .finished.then(() => particle.remove(), () => particle.remove());
      });
    };

    const slam = () => {
      const now = Date.now();
      if (now - lastBurst < 2500) return; // cooldown — no spam on snap jitter
      lastBurst = now;

      indicator.classList.add('dunking'); // dot -> 🏀, spins into its ring
      setTimeout(() => {
        burst(); // swish
        setTimeout(() => indicator.classList.remove('dunking'), 350); // -> blue dot
      }, 650);
    };

    ScrollTrigger.create({
      trigger: sections[sections.length - 1],
      start: 'top 60%',
      onEnter: slam,
      onEnterBack: slam,
    });

    // Indicator clicks: native anchors + CSS scroll-behavior: smooth — no JS needed.

    return () => {
      // matchMedia cleanup when conditions flip (e.g. user toggles reduced motion)
      root.classList.remove('is-enhanced');
    };
  },
);

// In reserve for real-device testing: ScrollTrigger.normalizeScroll(true)
// fixes some iOS overscroll quirks but hijacks touch events — opt in only
// if the device test shows jank.
