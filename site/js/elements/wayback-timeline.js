// <wayback-timeline src="/images/wayback/manifest.json"> — every archived
// version of davidpuerto.com as a pane in a corridor that recedes into depth.
// Scroll, drag, arrow keys or the year ruler travel through time; the pane in
// front is the version on screen. Moving fast splits the panes' color.
//
// Light DOM. The ruler is real buttons, so keyboard and screen readers get the
// whole timeline; WebGL is the picture on top. No WebGL: a linked grid.
// Reduced motion: frames cross-fade in place, no travel, no color split.
// Pair with css/elements/wayback-timeline.css.
import * as THREE from 'three';

const GAP = 2.4; // depth between panes
const W = 3.2; // pane width; captures are 1280x800
const H = W * (800 / 1280);

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
// the color split runs along x with the travel speed; the edges glow coral only while traveling
const fragment = /* glsl */ `
  uniform sampler2D map;
  uniform float opacity, shift, loaded;
  uniform vec3 accent;
  varying vec2 vUv;
  void main() {
    vec2 d = vec2(shift * 0.02, 0.0);
    vec3 c = vec3(texture2D(map, vUv + d).r, texture2D(map, vUv).g, texture2D(map, vUv - d).b);
    c = mix(vec3(0.06, 0.05, 0.055), c, loaded);
    float edge = smoothstep(0.0, 0.02, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
    c = mix(accent, c, mix(1.0, edge, min(1.0, abs(shift) * 1.5)));
    gl_FragColor = vec4(c, opacity);
  }
`;

const fmt = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const dateOf = (ts) => new Date(Date.UTC(+ts.slice(0, 4), +ts.slice(4, 6) - 1, +ts.slice(6, 8)));
const archiveUrl = (ts) => `https://web.archive.org/web/${ts}/http://davidpuerto.com/`;

class WaybackTimeline extends HTMLElement {
  #frames = [];
  #t = 0; // where the camera is, in frames
  #target = 0; // where it is heading
  #raf = 0;
  #cleanup = [];

  async connectedCallback() {
    const res = await fetch(this.getAttribute('src'));
    this.#frames = await res.json();
    this.#target = this.#t = this.#frames.length - 1; // open on today
    this.#renderChrome();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!this.#hasGL()) return this.#renderGrid();
    this.querySelector('.wt-stage').title = 'Open this version on the Wayback Machine';
    this.#initGL(reduced);
    this.#select(this.#frames.length - 1, { instant: true });
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.#raf);
    this.#cleanup.forEach((fn) => fn());
  }

