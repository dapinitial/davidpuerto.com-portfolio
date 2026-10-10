// About page: rain + the clipped image/video reveal.
import './elements/rain-fall.js';
import './elements/clipped-image.js';

// --- The piece: load three.js only when a glass piece is near ---------------
// A WebGL-less browser or a failed load leaves the slide as copy alone.
const piece = document.querySelector('glass-piece');
if (piece) {
  const hasGL = (() => {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      return false;
    }
  })();
  if (!hasGL) {
    document.querySelectorAll('glass-piece').forEach((p) => p.setAttribute('data-error', ''));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        import('./elements/glass-piece.js').catch(() => document.querySelectorAll('glass-piece').forEach((p) => p.setAttribute('data-error', '')));
      },
      { rootMargin: '800px 0px' },
    );
    io.observe(piece);
  }
}
