# davidpuerto.com

Everyone's wanted to see how I did it — so here it is.

This is my portfolio from prior to the AI boom, reworked with Claude, because
these days I prefer **Web Components**. The original was a React/Vike SSR app
with a CodePen iframe doing the heavy lifting on the homepage; this rebuild is
deliberately boring infrastructure around deliberately fun interfaces:

- **No framework.** Plain HTML pages, built as a Vite multi-page app.
- **Web Components in light DOM** — every interactive piece is one JS file +
  one CSS file you can copy-paste into any project, no dependencies, no shadow
  DOM fighting your cascade.
- **GSAP for scroll-driven visuals** (it's 100% free now), **native CSS
  scroll-snap for the feel**. The homepage zoom-melt that used to be
  Chrome-only CSS `animation-timeline` now works in every browser, including
  iOS Safari — which is what kicked this whole rebuild off.
- **A ~170-line Express server** for the gated case studies (stateless
  HMAC-signed cookie, hand-rolled rate limiter) and a contact form
  (Nodemailer). That's the entire backend.

## The components

Each one lives as a `site/js/elements/*.js` + `site/css/elements/*.css` pair:

| Element | What it does |
| --- | --- |
| `<site-header>` | Fixed chrome bar, morphing logo, hamburger, full-screen cube-flip overlay nav |
| `<site-preloader>` | The LOADING loader — gradient sweeping through letters, tweened percentage, choreographed exit |
| `<infinity-loader>` | Infinity-path SVG loop covering page transitions |
| `glass-button` (CSS-only) | Liquid-glass pill CTA: backdrop blur, conic outline ring, shine sweep |
| …more landing as the case studies port | rain, neon text, galleries, image comparison |

## Run it

```bash
npm install
npm run dev          # Vite on :5173 (or 5174), proxies /api to the server
npm run dev:server   # the Express server on :3001 (needs .env)
npm run preview      # production build + prod server, the real deal locally
```

`.env` (never committed):

```
COOKIE_SECRET=        # openssl rand -base64 32
PASSWORD_HASH=        # bcrypt hash of the case-studies password
GMAIL_USER=           # contact form sender
GMAIL_APP_PASSWORD=   # Gmail app password (2FA → App passwords)
```

## Deploy

DigitalOcean App Platform, push-to-deploy from `main`. Build: `npm run build`,
run: `node server/index.js`. No Docker, no registry, no SSH — that was the
old way, and decommissioning it was half the point.

## Analytics

GA4 collection plus a gated `/admin` dashboard — zero new npm dependencies
(the Google service-account OAuth flow is hand-rolled with `node:crypto`).

Setup:

1. Create a GA4 property and grab its **measurement id** (`G-XXXX`). That id is
   NOT an env var — paste it into the `<meta name="ga-id" content="">` tag in
   each page head under `site/` (empty content = collection stays off).
2. In Google Cloud, enable the **Google Analytics Data API** and create a
   **service account** (no roles needed) + a JSON key.
3. In GA4 → Admin → Property access management, add the service account email
   as **Viewer**.
4. Set the server env vars (App Platform stores the key's newlines as literal
   `\n` — the server normalizes them):

```
GA_PROPERTY_ID=       # numeric GA4 property id
GA_CLIENT_EMAIL=      # service account email
GA_PRIVATE_KEY=       # service account PEM private key
```

`/admin` is gated behind the same login as the case studies (same password,
same cookie). `/api/admin/stats?range=7|28|90` proxies the GA4 Data API with a
10-minute in-memory cache; until the env vars exist it answers
`503 {"error":"Analytics not configured"}`. Visitors with Do Not Track enabled
are never tracked.

## License

[MIT](LICENSE) — take whatever's useful.
