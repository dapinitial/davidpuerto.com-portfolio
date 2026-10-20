// Browser smoke test: loads pages the way a visitor does and fails on
// console errors, anything the CSP blocks, a broken image or script, or a
// GA4 hit Google does not accept.
//
//   node tests/smoke.mjs                         against https://davidpuerto.com
//   node tests/smoke.mjs http://localhost:3001   against a local prod server
import { chromium } from 'playwright';

const BASE = (process.argv[2] || 'https://davidpuerto.com').replace(/\/$/, '');
const PAGES = ['/', '/about-me/', '/about-me/?deck=1', '/contact/', '/login/', '/resume/', '/privacy/', '/terms/', '/since-2004/'];
// a real browser's UA: GA4 drops hits from user agents that announce a bot
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

const browser = await chromium.launch();
const failures = [];
let gaTag = 0;
let gaHits = 0;

for (const path of PAGES) {
  const context = await browser.newContext({ userAgent: UA, viewport: { width: 1454, height: 840 } });
  // label these visits internal so GA's Internal Traffic filter drops them
  await context.addInitScript(() => localStorage.setItem('dp-internal', '1'));
  const page = await context.newPage();
  const fail = (msg) => failures.push(`${path}: ${msg}`);
  page.on('console', (m) => { if (m.type() === 'error') fail(`console: ${m.text().slice(0, 200)}`); });
  page.on('pageerror', (e) => fail(`uncaught: ${e.message.slice(0, 200)}`));
  page.on('response', (r) => {
    const u = r.url();
    if (u.includes('googletagmanager.com/gtag/js')) { if (r.status() === 200) gaTag++; else fail(`GA tag ${r.status()}`); }
    if (u.includes('/g/collect')) { if (r.status() < 300) gaHits++; else fail(`GA hit ${r.status()}`); }
    if (u.startsWith(BASE) && r.status() >= 400) fail(`${r.status()} ${u.slice(BASE.length)}`);
  });
  // navigation cancels in-flight beacons; only real failures count
  page.on('requestfailed', (q) => { if (q.failure()?.errorText !== 'net::ERR_ABORTED') fail(`failed ${q.url().slice(0, 100)} ${q.failure()?.errorText}`); });

  const res = await page.goto(BASE + path, { waitUntil: 'networkidle' });
  if (res?.status() !== 200) fail(`status ${res?.status()}`);
  await page.waitForTimeout(2500);
  await context.close();
}
await browser.close();

// analytics only runs on the real domain; a local run checks everything else
const live = /(^|\.)davidpuerto\.com$/.test(new URL(BASE).hostname);
if (live && !gaTag) failures.push('GA tag never loaded');
if (live && !gaHits) failures.push('Google accepted no GA hits');

console.log(`${BASE}: ${PAGES.length} pages, GA tag loaded ${gaTag}x, ${gaHits} hits accepted`);
if (failures.length) {
  console.log(failures.map((f) => `  ✖ ${f}`).join('\n'));
  process.exit(1);
}
console.log('  ✔ smoke clean');
