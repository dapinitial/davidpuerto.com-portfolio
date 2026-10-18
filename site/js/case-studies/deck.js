// Deck mode for a case study: ?deck=1 turns the page's marked beats into
// full-screen slides with the story arc as the map.
//
// Markup contract (set by the page):
//   data-beat="12"        an element that becomes one slide; the number is its
//                         order in the deck (the read order may differ)
//   data-stage="climax"   exposition | rising | climax | falling | resolution
//                         (unset: inferred from position, climax near 62%)
//   data-notes="…"        talking points, shown with N
//   data-title="…"        the arc's label for the beat (else its heading)
//
// Mechanism: the homepage's. Every beat gets a 100svh slot in the document
// and the browser snaps between slots (native CSS scroll-snap). The beat
// itself is a fixed layer that GSAP scrubs in (scale 0 → 1, blur off) as its
// slot arrives and out (scale 1 → 1.5, blur on) as it leaves. Keys and the
// arc only scroll to a slot; nothing else moves the deck.
//
// Presenter keys: → ↓ space next · ← ↑ back · Home/End · N notes · T story
// arc · F fullscreen · Esc closes the arc.
import { gsap, ScrollTrigger } from '../lib/gsap.js';
import '../elements/hand-mark.js';

const params = new URLSearchParams(location.search);
// The deck is the default on a desktop (a fine pointer and room for the
// spread); ?read=1 asks for the long read, ?deck=1 forces the deck anywhere.
// a tablet is a stage too: an iPad swipes slide to slide on the same snap
const STAGE = matchMedia('(min-width: 900px) and (pointer: fine), (min-width: 744px) and (min-height: 600px) and (pointer: coarse)').matches;
// ?talk=1 plays the route marked for the room: only beats with data-talk, the
// same deck otherwise. A opens the full deck at the same slide.
const TALK = params.get('talk') === '1';
// Talking points are for the presenter: the talk route, or localhost. Visitors with the password never see them.
const PRESENTER = TALK || ['localhost', '127.0.0.1'].includes(location.hostname);
export const isDeck =
  params.get('deck') === '1' || TALK ||
  (params.get('read') !== '1' && STAGE && !!document.querySelector('[data-beat]'));

// the page was held pre-paint (boot/arriving.js) until the deck is laid out;
// a frame after this module's setup, it shows
requestAnimationFrame(() => document.documentElement.classList.remove('deck-pending'));

