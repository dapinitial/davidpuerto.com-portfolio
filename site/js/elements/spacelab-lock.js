// <spacelab-lock> — the 2014 davidpuerto.com lock, rebuilt. Three dials (the
// purple outer ring, the blue middle, the cyan inner) around a live seconds
// clock; the right combination lights the six slots, spins the wheels apart,
// blows the latches off in smoke and sparks, and swings in the panel that
// said "Spacelab Forever, coming soon."
//
// The 2014 original was jQuery Knob over layered PNGs, a smoke GIF and a
// metaball shader in the spirit of soulwire. This is SVG for the lock, one
// fragment shader for the field and the blast, GSAP for the choreography.
// Every dial is a real slider: drag it around, or use the arrow keys.
// Light DOM. Pair with css/elements/spacelab-lock.css.
import { gsap } from '../lib/gsap.js';

const COMBO = { inner: 10, middle: 50, outer: 200 }; // the 2014 combination
const DIALS = [
  { key: 'outer', label: 'Outer ring', r: 218, w: 16, max: 300, step: 100, color: '#dc0eff' },
  { key: 'middle', label: 'Middle ring', r: 128, w: 22, max: 100, step: 10, color: '#007fd1' },
  { key: 'inner', label: 'Inner ring', r: 86, w: 26, max: 100, step: 10, color: '#00fffc' },
];
const CURSOR = 26; // degrees of arc the knob's cursor covers

const polar = (r, deg) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [r * Math.cos(a), r * Math.sin(a)];
};
const arc = (r, from, to) => {
  const [x1, y1] = polar(r, from);
  const [x2, y2] = polar(r, to);
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
};
// a thick ring segment as a closed shape, for the latches and slot windows
const band = (r0, r1, from, to) => {
  const [a, b] = polar(r1, from);
  const [c, d] = polar(r1, to);
  const [e, f] = polar(r0, to);
  const [g, h] = polar(r0, from);
  const big = to - from > 180 ? 1 : 0;
  return `M${a} ${b} A${r1} ${r1} 0 ${big} 1 ${c} ${d} L${e} ${f} A${r0} ${r0} 0 ${big} 0 ${g} ${h} Z`;
};

// ---------------------------------------------------------------------------
// the field: 2014's three-color metaballs with scanlines, plus the blast
// (shockwave, sparks, smoke) when u_burst runs
const FRAG = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 u_res;
uniform vec2 u_center;   // the lock, in pixels from the bottom left
uniform float u_time;
uniform float u_burst;   // seconds since the lock blew, < 0 before
uniform float u_layer;   // 0: the field behind the lock, 1: the blast in front
uniform float u_calm;    // 1 under reduced motion
out vec4 outColor;

