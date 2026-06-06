// <scroll-progress> — circular scroll-progress ring that doubles as a
// scroll-to-top button. Fades in after 50px of scroll; the ring's stroke
// tracks how far down the page you are.
// Light DOM, zero deps. Pair with css/elements/scroll-progress.css.

class ScrollProgress extends HTMLElement {
  #ac;

  connectedCallback() {
    this.innerHTML = `
      <button type="button" class="progress-wrap" aria-label="Scroll back to top">
        <svg class="progress-circle" width="100%" height="100%" viewBox="-1 -1 102 102" aria-hidden="true">
          <path d="M50,1 a49,49 0 0,1 0,98 a49,49 0 0,1 0,-98"
            stroke="url(#scrollProgressGradient)" stroke-width="4" fill="none" />
          <linearGradient id="scrollProgressGradient" x1="0%" y1="0%" x2="100%">
            <stop offset="0%" stop-color="#dadada" />
            <stop offset="100%" stop-color="#fff" />
          </linearGradient>
        </svg>
      </button>`;

    const wrap = this.querySelector('.progress-wrap');
    const path = this.querySelector('.progress-circle path');
    const pathLength = path.getTotalLength();

    path.style.strokeDasharray = `${pathLength} ${pathLength}`;
    path.style.strokeDashoffset = pathLength;
    path.style.transition = 'stroke-dashoffset 10ms linear';

    this.#ac = new AbortController();
    const { signal } = this.#ac;

    const onScroll = () => {
      const height = document.documentElement.scrollHeight - window.innerHeight;
      wrap.classList.toggle('visible', window.scrollY > 50);
      if (height > 0) {
        path.style.strokeDashoffset = pathLength - (window.scrollY * pathLength) / height;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true, signal });
    wrap.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }), {
      signal,
    });
    onScroll();
  }

  disconnectedCallback() {
    this.#ac?.abort();
    this.replaceChildren();
  }
}

customElements.define('scroll-progress', ScrollProgress);
