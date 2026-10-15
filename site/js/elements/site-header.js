// <site-header> — fixed site chrome: D-logo, hamburger, full-screen overlay nav
// with case-studies submenu, and a Logout button when authenticated.
// Light DOM, zero dependencies. Pair with css/elements/site-header.css.

import { sprayHover, clearSprays } from './spray-hover.js';

const LOGO_PATH =
  'M17.7762223,0 C22.0993405,1.05095417 26,3.22401634 26,8.83692672 C26,14.4498371 21.4058992,19 15.7387888,19 L0,19 L3.40465506,15.304337 L15.7387888,15.304337 C19.3451318,15.304337 22.2686505,12.4087788 22.2686505,8.83692672 C22.2686505,5.26507465 18.569846,3.41487829 14.963503,3.41487829 L17.7762223,0 Z';

// mirrored so the arrow points back, toward the main menu
const BACK_PATH =
  'M8.75268,0.475719 C9.37956,-0.158573 10.3885,-0.158573 11.0155,0.475719 C11.329,0.792872 11.4857,1.20416 11.4857,1.62042 C11.4857,2.03668 11.329,2.44797 11.0155,2.76512 L5.4612,8.38454 L22.3984,8.38454 C23.28,8.38454 24,9.10803 24,10.0049 C24,10.8969 23.2849,11.6254 22.3984,11.6254 L5.4612,11.6254 L11.0155,17.2349 C11.6424,17.8692 11.6424,18.89 11.0155,19.5242 C10.3885,20.1586 9.37956,20.1586 8.75268,19.5242 L0.47016,11.1447 C0.17148,10.8424 0,10.4311 0,9.99995 C0,9.56888 0.16656,9.15758 0.47016,8.8553 L8.75268,0.475719 Z';

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
  // Zillow stays on the homepage; its study is out of the menu (Oct 2026).
];

const item = ([name, href]) =>
  href
    ? `<li><a href="${href}" data-navlinkname="${name}" aria-label="${name}"${
        location.pathname === href ? ' aria-current="page"' : ''
      }><span class="sr-only">${name}</span></a></li>`
    : `<li><button type="button" class="submenu-toggle" data-navlinkname="${name}" aria-label="${name}" aria-expanded="false" aria-controls="menu-sub"><span class="sr-only">${name}</span></button></li>`;

class SiteHeader extends HTMLElement {
  #ac;

  connectedCallback() {
    this.innerHTML = `
      <header class="site-chrome">
        <a class="skip-link" href="#main">Skip to content</a>
        <a class="logo" href="/" aria-label="Home — davidpuerto.com">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 19" width="24" height="24" aria-hidden="true">
            <path class="logo-shape" d="${LOGO_PATH}"></path>
          </svg>
          <span class="crumb" hidden>/ Case Studies</span>
        </a>
        <button type="button" class="logout" hidden>Logout</button>
        <button type="button" class="hamburger" aria-expanded="false" aria-label="Open menu" aria-controls="site-menu">
          <span></span><span></span><span></span>
        </button>
        <nav class="overlay" id="site-menu" aria-label="Site">
          <ul class="menu menu-main">${MAIN_LINKS.map(item).join('')}</ul>
          <ul class="menu menu-sub" id="menu-sub" hidden>${CASE_STUDIES.map(item).join('')}</ul>
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

    const toggle = this.querySelector('.submenu-toggle');
    const showSub = (sub) => {
      const hadFocus = this.contains(document.activeElement) && document.activeElement !== hamburger;
      clearSprays(this);
      mainMenu.hidden = sub;
      subMenu.hidden = !sub;
      crumb.hidden = !sub;
      shape.setAttribute('d', sub ? BACK_PATH : LOGO_PATH);
      shape.classList.toggle('is-back', sub);
      logo.setAttribute('aria-label', sub ? 'Back to main menu' : 'Home — davidpuerto.com');
      toggle.setAttribute('aria-expanded', String(sub));
      // the button that had focus is now hidden; keep focus in the menu
      if (hadFocus) (sub ? subMenu.querySelector('a') : toggle).focus({ preventScroll: true });
    };

    // while the menu is open, the page behind it is out of reach (Tab stays in the menu)
    const behind = new Set();
    const setInert = (on) => {
      if (on) {
        for (const el of document.body.children) {
          if (el === this || el.contains(this) || el.inert || el.tagName === 'SCRIPT') continue;
          el.inert = true;
          behind.add(el);
        }
      } else {
        behind.forEach((el) => (el.inert = false));
        behind.clear();
      }
    };

    const setOpen = (open, { keyboard = false } = {}) => {
      const wasOpen = this.classList.contains('open');
      this.classList.toggle('open', open);
      document.body.classList.toggle('menu-open', open);
      hamburger.setAttribute('aria-expanded', String(open));
      hamburger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (!open) {
        showSub(false);
        clearSprays(this);
      }
      setInert(open);
      skip.tabIndex = open ? -1 : 0; // nothing to skip to while the menu covers the page
      if (open && !wasOpen && keyboard) mainMenu.querySelector('a, button')?.focus({ preventScroll: true });
      if (!open && wasOpen && this.querySelector('.overlay').contains(document.activeElement)) hamburger.focus({ preventScroll: true });
    };

    // detail 0 = Enter or Space, not a pointer
    on(hamburger, 'click', (e) => setOpen(!this.classList.contains('open'), { keyboard: e.detail === 0 }));
    on(toggle, 'click', () => showSub(true));
    sprayHover(this, signal);
    const main = document.querySelector('main');
    if (main && !main.id) main.id = 'main';
    const skip = this.querySelector('.skip-link');
    // skip link: straight to the page's main content, without touching the hash (decks keep #bN there)
    on(skip, 'click', (e) => {
      if (!main) return;
      e.preventDefault();
      if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
      main.focus();
    });
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
      if (e.key === 'Escape' && this.classList.contains('open')) setOpen(false); // focus returns to the hamburger if it was in the menu
    });

    // Ink flip: when a .light-section scrolls under the header, body gets
    // .light-content so the logo/hamburger/logout turn black (CSS). Ported from
    // the old clientLayout — sampled at the logo's vertical centre.
    const SAMPLE_Y = 24;
    let ticking = false;
    const detect = () => {
      ticking = false;
      const sections = document.querySelectorAll('.light-section, .dark-section');
      let light = false;
      for (const sec of sections) {
        const r = sec.getBoundingClientRect();
        if (r.top <= SAMPLE_Y && r.bottom >= SAMPLE_Y) {
          light = sec.classList.contains('light-section');
          break;
        }
      }
      document.body.classList.toggle('light-content', light);
      document.body.classList.toggle('dark-content', !light);
    };
    const schedule = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(detect);
    };
    on(window, 'scroll', schedule);
    on(window, 'resize', schedule);
    on(window, 'load', schedule);
    schedule();

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
    document.body.classList.remove('menu-open', 'light-content', 'dark-content');
    this.replaceChildren();
  }
}

customElements.define('site-header', SiteHeader);
