// <hoop-dunk> — a tiny CSS-art basketball hoop. Call .dunk() and a ball
// drops through the net (swoosh included). Resolves when the ball lands,
// then the art fades itself out. Zero deps, pure CSS animation.
// Pair with css/elements/hoop-dunk.css.

const ART = `
  <div class="art" aria-hidden="true">
    <div class="backboard"></div>
    <div class="rim-back"></div>
    <div class="net"></div>
    <div class="basketball">🏀</div>
    <div class="rim-front"></div>
  </div>`;

class HoopDunk extends HTMLElement {
  dunk() {
    return new Promise((resolve) => {
      this.classList.remove('fade');
      this.innerHTML = ART;
      const ball = this.querySelector('.basketball');
      ball.addEventListener(
        'animationend',
        () => {
          resolve(); // ball through the net — fire your celebration
          setTimeout(() => {
            this.classList.add('fade');
            setTimeout(() => this.replaceChildren(), 450);
          }, 650);
        },
        { once: true },
      );
    });
  }

  disconnectedCallback() {
    this.replaceChildren();
  }
}

customElements.define('hoop-dunk', HoopDunk);

export { HoopDunk };
