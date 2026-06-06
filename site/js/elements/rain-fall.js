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
    const interval = 300 + Math.random() * 300;
    if (this.childElementCount < this.maxDrips && timestamp - this.#lastDrip > interval) {
      const drip = document.createElement('div');
      drip.className = 'drip';
      drip.style.left = `${Math.random() * 100}%`;
      drip.style.animationDelay = `${Math.random() * 3}s`;
      this.append(drip);
      setTimeout(() => drip.remove(), 4000);
      this.#lastDrip = timestamp;
    }
    this.#raf = requestAnimationFrame(this.#tick);
  };
}

customElements.define('rain-fall', RainFall);
