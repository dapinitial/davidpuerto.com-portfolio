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
- **One small Express server** (`server/index.js`) for the gated case studies
  (bcrypt password, stateless HMAC-signed cookie, hand-rolled rate limiter),
  the contact form (Resend in production, Nodemailer locally) and analytics.
  That's the entire backend.

## The components

Each one lives as a `site/js/elements/*.js` + `site/css/elements/*.css` pair,
light DOM, no dependencies beyond GSAP where noted:

| Element | What it does |
| --- | --- |
| `<site-header>` | Fixed chrome bar, morphing logo, hamburger, full-screen cube-flip overlay nav, skip link |
| `<site-preloader>` | The LOADING loader: gradient sweeping through letters, tweened percentage, choreographed exit |
| `<infinity-loader>` | Infinity-path SVG loop covering page departures |
| `glass-button` (CSS-only) | Liquid-glass pill CTA: backdrop blur, conic outline ring, shine sweep |
| `<glass-piece>` | One chess piece rendered as black obsidian glass (three.js, loaded only when near) |
| `<rain-fall>` | Ambient drips with splash rings; `fullpage` covers the viewport, `wash` bleeds each drop into a watercolor pool |
| `<neon-text>` | Neon sign with letters that randomly short out |
| `<hand-mark>` | A hand-drawn underline under one phrase |
| `spray-hover` | Spray-paint stroke sprayed behind each menu link on hover |
| `wire-frame` (CSS) | Inline SVG wireframes that draw themselves in (`tools/wireframes.py` regenerates them) |
| `<clipped-image>` | Circular clip-path that opens to full frame as you scroll (GSAP pin) |
| `<case-study-nav>` | Prev/next study links that fade in after the first scroll |
| `<image-compare>` | Before/after with a draggable divider |
| `<video-player>` | Poster and pulsing play button over a native `<video>` |
| `<accordion-list>`, `<pill-list>`, `<list-rotator>`, `<marquee-scroller>`, `<moving-gallery>`, `<reveal-gallery>`, `<zoom-gallery>`, `<slowed-pin>`, `<scroll-progress>`, `<tts-button>`, `<hoop-dunk>` | The scroll and gallery pieces ported from the old React site |

Everything honors `prefers-reduced-motion`, and looping background video has
a keyboard-only pause control.

## Run it

```bash
npm install
npm run dev          # Vite on :5173, proxies /api to the server
npm run dev:server   # the Express server on :3001 (needs .env)
npm run preview      # production build + prod server, the real deal locally
npm run lock         # build, then re-encrypt the gated case studies
```

`.env` (never committed):

```
COOKIE_SECRET=        # openssl rand -base64 32
PASSWORD_HASH=        # bcrypt hash of the case-studies password
CONTENT_KEY=          # openssl rand -base64 32, decrypts content-locked/
RESEND_API_KEY=       # production contact form (DO blocks outbound SMTP)
CONTACT_TO=           # where contact messages land
GMAIL_USER=           # local contact form sender
GMAIL_APP_PASSWORD=   # Gmail app password (2FA, then App passwords)
```

## The content lock

The repo is public; the NDA-gated case studies are not. Their sources
(`site/case-studies/apple/`, `microsoft/` and the rest) are in `.gitignore`.
`npm run lock` builds the site and encrypts each gated page, its asset chunks
and its images with AES-256-GCM into `content-locked/*.enc`, which is what gets
committed. At request time the server checks the login cookie, decrypts the
file with `CONTENT_KEY` and serves it; without the cookie a gated page
redirects to `/login/`.

The lock is incremental. `content-locked/.manifest.json` keeps a keyed HMAC
of every source file, so a relock rewrites only what changed and removes
`.enc` files whose source is gone. The fingerprints are keyed with
`CONTENT_KEY`, so the manifest says nothing about the plaintext.

## Deck mode

Every study is also a presentation. `?deck=1` turns the long read into
full-screen slides on the same scroll-snap: each `data-beat` section is a
slide.

| Key | Does |
| --- | --- |
| Arrows, Space, Page Up/Down | Next and previous slide |
| Home / End | First and last slide |
| T | The arc map, every slide by chapter |
| F | Full screen |
| N | Talking points (presenter only) |
| Ctrl + Shift + R | Back to the long read |

`?talk=1` plays only the beats marked `data-talk`, the route for a timed room;
A opens the full deck at the same slide. Talking points live in `data-notes`
and show only on the talk route or on localhost, never to a visitor with the
password.

## Security

- **Path guard.** Every request is decoded once and rejected (400) if it
  carries `..`, `.`, a backslash, a null byte, or an encoded slash. Locked
  files resolve inside `content-locked/` and must land under an allowed
  folder.
- **Login and contact** are rate limited per client IP (DigitalOcean's
  `do-connecting-ip`, not a spoofable `X-Forwarded-For`), and contact input is
  coerced to strings.
- **Headers.** A `'self'` CSP with `object-src 'none'`, `base-uri`,
  `form-action` and `frame-ancestors`, plus HSTS, `nosniff`,
  `X-Frame-Options` and a Permissions-Policy that turns off camera and mic
  except on `/cursorlab`.
- **Dev editor.** The localhost copy editor (`tools/edit-in-place.mjs`)
  accepts only same-origin JSON, so another site in the same browser cannot
  save or publish.
- **No names in public.** Commit messages, comments and copy use roles, not
  people's names or emails ("the analyst", "the PM"). The history was
  rewritten once to make that true; keep it true.

## Deploy

DigitalOcean App Platform, push-to-deploy from `main` (`.do/app.yaml`).
Build: `npm run build`, run: `node server/index.js`. To ship a gated change:
`npm run lock`, commit `content-locked/`, push, and check `git status -sb`
shows nothing ahead. No Docker, no registry, no SSH; that was the old way,
and decommissioning it was half the point.

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
