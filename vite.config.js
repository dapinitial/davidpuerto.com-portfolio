import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const page = (p) => resolve(import.meta.dirname, 'site', p);

// Dev-only auth gate: mirror production's /case-studies gate by asking the
// real auth server (npm run dev:server, :3001) to validate the cookie.
// If the auth server isn't running, fail OPEN with a console warning so
// frontend-only work doesn't require it.
const devAuthGate = () => ({
  name: 'dev-auth-gate',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/case-studies')) return next();
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
          '[dev-auth-gate] auth server (:3001) unreachable — serving /case-studies UNGATED',
        );
        next();
      }
    });
  },
});

export default defineConfig({
  root: 'site',
  appType: 'mpa',
  publicDir: 'public',
  plugins: [devAuthGate()],
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
        login: page('login/index.html'),
        notfound: page('404.html'),
        servererror: page('500.html'),
        csMicrosoft: page('case-studies/microsoft/index.html'),
        csFacebook: page('case-studies/facebook/index.html'),
        csNordstrom: page('case-studies/nordstrom/index.html'),
        csSonosite: page('case-studies/sonosite/index.html'),
        csZillow: page('case-studies/zillow/index.html'),
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
