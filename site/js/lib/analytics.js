// GA4 collection — the measurement id lives in <meta name="ga-id"> so the
// markup is the single source of truth (no env plumbing into the bundle).
// Missing/empty meta or Do Not Track → no-op; the site works before GA exists.
const id = document.querySelector('meta[name="ga-id"]')?.content.trim();

if (id && navigator.doNotTrack !== '1') {
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.append(s);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', id);
}
