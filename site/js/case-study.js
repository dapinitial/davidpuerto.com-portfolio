// Shared entry for all case-study pages.
import './elements/rain-fall.js';
import './elements/neon-text.js';
import './elements/tts-button.js';
import './elements/case-study-nav.js';
import './elements/video-player.js';
import './elements/pill-list.js';
import { ScrollTrigger } from './lib/gsap.js';

// Lazy images shift the layout as they land — re-sync every ScrollTrigger
// (debounced) so pins/scrubs never run on stale measurements.
let lazySync;
document.addEventListener(
  'load',
  (e) => {
    if (e.target.tagName !== 'IMG') return;
    clearTimeout(lazySync);
    lazySync = setTimeout(() => ScrollTrigger.refresh(), 200);
  },
  true, // capture — image load events don't bubble
);
