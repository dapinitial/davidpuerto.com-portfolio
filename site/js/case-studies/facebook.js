// Facebook (FBIDE "Lyric") case study — page-specific elements + the bespoke
// GSAP timelines from the old +Page.jsx useEffects/hooks:
//   clientLayout/hero pin-reveal, useSplitTextAnimation (more-info),
//   useFadeInOutAnimation (breakdown columns), useScrollScale (so-why row),
//   usePinnedScroll (initial scribble) and the caseStudyFooter reveal.
import '../elements/list-rotator.js';
import '../elements/accordion-list.js';
import '../elements/marquee-scroller.js';
import '../elements/image-compare.js';
import '../elements/reveal-gallery.js';
import '../elements/moving-gallery.js';
import '../elements/zoom-gallery.js';
import '../elements/slowed-pin.js';
import { gsap } from '../lib/gsap.js';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  // Hero: pinned clip-path reveal (clientLayout/hero useEffect).
  const hero = document.querySelector('.hero');
  if (hero) {
    const heroImage = hero.querySelector('.hero-image');
    const heroContent = hero.querySelector('.hero-content');

    gsap
      .timeline({
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: '+=80%',
          scrub: 0.5,
          pin: true,
          pinSpacing: false,
        },
      })
      .fromTo(
        heroImage,
        { clipPath: 'inset(0 35vw 0 35vw)', scale: 0.7 },
        { clipPath: 'inset(0 0 0 0)', scale: 1, ease: 'power2.inOut', duration: 0.7 },
      )
      .fromTo(
        heroContent,
        { y: '80%', opacity: 0 },
        { y: '0%', opacity: 1, ease: 'power1.out', duration: 1.0 },
        '-=0.5',
      );
  }

  // "In 2014 I joined..." — scrubbed per-character reveal (useSplitTextAnimation).
  const moreInfo = document.querySelector('.more-info .column');
  if (moreInfo) {
    const splitText = new SplitText(moreInfo, { type: 'words, chars' });
    gsap.fromTo(
      splitText.chars,
      { opacity: 0.2 },
      {
        opacity: 0.99,
        stagger: 0.05,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: moreInfo,
          start: 'top 100%',
          end: 'bottom 80%',
          scrub: true,
        },
      },
    );
  }

  // Breakdown-of-role columns — scrubbed fade in/out (useFadeInOutAnimation).
  for (const column of document.querySelectorAll('.breakdown-of-role > .column')) {
    gsap.fromTo(
      column,
      { opacity: 0 },
      {
        opacity: 1,
        scrollTrigger: {
          trigger: column,
          start: 'top 80%',
          end: 'bottom 20%',
          scrub: 1,
        },
      },
    );
  }

  // "[ So... Why an IDE in the browser?]" row — scroll scale (useScrollScale(.7, 1)).
  const soWhy = document.querySelector('.so-why-container');
  if (soWhy) {
    gsap.fromTo(
      soWhy,
      { scale: 0.7 },
      {
        scale: 1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: soWhy,
          start: 'top 50%',
          end: 'bottom 100%',
          scrub: 1,
          invalidateOnRefresh: true,
        },
      },
    );
  }

  // Initial scribble — pin the copy column alongside the tall whiteboard
  // photo (usePinnedScroll, templateOffset 360).
  const scribbleCopy = document.querySelector('.initial-scribble .scribble-copy');
  const scribblePinned = document.querySelector('.initial-scribble .pinned-column');
  if (scribbleCopy && scribblePinned) {
    const containerHeight = scribblePinned.offsetHeight;
    gsap.timeline({
      scrollTrigger: {
        trigger: scribbleCopy,
        start: `top top+=${containerHeight}`,
        end: () => `+=${containerHeight - 360}`,
        pin: scribbleCopy,
        pinSpacing: false,
        scrub: true,
      },
    });
  }

  // "The End" footer reveal (caseStudyFooter useEffect).
  const footer = document.querySelector('.case-study-footer');
  if (footer) {
    const titleSpans = footer.querySelectorAll('.next-hero-title span');
    const subtitleSpan = footer.querySelector('.next-hero-subtitle span');

    gsap.fromTo(
      footer,
      { opacity: 0 },
      {
        opacity: 1,
        duration: 0.6,
        ease: 'power2.inOut',
        scrollTrigger: {
          trigger: footer,
          start: 'top 90%',
          toggleActions: 'play none none reverse',
        },
      },
    );

    gsap.fromTo(
      titleSpans,
      { y: 80, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.3,
        ease: 'power2.inOut',
        stagger: 0.05,
        scrollTrigger: {
          trigger: footer,
          start: 'top 90%',
          toggleActions: 'play none none reverse',
        },
      },
    );

    gsap.fromTo(
      subtitleSpan,
      { y: 40, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.3,
        ease: 'power2.inOut',
        delay: 0.15,
        scrollTrigger: {
          trigger: footer,
          start: 'top 90%',
          toggleActions: 'play none none reverse',
        },
      },
    );
  }
}
