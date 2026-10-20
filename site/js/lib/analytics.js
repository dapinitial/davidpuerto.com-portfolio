// GA4 collection — the measurement id lives in <meta name="ga-id"> so the
// markup is the single source of truth (no env plumbing into the bundle).
// Missing/empty meta, Do Not Track or Global Privacy Control → no-op; the site works before GA exists.
const id = document.querySelector('meta[name="ga-id"]')?.content.trim();

// Only the real site counts: a local or preview copy never sends hits.
const live = /(^|\.)davidpuerto\.com$/.test(location.hostname);
// The automated checks mark themselves internal, so GA can filter them out.
const internal = (() => { try { return localStorage.getItem('dp-internal') === '1'; } catch { return false; } })();

if (id && live && navigator.doNotTrack !== '1' && !navigator.globalPrivacyControl) {
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

// Fire a custom event — safe no-op when collection is off (no id / DNT / GPC).
// Beacon transport so events survive an immediate navigation (login redirect).
export function track(name, params = {}) {
  window.gtag?.('event', name, { transport_type: 'beacon', ...params });
}
