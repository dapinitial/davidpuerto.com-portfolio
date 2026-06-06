// <infinity-loader> — the infinity-path SVG loader (stroke-dash loop with
// bounce-out exit). In the MPA rebuild it covers page TRANSITIONS: the site
// header injects it when an internal link is clicked, and arriving pages can
// also declare it with the `auto` attribute to cover heavy asset loads.
//
//   InfinityLoader.show()      — inject + show now (used on nav clicks)
//   <infinity-loader auto>     — shows until window 'load' (+ min 500ms)
//
// Pair with css/elements/infinity-loader.css.

const SVG = `
  <svg width="60" height="60" viewBox="0 0 100 100" aria-hidden="true">
    <path fill="none"
      d="M24.3,30C11.4,30,5,43.3,5,50s6.4,20,19.3,20c19.3,0,32.1-40,51.4-40C88.6,30,95,43.3,95,50s-6.4,20-19.3,20C56.4,70,43.6,30,24.3,30z"
      stroke="#fff" stroke-width="3"
      stroke-dasharray="205.271142578125 51.317785644531256">
      <animate attributeName="stroke-dashoffset" calcMode="linear"
        values="0;256.58892822265625" keyTimes="0;1" dur="1.0"
        begin="0" repeatCount="indefinite" />
    </path>
  </svg>`;

class InfinityLoader extends HTMLElement {
  #shownAt = 0;

  connectedCallback() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.remove();
      return;
    }
    this.innerHTML = SVG;
    this.setAttribute('role', 'status');
    this.setAttribute('aria-label', 'Loading');
    this.#shownAt = performance.now();

    if (this.hasAttribute('auto')) {
      if (document.readyState === 'complete') this.hide();
      else window.addEventListener('load', () => this.hide(), { once: true });
    }
    // Without `auto`, the element rides until navigation replaces the page
    // (transition use) or someone calls hide().
  }

  hide() {
    const minShow = 500;
    const wait = Math.max(0, minShow - (performance.now() - this.#shownAt));
    setTimeout(() => {
      this.classList.add('exit');
      setTimeout(() => this.remove(), 550); // bounce (300) + fade tail
    }, wait);
  }

  static show() {
    const el = document.createElement('infinity-loader');
    document.body.append(el);
    return el;
  }
}

customElements.define('infinity-loader', InfinityLoader);

export { InfinityLoader };
