// Check a case study the way a visitor meets it, on the dev server.
//   node .claude/skills/case-study/check-study.mjs <slug> [base]
// base defaults to http://localhost:5173. Walks every slide of the deck at two
// laptop sizes and a tablet (?deck=1), then reads the long read (?read=1), and
// prints one line per problem: a slide that scrolls inside itself, a page that
// scrolls sideways, an em-dash, more than one h1, a skipped heading level, a
// live iframe inside a slide, an uncaught page error. Exit 1 when any is found.
// Waits for load, not network idle: a study streaming video never goes idle.
import { chromium } from 'playwright';

const [slug, base = 'http://localhost:5173'] = process.argv.slice(2);
if (!slug) {
  console.error('usage: check-study.mjs <slug> [base]');
  process.exit(2);
}
const url = `${base}/case-studies/${slug}/`;
if (!(await fetch(url).then(() => true, () => false))) {
  console.error(`nothing answers at ${base}: start the dev server (npm run dev) first`);
  process.exit(2);
}
const problems = [];
const say = (where, what) => problems.push(`${where}: ${what}`);

const browser = await chromium.launch();

// two laptops and a tablet; a phone gets the long read unless ?deck=1 forces the deck
for (const [w, h] of [[1454, 840], [1280, 720], [820, 1180]]) {
  const where = `deck ${w}x${h}`;
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => say(where, `page error: ${e.message}`));
  await page.goto(url + (w < 900 ? '?deck=1' : ''), { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  const total = await page.evaluate(() => document.querySelectorAll('.deck-slot').length);
  if (!total) say(where, 'no deck: is the page in arriving.js, and does it mark [data-beat]?');
  const climax = await page.evaluate(() => [...document.querySelectorAll('.deck-beat[data-stage="climax"]')].map((b) => b.dataset.title));
  if (total && !climax.length) say(where, 'no data-stage="climax": the arc has no crux');
  for (let i = 0; i < total; i++) {
    await page.evaluate((i) => document.querySelectorAll('.deck-slot')[i].scrollIntoView(), i);
    await page.waitForTimeout(1300);
    const r = await page.evaluate(() => {
      const b = document.querySelector('.deck-beat.active');
      if (!b) return null;
      return {
        beat: b.dataset.beat,
        title: b.dataset.title ?? b.querySelector('h1, h2')?.textContent.trim().slice(0, 40),
        over: b.scrollHeight - b.clientHeight,
        wide: document.documentElement.scrollWidth > innerWidth,
        frame: [...b.querySelectorAll('iframe')].some((f) => f.offsetWidth > 0), // the long read's frames sit hidden in a slide
      };
    });
    if (!r) { say(where, `slide ${i + 1} never became active`); continue; }
    const at = `slide ${i + 1} (beat ${r.beat}, ${r.title})`;
    if (r.over > 4) say(where, `${at} overflows by ${r.over}px`);
    if (r.wide) say(where, `${at} scrolls sideways`);
    if (r.frame) say(where, `${at} holds a live iframe; it takes the wheel, use a link in the deck`);
  }
  if (w === 1454) console.log(`${slug}: ${total} slides, crux on ${climax.join(' and ') || 'nothing'}`);
  await page.close();
}

{
  const where = 'long read 390x844';
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', (e) => say(where, `page error: ${e.message}`));
  await page.goto(`${url}?read=1`, { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  const r = await page.evaluate(() => {
    const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const levels = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].filter(visible).map((x) => Number(x.tagName[1]));
    const skips = [];
    for (let i = 1; i < levels.length; i++) if (levels[i] > levels[i - 1] + 1) skips.push(`h${levels[i - 1]} to h${levels[i]}`);
    return {
      h1: levels.filter((l) => l === 1).length,
      skips: [...new Set(skips)],
      dash: document.body.innerText.includes('\u2014'),
      wide: document.documentElement.scrollWidth > innerWidth,
      title: document.title,
    };
  });
  if (r.h1 !== 1) say(where, `${r.h1} h1s; one is the title`);
  if (r.skips.length) say(where, `heading levels skip: ${r.skips.join(', ')}`);
  if (r.dash) say(where, 'an em-dash in the copy');
  if (r.wide) say(where, 'scrolls sideways');
  if (!/ · /.test(r.title)) say(where, `title "${r.title}" lacks the " · " the other studies use`);
  await page.close();
}

await browser.close();
for (const p of problems) console.log(p);
console.log(problems.length ? `${problems.length} to fix` : 'clean');
process.exit(problems.length ? 1 : 0);
