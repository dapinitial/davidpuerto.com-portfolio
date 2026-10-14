// <glass-piece model="/models/knight.glb" caption="…">
//
// One object rendered as black obsidian glass, driven by every input the
// visitor has: pointer on desktop, the phone's tilt on touch devices (after
// iOS's permission tap), and the scroll position for a slow settle. Every
// modality is a small adapter over one target rotation — the same idea as
// the cursor lab's input bus. Reduced motion renders one still frame.
//
// Light DOM: the canvas, an optional "Tilt" button (touch devices that need a
// permission gesture), and the caption. The host gets data-loaded once the
// model is on screen and data-error if it failed. Loaded lazily by the page
// that uses it (case-studies/microsoft.js), so three.js is never on the
// homepage's critical path.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const WEBKIT = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
const TOUCH = matchMedia('(pointer: coarse)').matches;

// The site's accents as rim light: coral low-left, teal high-right.
const CORAL = 0xfb836d;
const TEAL = 0x00a3bb;

function obsidian() {
  // Dark glass: a near-black body with a hard clearcoat, so the shape reads
  // from reflections and the two rims rather than from a diffuse colour.
  return new THREE.MeshPhysicalMaterial({
    color: 0x0b0a0c,
    metalness: 0,
    roughness: 0.18,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 0.9,
    specularIntensity: 1,
    sheen: 0.2,
    sheenColor: new THREE.Color(0x3a2f33),
  });
}

class GlassPiece extends HTMLElement {
  #abort = new AbortController();
  #frame = 0;
  #renderer = null;

  connectedCallback() {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const url = this.getAttribute('model') ?? '/models/knight.glb';
    const caption = this.getAttribute('caption');

    this.innerHTML = `<canvas aria-hidden="true"></canvas>${caption ? `<p class="glass-piece-caption">${caption}</p>` : ''}`;
    const canvas = this.querySelector('canvas');
    const W = () => Math.max(1, this.clientWidth);
    const H = () => Math.max(1, this.clientHeight);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch {
      this.setAttribute('data-error', '');
      return;
    }
    this.#renderer = renderer;
    renderer.setPixelRatio(Math.min(devicePixelRatio, TOUCH || WEBKIT ? 1.25 : 1.75));
    renderer.setSize(W(), H(), false);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, W() / H(), 0.1, 100);
    camera.position.set(0, 0.15, 5.2);
    scene.add(camera);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    scene.add(new THREE.AmbientLight(0xffffff, 0.06));
    const key = new THREE.DirectionalLight(0xffffff, 0.5);
    key.position.set(1.2, 3, 4);
    scene.add(key);
    const coral = new THREE.PointLight(CORAL, 18, 14);
    coral.position.set(-3, -1.4, 1.2);
    scene.add(coral);
    const teal = new THREE.PointLight(TEAL, 12, 14);
    teal.position.set(2.8, 2.2, 1.4);
    scene.add(teal);

    const pivot = new THREE.Group();
    scene.add(pivot);

    // --- one target, many adapters ---------------------------------------
    const target = { x: 0, y: 0 }; // radians, where the piece wants to face
    const input = { pointerX: 0, pointerY: 0, tiltX: 0, tiltY: 0, scroll: 0 };
    const compose = () => {
      target.y = input.pointerX * 0.55 + input.tiltY * 0.6 + input.scroll * 0.9 - 0.35;
      target.x = input.pointerY * 0.3 + input.tiltX * 0.4 + 0.05;
    };

