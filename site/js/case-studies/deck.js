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

const params = new URLSearchParams(location.search);
// The deck is the default on a desktop (a fine pointer and room for the
// spread); ?read=1 asks for the long read, ?deck=1 forces the deck anywhere.
const STAGE = matchMedia('(min-width: 900px) and (pointer: fine)').matches;
export const isDeck =
  params.get('deck') === '1' ||
  (params.get('read') !== '1' && STAGE && !!document.querySelector('[data-beat]'));

if (isDeck) {
  const root = document.documentElement;
  root.classList.add('deck');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || params.has('nomotion');
  const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
  if (reduced) root.classList.add('deck-still');

  // The deck owns the screen: drop the read-mode scroll choreography.
  ScrollTrigger.getAll().forEach((t) => t.kill());

  const main = document.querySelector('main');
  const beats = [...document.querySelectorAll('[data-beat]')].sort(
    (a, b) => Number(a.dataset.beat) - Number(b.dataset.beat),
  );

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
      <button type="button" class="deck-arc-btn" aria-label="Open the story arc"><svg viewBox="0 0 48 48" aria-hidden="true"><circle class="ring" cx="24" cy="24" r="20"></circle><circle class="prog" cx="24" cy="24" r="20"></circle></svg><span class="deck-arc-n"></span></button>
      <p class="deck-kicker" aria-hidden="true"></p>
      <p class="deck-hint" aria-hidden="true">scroll or → next · ← back · N notes · T story arc · F fullscreen · R read</p>
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
    const kicker = ui.querySelector('.deck-kicker');
    // the chapter each slide belongs to: the eyebrow of the last opener before it
    const chapterOf = beats.map((b, i) => {
      for (let k = i; k >= 0; k--) {
        const o = beats[k];
        if (o.matches('.ms-chapter-open') || o.dataset.glow) {
          const e = o.querySelector('.ms-eyebrow');
          return e ? e.textContent.replace(/\s+/g, ' ').trim() : '';
        }
      }
      return '';
    });
    const notes = ui.querySelector('.deck-notes');
    const notesBody = ui.querySelector('.deck-notes-body');

    // --- per-beat enter: children rise in, counters count, links draw -----
    // The scramble (ported from David's 2015 pen, no jQuery): a title slide's
    // heading is split into letters that fly in from random offsets and settle.
    const scramble = (h) => {
      if (h.dataset.scrambled) return h.querySelectorAll('.ltr');
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
    const enter = (b) => {
      if (reduced) return;
      const title = b.matches('.ms-beat, .ms-chapter-open') ? b.querySelector('h2, .ms-taught') : null;
      if (title) {
        const letters = scramble(title);
        const axes = ['x', 'y', 'z'];
        const axis = axes[(Number(b.dataset.beat) || 0) % 3];
        letters.forEach((l) => {
          const off = (Math.round(Math.random()) ? 1 : -1) * (100 + Math.random() * 200);
          gsap.fromTo(l, { opacity: 0, [axis]: off }, { opacity: 1, [axis]: 0, duration: 1.5 + Math.random(), ease: 'power3.inOut', clearProps: 'transform' });
        });
      }
      const kids = [...b.children].filter((k) => !k.matches('canvas, video'));
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
    const STAGES = ['Exposition', 'Rising action', 'Climax', 'Falling action', 'Resolution'];
    const EXPLICIT = { exposition: 'Exposition', rising: 'Rising action', climax: 'Climax', falling: 'Falling action', resolution: 'Resolution' };
    const climaxIdx = beats.map((b, i) => (b.dataset.stage === 'climax' ? i : -1)).filter((i) => i >= 0);
    const peakStart = climaxIdx.length ? climaxIdx[0] : Math.round(beats.length * 0.62);
    const peakEnd = climaxIdx.length ? climaxIdx[climaxIdx.length - 1] : peakStart;
    const stageOf = (i) => {
      const ex = beats[i].dataset.stage ?? '';
      if (EXPLICIT[ex]) return EXPLICIT[ex];
      if (i >= peakStart && i <= peakEnd) return 'Climax';
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
    toc.setAttribute('aria-label', 'The story arc, every beat');
    toc.innerHTML = `
      <div class="arc-head"><h2>The story arc</h2><button type="button" class="arc-close">Close · Esc</button></div>
      <div class="arc-body">
        <svg class="arc-svg" viewBox="0 0 ${W} ${H}" aria-hidden="true">
          <line class="base" x1="${PAD}" y1="${BASE + 18}" x2="${W - PAD}" y2="${BASE + 18}"></line>
          <path class="pyramid" d="${pathD}"></path>
          <path class="done" d="${pathD}"></path>
          <text class="peak" x="${(px(peakStart) + px(peakEnd)) / 2}" y="${APEX - 16}" text-anchor="middle">Climax</text>
          ${STAGES.filter((n) => n !== 'Climax').map((n) => { const idx = beats.map((_, i) => i).filter((i) => stageOf(i) === n); if (!idx.length) return ''; const x = (px(idx[0]) + px(idx[idx.length - 1])) / 2; const anchor = n === 'Exposition' ? 'start' : n === 'Resolution' ? 'end' : 'middle'; return `<text class="stage" data-stage="${n}" x="${x}" y="${BASE + 44}" text-anchor="${anchor}">${n}</text>`; }).join('')}
          ${beats.map((b, i) => `<circle class="dot" data-i="${i}" cx="${px(i)}" cy="${py(i)}" r="6"><title>${i + 1}. ${esc(titleOf(b))}</title></circle>`).join('')}
        </svg>
        <div class="arc-list">
          ${STAGES.map((n) => `<div class="arc-col" data-stage="${n}"><h4>${n}</h4><ol>${beats.map((b, i) => (stageOf(i) === n ? `<li><button type="button" data-i="${i}"><small>${String(i + 1).padStart(2, '0')}</small>${esc(titleOf(b))}</button></li>` : '')).join('')}</ol></div>`).join('')}
        </div>
      </div>`;
    document.body.appendChild(toc);
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
      notesBody.textContent = beats[i].dataset.notes ?? '(no notes for this beat)';
      hint.style.opacity = i >= beats.length - 1 ? '0' : '';
      const showKicker = chapterOf[i] && !beats[i].matches('.cs-hero, .page-hero, .ms-chapter-open');
      kicker.textContent = showKicker ? chapterOf[i] : '';
      history.replaceState(null, '', `${location.pathname}${location.search}#b${i + 1}`);
      toc.querySelectorAll('.dot').forEach((d) => { const k = Number(d.dataset.i); d.classList.toggle('now', k === i); d.classList.toggle('past', k < i); });
      toc.querySelectorAll('.arc-col button').forEach((btn) => { const k = Number(btn.dataset.i); btn.classList.toggle('now', k === i); btn.classList.toggle('past', k < i); });
      const st = stageOf(i);
      toc.querySelectorAll('.arc-col h4').forEach((h) => h.classList.toggle('on', h.parentElement.dataset.stage === st));
      toc.querySelectorAll('.stage').forEach((t) => t.classList.toggle('on', t.dataset.stage === st));
      donePath.style.strokeDashoffset = `${doneLen * (1 - (beats.length > 1 ? i / (beats.length - 1) : 1))}`;
    };
    const setCur = (i) => {
      if (i === cur) return;
      cur = i;
      beats.forEach((b, k) => b.classList.toggle('active', k === i));
      beats[i].scrollTop = 0;
      // a chapter opener may recolor the glow and the accent for the slides after it
      if (beats[i].dataset.glow) document.body.style.setProperty('--cs-glow', beats[i].dataset.glow);
      if (beats[i].dataset.accent) document.body.style.setProperty('--cs-accent', beats[i].dataset.accent);
      paint(i);
      enter(beats[i]);
    };

    // --- the scrub: the homepage's in/out, per slot -----------------------
    const EASE = 'power1.inOut';
    beats.forEach((b, i) => {
      const slot = slots[i];
      ScrollTrigger.create({
        trigger: slot,
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
          : 'h1, h2, .ms-taught, .ms-close, .ms-stats b, .ms-beat-n, img, video',
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

    // --- navigation: only ever a scroll to a slot --------------------------
    const go = (i, instant = false) => {
      i = Math.max(0, Math.min(beats.length - 1, i));
      const top = slots[i].offsetTop;
      if (instant) {
        root.style.scrollBehavior = 'auto';
        window.scrollTo(0, top);
        root.style.scrollBehavior = '';
      } else {
        window.scrollTo({ top, behavior: 'smooth' });
      }
    };
    const openToc = () => { toc.classList.add('open'); setTimeout(() => (toc.querySelector('.arc-col button.now') ?? toc.querySelector('.arc-col button'))?.focus(), 50); };
    const closeToc = () => toc.classList.remove('open');
    window.addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea, select, [role=slider]')) return;
      const k = e.key.toLowerCase();
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(cur + 1); }
      else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); go(cur - 1); }
      else if (e.key === 'Home') { e.preventDefault(); go(0); }
      else if (e.key === 'End') { e.preventDefault(); go(beats.length - 1); }
      else if (k === 'n') notes.hidden = !notes.hidden;
      else if (k === 't') { if (toc.classList.contains('open')) closeToc(); else openToc(); }
      else if (k === 'f') { if (document.fullscreenElement) document.exitFullscreen(); else root.requestFullscreen?.(); }
      else if (k === 'r') { location.href = `${location.pathname}?read=1`; }
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