if (isDeck) {
  const root = document.documentElement;
  root.classList.add('deck');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || params.has('nomotion');
  const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
  if (reduced) root.classList.add('deck-still');

  // The deck owns the screen: drop the read-mode scroll choreography.
  ScrollTrigger.getAll().forEach((t) => t.kill());

  const main = document.querySelector('main');
  // a beat marked read-only belongs to the long read; the deck skips it
  const all = [...document.querySelectorAll('[data-beat]')].filter((b) => !b.classList.contains('read-only')).sort(
    (a, b) => Number(a.dataset.beat) - Number(b.dataset.beat),
  );
  // a long paragraph reads better ragged-right than centered: mark it
  all.forEach((b) => b.querySelectorAll('p:not(.read-only)').forEach((p) => { if (p.textContent.trim().length > 320) p.classList.add('deck-long'); }));
  // the next-study link keeps the mode you are presenting in (?talk=1 or ?deck=1)
  document.querySelectorAll('a.deck-next').forEach((a) => { a.href = a.getAttribute('href') + location.search; });
  const beats = TALK && all.some((b) => b.hasAttribute('data-talk')) ? all.filter((b) => b.hasAttribute('data-talk')) : all;
  if (TALK) root.classList.add('talk');
  if (!PRESENTER) all.forEach((b) => b.removeAttribute('data-notes'));

  if (main && beats.length) {
    // One slot per beat in document flow (the thing that snaps); the beat
    // itself becomes a fixed layer. The rest of main is hidden.
    const stage = document.createElement('div');
    stage.className = 'deck-stage';
    const slots = beats.map((b, i) => {
      b.classList.add('deck-beat');
      // every disclosure opens on its slide, except the five readings: that
      // slide is a menu the presenter opens for whoever just asked
      if (!b.classList.contains('ms-readers')) b.querySelectorAll('details').forEach((d) => { d.open = true; });
      if (b.classList.contains('ms-readers')) {
        // one reading open at a time, shown beside the list, the first by default
        const ds = [...b.querySelectorAll('details')];
        ds.forEach((d, k) => { d.open = k === 0; d.addEventListener('toggle', () => { if (d.open) ds.forEach((o) => { if (o !== d) o.open = false; }); }); });
      }
      // a read slide is a spread: heading across the top, the copy in columns
      if (b.classList.contains('ms-read') && !b.querySelector('.deck-copy')) {
        const copy = document.createElement('div');
        copy.className = 'deck-copy';
        [...b.children].filter((k) => !k.matches('h1, h2, .ms-epigraph')).forEach((k) => copy.appendChild(k));
        // exactly two paragraphs the deck will show sit side by side; the
        // long read's hidden paragraphs do not count
        const shown = [...copy.children].filter((k) => k.tagName === 'P' && !k.classList.contains('read-only') && !k.classList.contains('ms-links'));
        if (shown.length === 2) copy.classList.add('deck-two-up');
        b.appendChild(copy);
      }
      const slot = document.createElement('div');
      slot.className = 'deck-slot';
      slot.dataset.i = String(i);
      stage.appendChild(slot);
      stage.appendChild(b);
      return slot;
    });
    // a read slide's still leaves the scaled layer for a fixed layer of its
    // own, so it is full size from the first pixel and only ever crossfades
    const arts = beats.map((b) => {
      const fig = reduced ? null : b.querySelector('.ms-art'); // still motion keeps it in flow
      if (!fig) return null;
      const layer = document.createElement('div');
      layer.className = b.classList.contains('deck-image') ? 'deck-art deck-art-full' : 'deck-art';
      layer.setAttribute('aria-hidden', 'true');
      layer.appendChild(fig);
      b.classList.add('has-art');
      return layer;
    });
    // a slide whose only figure or list is in its long-read block is a text
    // slide in the deck, and takes the centred text layout
    beats.forEach((b) => {
      const visible = [...b.querySelectorAll('figure, blockquote, ol, ul, table, video')].some((el) => !el.closest('.read-only'));
      if (!visible) b.classList.add('deck-text-only');
    });
    [...main.children].forEach((c) => c.classList.add('deck-hidden')); // a class: author display rules beat the hidden attribute
    main.appendChild(stage);
    // one glow under every slide, fixed, so a slide that scrolls inside itself never drags it
    const glow = document.createElement('div');
    glow.className = 'deck-glow';
    glow.setAttribute('aria-hidden', 'true');
    main.appendChild(glow);
    arts.forEach((a) => a && main.appendChild(a));

    // Presenter chrome
    const ui = document.createElement('div');
    ui.className = 'deck-ui';
    ui.innerHTML = `
      <div class="deck-bar" aria-hidden="true"><span class="deck-fill"></span></div>
      <div class="deck-num" aria-hidden="true"></div>
      <button type="button" class="deck-arc-btn" aria-label="Open the story arc" aria-expanded="false" aria-controls="deck-arc"><svg viewBox="0 0 48 48" aria-hidden="true"><circle class="ring" cx="24" cy="24" r="20"></circle><circle class="prog" cx="24" cy="24" r="20"></circle></svg><span class="deck-arc-n"></span></button>
      <p class="deck-gen" aria-hidden="true"><span class="deck-gen-ticks"><i></i><i></i><i></i><i></i></span><span class="deck-gen-label"></span></p>
      <p class="deck-hint" aria-hidden="true">scroll or → next · ← back · ${PRESENTER ? 'N notes · ' : ''}T story arc · F fullscreen${TALK ? ' · A every slide' : ''}</p>
      <p class="sr-only deck-live" aria-live="polite" aria-atomic="true"></p>
      <aside class="deck-notes" hidden><p class="deck-eyebrow">Talking points · N to hide</p><div class="deck-notes-body"></div></aside>`;
    document.body.appendChild(ui);
    const fill = ui.querySelector('.deck-fill');
    const arcBtn = ui.querySelector('.deck-arc-btn');
    const arcN = ui.querySelector('.deck-arc-n');
    const prog = ui.querySelector('.deck-arc-btn .prog');
    const RING = 2 * Math.PI * 20;
    prog.style.strokeDasharray = `${RING}`;
    const num = ui.querySelector('.deck-num');
    const hint = ui.querySelector('.deck-hint');
    const live = ui.querySelector('.deck-live');
    // the generation each slide belongs to: one idea, four generations, each
    // carrying more of the decision. A beat sets data-gen where a generation
    // begins (0 = none) and every slide after inherits it; data-gen-label
    // overrides the words. The arc map names the generation beside each title.
    const GEN_LABELS = { 1: 'One · By hand', 2: 'Two · As a system', 3: 'Three · With agents', 4: 'Four · The judgment held in tests' };
    const GEN_SHORT = { 1: 'one', 2: 'two', 3: 'three', 4: 'four' };
    const genOf = beats.map((b, i) => {
      for (let k = i; k >= 0; k--) {
        const d = beats[k].dataset;
        if (d.gen !== undefined) { const n = Number(d.gen); return n ? { n, label: d.genLabel || GEN_LABELS[n] } : null; }
      }
      return null;
    });
    const gen = ui.querySelector('.deck-gen');
    const genLabel = ui.querySelector('.deck-gen-label');
    const genTicks = [...ui.querySelectorAll('.deck-gen-ticks i')];
    const notes = ui.querySelector('.deck-notes');
    const notesBody = ui.querySelector('.deck-notes-body');

    // --- per-beat enter: children rise in, counters count, links draw -----
    // The scramble (ported from David's 2015 pen, no jQuery): a title slide's
    // heading is split into letters that fly in from random offsets and settle.
    const scramble = (h) => {
      if (h.dataset.scrambled) return h.querySelectorAll('.ltr');
      // letters split into spans read one by one; the heading keeps its words
      if (!h.hasAttribute('aria-label')) h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
      const walk = (node) => {
        [...node.childNodes].forEach((n) => {
          if (n.nodeType === 3) {
            // letters become inline blocks, so each word is wrapped to keep
            // the line breaking between words, never inside one
            const frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach((part) => {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
              const w = document.createElement('span');
              w.className = 'wrd';
              for (const ch of part) {
                const sp = document.createElement('span');
                sp.className = 'ltr';
                sp.textContent = ch;
                w.appendChild(sp);
              }
              frag.appendChild(w);
            });
            n.replaceWith(frag);
          } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
        });
      };
      walk(h);
      h.classList.add('deck-scramble');
      h.dataset.scrambled = '1';
      return h.querySelectorAll('.ltr');
    };
    // --- the word morph: words the next slide shares with this one travel to
    //     their new place; the rest fade. A FLIP on the Web Animations API,
    //     after the pen David wrote years ago. Apple, Microsoft and About only.
    const MORPH = /\/(case-studies\/(apple|microsoft)|about-me)\//.test(location.pathname) && !reduced;
    const STOP = new Set(['that', 'this', 'with', 'from', 'have', 'were', 'they', 'them', 'their', 'than', 'then', 'into', 'about', 'every', 'would', 'could', 'when', 'what', 'which', 'where', 'there', 'these', 'those', 'because', 'before', 'after', 'while', 'being', 'been', 'over', 'under', 'through']);
    const wordKey = (el) => { const t = el.textContent.toLowerCase().replace(/[^a-z0-9]/g, ''); return t.length >= 4 && !STOP.has(t) ? t : null; };
    if (MORPH) {
      beats.forEach((b) => {
        b.querySelectorAll('.deck-copy > p:not(.read-only)').forEach((p) => {
          const walk = (n) => {
            [...n.childNodes].forEach((c) => {
              if (c.nodeType === 3) {
                const frag = document.createDocumentFragment();
                c.textContent.split(/(\s+)/).forEach((part) => {
                  if (!part) return;
                  if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
                  const w = document.createElement('span'); w.className = 'mw'; w.textContent = part; frag.appendChild(w);
                });
                c.replaceWith(frag);
              } else if (c.nodeType === 1 && !c.matches('hand-mark, code, a, svg')) walk(c);
            });
          };
          walk(p);
        });
      });
    }
    const wordMorph = (from, to) => {
      if (!MORPH || !from || !to) return false;
      const pool = new Map();
      from.querySelectorAll('.mw').forEach((w) => { const k = wordKey(w); if (k) (pool.get(k) ?? pool.set(k, []).get(k)).push(w); });
      const pairs = [];
      to.querySelectorAll('.mw').forEach((w) => { const k = wordKey(w); const src = k && pool.get(k)?.shift(); if (src) pairs.push([src, w]); });
      if (pairs.length < 2) return false;
      const accent = getComputedStyle(document.body).getPropertyValue('--cs-accent').trim() || '#fb836d';
      const copy = to.querySelector('.deck-copy');
      if (copy) gsap.set(copy, { opacity: 1, y: 0 });
      to.querySelectorAll('.mw').forEach((w) => { w.classList.remove('morphed'); w.style.opacity = '0'; });
      pairs.forEach(([src, w], i) => {
        const a = src.getBoundingClientRect(), b = w.getBoundingClientRect();
        const colour = getComputedStyle(w).color;
        w.classList.add('morphed'); w.style.opacity = '';
        w.animate(
          [{ transform: `translate(${a.left - b.left}px, ${a.top - b.top}px)`, color: accent }, { transform: 'translate(0, 0)', color: accent, offset: 0.7 }, { transform: 'translate(0, 0)', color: colour }],
          { duration: 1100, delay: 80 + i * 40, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', fill: 'both' },
        );
      });
      const rest = [...to.querySelectorAll('.mw:not(.morphed)')];
      rest.forEach((w, i) => { w.style.opacity = ''; w.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 600 + Math.min(i, 40) * 12, easing: 'ease-out', fill: 'both' }); });
      return true;
    };
    const enter = (b, prev) => {
      if (reduced) return;
      const title = b.matches('.ms-beat, .ms-chapter-open, .ms-statement') ? b.querySelector('h2, .ms-taught') : null;
      if (title) {
        const letters = scramble(title);
        const axes = ['x', 'y', 'z'];
        const axis = axes[(Number(b.dataset.beat) || 0) % 3];
        letters.forEach((l) => {
          const off = (Math.round(Math.random()) ? 1 : -1) * (100 + Math.random() * 200);
          gsap.fromTo(l, { opacity: 0, [axis]: off }, { opacity: 1, [axis]: 0, duration: 1.5 + Math.random(), ease: 'power3.inOut', clearProps: 'transform' });
        });
      }
      const morphed = wordMorph(prev, b);
      const kids = [...b.children].filter((k) => !k.matches('canvas, video') && !(morphed && k.classList.contains('deck-copy')));
      if (kids.length) gsap.fromTo(kids, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.07, ease: 'power3.out', clearProps: 'transform' });
      b.querySelectorAll('[data-count]').forEach((el) => {
        const target = Number(el.dataset.count);
        const state = { n: 0 };
        gsap.to(state, { n: target, duration: 1.2, ease: 'power2.out', onUpdate: () => { el.textContent = String(Math.round(state.n)); }, onComplete: () => { el.textContent = String(target); } });
      });
      b.querySelectorAll('svg .link, svg .ms-gen-link, svg .ap-link, svg .ink, svg .ink-thin').forEach((l, i) => {
        const len = l.getTotalLength ? l.getTotalLength() : 120;
        gsap.fromTo(l, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.7, delay: 0.3 + i * 0.03, ease: 'power1.inOut' });
      });
    };

    // --- the arc map: Freytag's triangle with every beat plotted on it ----
    const STAGES = ['Exposition', 'Rising action', 'Crux', 'Falling action', 'Resolution'];
    const EXPLICIT = { exposition: 'Exposition', rising: 'Rising action', climax: 'Crux', falling: 'Falling action', resolution: 'Resolution' };
    const climaxIdx = beats.map((b, i) => (b.dataset.stage === 'climax' ? i : -1)).filter((i) => i >= 0);
    const peakStart = climaxIdx.length ? climaxIdx[0] : Math.round(beats.length * 0.62);
    const peakEnd = climaxIdx.length ? climaxIdx[climaxIdx.length - 1] : peakStart;
    const stageOf = (i) => {
      const ex = beats[i].dataset.stage ?? '';
      if (EXPLICIT[ex]) return EXPLICIT[ex];
      if (i >= peakStart && i <= peakEnd) return 'Crux';
      if (i < peakStart) return i < Math.max(1, Math.round(peakStart * 0.3)) ? 'Exposition' : 'Rising action';
      const tail = beats.length - 1 - peakEnd;
      return i >= peakEnd + 1 + Math.max(1, Math.floor(tail * 0.6)) ? 'Resolution' : 'Falling action';
    };
    const titleOf = (b) => {
      if (b.dataset.title) return b.dataset.title;
      for (const sel of ['.ms-d-line', 'h1', 'h2', 'h3', '.ms-eyebrow', 'figcaption']) {
        const h = b.querySelector(sel);
        if (!h) continue;
        const clone = h.cloneNode(true);
        clone.querySelectorAll('br').forEach((br) => br.replaceWith(' '));
        const txt = clone.textContent.replace(/\s+/g, ' ').trim();
        if (txt) return txt.length > 90 ? `${txt.slice(0, 87)}…` : txt;
      }
      return `Beat ${beats.indexOf(b) + 1}`;
    };
    const W = 1000, H = 300, PAD = 60, APEX = 40, BASE = 230;
    const px = (i) => PAD + (i / Math.max(1, beats.length - 1)) * (W - PAD * 2);
    const py = (i) => {
      if (i < peakStart) return BASE - (BASE - APEX) * (i / Math.max(1, peakStart));
      if (i <= peakEnd) return APEX;
      return APEX + (BASE - APEX) * ((i - peakEnd) / Math.max(1, beats.length - 1 - peakEnd));
    };
    const pathD = beats.map((_, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)} ${py(i).toFixed(1)}`).join(' ');
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    const toc = document.createElement('div');
    toc.className = 'arc-toc';
    toc.setAttribute('role', 'dialog');
    toc.setAttribute('aria-modal', 'true');
    toc.id = 'deck-arc';
    toc.setAttribute('aria-label', 'The story arc, every beat');
    toc.innerHTML = `
      <div class="arc-head"><h2>The story arc</h2><button type="button" class="arc-close">Close · Esc</button></div>
      <div class="arc-body">
        <svg class="arc-svg" viewBox="0 0 ${W} ${H}" aria-hidden="true">
          <line class="base" x1="${PAD}" y1="${BASE + 18}" x2="${W - PAD}" y2="${BASE + 18}"></line>
          <path class="pyramid" d="${pathD}"></path>
          <path class="done" d="${pathD}"></path>
          <text class="peak" x="${(px(peakStart) + px(peakEnd)) / 2}" y="${APEX - 16}" text-anchor="middle">Crux</text>
          ${STAGES.filter((n) => n !== 'Crux').map((n) => { const idx = beats.map((_, i) => i).filter((i) => stageOf(i) === n); if (!idx.length) return ''; const x = (px(idx[0]) + px(idx[idx.length - 1])) / 2; const anchor = n === 'Exposition' ? 'start' : n === 'Resolution' ? 'end' : 'middle'; return `<text class="stage" data-stage="${n}" x="${x}" y="${BASE + 44}" text-anchor="${anchor}">${n}</text>`; }).join('')}
          ${beats.map((b, i) => `<circle class="dot" data-i="${i}" cx="${px(i)}" cy="${py(i)}" r="6"><title>${i + 1}. ${esc(titleOf(b))}</title></circle>`).join('')}
        </svg>
        <div class="arc-list">
          ${STAGES.map((n) => `<div class="arc-col" data-stage="${n}"><h4>${n}</h4><ol>${beats.map((b, i) => (stageOf(i) === n ? `<li><button type="button" data-i="${i}"><small>${String(i + 1).padStart(2, '0')}</small>${esc(titleOf(b))}${genOf[i] ? `<em class="arc-gen">${GEN_SHORT[genOf[i].n]}</em>` : ''}</button></li>` : '')).join('')}</ol></div>`).join('')}
        </div>
      </div>`;
    document.body.appendChild(toc);
    // each beat is a named slide for a screen reader (a figure keeps its own role and caption);
    // a beat that was a list item no longer sits in its list, so it stops claiming to be one
    beats.forEach((b, i) => {
      if (b.tagName === 'FIGURE' || b.tagName === 'ARTICLE') return; // these keep their own roles
      b.setAttribute('role', 'group');
      b.setAttribute('aria-roledescription', 'slide');
      b.setAttribute('aria-label', `${i + 1} of ${beats.length}: ${titleOf(b)}`);
    });
    const donePath = toc.querySelector('.done');
    const doneLen = donePath.getTotalLength();
    donePath.style.strokeDasharray = `${doneLen}`;
    donePath.style.strokeDashoffset = `${doneLen}`;

    // --- state: which slot is centred -------------------------------------
    let cur = -1;
    let numT = 0;
    const paint = (i) => {
      fill.style.width = `${((i + 1) / beats.length) * 100}%`;
      prog.style.strokeDashoffset = `${RING * (1 - (i + 1) / beats.length)}`;
      arcN.textContent = String(i + 1).padStart(2, '0');
      num.innerHTML = i === 0 ? '' : `${String(i + 1).padStart(2, '0')}<small> / ${beats.length}</small>`;
      num.classList.add('show');
      clearTimeout(numT);
      numT = setTimeout(() => num.classList.remove('show'), 2000);
      if (PRESENTER) notesBody.textContent = beats[i].dataset.notes ?? '(no notes for this beat)';
      hint.style.opacity = i >= beats.length - 1 ? '0' : '';
      const chromeOff = beats[i].matches('.cs-hero, .page-hero, .ms-chapter-open');
      const g = chromeOff ? null : genOf[i];
      genLabel.textContent = g ? g.label : '';
      gen.classList.remove('show'); // the ladder row is retired from the chrome (David, Oct 13 2026); the arc map still names the generation
      genTicks.forEach((t, k) => { t.classList.toggle('on', !!g && k + 1 === g.n); t.classList.toggle('past', !!g && k + 1 < g.n); });
      history.replaceState(null, '', `${location.pathname}${location.search}#b${i + 1}`);
      toc.querySelectorAll('.dot').forEach((d) => { const k = Number(d.dataset.i); d.classList.toggle('now', k === i); d.classList.toggle('past', k < i); });
      toc.querySelectorAll('.arc-col button').forEach((btn) => { const k = Number(btn.dataset.i); btn.classList.toggle('now', k === i); btn.classList.toggle('past', k < i); if (k === i) btn.setAttribute('aria-current', 'step'); else btn.removeAttribute('aria-current'); });
      const st = stageOf(i);
      toc.querySelectorAll('.arc-col h4').forEach((h) => h.classList.toggle('on', h.parentElement.dataset.stage === st));
      toc.querySelectorAll('.stage').forEach((t) => t.classList.toggle('on', t.dataset.stage === st));
      donePath.style.strokeDashoffset = `${doneLen * (1 - (beats.length > 1 ? i / (beats.length - 1) : 1))}`;
    };
    const setCur = (i) => {
      if (i === cur) return;
      const prev = cur >= 0 ? beats[cur] : null;
      cur = i;
      beats.forEach((b, k) => b.classList.toggle('active', k === i));
      // a reel keeps playing after its slide has gone; stop every video that is not on the active slide
      beats.forEach((b, k) => { if (k !== i) b.querySelectorAll('video').forEach((v) => { if (!v.paused) v.pause(); }); });
      // a background video that loops on its own (autoplay) starts over when its slide comes back; a reel waits for its play button
      beats[i]?.querySelectorAll('video[autoplay]').forEach((v) => { v.currentTime = 0; v.play().catch(() => {}); });
      beats[i].scrollTop = 0;
      // a chapter opener may recolor the glow and the accent for the slides after it
      // the nearest opener at or before this slide owns the colour, so a jump
      // from the arc map lands in the right chapter colour too
      for (let k = i; k >= 0; k--) {
        const d = beats[k].dataset;
        if (!d.glow && !d.accent) continue;
        if (d.glow) document.body.style.setProperty('--cs-glow', d.glow);
        if (d.accent) document.body.style.setProperty('--cs-accent', d.accent);
        break;
      }
      paint(i);
      if (prev) live.textContent = `Slide ${i + 1} of ${beats.length}: ${titleOf(beats[i])}`;
      enter(beats[i], prev);
    };

    // --- the scrub: the homepage's in/out, per slot -----------------------
    const EASE = 'power1.inOut';
    beats.forEach((b, i) => {
      const slot = slots[i];
      ScrollTrigger.create({
        trigger: reduced ? b : slot, // reduced motion hides the slots; the beats sit in flow
        start: 'top center',
        end: 'bottom center',
        onToggle: (self) => { if (self.isActive) setCur(i); },
      });
      if (reduced) return;
      // Blur the headline elements, never the layer itself (an ancestor
      // filter rasterizes the whole subtree). Safari skips media: its blur
      // bleed renders as a ghost glow.
      const blurEls = b.querySelectorAll(
        isSafari
          ? 'h1, h2, .ms-taught, .ms-close, .ms-stats b, .ms-beat-n'
          : 'h1, h2, .ms-taught, .ms-close, .ms-stats b, .ms-beat-n',
      );
      const inTl = gsap.timeline({
        defaults: { ease: EASE },
        scrollTrigger: { trigger: slot, start: 'top bottom', end: 'top top', scrub: true },
      });
      // snap quantizes the scrubbed value so rest lands on exactly 1.0 — a
      // 0.999 scale leaves the layer permanently bitmap-blurred.
      inTl.fromTo(b, { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, immediateRender: false, snap: { scale: 0.01 } }, 0);
      if (arts[i]) inTl.fromTo(arts[i], { autoAlpha: 0 }, { autoAlpha: 1, immediateRender: false }, 0);
      if (blurEls.length) inTl.fromTo(blurEls, { filter: 'blur(48px)' }, { filter: 'blur(0px)', immediateRender: false }, 0);
      const outTl = gsap.timeline({
        defaults: { ease: EASE },
        scrollTrigger: { trigger: slot, start: 'top top', end: 'bottom top', scrub: true },
      });
      outTl.fromTo(b, { scale: 1, autoAlpha: 1 }, { scale: 1.5, autoAlpha: 0, immediateRender: false, snap: { scale: 0.01 } }, 0);
      if (arts[i]) outTl.fromTo(arts[i], { autoAlpha: 1 }, { autoAlpha: 0, immediateRender: false }, 0);
      if (blurEls.length) outTl.fromTo(blurEls, { filter: 'blur(0px)' }, { filter: 'blur(32px)', immediateRender: false }, 0);
    });

    // --- steady layers while scrolling (see home.js blink guard) ----------
    let settleT = 0;
    const settled = () => root.classList.remove('is-scrolling');
    window.addEventListener('scroll', () => {
      if (!root.classList.contains('is-scrolling')) root.classList.add('is-scrolling');
      clearTimeout(settleT);
      settleT = setTimeout(settled, 220);
    }, { passive: true });
    window.addEventListener('scrollend', () => { clearTimeout(settleT); settleT = setTimeout(settled, 60); });

    // --- navigation: only ever a scroll to a slot --------------------------
    const go = (i, instant = false) => {
      i = Math.max(0, Math.min(beats.length - 1, i));
      const top = reduced ? beats[i].getBoundingClientRect().top + scrollY : slots[i].offsetTop;
      if (instant) {
        root.style.scrollBehavior = 'auto';
        window.scrollTo(0, top);
        root.style.scrollBehavior = '';
      } else {
        window.scrollTo({ top, behavior: 'smooth' });
      }
    };
    let tocReturn = null;
    const openToc = () => { tocReturn = document.activeElement; toc.classList.add('open'); arcBtn.setAttribute('aria-expanded', 'true'); setTimeout(() => (toc.querySelector('.arc-col button.now') ?? toc.querySelector('.arc-col button'))?.focus(), 50); };
    const closeToc = () => {
      if (!toc.classList.contains('open')) return;
      toc.classList.remove('open');
      arcBtn.setAttribute('aria-expanded', 'false');
      if (toc.contains(document.activeElement)) ((tocReturn && tocReturn !== document.body && document.contains(tocReturn)) ? tocReturn : arcBtn).focus({ preventScroll: true }); // focus goes back where it came from
    };
    window.addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea, select, [role=slider], [contenteditable], video, audio, summary')) return; // their own keys
      const k = e.key.toLowerCase();
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(cur + 1); }
      else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); go(cur - 1); }
      else if (e.key === 'Home') { e.preventDefault(); go(0); }
      else if (e.key === 'End') { e.preventDefault(); go(beats.length - 1); }
      else if (k === 'n' && PRESENTER) notes.hidden = !notes.hidden;
      else if (k === 't') { if (toc.classList.contains('open')) closeToc(); else openToc(); }
      else if (k === 'f') { if (document.fullscreenElement) document.exitFullscreen(); else root.requestFullscreen?.(); }
      else if (k === 'a' && TALK) { location.href = `${location.pathname}?deck=1#b${all.indexOf(beats[cur]) + 1}`; } // the whole deck, same slide
      else if (k === 'r' && e.ctrlKey && e.shiftKey) { e.preventDefault(); location.href = `${location.pathname}?read=1`; } // the long read: deliberate, not a stray key
      else if (e.key === 'Escape') closeToc();
    });
    arcBtn.addEventListener('click', () => { if (toc.classList.contains('open')) closeToc(); else openToc(); });
    toc.addEventListener('click', (e) => {
      const i = e.target.closest('[data-i]')?.dataset.i;
      if (i !== undefined) { closeToc(); go(Number(i)); return; }
      if (e.target.closest('.arc-close') || e.target === toc) closeToc();
    });

    // start: the hash remembers the slide
    ScrollTrigger.refresh();
    const m = /#b(\d+)/.exec(location.hash);
    const start = m ? Number(m[1]) - 1 : 0;
    if (start > 0) go(start, true);
    if (cur < 0) setCur(start);
    // the slot heights settle after fonts/images; keep the scrub honest
    addEventListener('load', () => ScrollTrigger.refresh());
  }
}
