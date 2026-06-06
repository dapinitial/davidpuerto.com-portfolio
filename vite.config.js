import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const page = (p) => resolve(import.meta.dirname, 'site', p);

export default defineConfig({
  root: 'site',
  appType: 'mpa',
  publicDir: 'public',
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
