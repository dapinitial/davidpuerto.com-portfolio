// <clipped-image image="/images/x.jpg" video="/images/y.mov"> — a circular
// clip-path that expands to full frame as you scroll, GSAP-pinned.
// Light DOM. Pair with css/elements/clipped-image.css.
import { gsap, ScrollTrigger } from '../lib/gsap.js';

class ClippedImage extends HTMLElement {
  #ctx;

  connectedCallback() {
    const image = this.getAttribute('image');
    const video = this.getAttribute('video');

    this.innerHTML = `
      <div class="ci-wrapper">
        <div class="ci-pin">
          <div class="ci-media">
            ${image ? `<img src="${image}" alt="" />` : ''}
            ${
              video
                ? `<div class="ci-video"><video autoplay loop muted playsinline>
                     <source src="${video}" type="video/mp4" /></video></div>`
                : ''
            }
            <div class="ci-gradient"></div>
          </div>
        </div>
        <div class="ci-content"></div>
      </div>`;

    const pin = this.querySelector('.ci-pin');
    const media = this.querySelector('.ci-media');
    const gradient = this.querySelector('.ci-gradient');
    const content = this.querySelector('.ci-content');

    this.#ctx = gsap.context(() => {
      gsap.set(content, { paddingTop: Math.min(window.innerHeight / 2, 300) });
      gsap.set(gradient, { height: Math.min(window.innerHeight * 0.3, 200) });

      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.set(media, { clipPath: 'circle(75%)' });
        return;
      }

      gsap.to(gradient, {
        scrollTrigger: { trigger: pin, start: 'top top', end: () => `+=${content.offsetHeight || window.innerHeight}`, scrub: true },
        opacity: 1,
        y: 1,
      });

      gsap.to(media, {
        scrollTrigger: {
          trigger: pin,
          start: 'top top',
          end: () => `+=${content.offsetHeight || window.innerHeight}`,
          scrub: 1,
          pin: true,
          pinSpacing: false,
        },
        clipPath: 'circle(75%)',
        ease: 'none',
      });
    }, this);
  }

  disconnectedCallback() {
    this.#ctx?.revert();
    this.replaceChildren();
  }
}

customElements.define('clipped-image', ClippedImage);