    // pointer: relative to the piece's centre, so it looks toward the cursor
    if (!TOUCH) {
      window.addEventListener(
        'pointermove',
        (e) => {
          const r = this.getBoundingClientRect();
          input.pointerX = (e.clientX - (r.left + r.width / 2)) / innerWidth;
          input.pointerY = (e.clientY - (r.top + r.height / 2)) / innerHeight;
          compose();
        },
        { signal: this.#abort.signal, passive: true },
      );
    }

    // scroll: a slow quarter-turn as the piece crosses the viewport
    const onScroll = () => {
      const r = this.getBoundingClientRect();
      const p = 1 - Math.min(1, Math.max(0, (r.top + r.height / 2) / innerHeight)); // 0 at the bottom, 1 at the top
      input.scroll = (p - 0.5) * 1.2;
      compose();
    };
    window.addEventListener('scroll', onScroll, { signal: this.#abort.signal, passive: true });
    onScroll();

    // tilt: the phone's orientation; iOS needs a gesture before it will say
    const onTilt = (e) => {
      if (e.gamma == null || e.beta == null) return;
      input.tiltY = Math.max(-1, Math.min(1, e.gamma / 35));
      input.tiltX = Math.max(-1, Math.min(1, (e.beta - 45) / 35));
      compose();
    };
    const armTilt = () => window.addEventListener('deviceorientation', onTilt, { signal: this.#abort.signal, passive: true });
    if (TOUCH && 'DeviceOrientationEvent' in window && !reduced) {
      const DOE = window.DeviceOrientationEvent;
      if (typeof DOE.requestPermission === 'function') {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'glass-piece-tilt';
        btn.textContent = 'Tilt to look around';
        this.appendChild(btn);
        btn.addEventListener(
          'click',
          async () => {
            try {
              if ((await DOE.requestPermission()) === 'granted') armTilt();
            } catch {
              /* denied: the piece still answers scroll */
            }
            btn.remove();
          },
          { signal: this.#abort.signal },
        );
      } else {
        armTilt();
      }
    }

    // --- the model --------------------------------------------------------
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    let visible = false;
    loader.load(
      url,
      (gltf) => {
        const root = gltf.scene;
        const box = new THREE.Box3().setFromObject(root);
        const size = box.getSize(new THREE.Vector3()).length() || 1;
        const s = 2.6 / size; // a little air above the ears and under the foot
        root.scale.setScalar(s);
        const center = box.getCenter(new THREE.Vector3()).multiplyScalar(s);
        root.traverse((c) => {
          if (c.isMesh) c.material = obsidian();
        });
        root.position.sub(center);
        pivot.add(root);
        this.setAttribute('data-loaded', '');
        if (reduced) {
          pivot.rotation.set(0.05, -0.35, 0);
          renderer.render(scene, camera);
        }
      },
      undefined,
      () => this.setAttribute('data-error', ''),
    );

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries.some((e) => e.isIntersecting);
      },
      { threshold: 0.05 },
    );
    io.observe(this);
    this.#abort.signal.addEventListener('abort', () => io.disconnect());

    if (!reduced) {
      let skip = false;
      const animate = () => {
        this.#frame = requestAnimationFrame(animate);
        if (WEBKIT) {
          skip = !skip;
          if (skip) return; // 30 fps on Safari is plenty for a slow drift
        }
        if (!visible) return;
        // in deck mode every slide is a fixed layer that 'intersects' the viewport
        // even while hidden; only the active slide's piece is worth a frame
        const beat = this.closest('.deck-beat');
        if (beat && !beat.classList.contains('active')) return;
        pivot.rotation.y += 0.05 * (target.y - pivot.rotation.y);
        pivot.rotation.x += 0.05 * (target.x - pivot.rotation.x);
        pivot.rotation.z = Math.sin(performance.now() * 0.0003) * 0.03;
        renderer.render(scene, camera);
      };
      animate();
    }

    const ro = new ResizeObserver(() => {
      camera.aspect = W() / H();
      camera.updateProjectionMatrix();
      renderer.setSize(W(), H(), false);
      if (reduced) renderer.render(scene, camera);
    });
    ro.observe(this);
    this.#abort.signal.addEventListener('abort', () => ro.disconnect());
  }

  disconnectedCallback() {
    this.#abort.abort();
    cancelAnimationFrame(this.#frame);
    this.#renderer?.dispose();
  }
}

customElements.define('glass-piece', GlassPiece);
