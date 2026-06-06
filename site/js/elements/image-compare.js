// <image-compare> — before/after comparison with a pointer-draggable divider
// (port of components/imageComparison — the old component was already a DOM
// overlay-width slider, no WebGL/GLSL involved, so the same approach is kept).
// Markup (two imgs as children; first = base "before", second = overlay "after"):
//   <image-compare before-label="FBIDE Before" after-label="Lyric After">
//     <img src="/images/before.png" alt="Before">
//     <img src="/images/after.png" alt="After">
//   </image-compare>
// Attributes: before-label / after-label (corner captions; default Before/After).
// Light DOM, zero deps. Pair with css/elements/image-compare.css.

class ImageCompare extends HTMLElement {
  #ac;
  #raf;
  #value = 50;
  #dragging = false;

  connectedCallback() {
    const imgs = this.querySelectorAll(':scope > img');
    if (imgs.length < 2) return;
    const [beforeImg, afterImg] = imgs;

    const base = document.createElement('div');
    base.className = 'ic-base';
    base.append(beforeImg);

    const overlay = document.createElement('div');
    overlay.className = 'ic-overlay';
    overlay.append(afterImg);

    const slider = document.createElement('div');
    slider.className = 'ic-slider';
    slider.innerHTML = '<div class="ic-line"></div><div class="ic-thumb"></div>';

    const beforeLabel = document.createElement('span');
    beforeLabel.className = 'ic-label ic-label-before';
    beforeLabel.textContent = this.getAttribute('before-label') ?? 'Before';

    const afterLabel = document.createElement('span');
    afterLabel.className = 'ic-label ic-label-after';
    afterLabel.textContent = this.getAttribute('after-label') ?? 'After';

    this.append(base, overlay, slider, beforeLabel, afterLabel);

    const apply = () => {
      overlay.style.width = `${this.#value}%`;
      slider.style.left = `${this.#value}%`;
      this.#raf = null;
    };
    apply();

    const moveTo = (clientX) => {
      const bounds = this.getBoundingClientRect();
      this.#value = Math.max(0, Math.min(100, ((clientX - bounds.left) / bounds.width) * 100));
      this.#raf ??= requestAnimationFrame(apply);
    };

    this.#ac = new AbortController();
    const { signal } = this.#ac;

    this.addEventListener(
      'pointerdown',
      (e) => {
        this.#dragging = true;
        this.setPointerCapture(e.pointerId);
        this.classList.remove('animate-before', 'animate-after');
        moveTo(e.clientX);
      },
      { signal },
    );

    this.addEventListener(
      'pointermove',
      (e) => {
        if (this.#dragging) moveTo(e.clientX);
      },
      { signal },
    );

    const release = () => {
      if (!this.#dragging) return;
      this.#dragging = false;
      // Same end-of-drag pulses as the old component.
      this.classList.toggle('animate-before', this.#value <= 0);
      this.classList.toggle('animate-after', this.#value >= 100);
    };
    this.addEventListener('pointerup', release, { signal });
    this.addEventListener('pointercancel', release, { signal });
  }

  disconnectedCallback() {
    this.#ac?.abort();
    if (this.#raf) cancelAnimationFrame(this.#raf);
  }
}

customElements.define('image-compare', ImageCompare);
