// <site-preloader> — the main page loader: LOADING wordmark with gradient
// sweep, percentage crawl to ~42% then zip to 100%, GSAP exit sequence.
// Shows once per session (sessionStorage) and never for reduced-motion.
// Pair with css/elements/site-preloader.css.
import { gsap } from '../lib/gsap.js';

const SESSION_KEY = 'dp-preloaded';

class SitePreloader extends HTMLElement {
  #tl;

  connectedCallback() {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Plays on every load (original behavior). Add the `once` attribute to
    // limit it to once per browser session instead.
    const skip = this.hasAttribute('once') && sessionStorage.getItem(SESSION_KEY);
    if (reduced || skip) {
      document.documentElement.classList.remove('is-covered');
      this.remove();
      return;
    }
    sessionStorage.setItem(SESSION_KEY, '1');

    this.innerHTML = `
      <div class="preloader-wrap" role="status" aria-label="Loading">
        <div class="outer">
          <div class="percentage-wrapper">
            <div class="percentage">0%</div>
          </div>
          <div class="preloader-intro">
            <div class="loadbar"></div>
            <span class="loading-text">LOADING</span>
          </div>
        </div>
        <div class="percentage-intro">
          <h5>deep breath</h5>
          Deepest breaths... content is loading.
        </div>
      </div>`;

    const bar = this.querySelector('.loadbar');
    const pct = this.querySelector('.percentage');
    const text = this.querySelector('.loading-text');
    const wrap = this.querySelector('.preloader-wrap');

    // One tweened progress value renders bar + gradient + percentage in
    // lockstep — fully interpolated, no stair-steps. Crawl to ~42%, breathe,
    // zip to 100, exit.
    const state = { p: 0 };
    const render = () => {
      pct.textContent = `${Math.round(state.p)}%`;
      bar.style.width = `${state.p}%`;
      text.style.backgroundPosition = `${100 - state.p}% 0`;
    };

    this.#tl = gsap
      .timeline()
      .to(state, { p: 42, duration: 1.1, ease: 'power1.inOut', onUpdate: render })
      .to(state, { p: 100, duration: 0.5, ease: 'power2.inOut', onUpdate: render }, '+=0.3')
      .add(() => this.#exit(bar, text, pct, wrap));
  }

  #exit(bar, text, pct, wrap) {
    // Lift the pre-paint cover — the preloader itself still covers, and its
    // fade is what reveals the page.
    document.documentElement.classList.remove('is-covered');
    // The CSS entrance animation fills forwards, and animations beat inline
    // styles — clear it or the fade tween below is silently ignored and the
    // overlay pops off instead of fading.
    wrap.style.animation = 'none';
    gsap
      .timeline({ onComplete: () => this.remove() })
      .to(bar, { width: '100%', duration: 0.3, ease: 'power2.out' })
      .to(text, { width: 0, duration: 0.3, ease: 'power4.out' })
      .to(pct, { y: -50, opacity: 0, duration: 0.3, ease: 'power2.inOut' }, '-=0.2')
      .to(wrap, { opacity: 0, duration: 0.8, ease: 'power2.inOut' });
  }

  disconnectedCallback() {
    this.#tl?.kill();
  }
}

customElements.define('site-preloader', SitePreloader);
