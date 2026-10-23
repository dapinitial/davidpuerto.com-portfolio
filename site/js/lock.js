// /lock: the 2014 combination lock, rebuilt. The lock itself is the shared
// spacelab-lock package (github:dapinitial/spacelab-lock), the same source
// spacelabforever.com mounts; its styles ride in with it.
import 'spacelab-lock';
import 'spacelab-lock/spacelab-lock.css';
import { note } from './lib/analytics.js';

// the lock's moments, counted: lock_hint, lock_clamp, lock_timeout, lock_open
document.addEventListener('sl-note', (e) => {
  const { name, ...data } = e.detail;
  note(name, Object.keys(data).length ? data : undefined);
});
