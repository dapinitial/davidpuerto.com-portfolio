// <list-rotator> — a 3D "drum" of list items rotated by scroll (port of
// components/listRotator). Markup:
//   <list-rotator>
//     <ul>
//       <li>Zero setup</li>
//       <li><em>Lowers barrier of entry</em></li>
//       ...
//     </ul>
//   </list-rotator>
// Light DOM. GSAP-scrubbed; renders a static list under
// prefers-reduced-motion. Pair with css/elements/list-rotator.css.
import { gsap, ScrollTrigger } from '../lib/gsap.js';

class ListRotator extends HTMLElement {
  #ctx;
  #ac;

  connectedCallback() {
    const list = this.querySelector('ul');
    if (!list || list.parentElement.classList.contains('pin')) return;

    const pin = document.createElement('div');
    pin.className = 'pin';
    this.insertBefore(pin, list);
    pin.append(list);

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.classList.add('static');
      return;
    }

    const items = [...list.children];
    if (!items.length) return;
    const totalItems = items.length - 1;
    const angleIncrement = 180 / totalItems;

    this.#ac = new AbortController();

    this.#ctx = gsap.context(() => {
      const setProperties = () => {
        // Keep wrapper, pin and rotator at viewport height (old behavior).
        gsap.set([this, pin, list], { height: window.innerHeight });
        ScrollTrigger.refresh();
      };

      gsap.set(list, { rotationX: -90 });
      setProperties();
      window.addEventListener('resize', setProperties, { signal: this.#ac.signal });

      items.forEach((item, index) => {
        const rotationAngle = index * angleIncrement;
        const fontSize = gsap.getProperty(item, 'fontSize');
        const lineHeight = gsap.getProperty(item, 'lineHeight') * 2.2;
        const translateZ = (parseFloat(fontSize) + parseFloat(lineHeight)) * 1.8;

        gsap.set(item, {
          transformOrigin: 'center center 0',
          transform: `rotateX(${-rotationAngle}deg) translateZ(${translateZ}px)`,
          zIndex: totalItems - index,
        });
      });

      gsap.to(list, {
        scrollTrigger: {
          trigger: this,
          start: 'top +=' + window.innerHeight * 0.8,
          end: '+=' + window.innerHeight * 3.5,
          scrub: true,
        },
        rotationX: 285,
      });
    }, this);
  }

  disconnectedCallback() {
    this.#ac?.abort();
    this.#ctx?.revert();
  }
}

customElements.define('list-rotator', ListRotator);
