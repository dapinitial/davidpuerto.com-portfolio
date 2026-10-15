// Spray-paint hover for the overlay menu: a soft, freshly randomized stroke
// sprayed behind each link on hover. Two or three passes of a wavy line with
// peaks and valleys, edges roughened by turbulence, softened by blur, and
// grained like aerosol. Every hover paints a new one. Light DOM, no deps.

const NS = 'http://www.w3.org/2000/svg';
const CORAL = ['#fb836d', '#e0573f', '#ff9f8a', '#c94a6a'];

// The paint is coral everywhere, except the case-study links in the menu's
// Case Studies list: each one sprays in its study's colour (the same colours
// as css/pages/case-study.css), so the list doubles as a key to the studies.
const STUDY_RGB = {
  apple: [171, 101, 192],
  microsoft: [251, 131, 109],
  facebook: [237, 180, 23],
  nordstrom: [208, 212, 220],
  sonosite: [0, 163, 187],
  zillow: [18, 119, 225],
};
function paletteFor(link) {
  const slug = (link.getAttribute?.('href') || '').match(/\/case-studies\/([a-z]+)/)?.[1];
  const rgb = link.closest?.('.menu-sub') && STUDY_RGB[slug];
  if (!rgb) return CORAL;
  const mix = (t, k) => '#' + rgb.map((c) => Math.round(c + (t - c) * k).toString(16).padStart(2, '0')).join('');
  return [mix(0, 0), mix(255, 0.35), mix(0, 0.25), mix(255, 0.15)];
}

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand = (a, b) => a + Math.random() * (b - a);
let uid = 0;

function measure(link) {
  const cs = getComputedStyle(link, '::after');
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const text = (link.dataset.navlinkname || '').toUpperCase();
  const ls = parseFloat(cs.letterSpacing) || 0;
  return ctx.measureText(text).width + ls * text.length;
}

// one pass: a cubic wave across the word, entering and leaving off-axis
function passPath(w, h, x0) {
  const y = (f) => h / 2 + rand(-f, f) * h * 0.6;
  const x1 = x0 + w;
  const c = [
    [x0 - rand(0.02, 0.08) * w, y(0.18)],
    [x0 + w * rand(0.18, 0.32), y(0.34)],
    [x0 + w * rand(0.42, 0.58), y(0.34)],
    [x0 + w * rand(0.68, 0.82), y(0.34)],
    [x1 + rand(0.02, 0.1) * w, y(0.2)],
  ];
  return `M${c[0][0]},${c[0][1]} C${c[1][0]},${c[1][1]} ${c[2][0]},${c[2][1]} ${c[2][0]},${c[2][1]} S${c[3][0]},${c[3][1]} ${c[4][0]},${c[4][1]}`;
}

