// Edit in place, dev server only. With ?edit=1 on any page, Cmd + double-click
// a line of text to edit it where it sits; Save writes the change straight into
// the source HTML (site/**/index.html, the gated decks included, since they live
// here unencrypted); Publish locks, commits and pushes. Never shipped: the
// plugin applies to `vite` serve only, and the client script is not referenced
// by any built page.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = resolve(import.meta.dirname, '..');
const SITE = join(ROOT, 'site');

const htmlFiles = (dir = SITE, out = []) => {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (n === 'node_modules' || n === 'public' || n.startsWith('.')) continue;
    if (statSync(p).isDirectory()) htmlFiles(p, out);
    else if (n.endsWith('.html')) out.push(p);
  }
  return out;
};

const pageFile = (pathname) => {
  const clean = decodeURIComponent(pathname.split('?')[0]).replace(/\/+$/, '');
  const cands = [join(SITE, clean, 'index.html'), join(SITE, `${clean}.html`), join(SITE, clean)];
  for (const c of cands) {
    const r = resolve(c);
    if ((r + sep).startsWith(SITE + sep) && existsSync(r) && r.endsWith('.html')) return r;
  }
  return null;
};

const count = (hay, needle) => (needle ? hay.split(needle).length - 1 : 0);
const attrEsc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

// One edit: replace `before` with `after`, exactly once. The page's own file
// first; if the text is not unique there, inside `scope` (the parent's original
// markup); failing that, any other page under site/ (shared partials).
const apply = (files, pageSrc, edit) => {
  let { before, after, scope, kind } = edit;
  if (kind === 'notes') {
    const forms = [`data-notes="${before}"`, `data-notes="${attrEsc(before)}"`];
    for (const f of [pageSrc, ...files.filter((x) => x !== pageSrc)]) {
      const src = readFileSync(f, 'utf8');
      for (const form of forms) {
        if (count(src, form) === 1) {
          writeFileSync(f, src.split(form).join(`data-notes="${attrEsc(after).replace(/&amp;/g, '&')}"`));
          return { ok: true, file: relative(ROOT, f) };
        }
      }
    }
    return { ok: false, reason: 'notes not found once in source' };
  }
  for (const f of [pageSrc, ...files.filter((x) => x !== pageSrc)]) {
    const src = readFileSync(f, 'utf8');
    const n = count(src, before);
    if (n === 1) {
      writeFileSync(f, src.split(before).join(after));
      return { ok: true, file: relative(ROOT, f) };
    }
    // the same words may also sit in a data-notes attribute: element content
    // is bracketed by tags, an attribute value is not
    const wrapped = `>${before}</`;
    if (n > 1 && count(src, wrapped) === 1) {
      writeFileSync(f, src.split(wrapped).join(`>${after}</`));
      return { ok: true, file: relative(ROOT, f) };
    }
    if (n > 1 && scope && count(src, scope) === 1 && count(scope, before) === 1) {
      writeFileSync(f, src.split(scope).join(scope.split(before).join(after)));
      return { ok: true, file: relative(ROOT, f), scoped: true };
    }
    if (n > 1) return { ok: false, reason: `found ${n} times in ${relative(ROOT, f)}; edit a longer line` };
  }
  return { ok: false, reason: 'not found in source (runtime markup?)' };
};

const readBody = (req) => new Promise((res, rej) => {
  let s = '';
  req.on('data', (c) => { s += c; if (s.length > 8e6) rej(new Error('too big')); });
  req.on('end', () => { try { res(JSON.parse(s || '{}')); } catch (e) { rej(e); } });
});
const send = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
const sh = (cmd) => execSync(cmd, { cwd: ROOT, stdio: 'pipe', env: process.env, timeout: 180000 }).toString();

export const editInPlace = () => ({
  name: 'edit-in-place',
  apply: 'serve',
  transformIndexHtml: {
    order: 'pre',
    handler: () => [{ tag: 'script', attrs: { type: 'module', src: '/js/edit/edit-in-place.js' }, injectTo: 'head-prepend' }],
  },
  configureServer(server) {
    server.middlewares.use('/__edit', async (req, res) => {
      if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
      try {
        if (req.url === '/save') {
          const { page, edits = [] } = await readBody(req);
          const pageSrc = pageFile(page);
          if (!pageSrc) return send(res, 400, { error: `no source for ${page}` });
          const files = htmlFiles();
          const results = edits.map((e) => ({ before: e.before.slice(0, 60), ...apply(files, pageSrc, e) }));
          return send(res, 200, { results });
        }
        if (req.url === '/publish') {
          if (!sh('git status --porcelain').trim()) return send(res, 200, { nothing: true, log: 'nothing to publish' });
          const log = [];
          log.push(sh('npm run lock 2>&1').split('\n').slice(-3).join('\n'));
          log.push(sh('git add -A && git commit -q -m "Copy edits, in place" && git push -q origin main 2>&1'));
          const sha = sh('git rev-parse --short HEAD').trim();
          const ahead = sh('git status -sb').split('\n')[0];
          return send(res, 200, { sha, ahead, log: log.join('\n') });
        }
        send(res, 404, { error: 'unknown' });
      } catch (e) {
        send(res, 500, { error: String(e.stderr?.toString?.() || e.stdout?.toString?.() || e.message).slice(-800) });
      }
    });
  },
});
