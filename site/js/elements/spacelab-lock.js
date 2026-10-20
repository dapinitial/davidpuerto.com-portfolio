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
// enter-href="/somewhere" adds an [ ENTER ] link to the reveal.
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
// a full ring with a hole, so whatever is behind shows through the middle
const ring = (r0, r1) => {
  const circle = (r) => `M ${r} 0 A ${r} ${r} 0 1 1 ${-r} 0 A ${r} ${r} 0 1 1 ${r} 0 Z`;
  return `${circle(r1)} ${circle(r0)}`;
};
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
uniform float u_unit;    // canvas pixels per lock unit (the lock is 640 units across)
uniform float u_release; // 0: the blobs live inside the lock; 1: set free across the screen
uniform float u_dim;     // 1 normally, low while the lock is shorted out
uniform float u_time;
uniform float u_burst;   // seconds since the lock blew, < 0 before
uniform float u_fizzle;  // 1 when the time ran out: a small gray puff instead of the blast
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
    // the 2014 field: blobs drifting on sin/cos/tan paths, three color groups.
    // Until the blast they drift inside the glass ring, scaled to fit it;
    // u_release lets them out to roam the whole screen.
    vec2 pos = frag / u_res.x;
    vec2 center = vec2(0.5, 0.5 * u_res.y / u_res.x);
    vec2 lockC = u_center / u_res.x;
    float R = 300.0 * u_unit / u_res.x;        // the glass ring's outer edge: the blobs never cross it
    float kc = R / 0.34;                         // the screen-wide paths, scaled into it
    float k = mix(kc, 1.0, u_release);
    float t = u_time * 0.001 * 2.2 * (1.0 - 0.85 * u_calm);
    float a = 0.0, b = 0.0, c = 0.0;
    for (int i = 0; i < 10; i++) {
      float n = float(i) / 10.0;
      float na = hash(n * 1.1 + 0.3), nb = hash(n * 2.8 + 0.7), nc = hash(n * 0.7 + 0.1), nd = hash(n * 3.2 + 0.9);
      vec2 o = vec2(sin(t * na) * cos(t * nb) * clamp(tan(t * na * 0.15), -3.0, 3.0) * 0.3,
                    clamp(tan(t * nc), -3.0, 3.0) * sin(t * nd) * 0.1);
      // inside the glass they're drawn toward each other, so they meet and merge more
      vec2 q = mix(lockC + o * kc * 0.62, center + o, u_release);
      // and their glows are softer and wider, so merges swell bigger
      float blobiness = mix(0.92, 1.1, u_release);
      // bigger while they're contained; their usual size once they're free
      float grow = mix(2.0, 1.0, u_release);
      float d = pow(1.6 * na * k * grow / max(length(q - pos), 1e-3), blobiness);
      if (i < 3) a += d; else if (i < 7) b += d; else c += d;
    }
    col = vec3(a * c, b * c, a * b) * 0.00018;
    col = min(col, vec3(0.9));
    // the glass ring's edge: the blobs stay inside it until they're released
    float px = 1.5 / u_res.x;
    float Rm = mix(R, 4.0, u_release);
    col *= smoothstep(Rm + px, Rm - px, length(pos - lockC)) * u_dim;
    // a ground a hair off black, so the scanlines read across the whole screen
    col += vec3(0.028, 0.026, 0.032);
    col -= mod(frag.y, 2.0) < 1.0 ? 0.03 + 0.06 * min(1.0, max(col.r, max(col.g, col.b)) * 4.0) : 0.0; // the scanlines
    // the blast lights the field up for a moment
    if (u_burst > 0.0) col += vec3(0.55, 0.3, 0.75) * exp(-u_burst * 2.5) * smoothstep(0.9, 0.0, length(p));
    col = max(col, 0.0);
  } else {
    if (u_burst < 0.0) discard;
    float t = u_burst;
    float r = length(p);
    if (u_fizzle > 0.5) {
      // time's up: a short, low puff from the lock, gray, gone in a few seconds
      vec2 fp = p * 3.2 - vec2(0.0, -t * 0.35);
      float fb = fbm(fp + vec2(fbm(fp * 1.4 + t * 0.6), fbm(fp * 1.2 - t * 0.5)) * 1.2 - t * 0.5);
      float fbody = smoothstep(0.34 + t * 0.32, 0.0, r) * smoothstep(0.0, 0.2, t);
      float puff = clamp(fb * 3.0 - 0.6, 0.0, 1.0) * fbody * exp(-t * 0.45);
      col = mix(vec3(0.16, 0.16, 0.17), vec3(0.42, 0.41, 0.43), fb);
      alpha = puff * 0.95;
      outColor = vec4(col * alpha, alpha);
      return;
    }
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
    float body = smoothstep(0.55 + t * 0.6, 0.0, r) * smoothstep(0.0, 0.15, t);
    float smoke = clamp(billow * 3.0 - 0.55, 0.0, 1.0) * body * exp(-t * 0.28);
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
  const U = { res: u('u_res'), center: u('u_center'), time: u('u_time'), burst: u('u_burst'), layer: u('u_layer'), calm: u('u_calm'), fizzle: u('u_fizzle'), unit: u('u_unit'), release: u('u_release'), dim: u('u_dim') };
  gl.uniform1f(U.layer, layer);
  return {
    draw({ time, burst, center, calm, fizzle = 0, unit = 1, release = 1, dim = 1 }) {
      const w = canvas.width;
      const h = canvas.height;
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, layer === 1 ? 0 : 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(U.res, w, h);
      gl.uniform2f(U.center, center[0], h - center[1]);
      gl.uniform1f(U.time, time);
      gl.uniform1f(U.burst, burst);
      gl.uniform1f(U.fizzle, fizzle);
      gl.uniform1f(U.unit, unit);
      gl.uniform1f(U.release, release);
      gl.uniform1f(U.dim, dim);
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
    this.querySelectorAll('.sl-latch').forEach((l) => {
      l.addEventListener('click', () => this.#press(l));
      l.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.#press(l); } });
    });
    this.windowStart = performance.now(); // the minute starts when the lock appears, as in 2014
    this.release = 0;
    this.#startClock();
    this.#startField(reduced);
    this.reduced = reduced;
    this.#mountGlass(reduced);
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
        <div class="sl-lockbox">
        <svg class="sl-lock" viewBox="-320 -320 640 640" aria-label="A combination lock with three rings">
          <defs>
            <radialGradient id="sl-metal" r="0.75">
              <stop offset="0.55" stop-color="#2a292c"/><stop offset="0.8" stop-color="#121113"/><stop offset="1" stop-color="#060506"/>
            </radialGradient>
            <linearGradient id="sl-bevel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#5a585c"/><stop offset="0.45" stop-color="#232224"/><stop offset="1" stop-color="#0b0a0b"/>
            </linearGradient>
            <!-- the glass bezel: a frosted disk under everything, a clear rim that catches the light -->
            <radialGradient id="sl-glass-disk" r="0.5">
              <stop offset="0.72" stop-color="#b4dcff" stop-opacity="0"/><stop offset="0.93" stop-color="#b4dcff" stop-opacity="0.07"/><stop offset="1" stop-color="#dff2ff" stop-opacity="0.12"/>
            </radialGradient>
            <linearGradient id="sl-glass-rim" x1="0.15" y1="0.05" x2="0.85" y2="0.95">
              <stop offset="0" stop-color="#ffffff" stop-opacity="0.5"/><stop offset="0.35" stop-color="#cfe9ff" stop-opacity="0.08"/>
              <stop offset="0.7" stop-color="#9fd8ff" stop-opacity="0.05"/><stop offset="1" stop-color="#00fffc" stop-opacity="0.28"/>
            </linearGradient>
            <filter id="sl-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.5"/></filter>
            <!-- a lit slot: white-hot in the middle, through cyan, to deep blue, as 2012's lights were -->
            <radialGradient id="sl-lit" cx="50%" cy="50%" r="65%">
              <stop offset="0" stop-color="#eafdff"/><stop offset="0.35" stop-color="#00d8ff"/><stop offset="1" stop-color="#0050d8"/>
            </radialGradient>
            <!-- the slot ring sits raised: a soft shadow under it, outward onto the wheel and in toward the window -->
            <filter id="sl-raised" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="5" stdDeviation="7" flood-color="#000" flood-opacity="0.85"/>
            </filter>
            <filter id="sl-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <g class="sl-outer">
            <path d="${ring(190, 236)}" fill="url(#sl-metal)" fill-rule="evenodd" stroke="#000" stroke-width="2"/>
            <circle r="232" fill="none" stroke="#3b3a3d" stroke-width="1.5"/>
            <g class="sl-ticks">${ticks}</g>
            <path d="${ring(186, 190)}" fill="#050405" fill-rule="evenodd"/>
            <circle r="190" fill="none" stroke="#2d2c2f" stroke-width="2"/>
          </g>
          <g class="sl-latches">
            <path class="sl-latch" data-dir="0" data-ring="inner" role="button" tabindex="0" aria-label="Clamp: show the inner ring's number" d="${band(236, 274, -38, 38)}" fill="url(#sl-bevel)"/>
            <path class="sl-latch" data-dir="240" data-ring="outer" role="button" tabindex="0" aria-label="Clamp: show the outer ring's number" d="${band(236, 274, 202, 278)}" fill="url(#sl-bevel)"/>
            <path class="sl-latch" data-dir="120" data-ring="middle" role="button" tabindex="0" aria-label="Clamp: show the middle ring's number" d="${band(236, 274, 82, 158)}" fill="url(#sl-bevel)"/>
          </g>
          <g class="sl-inner">
            <path d="${ring(152, 186)}" fill="#161517" fill-rule="evenodd" filter="url(#sl-raised)"/>
            <circle r="152" fill="#000" fill-opacity="0.18"/>
            <g class="sl-slots" filter="url(#sl-glow)">${slots}</g>
          </g>
          ${dials}
          <g class="sl-clock" aria-hidden="true">
            <circle r="44" class="sl-clock-track"/>
            <path class="sl-clock-hand" d=""/>
          </g>
        </svg>
        <canvas class="sl-glass3d" aria-hidden="true"></canvas>
        </div>
        <p class="sl-status" role="status" aria-live="polite"></p>
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
          <p class="sl-word sl-meta" data-text="COMING SOON · 1.2027">COMING SOON · 1.2027</p>
          <p class="sl-actions">
            ${this.getAttribute('enter-href') ? `<a class="sl-enter" href="${this.getAttribute('enter-href')}">[ ENTER ]</a>` : ''}
            <button type="button" class="sl-again">[ RELOCK ]</button>
          </p>
        </div>
      </div>`;
  }

  // --- the dials -----------------------------------------------------------
  #wireDial(g) {
    const d = DIALS.find((x) => x.key === g.dataset.key);
    const svg = this.querySelector('.sl-lock');
    const set = (v) => {
      if (this.#open || this.broken) return;
      if (this.windowStart == null) this.windowStart = performance.now(); // a safety: the minute normally starts with the lock
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

  // a clamp pressed: it pushes in, the clamp ring spins one full turn, and its
  // ring gives itself away (two slots glow white, the status names the number)
  #press(latch) {
    if (this.#open || this.broken || this.spinning) return;
    this.spinning = true;
    const k = latch.dataset.ring;
    const a = ((Number(latch.dataset.dir) - 90) * Math.PI) / 180;
    const ring = this.querySelector('.sl-latches');
    const pairs = { inner: [0, 3], middle: [1, 4], outer: [2, 5] };
    const slots = [...this.querySelectorAll('.sl-slot')];
    const status = this.querySelector('.sl-status');
    const was = status.textContent;
    const label = { inner: 'Inner ring', middle: 'Middle ring', outer: 'Outer ring' }[k];
    const tl = gsap.timeline({
      onComplete: () => {
        pairs[k].forEach((i) => slots[i].classList.remove('peek'));
        if (!this.#open && !this.broken) status.textContent = was;
        this.spinning = false;
      },
    });
    // press in toward the center, then back out
    tl.to(latch, { x: -Math.cos(a) * 7, y: -Math.sin(a) * 7, filter: 'brightness(0.7)', duration: 0.08, ease: 'power2.out' });
    tl.to(latch, { x: 0, y: 0, filter: 'brightness(1)', duration: 0.18, ease: 'back.out(3)' });
    // the whole clamp ring spins one turn and settles where it began
    tl.add(() => {
      pairs[k].forEach((i) => slots[i].classList.add('peek'));
      status.textContent = `${label}: ${COMBO[k]}`;
    }, 0.1);
    tl.fromTo(ring, { rotation: 0 }, { rotation: this.reduced ? 0 : 360, svgOrigin: '0 0', duration: this.reduced ? 0 : 1.1, ease: 'power3.inOut' }, 0.12);
    tl.to({}, { duration: this.reduced ? 1.6 : 0.6 });
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
    // each ring that is right lights its pair of slots, opposite each other
    const pairs = { inner: [0, 3], middle: [1, 4], outer: [2, 5] };
    const slots = this.querySelectorAll('.sl-slot');
    for (const [k, [a, b]] of Object.entries(pairs)) {
      const on = v[k] === COMBO[k];
      slots[a].classList.toggle('lit', on);
      slots[b].classList.toggle('lit', on);
    }
    if (v.inner === COMBO.inner && v.middle === COMBO.middle && v.outer === COMBO.outer) this.#unlock();
  }

  // --- the glass bezel: three.js, loaded after the lock is up ---------------
  #mountGlass(reduced) {
    const canvas = this.querySelector('.sl-glass3d');
    import('./spacelab-glass.js')
      .then(({ mountGlass }) => {
        if (!canvas.isConnected) return;
        const glass = mountGlass(canvas, { reduced });
        this.#cleanup.push(() => glass.dispose());
      })
      .catch(() => canvas.remove()); // no WebGL or no three: the lock stands without its glass
  }

  // --- the seconds clock in the middle -------------------------------------
  // the seconds clock until a dial turns; then the ring is your minute, as in 2014
  #startClock() {
    const hand = this.querySelector('.sl-clock-hand');
    const tick = () => {
      let s;
      if (this.windowStart != null && !this.#open && !this.broken) {
        s = (performance.now() - this.windowStart) / 1000;
        if (s >= 60) return this.#timesUp();
        this.classList.toggle('sl-hurry', s > 50);
      } else {
        s = new Date().getSeconds();
      }
      hand.setAttribute('d', s >= 0.5 ? arc(44, 0, Math.max(0.5, s * 6)) : '');
    };
    tick();
    const id = setInterval(tick, 200);
    this.#cleanup.push(() => clearInterval(id));
  }

  // --- time's up: a gray puff, the lock shorts out, the dials fall back -----
  #timesUp() {
    this.broken = true;
    this.windowStart = null;
    this.fizzleAt = performance.now();
    this.classList.remove('sl-hurry');
    this.classList.add('sl-broken');
    const status = this.querySelector('.sl-status');
    status.textContent = 'You missed your window. Authorities have not been alerted.';
    setTimeout(() => this.#zero(), 400);
    setTimeout(() => {
      this.broken = false;
      this.classList.remove('sl-broken');
      status.textContent = 'Try again.';
      this.windowStart = performance.now(); // a fresh minute once it powers back up
    }, 3400);
  }

  #zero() {
    this.#values = { outer: 0, middle: 0, inner: 0 };
    this.querySelectorAll('.sl-slot').forEach((sl) => sl.classList.remove('lit'));
    this.querySelectorAll('.sl-dial').forEach((g) => {
      g.setAttribute('aria-valuenow', 0);
      g.setAttribute('aria-valuetext', '0');
      gsap.to(g.querySelector('.sl-cursor'), { rotation: 0, svgOrigin: '0 0', duration: this.reduced ? 0 : 0.7, ease: 'power3.inOut' });
    });
    this.#readout();
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
      this.dimNow = (this.dimNow ?? 1) + ((this.broken ? 0.25 : 1) - (this.dimNow ?? 1)) * 0.08;
      const state = { time: now - t0, burst, center, calm: reduced ? 1 : 0, unit: (lock.width / 640) * dpr, release: this.release ?? 0, dim: this.dimNow };
      back.draw(state);
      const fizzle = this.fizzleAt == null ? -1 : (now - this.fizzleAt) / 1000;
      if (burst >= 0 && burst < 9) front.draw(state);
      else if (fizzle >= 0 && fizzle < 7) front.draw({ ...state, burst: fizzle, fizzle: 1 });
      else front.draw({ ...state, burst: -1 });
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
    tl.to(this, { release: 1, duration: 1.8, ease: 'power2.out' }, 2.7); // the blobs burst out of the lock
    all('.sl-latch').forEach((l) => {
      const a = ((Number(l.dataset.dir) - 90) * Math.PI) / 180;
      tl.to(l, { x: Math.cos(a) * 900, y: Math.sin(a) * 900, rotation: gsap.utils.random(-540, 540), svgOrigin: '0 0', opacity: 0, duration: 1.4, ease: 'power2.out' }, 2.7);
    });
    tl.fromTo(q('.sl-lockbox'), { scale: 1 }, { scale: 1.12, duration: 0.12, ease: 'power2.out', yoyo: true, repeat: 1 }, 2.7);
    // 4. the lock falls away into the distance
    tl.to(q('.sl-lockbox'), { scale: 0, opacity: 0, rotation: 30, duration: 1.1, ease: 'power3.in' }, 3.1);
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
    const again = panel.querySelector('.sl-enter') || panel.querySelector('.sl-again');
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
    tl.fromTo(panel.querySelector('.sl-actions'), { opacity: 0 }, { opacity: 1, duration: 0.6 }, 2.4);
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
    this.classList.remove('sl-blasted', 'sl-broken', 'sl-hurry');
    this.hinted = false;
    this.windowStart = null;
    this.fizzleAt = null;
    this.broken = false;
    cancelAnimationFrame(this.#raf);
    this.#cleanup.forEach((fn) => fn());
    this.#cleanup = [];
    this.connectedCallback();
  }
}

customElements.define('spacelab-lock', SpacelabLock);
