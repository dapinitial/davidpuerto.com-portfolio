// <reveal-gallery> — fixed center image with two side images that fan out
// (rotate + slide) as you scroll (port of components/revealGallery). Markup:
//   <reveal-gallery
//     left="/images/a.jpg"
//     fixed="/images/b.jpg"
//     right="/images/c.jpg"></reveal-gallery>
// Light DOM. GSAP-scrubbed; static collage under prefers-reduced-motion.
// Pair with css/elements/reveal-gallery.css.
import { gsap } from '../lib/gsap.js';

class RevealGallery extends HTMLElement {
  #ctx;
  #ac;

  connectedCallback() {
    const left = this.getAttribute('left') ?? '';
    const fixed = this.getAttribute('fixed') ?? '';
    const right = this.getAttribute('right') ?? '';

    this.innerHTML = `
      <div class="reveal-img"><img src="${left}" alt="Left Reveal" loading="lazy"></div>
      <div class="reveal-img-fixed"><img src="${fixed}" alt="Fixed Reveal" loading="lazy"></div>
      <div class="reveal-img"><img src="${right}" alt="Right Reveal" loading="lazy"></div>`;

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.classList.add('static');
      return;
    }

    const imgFixed = this.querySelector('.reveal-img-fixed');
    const panels = this.querySelectorAll('.reveal-img');
    const [imgRotateLeft, imgRotateRight] = panels;

    this.#ac = new AbortController();
    const { signal } = this.#ac;

    this.#ctx = gsap.context(() => {
      gsap.set([imgRotateLeft, imgRotateRight], { left: '50%', xPercent: -50 });

      const setImgProperties = () => {
        gsap.set(imgRotateLeft, { x: -imgFixed.offsetWidth * 0.35, height: this.offsetHeight, scale: 0.9 });
        gsap.set(imgRotateRight, { x: imgFixed.offsetWidth * 0.35, height: this.offsetHeight, scale: 0.9 });
      };
      setImgProperties();

      window.addEventListener('resize', setImgProperties, { signal });
      // Re-measure once images have real dimensions.
      for (const img of this.querySelectorAll('img')) {
        if (!img.complete) img.addEventListener('load', setImgProperties, { once: true, signal });
      }

      gsap.to(imgRotateLeft, {
        scrollTrigger: {
          trigger: this,
          scrub: true,
          start: 'top 100%',
          end: () => `+=${this.offsetHeight + window.innerHeight}`,
          invalidateOnRefresh: true,
        },
        x: () => -imgFixed.offsetWidth * 0.65,
        rotation: -12,
      });

      gsap.to(imgRotateRight, {
        scrollTrigger: {
          trigger: this,
          scrub: true,
          start: 'top 100%',
          end: () => `+=${this.offsetHeight + window.innerHeight}`,
          invalidateOnRefresh: true,
        },
        x: () => imgFixed.offsetWidth * 0.65,
        rotation: 12,
      });
    }, this);
  }

  disconnectedCallback() {
    this.#ac?.abort();
    this.#ctx?.revert();
    this.replaceChildren();
  }
}

customElements.define('reveal-gallery', RevealGallery);
