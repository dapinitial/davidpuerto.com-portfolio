// <moving-gallery> — horizontal strip of images that pans with the scroll
// (port of components/movingGallery). Markup (imgs as children):
//   <moving-gallery direction="forwards">
//     <img src="/images/a.jpg" alt="..." loading="lazy">
//     <img src="/images/b.jpg" alt="..." loading="lazy">
//   </moving-gallery>
// direction: forwards (right→left) | backwards. Static under
// prefers-reduced-motion. Pair with css/elements/moving-gallery.css.
import { gsap } from '../lib/gsap.js';

class MovingGallery extends HTMLElement {
  #ctx;

  connectedCallback() {
    const imgs = [...this.querySelectorAll(':scope > img')];
    if (!imgs.length) return;

    const wrapper = document.createElement('ul');
    for (const img of imgs) {
      const li = document.createElement('li');
      li.append(img);
      wrapper.append(li);
    }
    this.append(wrapper);

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const isForward = (this.getAttribute('direction') ?? 'forwards') === 'forwards';

    this.#ctx = gsap.context(() => {
      const [xStart, xEnd] = isForward
        ? [0, -wrapper.scrollWidth + this.offsetWidth]
        : [-wrapper.scrollWidth + this.offsetWidth, 0];

      gsap.fromTo(
        wrapper,
        { x: xStart },
        {
          x: xEnd,
          scrollTrigger: {
            trigger: this,
            scrub: 0.5,
          },
        },
      );
    }, this);
  }

  disconnectedCallback() {
    this.#ctx?.revert();
  }
}

customElements.define('moving-gallery', MovingGallery);