function spray(li, link) {
  li._spray?.remove();
  const h = link.offsetHeight; // stroke sizes stay relative to the row, as before
  const pad = h * 0.6; // headroom so the overspray never meets an edge
  const padX = h * 1.2; // and side room: the strokes overshoot the word, then blur and scatter
  const tw = Math.max(measure(link), h * 2);
  const W = tw * 1.3;
  const id = `spray-${++uid}`;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'spray');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', W + padX * 2);
  svg.setAttribute('height', h + pad * 2);
  svg.setAttribute('viewBox', `${-padX} ${-pad} ${W + padX * 2} ${h + pad * 2}`);
  const seed = () => Math.floor(rand(1, 999));
  const blur = (h * 0.05).toFixed(1);
  svg.innerHTML = `
    <defs>
      <filter id="${id}-core" filterUnits="userSpaceOnUse" x="${-padX}" y="${-pad}" width="${W + padX * 2}" height="${h + pad * 2}">
        <feTurbulence type="fractalNoise" baseFrequency="${rand(0.01, 0.018).toFixed(3)}" numOctaves="2" seed="${seed()}" result="warp"/>
        <feDisplacementMap in="SourceGraphic" in2="warp" scale="${Math.round(h * 0.16)}" xChannelSelector="R" yChannelSelector="G" result="ragged"/>
        <feGaussianBlur in="ragged" stdDeviation="${blur}"/>
      </filter>
      <filter id="${id}-mist" filterUnits="userSpaceOnUse" x="${-padX}" y="${-pad}" width="${W + padX * 2}" height="${h + pad * 2}">
        <feTurbulence type="fractalNoise" baseFrequency="${rand(0.008, 0.014).toFixed(3)}" numOctaves="2" seed="${seed()}" result="warp"/>
        <feDisplacementMap in="SourceGraphic" in2="warp" scale="${Math.round(h * 0.3)}" xChannelSelector="R" yChannelSelector="G" result="ragged"/>
        <feGaussianBlur in="ragged" stdDeviation="${(h * 0.12).toFixed(1)}" result="soft"/>
        <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="${seed()}" result="grain"/>
        <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.6" result="dots"/>
        <feComposite in="soft" in2="dots" operator="in"/>
      </filter>
    </defs>`;
  const mist = document.createElementNS(NS, 'g');
  mist.setAttribute('filter', `url(#${id}-mist)`);
  const core = document.createElementNS(NS, 'g');
  core.setAttribute('filter', `url(#${id}-core)`);
  const passes = Math.random() < 0.55 ? 2 : 3;
  for (let k = 0; k < passes; k++) {
    const d = passPath(tw, h, (W - tw) / 2);
    const colors = paletteFor(link);
    const color = colors[Math.floor(Math.random() * colors.length)];
    const dur = rand(0.34, 0.52).toFixed(2), delay = (k * rand(0.06, 0.14)).toFixed(2);
    const mk = (width, opacity) => {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('pathLength', '1');
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', color);
      p.setAttribute('stroke-width', width);
      p.setAttribute('stroke-linecap', 'round');
      p.setAttribute('opacity', opacity);
      if (!reduced) {
        p.style.strokeDasharray = '1 1';
        p.style.strokeDashoffset = '1';
        p.style.animation = `spray-draw ${dur}s cubic-bezier(.3,.6,.2,1) ${delay}s forwards`;
      }
      return p;
    };
    const wCore = h * (k ? rand(0.12, 0.2) : rand(0.24, 0.34));
    mist.appendChild(mk((wCore * 2.1).toFixed(1), rand(0.5, 0.75).toFixed(2)));
    core.appendChild(mk(wCore.toFixed(1), rand(k ? 0.55 : 0.75, k ? 0.8 : 0.95).toFixed(2)));
  }
  svg.appendChild(mist);
  svg.appendChild(core);
  // painted on the list, behind the rows: a row clips at its own height, the list does not
  svg.style.top = `${li.offsetTop - pad}px`;
  li.parentElement.prepend(svg);
  li._spray = svg;
}

function fade(li) {
  const s = li._spray;
  li._spray = null;
  if (!s) return;
  s.classList.add('out');
  setTimeout(() => s.remove(), 360);
}

// wipe every stroke: a list that is hidden or swapped never gets its
// pointerleave, so its paint would wait there for the next time it shows
export function clearSprays(root) {
  root.querySelectorAll('.menu li').forEach(fade);
  // a list swapped in under a still cursor reports a hover; nothing reacts
  // (no paint, no flip) until the mouse actually moves. site-header.css keys
  // its hover flip off this class too.
  root.classList.add('hover-quiet');
}

export function sprayHover(root, signal) {
  // the first real movement ends the quiet (capture, so it lands before a link's own pointermove)
  root.addEventListener('pointermove', () => root.classList.remove('hover-quiet'), { signal, capture: true });
  root.querySelectorAll('.menu li > a, .menu li > .submenu-toggle').forEach((link) => {
    const li = link.parentElement;
    // hover only: opening the case-studies list moves focus to its first
    // link for keyboard users, and that must not leave a stroke sprayed on it.
    // Keyboard focus already shows the coral ring.
    link.addEventListener('pointerenter', () => { if (!root.classList.contains('hover-quiet')) spray(li, link); }, { signal });
    link.addEventListener('pointermove', () => { if (!li._spray) spray(li, link); }, { signal });
    link.addEventListener('pointerleave', () => fade(li), { signal });
  });
}