float hash(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453);
  float b = fract(sin(dot(i + vec2(1, 0), vec2(127.1, 311.7))) * 43758.5453);
  float c = fract(sin(dot(i + vec2(0, 1), vec2(127.1, 311.7))) * 43758.5453);
  float d = fract(sin(dot(i + vec2(1, 1), vec2(127.1, 311.7))) * 43758.5453);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  float scale = min(u_res.x, u_res.y);
  vec2 p = (frag - u_center) / scale; // lock-centered, short side = 1
  vec3 col = vec3(0.0);
  float alpha = 1.0;

  if (u_layer < 0.5) {
    // the 2014 field: blobs drifting on sin/cos/tan paths, three color groups
    vec2 pos = frag / u_res.x;
    vec2 center = vec2(0.5, 0.5 * u_res.y / u_res.x);
    float t = u_time * 0.001 * 2.2 * (1.0 - 0.85 * u_calm);
    float a = 0.0, b = 0.0, c = 0.0;
    for (int i = 0; i < 10; i++) {
      float n = float(i) / 10.0;
      float na = hash(n * 1.1 + 0.3), nb = hash(n * 2.8 + 0.7), nc = hash(n * 0.7 + 0.1), nd = hash(n * 3.2 + 0.9);
      vec2 q = center;
      q.x += sin(t * na) * cos(t * nb) * clamp(tan(t * na * 0.15), -3.0, 3.0) * 0.3;
      q.y += clamp(tan(t * nc), -3.0, 3.0) * sin(t * nd) * 0.1;
      float d = pow(1.6 * na / max(length(q - pos), 1e-3), 1.1);
      if (i < 3) a += d; else if (i < 7) b += d; else c += d;
    }
    col = vec3(a * c, b * c, a * b) * 0.00018;
    col = min(col, vec3(0.9));
    col -= mod(frag.y, 2.0) < 1.0 ? 0.08 : 0.0; // the scanlines
    // the blast lights the field up for a moment
    if (u_burst > 0.0) col += vec3(0.55, 0.3, 0.75) * exp(-u_burst * 2.5) * smoothstep(0.9, 0.0, length(p));
    col = max(col, 0.0);
  } else {
    if (u_burst < 0.0) discard;
    float t = u_burst;
    float r = length(p);
    // shockwave: a thin ring racing out
    float ringR = t * 1.15;
    float ring = exp(-pow((r - ringR) * 40.0, 2.0)) * exp(-t * 1.6);
    col += vec3(0.6, 0.95, 1.0) * ring * 1.4;
    // sparks: sixty embers thrown outward, slowing, falling a little
    for (int i = 0; i < 60; i++) {
      float fi = float(i);
      float ang = hash(fi + 1.7) * 6.2831;
      float spd = mix(0.25, 1.1, hash(fi + 9.1));
      vec2 dir = vec2(cos(ang), sin(ang));
      vec2 sp = dir * spd * (1.0 - exp(-t * 2.2)) / 2.2 * 2.0 - vec2(0.0, 0.08 * t * t);
      float life = exp(-t * mix(0.8, 1.8, hash(fi + 3.3)));
      float d = length(p - sp);
      vec3 hue = mix(vec3(1.0, 0.45, 0.95), vec3(0.3, 0.95, 1.0), hash(fi + 5.5));
      col += hue * 0.0009 / (d * d + 0.0004) * life;
    }
    // smoke: billowing fbm, pushed outward, thinning as it rises
    vec2 sp = p * 2.4 - vec2(0.0, -t * 0.25);
    float billow = fbm(sp + vec2(fbm(sp * 1.3 + t * 0.4), fbm(sp * 1.1 - t * 0.3)) * 1.4 - t * 0.35);
    float body = smoothstep(0.4 + t * 0.5, 0.05, r) * smoothstep(0.0, 0.18, t);
    float smoke = clamp(billow * 2.6 - 0.6, 0.0, 1.0) * body * exp(-t * 0.45);
    vec3 smokeCol = mix(vec3(0.22, 0.2, 0.24), vec3(0.62, 0.56, 0.7), billow);
    col = mix(col, smokeCol + col * 0.4, smoke);
    alpha = clamp(max(smoke, max(max(col.r, col.g), col.b)), 0.0, 1.0);
    col = min(col, vec3(1.0));
  }
  outColor = vec4(col * alpha, alpha);
}`;
const VERT = /* glsl */ `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

