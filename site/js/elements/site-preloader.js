// <site-preloader> — the main page loader: LOADING wordmark with gradient
// sweep, percentage crawl to ~42% then zip to 100%, GSAP exit sequence.
// Shows once per session (sessionStorage) and never for reduced-motion.
// Behind the wordmark, a coral spray stroke paints across the word in step
// with the percentage, in the same aerosol as the menu's hover.
// Pair with css/elements/site-preloader.css.
import { gsap } from '../lib/gsap.js';

const SESSION_KEY = 'dp-preloaded';
const NS = 'http://www.w3.org/2000/svg';
const rand = (a, b) => a + Math.random() * (b - a);

// The menu hover's spray, driven by progress instead of a timer: two or
// three thin passes of a wavy stroke from the percentage through the word.
// Each path has pathLength 1, so progress is simply the dash offset.
function sprayBehind(outer, from, word) {
  const o = outer.getBoundingClientRect();
  const a = from.getBoundingClientRect();
  const r = word.getBoundingClientRect();
  const h = r.height;
  const x0 = a.left - o.left;
  const w = r.right - a.left;
  const pad = h * 0.6;
  const padX = Math.max(h * 1.2, w * 0.26); // room for the overshoot and its mist
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'preloader-spray');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', w + padX * 2);
  svg.setAttribute('height', h + pad * 2);
  svg.setAttribute('viewBox', `${-padX} ${-pad} ${w + padX * 2} ${h + pad * 2}`);
  svg.style.left = `${x0 - padX}px`;
  svg.style.top = `${r.top - o.top - pad}px`;
  const seed = () => Math.floor(rand(1, 999));
  const box = `filterUnits="userSpaceOnUse" x="${-padX}" y="${-pad}" width="${w + padX * 2}" height="${h + pad * 2}"`;
  svg.innerHTML = `
    <defs>
      <filter id="pl-core" ${box}>
        <feTurbulence type="fractalNoise" baseFrequency="${rand(0.01, 0.018).toFixed(3)}" numOctaves="2" seed="${seed()}" result="warp"/>
        <feDisplacementMap in="SourceGraphic" in2="warp" scale="${Math.round(h * 0.16)}" xChannelSelector="R" yChannelSelector="G" result="ragged"/>
        <feGaussianBlur in="ragged" stdDeviation="${(h * 0.05).toFixed(1)}"/>
      </filter>
      <filter id="pl-mist" ${box}>
        <feTurbulence type="fractalNoise" baseFrequency="${rand(0.008, 0.014).toFixed(3)}" numOctaves="2" seed="${seed()}" result="warp"/>
        <feDisplacementMap in="SourceGraphic" in2="warp" scale="${Math.round(h * 0.3)}" xChannelSelector="R" yChannelSelector="G" result="ragged"/>
        <feGaussianBlur in="ragged" stdDeviation="${(h * 0.12).toFixed(1)}" result="soft"/>
        <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="${seed()}" result="grain"/>
        <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.6" result="dots"/>
        <feComposite in="soft" in2="dots" operator="in"/>
      </filter>
    </defs>`;
  // a cubic wave across the span, entering and leaving a little off-axis
  const y = (f) => h / 2 + rand(-f, f) * h * 0.6;
  const wave = () => {
    const c = [
      [-rand(0.01, 0.03) * w, y(0.18)],
      [w * rand(0.18, 0.32), y(0.34)],
      [w * rand(0.42, 0.58), y(0.34)],
      [w * rand(0.68, 0.82), y(0.34)],
      [w * (1 + rand(0.09, 0.11)), y(0.2)], // overshoots past the G, a little more than before the digits
    ];
    return `M${c[0][0]},${c[0][1]} C${c[1][0]},${c[1][1]} ${c[2][0]},${c[2][1]} ${c[2][0]},${c[2][1]} S${c[3][0]},${c[3][1]} ${c[4][0]},${c[4][1]}`;
  };
  const colors = ['#fb836d', '#e0573f', '#ff9f8a', '#c94a6a'];
  const mist = document.createElementNS(NS, 'g');
  mist.setAttribute('filter', 'url(#pl-mist)');
  const core = document.createElementNS(NS, 'g');
  core.setAttribute('filter', 'url(#pl-core)');
  const strokes = [];
  const passes = Math.random() < 0.55 ? 2 : 3;
  for (let k = 0; k < passes; k++) {
    const d = wave();
    const color = k ? colors[1 + Math.floor(Math.random() * 3)] : colors[0];
    // the first pass leads; each later pass starts a little behind it
    const start = k * 0.12;
    const mk = (width, opacity) => {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('pathLength', '1');
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', color);
      p.setAttribute('stroke-width', width.toFixed(1));
      p.setAttribute('stroke-linecap', 'round');
      p.setAttribute('opacity', opacity);
      p.style.strokeDasharray = '1 1';
      p.style.strokeDashoffset = '1';
      p.style.visibility = 'hidden';
      strokes.push({ p, start, span: 1 - start });
      return p;
    };
    const wCore = h * (k ? rand(0.12, 0.2) : rand(0.24, 0.34));
    mist.appendChild(mk(wCore * 2.1, rand(0.5, 0.75).toFixed(2)));
    core.appendChild(mk(wCore, rand(k ? 0.55 : 0.75, k ? 0.8 : 0.95).toFixed(2)));
  }
  svg.append(mist, core);
  outer.prepend(svg);
  return {
    svg,
    paint(pct) {
      const t = pct / 100;
      for (const s of strokes) {
        const k = Math.min(1, Math.max(0, (t - s.start) / (s.span ?? 1 - s.start)));
        s.p.style.strokeDashoffset = String(1 - k);
        // an undrawn stroke still paints its round cap as a dot; hide it until it moves
        s.p.style.visibility = k > 0 ? 'visible' : 'hidden';
      }
    },
  };
}

