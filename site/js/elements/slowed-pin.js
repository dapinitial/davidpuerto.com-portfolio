// <slowed-pin> — a pinned headline that drifts down the page while a long
// column of testimonial screenshots scrolls past it (port of
// components/slowedPin). Markup:
//   <slowed-pin
//     pinned-text="Last word. ..."
//     total="45"
//     base-path="/images/case-studies/facebook/testimonials/"></slowed-pin>
// Renders total images named test1.jpg..testN.jpg from base-path,
// alternating left/right. Static under prefers-reduced-motion.
// Pair with css/elements/slowed-pin.css.
import { gsap } from '../lib/gsap.js';

class SlowedPin extends HTMLElement {
  #ctx;

  connectedCallback() {
    const total = Number(this.getAttribute('total') ?? 45);
    const basePath = this.getAttribute('base-path') ?? '';
    const pinnedText = this.getAttribute('pinned-text') ?? 'Testimonials';

    const images = Array.from(
      { length: total },
      (_, i) => `
        <div class="sp-image ${i % 2 === 0 ? 'align-left' : 'align-right'}">
          <img src="${basePath}test${i + 1}.jpg" alt="Testimonial ${i + 1}" loading="lazy">
        </div>`,
    ).join('');

    this.innerHTML = `
      <div class="sp-text"><h2></h2></div>
      <div class="sp-images">${images}</div>`;
    this.querySelector('.sp-text h2').textContent = pinnedText;

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.classList.add('static');
      return;
    }

    const slowedText = this.querySelector('.sp-text');
    const imagesWrap = this.querySelector('.sp-images');
    const slowedImages = this.querySelectorAll('.sp-image img');

    this.#ctx = gsap.context(() => {
      // Fade in the pinned text.
      gsap.fromTo(
        slowedText,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.5,
          scrollTrigger: {
            trigger: this,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        },
      );

      // Pin the text and let it drift down for the height of the column.
      // invalidateOnRefresh: the 45 testimonial images lazy-load, so the
      // column height (and thus the drift distance) grows after init.
      gsap.to(slowedText, {
        scrollTrigger: {
          trigger: slowedText,
          scrub: true,
          pin: true,
          start: 'top top',
          end: () => `+=${imagesWrap.offsetHeight}`,
          invalidateOnRefresh: true,
        },
        y: () => window.innerHeight - slowedText.offsetHeight,
      });

      // Fade the text out 2000px from the bottom of the page.
      gsap.to(slowedText, {
        opacity: 0,
        scrollTrigger: {
          trigger: this,
          start: () => `top+=${document.body.scrollHeight - window.innerHeight - 2000}`,
          end: '+=200',
          scrub: true,
        },
      });

      // Each screenshot settles into place as it enters the viewport.
      slowedImages.forEach((sImage) => {
        gsap.to(sImage, {
          scrollTrigger: {
            trigger: sImage,
            scrub: true,
            start: 'top 100%',
          },
          scale: 1,
          y: 0,
        });
      });
    }, this);
  }

  disconnectedCallback() {
    this.#ctx?.revert();
    this.replaceChildren();
  }
}

customElements.define('slowed-pin', SlowedPin);
