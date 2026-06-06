// <neon-text> — buzzing neon sign with randomly shorting-out letters.
//   <neon-text goodbye="contact me@davidpuerto.com"
//              hello="Response in <br />2-3 business days."></neon-text>
// `goodbye` renders dim/blinking, `hello` renders bright/buzzing.
// Light DOM, zero deps. Pair with css/elements/neon-text.css (which
// self-hosts the NeonTubes face).

class NeonText extends HTMLElement {
  #interval;

  connectedCallback() {
    const hello = this.getAttribute('hello') ?? '';
    const goodbye = this.getAttribute('goodbye') ?? '';

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
      <span class="goodbye">${letters(goodbye, i)}</span>
      <span class="hello">${letters(hello, (i = count(goodbye)))}</span>`;

    const total = count(goodbye) + count(hello);
    const all = this.querySelectorAll('.neon-letter');

    const shortOut = () => {
      const dying = new Set();
      while (dying.size < Math.min(8, total)) dying.add(Math.floor(Math.random() * total));
      all.forEach((el) => el.classList.toggle('short-out', dying.has(Number(el.dataset.i))));
    };

    shortOut();
    this.#interval = setInterval(shortOut, 3500);
    // Fade in once the neon face is ready (font-display: swap handles fallback)
    document.fonts.ready.then(() => this.classList.add('lit'));
  }

  disconnectedCallback() {
    clearInterval(this.#interval);
    this.replaceChildren();
  }
}

customElements.define('neon-text', NeonText);
