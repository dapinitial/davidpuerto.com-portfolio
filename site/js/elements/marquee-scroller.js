// <marquee-scroller> — full-bleed text marquee whose travel direction flips
// with the scroll direction (port of components/marqueeScroller). Markup:
//   <marquee-scroller direction="forwards">
//     <h2><span><em>Testimonials.</em> &nbsp;</span><span>Staying Informed. &nbsp;</span></h2>
//   </marquee-scroller>
// The element clones the <h2> once for a seamless loop (the old React
// component rendered a duplicate but only animated the first copy, which
// left a visible gap — this port animates both copies for a true loop).
// Static under prefers-reduced-motion. Pair with css/elements/marquee-scroller.css.
import { gsap, ScrollTrigger } from '../lib/gsap.js';

class MarqueeScroller extends HTMLElement {
  #ctx;

  connectedCallback() {
    const text = this.querySelector('h2');
    if (!text || this.querySelectorAll('h2').length > 1) return;

    this.append(text.cloneNode(true));

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const isForward = (this.getAttribute('direction') ?? 'forwards') === 'forwards';
    const copies = this.querySelectorAll('h2');

    this.#ctx = gsap.context(() => {
      const marqueeAnim = gsap.fromTo(
        copies,
        { xPercent: isForward ? 0 : -100 },
        { xPercent: isForward ? -100 : 0, duration: 20, ease: 'none', repeat: -1 },
      );

      // Scroll direction drives the timeScale (down = forwards, up = reverse).
      ScrollTrigger.create({
        onUpdate(self) {
          gsap.to(marqueeAnim, { timeScale: self.direction === 1 ? 1 : -1, overwrite: true });
        },
      });
    }, this);
  }

  disconnectedCallback() {
    this.#ctx?.revert();
  }
}

customElements.define('marquee-scroller', MarqueeScroller);
