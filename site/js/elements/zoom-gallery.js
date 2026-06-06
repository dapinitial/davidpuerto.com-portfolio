// <zoom-gallery> — three-up gallery whose center image pins and zooms to
// 3.5x while the side images fade back (port of components/zoomGallery).
// Markup (imgs as children; the SECOND image is the zoom center):
//   <zoom-gallery height-ratio="0.6">
//     <img src="/images/a.png" alt="...">
//     <img src="/images/b.png" alt="...">
//     <img src="/images/c.png" alt="...">
//   </zoom-gallery>
// height-ratio: gallery height as a fraction of the center item width
// (default 0.6). Static under prefers-reduced-motion.
// Pair with css/elements/zoom-gallery.css.
import { gsap } from '../lib/gsap.js';

class ZoomGallery extends HTMLElement {
  #ctx;

  connectedCallback() {
    const imgs = [...this.querySelectorAll(':scope > img')];
    if (!imgs.length) return;

    const heightRatio = Number(this.getAttribute('height-ratio') ?? 0.6);

    const wrapper = document.createElement('ul');
    wrapper.className = 'zoom-wrapper';
    imgs.forEach((img, index) => {
      const li = document.createElement('li');
      if (index === 1) li.className = 'zoom-center';
      const imgWrapper = document.createElement('div');
      imgWrapper.className = 'zoom-img-wrapper';
      imgWrapper.append(img);
      li.append(imgWrapper);
      wrapper.append(li);
    });
    const thumb = document.createElement('div');
    thumb.className = 'zoom-thumb';
    this.append(wrapper, thumb);

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.classList.add('static');
      return;
    }

    const centerItem = this.querySelector('.zoom-center .zoom-img-wrapper');
    const sideItems = this.querySelectorAll('li:not(.zoom-center) .zoom-img-wrapper');

    this.#ctx = gsap.context(() => {
      gsap.set(wrapper, { height: centerItem.offsetWidth * heightRatio });
      gsap.set(thumb, {
        top: -((window.innerHeight - centerItem.offsetWidth * heightRatio) / 2),
        height: window.innerHeight,
      });

      gsap.to(centerItem, {
        scale: 3.5,
        duration: 1.5,
        ease: 'power1.inOut',
        scrollTrigger: {
          trigger: wrapper,
          start: 'top center',
          end: 'bottom top',
          scrub: true,
          pin: true,
        },
      });

      gsap.to(sideItems, {
        scale: 0.8,
        opacity: 0,
        ease: 'power1.inOut',
        scrollTrigger: {
          trigger: wrapper,
          start: 'top center',
          end: 'bottom top',
          scrub: true,
        },
      });
    }, this);
  }

  disconnectedCallback() {
    this.#ctx?.revert();
  }
}

customElements.define('zoom-gallery', ZoomGallery);
