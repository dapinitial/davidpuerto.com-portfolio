// GA4 collection — the measurement id lives in <meta name="ga-id"> so the
// markup is the single source of truth (no env plumbing into the bundle).
// Missing/empty meta, Do Not Track or Global Privacy Control → no-op; the site works before GA exists.
//
// Alongside GA, the site's own visit log (server/visits.js): page views and
// what people do on a page go to POST /api/v, under the same rules.
const id = document.querySelector('meta[name="ga-id"]')?.content.trim();

// Only the real site counts: a local or preview copy never sends hits.
const live = /(^|\.)davidpuerto\.com$/.test(location.hostname);
// The automated checks mark themselves internal, so GA can filter them out.
const internal = (() => { try { return localStorage.getItem('dp-internal') === '1'; } catch { return false; } })();
const allowed = navigator.doNotTrack !== '1' && !navigator.globalPrivacyControl;
// A local server can opt in to the visit log for testing (marked internal).
const logLocal = (() => { try { return localStorage.getItem('dp-log-local') === '1'; } catch { return false; } })();
const logging = allowed && (live || logLocal);

if (id && live && allowed) {
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.append(s);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', id, internal ? { traffic_type: 'internal' } : {});
}

// ?ref= on a link David sent. Only the first page carries it; the server ties
// the rest of the visit to it, so nothing is stored in the browser.
const tag = new URLSearchParams(location.search).get('ref');

// Write one line to the visit log. Beacons survive a navigation away.
export function note(e, d) {
  if (!logging || location.pathname.startsWith('/admin')) return;
  const body = {
    e,
    p: location.pathname,
    ...(d ? { d } : {}),
    ...(tag ? { ref: tag } : {}),
    ...(internal || (logLocal && !live) ? { i: 1 } : {}),
    ...(navigator.webdriver ? { w: 1 } : {}),
  };
  if (e === 'view') {
    body.r = document.referrer && !document.referrer.startsWith(location.origin) ? document.referrer : undefined;
    body.s = `${screen.width}x${screen.height}`;
    if (document.querySelector('meta[name="not-found"]')) body.nf = 1;
  }
  const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
  if (!navigator.sendBeacon?.('/api/v', blob)) fetch('/api/v', { method: 'POST', body: blob, keepalive: true }).catch(() => {});
}

// Fire a custom event — safe no-op when collection is off (no id / DNT / GPC).
// Beacon transport so events survive an immediate navigation (login redirect).
export function track(name, params = {}) {
  window.gtag?.('event', name, { transport_type: 'beacon', ...params });
  note(name, Object.keys(params).length ? params : undefined);
}

if (logging) {
  note('view');

  // how far down the page: 25, 50, 75, 100%, each once
  const marks = new Set();
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (max < 200) return;
    const pct = (scrollY / max) * 100;
    for (const m of [25, 50, 75, 100]) if (pct >= m - 1 && !marks.has(m)) { marks.add(m); note('scroll', { pct: m }); }
  };
  addEventListener('scroll', () => requestAnimationFrame(onScroll), { passive: true });

  // links that leave the site, and PDFs
  addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href]');
    if (!a) return;
    const url = new URL(a.href, location.href);
    if (/\.pdf$/i.test(url.pathname)) note('pdf', { file: url.pathname.split('/').pop() });
    else if (url.origin !== location.origin && /^https?:$/.test(url.protocol)) note('outbound', { host: url.hostname });
  }, true);

  // videos: played, and how far they got when they stopped
  const seen = new WeakSet();
  addEventListener('play', (e) => {
    const v = e.target;
    if (!(v instanceof HTMLVideoElement) || v.autoplay || seen.has(v)) return;
    seen.add(v);
    note('video', { state: 'play', src: (v.currentSrc || '').split('/').pop().slice(0, 60) });
  }, true);
  addEventListener('ended', (e) => {
    if (e.target instanceof HTMLVideoElement && !e.target.autoplay) note('video', { state: 'ended' });
  }, true);

  // time actually looking at the page, sent when they leave it
  let shown = document.visibilityState === 'visible' ? performance.now() : null;
  let total = 0;
  addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') shown = performance.now();
    else if (shown != null) { total += performance.now() - shown; shown = null; }
  });
  addEventListener('pagehide', () => {
    if (shown != null) total += performance.now() - shown;
    note('leave', { s: Math.round(total / 1000) });
  });
}
