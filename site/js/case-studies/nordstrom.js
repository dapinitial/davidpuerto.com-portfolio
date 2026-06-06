// Nordstrom case study — scroll-scrubbed line draw for the results graph.
// Port of the old React useEffect (expectedLineRef/actualLineRef + GSAP).
import { gsap, ScrollTrigger } from '../lib/gsap.js';

const lines = document.querySelectorAll('.graph-section .expected-line, .graph-section .actual-line');

if (lines.length) {
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
