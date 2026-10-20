// The lock's glass bezel: a real 3D torus in the Unakin glass, the same recipe
// as unakin.com's Blender models. A deep-teal alpha glass with a hard
// clearcoat, a room environment to reflect, a magenta rim low-left, a cyan
// rim high-right, a white key and filmic tone mapping; the bloom is a CSS glow
// on the canvas, since three's bloom pass drops the transparency. It tilts
// a little with the cursor. Loaded only when the lock is on the page.
//
// mountGlass(canvas, { reduced }) -> { setOpacity(v), dispose() }
// The canvas sits exactly over the lock's SVG; the camera is orthographic in
// the SVG's own units (-320..320), so the torus lines up with the drawing.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const PINK = 0xff4fd8;
const CYAN = 0x4fe3ff;
const RING = 286; // centerline radius, in SVG units: just outside the latches
const TUBE = 14;

export function mountGlass(canvas, { reduced = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-320, 320, 320, -320, -2000, 2000);
  camera.position.z = 1000;

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  // the Unakin alpha glass: dark teal at low opacity, the shine from clearcoat and the rims
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x1e5f78,
    metalness: 0,
    roughness: 0.16,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 0.55,
    specularIntensity: 1,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(RING, TUBE, 64, 256), material);
  scene.add(ring);

  // lights in SVG units; no falloff, so the rims read at this scale
  scene.add(new THREE.AmbientLight(0x6f8cff, 0.12));
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(-300, 500, 800);
  scene.add(key);
  const pink = new THREE.PointLight(PINK, 2.6, 0, 0);
  pink.position.set(-520, -360, 220);
  scene.add(pink);
  const cyan = new THREE.PointLight(CYAN, 2.0, 0, 0);
  cyan.position.set(480, 380, 260);
  scene.add(cyan);

  const size = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
  };
  const ro = new ResizeObserver(size);
  ro.observe(canvas);
  size();

  // a little tilt toward the cursor, as the Unakin models do
  let tx = 0;
  let ty = 0;
  const onMove = (e) => {
    tx = (e.clientY / innerHeight - 0.5) * 0.35;
    ty = (e.clientX / innerWidth - 0.5) * 0.45;
  };
  if (!reduced) addEventListener('pointermove', onMove, { passive: true });

  let raf = 0;
  let visible = true;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
  io.observe(canvas);
  const t0 = performance.now();
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    ring.rotation.x += (tx - ring.rotation.x) * 0.06;
    ring.rotation.y += (ty - ring.rotation.y) * 0.06;
    // the rims drift slowly, so light travels around the glass
    if (!reduced) {
      const a = (now - t0) * 0.00018;
      cyan.position.set(Math.cos(a) * 560, Math.sin(a) * 420, 260);
      pink.position.set(Math.cos(a + Math.PI) * 560, Math.sin(a + Math.PI) * 420, 220);
    }
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(loop);

  return {
    setOpacity(v) { material.opacity = 0.5 * v; },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      removeEventListener('pointermove', onMove);
      ring.geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