function field(canvas, layer) {
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, alpha: layer === 1 });
  if (!gl) return null;
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = (n) => gl.getUniformLocation(prog, n);
  const U = { res: u('u_res'), center: u('u_center'), time: u('u_time'), burst: u('u_burst'), layer: u('u_layer'), calm: u('u_calm') };
  gl.uniform1f(U.layer, layer);
  return {
    draw({ time, burst, center, calm }) {
      const w = canvas.width;
      const h = canvas.height;
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, layer === 1 ? 0 : 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(U.res, w, h);
      gl.uniform2f(U.center, center[0], h - center[1]);
      gl.uniform1f(U.time, time);
      gl.uniform1f(U.burst, burst);
      gl.uniform1f(U.calm, calm);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}

// ---------------------------------------------------------------------------
class SpacelabLock extends HTMLElement {
  #values = { outer: 0, middle: 0, inner: 0 };
  #open = false;
  #burstAt = -1;
  #raf = 0;
  #cleanup = [];

  connectedCallback() {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.innerHTML = this.#markup();
    this.querySelectorAll('.sl-dial').forEach((g) => this.#wireDial(g));
    this.querySelector('.sl-hint').addEventListener('click', (e) => {
      e.currentTarget.textContent = 'Turn the cyan inner ring to 10, the blue middle ring to 50, and the purple outer ring to 200.';
      e.currentTarget.disabled = true;
      this.hinted = true;
      this.#readout();
    });
    this.querySelector('.sl-again').addEventListener('click', () => this.#reset());
    this.#startClock();
    this.#startField(reduced);
    this.reduced = reduced;
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.#raf);
    this.#cleanup.forEach((fn) => fn());
  }

  #markup() {
    const slots = Array.from({ length: 6 }, (_, i) => {
      const a = i * 60 + 30;
      return `<path class="sl-slot" d="${band(160, 178, a - 7, a + 7)}"/>`;
    }).join('');
    const ticks = Array.from({ length: 60 }, (_, i) => {
      const [x1, y1] = polar(194, i * 6);
      const [x2, y2] = polar(i % 5 ? 198 : 202, i * 6);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    }).join('');
    const dials = DIALS.map((d) => `
      <g class="sl-dial" data-key="${d.key}" role="slider" tabindex="0" aria-label="${d.label}"
         aria-valuemin="0" aria-valuemax="${d.max}" aria-valuenow="0" style="--c:${d.color}">
        <circle class="sl-track" r="${d.r}" stroke-width="${d.w}"/>
        <path class="sl-cursor" d="${arc(d.r, -CURSOR / 2, CURSOR / 2)}" stroke-width="${d.w}"/>
        <circle class="sl-hit" r="${d.r}" stroke-width="${d.w + 22}"/>
      </g>`).join('');
    return `
      <canvas class="sl-field" aria-hidden="true"></canvas>
      <div class="sl-stage">
        <svg class="sl-lock" viewBox="-320 -320 640 640" aria-label="A combination lock with three rings">
          <defs>
            <radialGradient id="sl-metal" r="0.75">
              <stop offset="0.55" stop-color="#2a292c"/><stop offset="0.8" stop-color="#121113"/><stop offset="1" stop-color="#060506"/>
            </radialGradient>
            <linearGradient id="sl-bevel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#5a585c"/><stop offset="0.45" stop-color="#232224"/><stop offset="1" stop-color="#0b0a0b"/>
            </linearGradient>
            <filter id="sl-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <g class="sl-outer">
            <circle r="236" fill="url(#sl-metal)" stroke="#000" stroke-width="2"/>
            <circle r="232" fill="none" stroke="#3b3a3d" stroke-width="1.5"/>
            <g class="sl-ticks">${ticks}</g>
            <circle r="190" fill="#050405" stroke="#2d2c2f" stroke-width="2"/>
          </g>
          <g class="sl-latches">
            <path class="sl-latch" data-dir="0" d="${band(240, 270, -24, 24)}" fill="url(#sl-bevel)"/>
            <path class="sl-latch" data-dir="215" d="${band(244, 268, 196, 234)}" fill="url(#sl-bevel)"/>
            <path class="sl-latch" data-dir="145" d="${band(244, 268, 128, 162)}" fill="url(#sl-bevel)"/>
          </g>
          <g class="sl-inner">
            <circle r="186" fill="#161517" stroke="#3a393c" stroke-width="2"/>
            <circle r="152" fill="#070607" stroke="#2a292b" stroke-width="2"/>
            <g class="sl-slots" filter="url(#sl-glow)">${slots}</g>
          </g>
          ${dials}
          <g class="sl-clock" aria-hidden="true">
            <circle r="44" class="sl-clock-track"/>
            <path class="sl-clock-hand" d=""/>
          </g>
        </svg>
        <p class="sl-status" role="status" aria-live="polite">Three rings. One combination.</p>
        <p class="sl-readout" aria-hidden="true">${['inner', 'middle', 'outer'].map((k) => {
          const d = DIALS.find((x) => x.key === k);
          return `<span style="--c:${d.color}">${d.label.replace(' ring', '')} <b data-read="${k}">0</b><i data-ok="${k}" hidden>✓</i></span>`;
        }).join('')}</p>
        <button type="button" class="sl-hint">Need a hint?</button>
      </div>
      <canvas class="sl-blast" aria-hidden="true"></canvas>
      <div class="sl-panel" hidden>
        <svg class="sl-ghost" viewBox="-320 -320 640 640" aria-hidden="true">
          <circle class="sl-ghost-ring" r="236" pathLength="1"/>
          <circle class="sl-ghost-ring thin" r="190" pathLength="1"/>
          <g class="sl-ghost-ticks">${Array.from({ length: 60 }, (_, i) => {
            const [x1, y1] = polar(244, i * 6);
            const [x2, y2] = polar(i % 5 ? 250 : 258, i * 6);
            return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
          }).join('')}</g>
        </svg>
        <div class="sl-reveal">
          <h2 class="sl-word" data-text="SPACELAB">SPACELAB</h2>
          <p class="sl-word sl-sub" data-text="FOREVER">FOREVER</p>
          <p class="sl-word sl-meta" data-text="COMING SOON · DAVIDPUERTO.COM · 10.2014">COMING SOON · DAVIDPUERTO.COM · 10.2014</p>
          <button type="button" class="sl-again">[ RELOCK ]</button>
        </div>
      </div>`;
  }

  // --- the dials -----------------------------------------------------------
  #wireDial(g) {
    const d = DIALS.find((x) => x.key === g.dataset.key);
    const svg = this.querySelector('.sl-lock');
    const set = (v) => {
      if (this.#open) return;
      v = Math.round(((v % (d.max + d.step)) + (d.max + d.step)) % (d.max + d.step) / d.step) * d.step;
      if (v > d.max) v = 0;
      if (v === this.#values[d.key]) return;
      this.#values[d.key] = v;
      g.setAttribute('aria-valuenow', v);
      g.setAttribute('aria-valuetext', String(v));
      const deg = (v / (d.max + d.step)) * 360; // every stop gets its own place on the ring
      gsap.to(g.querySelector('.sl-cursor'), { rotation: deg, svgOrigin: '0 0', duration: this.reduced ? 0 : 0.18, ease: 'power2.out' });
      this.#readout();
      this.#check();
    };
    // pointer: the angle around the center becomes the value
    const toValue = (e) => {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const { x, y } = pt.matrixTransform(svg.getScreenCTM().inverse());
      const deg = ((Math.atan2(y, x) * 180) / Math.PI + 90 + 360) % 360;
      return (deg / 360) * (d.max + d.step);
    };
    g.addEventListener('pointerdown', (e) => {
      if (this.#open) return;
      g.setPointerCapture(e.pointerId);
      g.focus({ preventScroll: true });
      set(toValue(e));
      const move = (ev) => set(toValue(ev));
      const up = () => { g.removeEventListener('pointermove', move); g.removeEventListener('pointerup', up); };
      g.addEventListener('pointermove', move);
      g.addEventListener('pointerup', up);
    });
    g.addEventListener('keydown', (e) => {
      const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
      if (step) { e.preventDefault(); set(this.#values[d.key] + step * d.step); }
      if (e.key === 'Home') { e.preventDefault(); set(0); }
    });
  }

  // the numbers under the lock; after the hint, a check by each ring that is right
  #readout() {
    for (const k of ['inner', 'middle', 'outer']) {
      this.querySelector(`[data-read="${k}"]`).textContent = this.#values[k];
      this.querySelector(`[data-ok="${k}"]`).hidden = !(this.hinted && this.#values[k] === COMBO[k]);
    }
  }

  #check() {
    const v = this.#values;
    if (v.inner === COMBO.inner && v.middle === COMBO.middle && v.outer === COMBO.outer) this.#unlock();
  }

  // --- the seconds clock in the middle -------------------------------------
  #startClock() {
    const hand = this.querySelector('.sl-clock-hand');
    const tick = () => {
      const s = new Date().getSeconds();
      hand.setAttribute('d', s ? arc(44, 0, Math.max(0.5, s * 6)) : '');
    };
    tick();
    const id = setInterval(tick, 1000);
    this.#cleanup.push(() => clearInterval(id));
  }

  // --- the field and the blast ---------------------------------------------
  #startField(reduced) {
    const bg = this.querySelector('.sl-field');
    const fx = this.querySelector('.sl-blast');
    let back;
    let front;
    try {
      back = field(bg, 0);
      front = field(fx, 1);
    } catch {
      back = front = null;
    }
    if (!back) { this.classList.add('sl-nogl'); return; }
    const size = () => {
      const dpr = Math.min(devicePixelRatio, 1.5); // the field is soft; spare the GPU
      for (const c of [bg, fx]) {
        c.width = Math.round(c.clientWidth * dpr);
        c.height = Math.round(c.clientHeight * dpr);
      }
    };
    const ro = new ResizeObserver(size);
    ro.observe(this);
    size();
    this.#cleanup.push(() => ro.disconnect());
    const t0 = performance.now();
    const loop = (now) => {
      this.#raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      const lock = this.querySelector('.sl-lock').getBoundingClientRect();
      const host = this.getBoundingClientRect();
      const dpr = bg.width / Math.max(1, bg.clientWidth);
      const center = [(lock.left - host.left + lock.width / 2) * dpr, (lock.top - host.top + lock.height / 2) * dpr];
      const burst = this.#burstAt < 0 ? -1 : (now - this.#burstAt) / 1000;
      const state = { time: now - t0, burst, center, calm: reduced ? 1 : 0 };
      back.draw(state);
      if (burst >= 0 && burst < 6) front.draw(state);
      else if (burst >= 6) front.draw({ ...state, burst: -1 });
    };
    this.#raf = requestAnimationFrame(loop);
  }

  // --- the unlock, as 2014 choreographed it, with more to work with -------
  #unlock() {
    this.#open = true;
    const q = (s) => this.querySelector(s);
    const all = (s) => [...this.querySelectorAll(s)];
    q('.sl-status').textContent = 'Unlocked.';
    q('.sl-hint').hidden = true;

    if (this.reduced) {
      all('.sl-slot').forEach((s) => s.classList.add('lit'));
      gsap.to(q('.sl-stage'), { opacity: 0, duration: 0.6, delay: 0.6, onComplete: () => this.#showPanel(true) });
      return;
    }

    const tl = gsap.timeline();
    // 1. the six slots light, one after another
    all('.sl-slot').forEach((s, i) => tl.add(() => s.classList.add('lit'), 0.1 + i * 0.09));
    // 2. the wheels spin apart
    tl.to(q('.sl-outer'), { rotation: -360 * 6, svgOrigin: '0 0', duration: 1.9, ease: 'power3.in' }, 0.8);
    tl.to(q('.sl-inner'), { rotation: 360 * 6, svgOrigin: '0 0', duration: 1.9, ease: 'power3.in' }, 0.8);
    tl.to(all('.sl-dial'), { opacity: 0, duration: 0.8, stagger: 0.1 }, 1.2);
    tl.to(q('.sl-clock'), { opacity: 0, duration: 0.6 }, 1.4);
    // 3. the blast: latches fly, the lock jolts, smoke and sparks
    tl.add(() => { this.#burstAt = performance.now(); this.classList.add('sl-blasted'); }, 2.7);
    all('.sl-latch').forEach((l) => {
      const a = ((Number(l.dataset.dir) - 90) * Math.PI) / 180;
      tl.to(l, { x: Math.cos(a) * 900, y: Math.sin(a) * 900, rotation: gsap.utils.random(-540, 540), svgOrigin: '0 0', opacity: 0, duration: 1.4, ease: 'power2.out' }, 2.7);
    });
    tl.fromTo(q('.sl-lock'), { scale: 1 }, { scale: 1.12, duration: 0.12, ease: 'power2.out', yoyo: true, repeat: 1 }, 2.7);
    // 4. the lock falls away into the distance
    tl.to(q('.sl-lock'), { scale: 0, opacity: 0, rotation: 30, duration: 1.1, ease: 'power3.in' }, 3.1);
    tl.to([q('.sl-status'), q('.sl-readout')], { opacity: 0, duration: 0.4 }, 3.1);
    // 5. the panel swings in
    tl.add(() => this.#showPanel(false), 3.9);
  }

  #showPanel(instant) {
    const panel = this.querySelector('.sl-panel');
    panel.hidden = false;
    const rings = panel.querySelectorAll('.sl-ghost-ring');
    const ticks = panel.querySelector('.sl-ghost-ticks');
    const words = [...panel.querySelectorAll('.sl-word')];
    const again = panel.querySelector('.sl-again');
    if (instant) {
      gsap.set(rings, { strokeDashoffset: 0 });
      words.forEach((w) => { w.style.opacity = 1; });
      gsap.fromTo(panel, { opacity: 0 }, { opacity: 1, duration: 0.8 });
      again.focus({ preventScroll: true });
      return;
    }
    // the ghost of the lock traces itself in, then the words decode out of the smoke
    const tl = gsap.timeline({ onComplete: () => again.focus({ preventScroll: true }) });
    tl.fromTo(rings, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut', stagger: 0.15 }, 0);
    tl.fromTo(ticks, { opacity: 0, rotation: -30, svgOrigin: '0 0' }, { opacity: 1, rotation: 0, svgOrigin: '0 0', duration: 1.6, ease: 'power3.out' }, 0.2);
    words.forEach((w, i) => tl.add(() => this.#decode(w, i === 0 ? 1.1 : 0.8), 0.5 + i * 0.45));
    tl.fromTo(again, { opacity: 0 }, { opacity: 1, duration: 0.6 }, 2.4);
  }

  // glyph by glyph, like a terminal finding the signal
  #decode(el, seconds) {
    const target = el.dataset.text;
    const glyphs = '01<>/\\|[]{}#*+=-_:;ABCDEFGHJKLMNPRSTUVXYZ';
    const start = performance.now();
    el.style.opacity = 1;
    // timed by the clock, not by frames, so a busy GPU never stretches it
    const step = (now) => {
      const k = Math.min(1, (now - start) / (seconds * 1000));
      const settled = Math.floor(k * target.length);
      el.textContent = [...target].map((ch, i) => (i < settled || ch === ' ' || ch === '·' ? ch : glyphs[(Math.random() * glyphs.length) | 0])).join('');
      if (k < 1) requestAnimationFrame(step);
      else el.textContent = target;
    };
    requestAnimationFrame(step);
  }

  #reset() {
    gsap.killTweensOf(this.querySelectorAll('*'));
    this.#values = { outer: 0, middle: 0, inner: 0 };
    this.#open = false;
    this.#burstAt = -1;
    this.classList.remove('sl-blasted');
    this.hinted = false;
    cancelAnimationFrame(this.#raf);
    this.#cleanup.forEach((fn) => fn());
    this.#cleanup = [];
    this.connectedCallback();
  }
}

customElements.define('spacelab-lock', SpacelabLock);
