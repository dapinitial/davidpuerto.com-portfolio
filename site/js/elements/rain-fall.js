// <rain-fall> — ambient falling drips with splash rings.
//   <rain-fall></rain-fall>                    section-scale rain
//   <rain-fall fullpage max-drips="20"></rain-fall>   full-viewport rain
// Light DOM, zero deps. Pair with css/elements/rain-fall.css.

class RainFall extends HTMLElement {
  #raf;
  #lastDrip = 0;

  connectedCallback() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.#raf = requestAnimationFrame(this.#tick);
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.#raf);
    this.replaceChildren();
  }

  get maxDrips() {
    return Number(this.getAttribute('max-drips') ?? 20);
  }

  #tick = (timestamp) => {
    const beat = this.closest('.deck-beat');
    if (beat && !beat.classList.contains('active')) { this.#raf = requestAnimationFrame(this.#tick); return; }
    const interval = 300 + Math.random() * 300;
    if (this.childElementCount < this.maxDrips && timestamp - this.#lastDrip > interval) {
      const drip = document.createElement('div');
      drip.className = 'drip';
      drip.style.left = `${Math.random() * 100}%`;
      drip.style.animationDelay = `${Math.random() * 3}s`;
      // each drop carries a random amount of the chapter colour, most of them
      // barely any, so the rain stays rain and never outshines a white sign
      drip.style.setProperty('--tint', `${Math.round(Math.random() ** 2 * 70)}%`);
      // watercolor wash: each drop carries its own strength of the brand
      // colour, from a faint stain to a saturated bead, and blooms as it lands
      if (this.hasAttribute('wash')) {
        drip.style.setProperty('--tint', `${Math.round(45 + Math.random() * 55)}%`);
        drip.style.setProperty('--wash', `${(0.12 + Math.random() ** 1.6 * 0.5).toFixed(2)}`);
        drip.style.setProperty('--bloom', `${Math.round(90 + Math.random() * 140)}px`);
      }
      this.append(drip);
      setTimeout(() => drip.remove(), 4000);
      this.#lastDrip = timestamp;
    }
    this.#raf = requestAnimationFrame(this.#tick);
  };
}

customElements.define('rain-fall', RainFall);
