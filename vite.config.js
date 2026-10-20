import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { editInPlace } from './tools/edit-in-place.mjs';

const page = (p) => resolve(import.meta.dirname, 'site', p);

// Dev-only auth gate: mirror production's /case-studies + /admin gates by
// asking the real auth server (npm run dev:server, :3001) to validate the
// cookie. If the auth server isn't running, fail OPEN with a console warning
// so frontend-only work doesn't require it.
const GATED_PREFIXES = ['/case-studies', '/admin'];
// The rebuild study is public — it's the "how this site was built" story.
const PUBLIC_EXEMPT = ['/case-studies/rebuild'];

const devAuthGate = () => ({
  name: 'dev-auth-gate',
  configureServer(server) {
    // like production: a page folder without its trailing slash redirects to it
    server.middlewares.use((req, res, next) => {
      const [path, query = ''] = (req.url ?? '').split('?');
      if (req.method === 'GET' && !path.endsWith('/') && !path.includes('.') && !path.startsWith('/@') && !path.startsWith('/api') && !path.startsWith('/__')
        && existsSync(resolve(import.meta.dirname, 'site', `.${path}/index.html`))) {
        res.writeHead(301, { Location: `${path}/${query ? `?${query}` : ''}` });
        return res.end();
      }
      next();
    });
    server.middlewares.use(async (req, res, next) => {
      if (!GATED_PREFIXES.some((p) => req.url?.startsWith(p))) return next();
      if (PUBLIC_EXEMPT.some((p) => req.url?.startsWith(p))) return next();
      try {
        const check = await fetch('http://localhost:3001/api/check-auth', {
          headers: { cookie: req.headers.cookie ?? '' },
        });
        const { isAuthenticated } = await check.json();
        if (isAuthenticated) return next();
        res.writeHead(302, {
          Location: `/login/?redirectTo=${encodeURIComponent(req.url)}`,
        });
        res.end();
      } catch {
        console.warn(
          '[dev-auth-gate] auth server (:3001) unreachable — serving gated pages UNGATED',
        );
        next();
      }
    });
  },
});

// Every page preloads the two faces nearly all of its text is set in, so the
// font-display: block wait is a few milliseconds, not a flash (see fonts.css).
const PRELOAD_FONTS = ['/fonts/noto-sans-display.woff2', '/fonts/fraunces.woff2', '/fonts/fraunces-italic.woff2'];
const preloadFonts = () => ({
  name: 'preload-fonts',
  transformIndexHtml(html) {
    if (html.includes('rel="preload" as="font"')) return html;
    const tags = PRELOAD_FONTS.map((href) => `<link rel="preload" as="font" type="font/woff2" href="${href}" crossorigin>`).join('\n  ');
    return html.replace(/<meta charset[^>]*>/i, (m) => `${m}\n  ${tags}`);
  },
});

export default defineConfig({
  root: 'site',
  appType: 'mpa',
  publicDir: 'public',
  plugins: [devAuthGate(), editInPlace(), preloadFonts()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    // Guardrail: transpile anything too modern for these targets.
    // No more "works in Chrome, ships broken to Safari."
    target: ['safari15', 'chrome100', 'firefox100'],
    cssTarget: ['safari15', 'chrome100', 'firefox100'],
    rollupOptions: {
      input: {
        home: page('index.html'),
        about: page('about-me/index.html'),
        approach: page('approach/index.html'),
        contact: page('contact/index.html'),
        resume: page('resume/index.html'),
        privacy: page('privacy/index.html'),
        terms: page('terms/index.html'),
        since: page('since-2004/index.html'),
        lock: page('lock/index.html'),
        login: page('login/index.html'),
        admin: page('admin/index.html'),
        notfound: page('404.html'),
        servererror: page('500.html'),
        csRebuild: page('case-studies/rebuild/index.html'),
        // NDA-gated studies live OUTSIDE the repo (gitignored) — present on
        // dev machines, absent in CI/App Platform clones. Include only what
        // exists so cloud builds don't fail on missing inputs.
        ...Object.fromEntries(
          ['apple', 'microsoft', 'facebook', 'nordstrom', 'sonosite', 'zillow', 'review']
            .filter((s) =>
              existsSync(resolve(import.meta.dirname, 'site', `case-studies/${s}/index.html`)),
            )
            .map((s) => [`cs-${s}`, page(`case-studies/${s}/index.html`)]),
        ),
      },
    },
  },
  server: {
    // API + auth live in the tiny Express server (npm run dev:server).
    // 3001 because 3000 hosts other local apps.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
