// <site-header> — fixed site chrome: D-logo, hamburger, full-screen overlay nav
// with case-studies submenu, and a Logout button when authenticated.
// Light DOM, zero dependencies. Pair with css/elements/site-header.css.

const LOGO_PATH =
  'M17.7762223,0 C22.0993405,1.05095417 26,3.22401634 26,8.83692672 C26,14.4498371 21.4058992,19 15.7387888,19 L0,19 L3.40465506,15.304337 L15.7387888,15.304337 C19.3451318,15.304337 22.2686505,12.4087788 22.2686505,8.83692672 C22.2686505,5.26507465 18.569846,3.41487829 14.963503,3.41487829 L17.7762223,0 Z';

const BACK_PATH =
  'M15.24732,0.475719372 C14.62044,-0.158573124 13.61148,-0.158573124 12.98448,0.475719372 C12.67104,0.792871691 12.51432,1.20416324 12.51432,1.62042035 C12.51432,2.03667745 12.67104,2.447969 12.98448,2.76512132 L18.5388,8.3845437 L1.601628,8.3845437 C0.72,8.3845437 0,9.10803414 0,10.0049307 C0,10.8969102 0.7151016,11.625354 1.601628,11.625354 L18.5388,11.625354 L12.98448,17.2348574 C12.3576,17.8692106 12.3576,18.8900033 12.98448,19.5242351 C13.61148,20.1585883 14.62044,20.1585883 15.24732,19.5242351 L23.52984,11.1447025 C23.82852,10.8423983 24,10.4310703 24,9.99995295 C24,9.56888416 23.83344,9.15758047 23.52984,8.85530054 L15.24732,0.475719372 Z';

const MAIN_LINKS = [
  ['About Me', '/about-me/'],
  ['Case Studies', null], // null href = opens the submenu
  ['Contact', '/contact/'],
];

const CASE_STUDIES = [
  ['Apple', '/case-studies/apple/'],
  ['Microsoft', '/case-studies/microsoft/'],
  ['Facebook', '/case-studies/facebook/'],
  ['Nordstrom', '/case-studies/nordstrom/'],
  ['SonoSite', '/case-studies/sonosite/'],
  ['Zillow', '/case-studies/zillow/'],
];

const item = ([name, href]) =>
  href
    ? `<li><a href="${href}" data-navlinkname="${name}"${
        location.pathname === href ? ' aria-current="page"' : ''
      }><span class="sr-only">${name}</span></a></li>`
    : `<li><button type="button" class="submenu-toggle" data-navlinkname="${name}"><span class="sr-only">${name}</span></button></li>`;

class SiteHeader extends HTMLElement {
  #ac;

  connectedCallback() {
    this.innerHTML = `
      <header class="site-chrome">
        <a class="logo" href="/" aria-label="Home — davidpuerto.com">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 19" width="24" height="24" aria-hidden="true">
            <path class="logo-shape" d="${LOGO_PATH}"></path>
          </svg>
          <span class="crumb" hidden>/ Case Studies</span>
        </a>
        <button type="button" class="logout" hidden>Logout</button>
        <button type="button" class="hamburger" aria-expanded="false" aria-label="Open menu">
          <span></span><span></span><span></span>
        </button>
        <nav class="overlay" aria-label="Site">
          <ul class="menu menu-main">${MAIN_LINKS.map(item).join('')}</ul>
          <ul class="menu menu-sub" hidden>${CASE_STUDIES.map(item).join('')}</ul>
        </nav>
      </header>`;

    this.#ac = new AbortController();
    const { signal } = this.#ac;
    const on = (el, evt, fn) => el.addEventListener(evt, fn, { signal });

    const hamburger = this.querySelector('.hamburger');
    const logo = this.querySelector('.logo');
    const shape = this.querySelector('.logo-shape');
    const crumb = this.querySelector('.crumb');
    const mainMenu = this.querySelector('.menu-main');
    const subMenu = this.querySelector('.menu-sub');
    const logout = this.querySelector('.logout');

    const showSub = (sub) => {
      mainMenu.hidden = sub;
      subMenu.hidden = !sub;
      crumb.hidden = !sub;
      shape.setAttribute('d', sub ? BACK_PATH : LOGO_PATH);
      logo.setAttribute('aria-label', sub ? 'Back to main menu' : 'Home — davidpuerto.com');
    };

    const setOpen = (open) => {
      this.classList.toggle('open', open);
      document.body.classList.toggle('menu-open', open);
      hamburger.setAttribute('aria-expanded', String(open));
      hamburger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (!open) showSub(false);
    };

    on(hamburger, 'click', () => setOpen(!this.classList.contains('open')));
    on(this.querySelector('.submenu-toggle'), 'click', () => showSub(true));
    on(logo, 'click', (e) => {
      if (!subMenu.hidden) {
        e.preventDefault();
        showSub(false);
      } else if (this.classList.contains('open')) {
        e.preventDefault();
        setOpen(false);
      } // else: plain navigation home
    });
    on(document, 'keydown', (e) => {
      if (e.key === 'Escape' && this.classList.contains('open')) setOpen(false);
    });

    // Auth state (server lands in M2 — silently stays hidden until then)
    fetch('/api/check-auth')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.isAuthenticated) logout.hidden = false;
      })
      .catch(() => {});

    on(logout, 'click', async () => {
      try {
        await fetch('/api/logout', { method: 'POST' });
        location.assign('/');
      } catch {
        /* non-fatal */
      }
    });
  }

  disconnectedCallback() {
    this.#ac.abort();
    document.body.classList.remove('menu-open');
    this.replaceChildren();
  }
}

customElements.define('site-header', SiteHeader);
