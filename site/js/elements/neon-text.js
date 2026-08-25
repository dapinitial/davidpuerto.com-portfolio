// <neon-text> — neon sign with randomly shorting-out letters.
//   <neon-text dim="contact me@davidpuerto.com"
//              bright="Response in 2-3 business days"></neon-text>
// `dim` renders the small dim/blinking line, `bright` the large humming line.
// Put <br /> inside a value to split it across lines. Reactive: set
// `bright`/`dim` any time and the sign re-renders. Light DOM, zero deps.
// Pair with css/elements/neon-text.css (which self-hosts the NeonTubes face).

class NeonText extends HTMLElement {
  static observedAttributes = ['bright', 'dim'];

  #interval;

  connectedCallback() {
    this.#render();
    // Fade in once the neon face is ready (font-display: swap handles fallback)
    document.fonts.ready.then(() => this.classList.add('lit'));
  }

  attributeChangedCallback() {
    // Initial attributes are drawn by connectedCallback; only react to later
    // changes, once we're actually in the DOM.
    if (this.isConnected) this.#render();
  }

  disconnectedCallback() {
    clearInterval(this.#interval);
    this.replaceChildren();
  }

  #render() {
    clearInterval(this.#interval); // guard against stacking intervals on re-render

    const bright = this.getAttribute('bright') ?? '';
    const dim = this.getAttribute('dim') ?? '';

    const letters = (text, offset) =>
      text
        .split('<br />')
        .map(
          (segment) =>
            `<div>${[...segment]
              .map((ch) =>
                ch === ' '
                  ? '<span class="space">&nbsp;</span>'
                  : `<span class="neon-letter" data-i="${offset++}">${ch}</span>`,
              )
              .join('')}</div>`,
        )
        .join('');

    let i = 0;
    const count = (t) => [...t.replaceAll('<br />', '')].filter((c) => c !== ' ').length;
    this.innerHTML = `
      <span class="dim">${letters(dim, i)}</span>
      <span class="bright">${letters(bright, (i = count(dim)))}</span>`;

    const total = count(dim) + count(bright);
    const all = this.querySelectorAll('.neon-letter');

    const shortOut = () => {
      const dying = new Set();
      while (dying.size < Math.min(8, total)) dying.add(Math.floor(Math.random() * total));
      all.forEach((el) => el.classList.toggle('short-out', dying.has(Number(el.dataset.i))));
    };

    shortOut();
    this.#interval = setInterval(shortOut, 3500);
  }
}

customElements.define('neon-text', NeonText);