class SitePreloader extends HTMLElement {
  #tl;
  #spray;

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
            <span class="lt-cube"><span class="loading-text">LOADING</span><span class="loading-text loaded-text" aria-hidden="true">LOADED</span></span>
          </div>
        </div>
        <div class="percentage-intro">Breathe deeply, content is loading.</div>
      </div>`;

    const bar = this.querySelector('.loadbar');
    const pct = this.querySelector('.percentage');
    const text = this.querySelector('.loading-text');
    const wrap = this.querySelector('.preloader-wrap');
    const spray = sprayBehind(this.querySelector('.outer'), this.querySelector('.percentage-wrapper'), this.querySelector('.preloader-intro'));
    this.#spray = spray.svg;

    // One tweened progress value renders bar + gradient + percentage in
    // lockstep — fully interpolated, no stair-steps. Crawl to ~42%, breathe,
    // zip to 100, exit.
    const state = { p: 0 };
    const render = () => {
      pct.textContent = `${Math.round(state.p)}%`;
      pct.parentElement.dataset.pct = pct.textContent; // the dark shadow copy behind it
      bar.style.width = `${state.p}%`;
      text.style.backgroundPosition = `${100 - state.p}% 0`;
      spray.paint(state.p);
      wrap.style.setProperty('--p', (state.p / 100).toFixed(3)); // the climbs photo, when on, rises with it
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
    const cube = this.querySelector('.lt-cube');
    const loaded = this.querySelector('.loaded-text');
    const h = text.getBoundingClientRect().height;
    // the cube turns on its own centre: half its depth behind the word
    cube.style.transformOrigin = `50% 50% ${-h / 2}px`;
    gsap
      .timeline({ onComplete: () => this.remove() })
      .to(bar, { width: '100%', duration: 0.3, ease: 'power2.out' })
      // LOADING tips over the top; LOADED comes up from underneath
      .to(cube, { rotateX: 90, duration: 0.6, ease: 'power3.inOut' }, '<')
      // then the word collapses to the left, the paint with it
      .to(text, { width: 0, duration: 0.3, ease: 'power4.out' }, '+=0.25')
      .to(loaded, { clipPath: 'inset(-40% 112% -40% -6%)', duration: 0.3, ease: 'power4.out' }, '<')
      .fromTo(this.#spray, { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 100% 0% 0%)', duration: 0.3, ease: 'power4.out' }, '<')
      .to(pct.parentElement, { y: -50, opacity: 0, duration: 0.3, ease: 'power2.inOut' }, '-=0.2') // the digits and their shadow copy leave together
      .to(wrap, { opacity: 0, duration: 0.8, ease: 'power2.inOut' });
  }

  disconnectedCallback() {
    this.#tl?.kill();
  }
}

customElements.define('site-preloader', SitePreloader);