  #hasGL() {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      return false;
    }
  }

  // --- the DOM: year, date, link, and the ruler ---------------------------
  #renderChrome() {
    const first = +this.#frames[0].ts.slice(0, 4);
    const last = +this.#frames.at(-1).ts.slice(0, 4);
    const span = last - first + 1;
    this.innerHTML = `
      <div class="wt-stage"></div>
      <div class="wt-readout">
        <p class="wt-year" aria-hidden="true"></p>
        <p class="wt-date" aria-live="polite"></p>
        <p class="wt-note" hidden>Archived without its styles and scripts</p>
        <a class="wt-open" target="_blank" rel="noopener noreferrer">Open this capture on the Wayback Machine</a>
      </div>
      <nav class="wt-ruler" aria-label="Archived versions by date">
        <ol>${this.#frames
          .map((f, i) => {
            const y = +f.ts.slice(0, 4) + (+f.ts.slice(4, 6) - 1) / 12;
            return `<li style="--x:${((y - first) / span) * 100}%"><button type="button" data-i="${i}" aria-label="${fmt.format(dateOf(f.ts))}"></button></li>`;
          })
          .join('')}</ol>
        <div class="wt-years" aria-hidden="true">${Array.from({ length: span }, (_, k) => `<span style="--x:${(k / span) * 100}%">${first + k}</span>`).join('')}</div>
      </nav>
      <p class="wt-hint" aria-hidden="true">Scroll, drag or use the arrow keys to travel</p>`;
    this.querySelector('.wt-ruler').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-i]');
      if (b) this.#select(+b.dataset.i);
    });
  }

  #select(i, { instant = false } = {}) {
    i = Math.max(0, Math.min(this.#frames.length - 1, i));
    this.#target = i;
    if (instant) this.#t = i;
    const f = this.#frames[i];
    this.querySelector('.wt-year').textContent = f.ts.slice(0, 4);
    this.querySelector('.wt-date').textContent = fmt.format(dateOf(f.ts));
    this.querySelector('.wt-open').href = archiveUrl(f.ts);
    this.querySelector('.wt-note').hidden = !f.bare;
    this.querySelectorAll('.wt-ruler button').forEach((b, k) => {
      if (k === i) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
  }

  // a version whose Flash file was never archived: say so, in its own pane
  #card(f) {
    const c = document.createElement('canvas');
    c.width = 1280;
    c.height = 800;
    const g = c.getContext('2d');
    g.fillStyle = '#141113';
    g.fillRect(0, 0, 1280, 800);
    g.strokeStyle = '#4a4448';
    g.lineWidth = 2;
    g.strokeRect(40, 40, 1200, 720);
    g.fillStyle = '#fb836d';
    g.font = 'italic 160px Fraunces, serif';
    g.fillText(f.ts.slice(0, 4), 110, 330);
    g.fillStyle = '#fff0f4';
    g.font = '44px "Noto Sans Display", sans-serif';
    g.fillText('A Flash site lived here.', 110, 440);
    g.fillStyle = '#a09aa2';
    g.font = '30px "Noto Sans Display", sans-serif';
    g.fillText('Its SWF was never archived, so only the title survives:', 110, 510);
    const words = (f.title || '').split(' ');
    let line = '';
    let y = 580;
    for (const w of words) {
      if (g.measureText(`${line}${w} `).width > 1060) { g.fillText(line, 110, y); line = ''; y += 44; }
      line += `${w} `;
    }
    g.fillText(line, 110, y);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // --- no WebGL: the same history as a linked grid -------------------------
  #renderGrid() {
    this.querySelector('.wt-stage').innerHTML = `<ul class="wt-grid">${this.#frames
      .map((f) => `<li><a href="${archiveUrl(f.ts)}" target="_blank" rel="noopener noreferrer">${f.src ? `<img src="${f.src}" alt="davidpuerto.com on ${fmt.format(dateOf(f.ts))}" loading="lazy" width="1280" height="800">` : '<span class="wt-lost">Flash, not archived</span>'}<span>${fmt.format(dateOf(f.ts))}</span></a></li>`)
      .join('')}</ul>`;
    this.classList.add('wt-flat');
    this.#select(this.#frames.length - 1);
  }

  // --- WebGL: the corridor --------------------------------------------------
  #initGL(reduced) {
    const stage = this.querySelector('.wt-stage');
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.domElement.setAttribute('aria-hidden', 'true');
    stage.append(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0e0c0d, 4, GAP * 6);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    const accent = new THREE.Color('#fb836d');
    const loader = new THREE.TextureLoader();

    const panes = this.#frames.map((f, i) => {
      const material = new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthWrite: false,
        uniforms: { map: { value: null }, opacity: { value: 0 }, shift: { value: 0 }, loaded: { value: 0 }, accent: { value: accent } },
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(W, H), material);
      mesh.userData = { i, requested: false };
      scene.add(mesh);
      return mesh;
    });

    // load the panes near the camera first, the rest as you travel
    const load = (i) => {
      const m = panes[i];
      if (!m || m.userData.requested) return;
      m.userData.requested = true;
      if (!this.#frames[i].src) {
        m.material.uniforms.map.value = this.#card(this.#frames[i]);
        m.material.uniforms.loaded.value = 1;
        return;
      }
      loader.load(this.#frames[i].src, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        m.material.uniforms.map.value = tex;
        m.material.uniforms.loaded.value = 1;
      });
    };

    const resize = () => {
      const { width, height } = stage.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      // keep the front pane fully in frame on a phone
      camera.fov = camera.aspect < 1 ? 70 : 45;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(stage);
    resize();

    // input: wheel, drag, keys; the ruler handles clicks
    let wheelAcc = 0;
    const onWheel = (e) => {
      e.preventDefault();
      wheelAcc += e.deltaY;
      if (Math.abs(wheelAcc) > 60) {
        this.#select(this.#target + Math.sign(wheelAcc));
        wheelAcc = 0;
      }
    };
    let dragX = null;
    let downAt = null;
    const onDown = (e) => { dragX = e.clientX; downAt = [e.clientX, e.clientY]; stage.setPointerCapture(e.pointerId); };
    const onMove = (e) => {
      if (dragX == null) return;
      const dx = e.clientX - dragX;
      if (Math.abs(dx) > 50) { this.#select(this.#target + (dx < 0 ? 1 : -1)); dragX = e.clientX; }
    };
    // a click that did not drag opens the pane in front on the Wayback Machine
    const onUp = (e) => {
      dragX = null;
      if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 6) {
        window.open(archiveUrl(this.#frames[this.#target].ts), '_blank', 'noopener');
      }
      downAt = null;
    };
    const onKey = (e) => {
      if (e.target.closest('input, textarea')) return;
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (step) { e.preventDefault(); this.#select(this.#target + step); }
      if (e.key === 'Home') { e.preventDefault(); this.#select(0); }
      if (e.key === 'End') { e.preventDefault(); this.#select(this.#frames.length - 1); }
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', onUp);
    addEventListener('keydown', onKey);
    this.#cleanup.push(() => {
      ro.disconnect();
      removeEventListener('keydown', onKey);
      renderer.dispose();
    });

    // the frames fade between each other in place when motion is reduced
    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(stage);
    this.#cleanup.push(() => io.disconnect());

    let last = performance.now();
    const tick = (now) => {
      this.#raf = requestAnimationFrame(tick);
      if (!visible || document.hidden) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const prev = this.#t;
      this.#t += (this.#target - this.#t) * (reduced ? 1 : 1 - Math.exp(-dt * 6));
      const speed = reduced ? 0 : (this.#t - prev) / Math.max(dt, 1e-3);

      for (let k = -2; k <= 4; k++) load(Math.round(this.#t) + k);

      panes.forEach((m) => {
        const d = m.userData.i - this.#t; // < 0: behind the camera
        const u = m.material.uniforms;
        if (reduced) {
          m.position.set(0, 0, 0);
          m.rotation.y = 0;
          u.opacity.value = Math.max(0, 1 - Math.abs(d) * 2);
        } else {
          // a gentle S through the corridor, older years further back
          m.position.set(Math.sin(m.userData.i * 0.9) * 0.9 * Math.min(1, Math.abs(d)), Math.cos(m.userData.i * 0.7) * 0.25 * Math.min(1, Math.abs(d)), -m.userData.i * GAP);
          m.rotation.y = THREE.MathUtils.clamp(-d * 0.18, -0.6, 0.6) * Math.sign(Math.sin(m.userData.i * 0.9) || 1);
          u.opacity.value = d < -0.6 ? 0 : d < 0 ? 1 + d / 0.6 : Math.max(0, 1 - d / 6);
        }
        u.shift.value = THREE.MathUtils.clamp(speed * 0.35, -1, 1);
        m.visible = u.opacity.value > 0.01;
      });

      // on a wide screen the pane sits right of center, clear of the year
      const ox = camera.aspect > 1.3 ? -0.9 : 0;
      const oy = camera.aspect > 1.3 ? 0 : 0.35;
      if (reduced) {
        camera.position.set(ox, oy, 4.2);
        camera.lookAt(ox, oy, 0);
      } else {
        const z = -this.#t * GAP;
        camera.position.set(ox, oy, z + 4.2);
        camera.lookAt(ox, oy, z - 2);
      }
      renderer.render(scene, camera);
    };
    this.#raf = requestAnimationFrame(tick);
  }
}

customElements.define('wayback-timeline', WaybackTimeline);
