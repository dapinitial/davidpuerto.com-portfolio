// Edit in place (dev server only; injected by tools/edit-in-place.mjs).
// On any page: Cmd (or Ctrl) + double-click a line of text to edit it where it
// sits, no URL flag and no reload. Select words inside it for the format bar:
// bold, italic, underline, color, alignment. Enter or click away commits, Esc
// reverts. Save (or Cmd+S) writes every change into the source HTML; Publish
// locks, commits and pushes. Plain double-click still selects a word.
// ?edit=1 still works: it just shows the bar straight away.
{
  // snapshot every element's markup before any other module runs, so a save
  // matches the source and never carries runtime markup (hand-mark's svg,
  // animated counters) back into the file
  const snap = new WeakMap();
  const home = new WeakMap(); // the parent at load, before the deck re-wraps slides
  for (const el of document.body.querySelectorAll('*')) { snap.set(el, el.innerHTML); home.set(el, el.parentElement); }

  const SEL = 'h1,h2,h3,h4,h5,h6,p,li,figcaption,blockquote,dt,dd,td,th,summary,label,small,a,button,.ms-eyebrow';
  const SKIP = '.deck-ui, .ed-bar, svg, [data-ed-skip]';
  const edits = new Map(); // el -> { before, after, scope, kind }
  const pending = [];     // notes edits are keyed by beat, not element

  const style = document.createElement('style');
  style.textContent = `
    .ed-bar { position: fixed; right: 16px; bottom: 16px; z-index: 9999; display: flex; gap: 10px; align-items: center; padding: 10px 12px 10px 14px; border-radius: 999px; background: rgba(12,12,16,0.92); color: #eee; font: 12px/1.3 ui-monospace, Menlo, monospace; letter-spacing: 0.04em; box-shadow: 0 8px 30px rgba(0,0,0,0.4); backdrop-filter: blur(10px); }
    .ed-bar b { color: var(--cs-accent, #fb836d); font-weight: 600; }
    .ed-bar button { font: inherit; letter-spacing: inherit; padding: 7px 12px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.18); background: transparent; color: inherit; cursor: pointer; }
    .ed-bar button:hover { border-color: rgba(255,255,255,0.5); }
    .ed-bar button:disabled { opacity: 0.4; cursor: default; }
    .ed-bar .ed-msg { max-width: 40ch; white-space: pre-wrap; opacity: 0.8; }
    [contenteditable].ed-live { outline: 2px solid var(--cs-accent, #fb836d); outline-offset: 6px; border-radius: 4px; }
    .ed-dirty { box-shadow: inset 3px 0 0 var(--cs-accent, #fb836d); padding-left: 0.4em; }
    .deck-notes-body.ed-dirty { box-shadow: none; padding-left: 0; }
    .ed-saved { animation: ed-saved 1.4s ease forwards; }
    @keyframes ed-saved { 0% { box-shadow: inset 3px 0 0 var(--cs-accent, #fb836d); } 100% { box-shadow: inset 3px 0 0 transparent; } }
    .ed-tick { width: 22px; height: 22px; flex: none; display: none; }
    .ed-tick.go { display: block; }
    .ed-tick path { fill: none; stroke: var(--cs-accent, #fb836d); stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1 1; stroke-dashoffset: 1; }
    .ed-tick.go .ring { animation: ed-draw 0.5s cubic-bezier(0.3,0.1,0.25,1) forwards; }
    .ed-tick.go .mark { animation: ed-draw 0.35s cubic-bezier(0.3,0.1,0.25,1) 0.4s forwards; }
    @keyframes ed-draw { to { stroke-dashoffset: 0; } }
    .ed-tools { position: fixed; z-index: 10000; display: flex; align-items: center; gap: 2px; padding: 4px; border-radius: 10px; background: rgba(12,12,16,0.96); box-shadow: 0 8px 28px rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.12); }
    .ed-tools[hidden] { display: none; }
    .ed-tools button { font: 14px/1 ui-sans-serif, system-ui, sans-serif; color: #eee; background: transparent; border: 0; border-radius: 6px; min-width: 30px; height: 30px; padding: 0 6px; cursor: pointer; display: grid; place-items: center; }
    .ed-tools button:hover { background: rgba(255,255,255,0.12); }
    .ed-tools .sep { width: 1px; height: 18px; background: rgba(255,255,255,0.18); margin: 0 4px; }
    .ed-tools .sw { width: 14px; height: 14px; border-radius: 50%; display: block; }
    .ed-tools .sw-clear { background: #fff0f4; }
  `;
  document.head.appendChild(style);

  const bar = document.createElement('div');
  bar.className = 'ed-bar';
  bar.setAttribute('data-ed-skip', '');
  bar.innerHTML = `<svg class="ed-tick" viewBox="0 0 24 24" aria-hidden="true"><path class="ring" pathLength="1" d="M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19z"/><path class="mark" pathLength="1" d="M7.5 12.5l3 3 6-7"/></svg><span class="ed-msg">⌘ + double-click a line to edit</span><b class="ed-n"></b><button class="ed-save" disabled>Save ⌘S</button><button class="ed-drop" hidden>Discard</button><button class="ed-pub">Publish</button><button class="ed-exit">Done</button>`;
  bar.hidden = new URLSearchParams(location.search).get('edit') !== '1';
  document.body.appendChild(bar);
  const msg = bar.querySelector('.ed-msg');
  const nEl = bar.querySelector('.ed-n');
  const saveBtn = bar.querySelector('.ed-save');
  const pubBtn = bar.querySelector('.ed-pub');
  const dropBtn = bar.querySelector('.ed-drop');
  const tick = bar.querySelector('.ed-tick');
  let tickT = 0;
  const say = (t, ok) => {
    msg.textContent = t;
    tick.classList.remove('go'); void tick.offsetWidth; // restart the draw
    if (ok) { tick.classList.add('go'); clearTimeout(tickT); tickT = setTimeout(() => tick.classList.remove('go'), 2600); }
  };
  const paint = () => {
    const n = edits.size + pending.length;
    nEl.textContent = n ? `${n} change${n === 1 ? '' : 's'}` : '';
    saveBtn.disabled = !n;
    dropBtn.hidden = !n;
  };
  const dropAll = () => {
    for (const [el] of edits) { el.innerHTML = snap.get(el); el.classList.remove('ed-dirty'); }
    edits.clear(); pending.length = 0;
    document.querySelectorAll('.ed-dirty').forEach((d) => d.classList.remove('ed-dirty'));
    say('unsaved changes discarded'); paint();
  };

  // serialize an element's current content, substituting each custom element's
  // original markup so runtime children never reach the source
  const ser = (el) => {
    let out = '';
    for (const node of el.childNodes) {
      if (node.nodeType === 3) out += node.nodeValue.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/ /g, '&nbsp;');
      else if (node.nodeType === 1) {
        const tag = node.tagName.toLowerCase();
        if (tag === 'br') { out += '<br>'; continue; }
        if (tag === 'svg') continue; // runtime drawing inside a custom element, never source
        const attrs = [...node.attributes].filter((a) => !/^(contenteditable|spellcheck)$/.test(a.name)).map((a) => ` ${a.name}="${a.value.replace(/"/g, '&quot;')}"`).join('');
        const inner = tag.includes('-') && snap.has(node) ? snap.get(node) : ser(node);
        out += `<${tag}${attrs}>${inner}</${tag}>`;
      }
    }
    return out.replace(/(<br>)+$/, '');
  };

  let live = null;
  const commit = () => {
    if (!live) return;
    const el = live; live = null;
    el.removeAttribute('contenteditable'); el.removeAttribute('spellcheck'); el.classList.remove('ed-live');
    tools.hidden = true;
    if (el.matches('.deck-notes-body')) {
      const beat = el.ed_beat; const after = el.textContent.trim();
      const before = beat?.dataset.notes ?? '';
      if (beat && after !== before) { pending.push({ kind: 'notes', before, after, beat: beat.dataset.beat ?? null }); beat.dataset.notes = after; el.classList.add('ed-dirty'); }
      return paint();
    }
    const before = edits.get(el)?.before ?? snap.get(el);
    const after = ser(el);
    const norm = (h) => { const t = document.createElement('template'); t.innerHTML = h ?? ''; return t.innerHTML.replace(/\s+/g, ' ').trim(); };
    if (after === before || norm(after) === norm(snap.get(el))) { edits.delete(el); el.classList.remove('ed-dirty'); }
    else {
      // the ancestors' original markup, nearest first: when the same words sit
      // in two places, the first ancestor that is unique in the file decides
      const scopes = []; let a = home.get(el);
      while (a && a !== document.body && scopes.length < 4) { if (snap.has(a)) scopes.push(snap.get(a)); a = home.get(a); }
      // the slide it sits on: when a drawing is placed twice, the beat decides
      edits.set(el, { kind: 'html', before, after, scopes, beat: el.closest('[data-beat]')?.dataset.beat ?? null });
      el.classList.add('ed-dirty');
    }
    paint();
  };
  const revert = () => {
    if (!live) return;
    const el = live;
    if (el.matches('.deck-notes-body')) el.textContent = el.ed_beat?.dataset.notes ?? el.textContent;
    else el.innerHTML = edits.get(el)?.after ?? snap.get(el);
    commit();
  };

  document.addEventListener('dblclick', (e) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    if (e.target.closest(SKIP) && !e.target.closest('.deck-notes-body')) return;
    const el = e.target.closest('.deck-notes-body') || e.target.closest(SEL);
    if (!el || (!snap.has(el) && !el.matches('.deck-notes-body'))) return say('that text is drawn at runtime; edit its source by hand');
    if (el.matches('.deck-notes-body')) el.ed_beat = document.querySelector('.deck-beat.active');
    e.preventDefault();
    if (live && live !== el) commit();
    // the deck splits words into spans for the morph; edit the clean markup,
    // and re-snapshot any custom element inside it from an inert template so
    // its runtime children (hand-mark's svg) never reach the source
    const clean = edits.get(el)?.after ?? snap.get(el);
    if (clean !== undefined && el.innerHTML !== clean) {
      const tpl = document.createElement('template'); tpl.innerHTML = clean;
      el.innerHTML = clean;
      const seen = {};
      for (const ce of el.querySelectorAll('*')) {
        const tag = ce.tagName.toLowerCase(); if (!tag.includes('-')) continue;
        const k = (seen[tag] = (seen[tag] ?? 0)); seen[tag]++;
        const src = tpl.content.querySelectorAll(tag)[k];
        if (src) snap.set(ce, src.innerHTML);
      }
    }
    live = el;
    bar.hidden = false;
    el.setAttribute('contenteditable', el.matches('.deck-notes-body') ? 'plaintext-only' : 'true');
    el.setAttribute('spellcheck', 'false');
    el.classList.add('ed-live');
    el.focus();
    // a double-click selects the word under the cursor; typing would replace
    // it. Put the caret where the click landed instead, collapsed.
    try {
      const pos = document.caretPositionFromPoint?.(e.clientX, e.clientY);
      const range = pos ? (() => { const r = document.createRange(); r.setStart(pos.offsetNode, pos.offset); r.collapse(true); return r; })() : document.caretRangeFromPoint?.(e.clientX, e.clientY);
      if (range && el.contains(range.startContainer)) { const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range); }
      else getSelection().collapseToEnd();
    } catch { getSelection().collapseToEnd(); }
    say(el.matches('.deck-notes-body') ? 'editing the talking points · Enter commits · Esc reverts' : 'Enter commits · Esc reverts · Shift+Enter breaks a line');
  }, true);

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && !bar.hidden) { e.preventDefault(); commit(); return save(); }
    if (e.key === 'Escape' && !live && !bar.hidden && !(edits.size + pending.length)) { bar.hidden = true; return; }
    if (!live) return;
    if ((e.metaKey || e.ctrlKey) && ['b', 'i', 'u'].includes(e.key.toLowerCase()) && !live.matches('.deck-notes-body')) { e.preventDefault(); e.stopImmediatePropagation(); fmt({ b: 'strong', i: 'em', u: 'hand-mark' }[e.key.toLowerCase()]); return; }
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); revert(); if (!(edits.size + pending.length)) { bar.hidden = true; live?.blur(); getSelection().removeAllRanges(); } }
    else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.stopImmediatePropagation(); commit(); }
    else if (e.key === 'Enter' && e.shiftKey && !live.matches('.deck-notes-body')) { e.preventDefault(); document.execCommand('insertHTML', false, '<br>'); }
  }, true);
  document.addEventListener('focusout', (e) => { if (live && e.target === live) setTimeout(() => { if (live === e.target && !tools.contains(document.activeElement)) commit(); }, 0); });
  document.addEventListener('paste', (e) => {
    if (!live || !live.contains(e.target)) return;
    e.preventDefault();
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
  }, true);

  // --- the format bar: floats over a selection inside the line being edited
  const tools = document.createElement('div');
  tools.className = 'ed-tools';
  tools.setAttribute('data-ed-skip', '');
  tools.hidden = true;
  tools.innerHTML = `
    <button data-f="strong" title="Bold ⌘B"><b>B</b></button>
    <button data-f="em" title="Italic: the accent italic in headings ⌘I"><i>I</i></button>
    <button data-f="hand-mark" title="Hand-drawn underline ⌘U"><u>U</u></button>
    <span class="sep"></span>
    <button data-c="accent" title="Accent color"><span class="sw" style="background: var(--cs-accent, #fb836d)"></span></button>
    <button data-c="muted" title="Muted"><span class="sw" style="background: #9a9499"></span></button>
    <button data-c="" title="Default color"><span class="sw sw-clear"></span></button>
    <span class="sep"></span>
    <button data-a="left" title="Align left">⟸</button>
    <button data-a="center" title="Center">≡</button>
    <button data-a="right" title="Align right">⟹</button>
    <button data-a="" title="Default alignment">↺</button>`;
  document.body.appendChild(tools);
  tools.addEventListener('mousedown', (e) => e.preventDefault()); // keep the selection and the focus

  const range = () => { const sel = getSelection(); if (!live || !sel.rangeCount) return null; const r = sel.getRangeAt(0); return live.contains(r.commonAncestorContainer) ? r : null; };
  const unwrap = (node) => { const parent = node.parentNode; while (node.firstChild) parent.insertBefore(node.firstChild, node); parent.removeChild(node); };
  const select = (node) => { const sel = getSelection(); const r = document.createRange(); r.selectNodeContents(node); sel.removeAllRanges(); sel.addRange(r); };
  // wrap the selection in a tag, or unwrap it when it is already inside one
  const fmt = (tag, attrs) => {
    const r = range(); if (!r || r.collapsed) return;
    const anc = r.commonAncestorContainer.nodeType === 1 ? r.commonAncestorContainer : r.commonAncestorContainer.parentElement;
    const inside = tag === 'span' ? anc.closest('span[data-ed-color]') : anc.closest(tag);
    if (inside && inside !== live && live.contains(inside)) {
      if (tag !== 'span') { unwrap(inside); return place(); }
      if (!attrs) { unwrap(inside); return place(); }
      Object.entries(attrs).forEach(([k, v]) => inside.setAttribute(k, v)); return place();
    }
    if (tag === 'span' && !attrs) return;
    const w = document.createElement(tag);
    if (attrs) Object.entries(attrs).forEach(([k, v]) => w.setAttribute(k, v));
    w.appendChild(r.extractContents());
    r.insertNode(w);
    select(w); place();
  };
  const COLORS = { accent: 'color: var(--cs-accent, #fb836d)', muted: 'color: #9a9499' };
  // alignment applies to the whole line: one block wrapper inside it
  const align = (a) => {
    if (!live) return;
    let box = live.querySelector(':scope > span[data-ed-align]');
    if (!a) { if (box) unwrap(box); return place(); }
    if (!box) { box = document.createElement('span'); box.setAttribute('data-ed-align', ''); while (live.firstChild) box.appendChild(live.firstChild); live.appendChild(box); }
    box.setAttribute('style', `display: block; text-align: ${a}`);
    place();
  };
  tools.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || !live) return;
    if (b.dataset.f) fmt(b.dataset.f);
    else if ('c' in b.dataset) fmt('span', b.dataset.c ? { 'data-ed-color': b.dataset.c, style: COLORS[b.dataset.c] } : null);
    else if ('a' in b.dataset) align(b.dataset.a);
  });
  // float the bar just above the selection, or above the line when nothing is selected
  const place = () => {
    if (!live || live.matches('.deck-notes-body')) { tools.hidden = true; return; }
    const r = range();
    const box = (r && !r.collapsed ? r : live).getBoundingClientRect();
    tools.hidden = false;
    const w = tools.offsetWidth, h = tools.offsetHeight;
    tools.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, box.left + box.width / 2 - w / 2))}px`;
    tools.style.top = `${Math.max(8, box.top - h - 12)}px`;
  };
  document.addEventListener('selectionchange', () => { if (live) place(); });

  const post = (path, body) => fetch(`/__edit${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());
  const save = async () => {
    const list = [...edits.values(), ...pending];
    if (!list.length) return say('nothing to save');
    saveBtn.disabled = true; say('saving…');
    try {
      const { results = [], error } = await post('/save', { page: location.pathname, edits: list });
      if (error) return say(error);
      const bad = results.filter((r) => !r.ok);
      const ok = results.length - bad.length;
      say(`${ok} saved${bad.length ? `\n${bad.map((b) => `✕ "${b.before}…": ${b.reason}`).join('\n')}` : ''}`, ok > 0 && !bad.length);
      // the page stays put (the plugin holds back the dev server's reload);
      // the saved text becomes the new baseline for the next edit of that line
      results.forEach((r, i) => {
        if (!r.ok) return;
        const e = list[i];
        for (const [el, v] of edits) if (v === e) { edits.delete(el); snap.set(el, v.after); el.classList.remove('ed-dirty'); el.classList.remove('ed-saved'); void el.offsetWidth; el.classList.add('ed-saved'); }
        const k = pending.indexOf(e); if (k >= 0) pending.splice(k, 1);
      });
      paint();
    } catch (err) { say(`save failed: ${err.message}`); paint(); }
  };
  saveBtn.addEventListener('click', () => { commit(); save(); });
  dropBtn.addEventListener('click', () => { commit(); dropAll(); });

  let armed = false;
  pubBtn.addEventListener('click', async () => {
    if (edits.size + pending.length) return say('save first');
    if (!armed) { armed = true; pubBtn.textContent = 'Publish to davidpuerto.com?'; setTimeout(() => { armed = false; pubBtn.textContent = 'Publish'; }, 6000); return; }
    armed = false; pubBtn.textContent = 'Publishing…'; pubBtn.disabled = true; say('lock, commit, push…');
    try {
      const r = await post('/publish', {});
      say(r.error ? `publish failed: ${r.error}` : r.nothing ? 'nothing to publish' : `pushed ${r.sha}\nlive in about two minutes`, !r.error && !r.nothing);
    } catch (err) { say(`publish failed: ${err.message}`); }
    pubBtn.textContent = 'Publish'; pubBtn.disabled = false;
  });
  bar.querySelector('.ed-exit').addEventListener('click', () => {
    commit();
    if (edits.size + pending.length) return say('unsaved changes: Save or Discard first');
    tools.hidden = true;
    bar.hidden = true;
    document.activeElement?.blur?.();
    getSelection().removeAllRanges();
  });
  window.addEventListener('beforeunload', (e) => { if (edits.size + pending.length) e.preventDefault(); });
  paint();
}
