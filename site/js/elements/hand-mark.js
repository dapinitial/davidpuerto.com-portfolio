// <hand-mark> — a hand-drawn underline under one word.
//   <p>… a design language that was <hand-mark>scriptable</hand-mark>.</p>
// Light DOM. The element appends one inline SVG with one stroke.
// JS only builds the path (once per draw); the drawing itself is a CSS
// keyframe on stroke-dashoffset (css/elements/hand-mark.css), so the browser
// owns the animation. pathLength="1" normalises every generated line to a
// dash length of 1, so the CSS never needs to know the path's real length.
//
// The line is different every time it draws. Shape: a baseline with a slight
// downward drift (the hand drops toward the end of a stroke) plus a sum of
// sines whose amplitude falls with frequency (1/f: slow sway, little tremor),
// each with a random phase; both ends overshoot the word a little.

const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

// The box is W wide and 12 tall in user units, W set by the element so one
// unit is the same size on both axes (dashes and stroke then scale evenly).
// The word spans x 4%…96%, the stroke sits around y 6.
export function handLine(seed, { drift = 1.2, sway = 1.5, lag = 0, W = 100 } = {}) {
  const rnd = mulberry32(seed);
  const freqs = [0.7, 1.6, 3.1, 5.3, 8.9];
  const waves = freqs.map((f) => ({ f, a: (sway / f ** 1.1) * (0.6 + rnd() * 0.8), p: rnd() * Math.PI * 2 }));
  const over0 = 1 + rnd() * 2.5, over1 = 1 + rnd() * 2.5;
  const x0 = (4 - over0) * W / 100, x1 = (96 + over1) * W / 100;
  const tilt = (rnd() - 0.5) * 1.2;
  const n = 28, pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    let y = 5 + lag + drift * t * t + tilt * (t - 0.5);
    for (const w of waves) y += w.a * Math.sin(Math.PI * 2 * w.f * t + w.p);
    // the pen lands and lifts: the first and last points pull toward the baseline
    const ease = Math.min(1, t * 6, (1 - t) * 6);
    y = 5 + (y - 5) * (0.35 + 0.65 * ease);
    pts.push([x0 + (x1 - x0) * t, y]);
  }
  // Catmull-Rom → cubic Béziers, so the sampled points become one smooth stroke
  let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(2)} ${c1[1].toFixed(2)} ${c2[0].toFixed(2)} ${c2[1].toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

class HandMark extends HTMLElement {
  #io;
  #ro;

  connectedCallback() {
    if (this.querySelector('svg')) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 12');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'line');
    path.setAttribute('pathLength', '1');
    svg.appendChild(path);
    this.appendChild(svg);
    this.redraw();
    // a fresh line every time the CSS starts a draw (the deck re-enters a
    // slide, or the long read scrolls it back in)
    svg.firstElementChild.addEventListener('animationstart', () => this.redraw());
    // the box follows the word's width, so the line is never stretched
    this.#ro = new ResizeObserver(() => this.redraw());
    this.#ro.observe(this);

    // the long read: draw when the word scrolls in. In the deck the beat's
    // .active class drives the CSS instead.
    if (!document.documentElement.classList.contains('deck')) {
      this.#io = new IntersectionObserver((entries) => {
        for (const e of entries) this.classList.toggle('seen', e.isIntersecting);
      }, { threshold: 0.5 });
      this.#io.observe(this);
    }
  }

  redraw() {
    const svg = this.querySelector('svg');
    const r = svg.getBoundingClientRect();
    const W = r.height > 0 ? Math.max(20, Math.round((r.width / r.height) * 12)) : 100;
    svg.setAttribute('viewBox', `0 0 ${W} 12`);
    const seed = hash(this.textContent.trim()) ^ (Date.now() & 0xffffffff);
    this.querySelector('path').setAttribute('d', handLine(seed, { W }));
  }

  disconnectedCallback() { this.#io?.disconnect(); this.#ro?.disconnect(); }
}

customElements.define('hand-mark', HandMark);
