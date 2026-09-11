// SonoSite iViz case study — page-specific elements + the live radial thumb-wheel.
// The wheel is the 2013 prototype's idea, remade in 2026 componentry: drag/spin it with a
// pointer or thumb, momentum + friction under the pad, an oversized invisible hitbox (the
// gloved-thumb principle), keyboard-nudgeable, and honest about reduced motion.
import '../elements/accordion-list.js';

const wheel = document.querySelector('.ss-wheel');
if (wheel) {
  const rotor = wheel.querySelector('.rotor');
  const readout = document.querySelector('.ss-readout b');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let angle = 0;          // cumulative rotation, degrees
  let vel = 0;            // deg / frame (momentum)
  let dragging = false, lastA = 0, lastT = 0, raf = 0;
  const MIN = 2, MAX = 30, START = 12.4;   // depth range in cm — a real ultrasound-ish scale

  const center = () => { const r = wheel.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const angleAt = (e) => { const c = center(); return Math.atan2(e.clientY - c.y, e.clientX - c.x) * 180 / Math.PI; };
  const depth = () => Math.min(MAX, Math.max(MIN, START + angle / 36));   // 36° per cm — tuned so a thumb sweep ≈ a few cm
  const paint = () => {
    rotor.style.transform = `rotate(${angle}deg)`;
    const d = depth();
    if (readout) readout.textContent = d.toFixed(1) + ' cm';
    wheel.setAttribute('aria-valuenow', d.toFixed(1));
  };

  const tick = () => {
    if (dragging || Math.abs(vel) < 0.05) { vel = 0; raf = 0; return; }
    angle += vel; vel *= 0.94;               // friction: the wheel glides, then settles under the pad
    paint(); raf = requestAnimationFrame(tick);
  };

  wheel.addEventListener('pointerdown', (e) => {
    dragging = true; vel = 0; cancelAnimationFrame(raf); raf = 0;
    lastA = angleAt(e); lastT = performance.now();
    wheel.setPointerCapture(e.pointerId);
  });
  wheel.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const a = angleAt(e); let d = a - lastA;
    if (d > 180) d -= 360; if (d < -180) d += 360;   // unwrap across the ±180° seam
    angle += d; lastA = a;
    const now = performance.now(); vel = d / Math.max(1, (now - lastT)) * 16; lastT = now;
    paint();
  });
  const release = () => { if (!dragging) return; dragging = false;
    if (reduce) { vel = 0; return; }
    if (!raf) raf = requestAnimationFrame(tick); };
  wheel.addEventListener('pointerup', release);
  wheel.addEventListener('pointercancel', release);

  // Keyboard: arrows nudge a step; the wheel is a real control, not a picture.
  wheel.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 36 : 9;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { angle += step; paint(); e.preventDefault(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { angle -= step; paint(); e.preventDefault(); }
  });

  paint();
}
