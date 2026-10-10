// Deck mode for a case study: ?deck=1 turns the page's marked beats into
// full-screen slides, one at a time, with the story arc as the map.
//
// Markup contract (set by the page):
//   data-beat="12"        an element that becomes one slide; the number is its
//                         order in the deck (the read order may differ)
//   data-stage="climax"   exposition | rising | climax | falling | resolution
//                         (unset: inferred from position, climax near 62%)
//   data-notes="…"        speaker notes, shown with N
//
// Presenter keys: → ↓ space next · ← ↑ back · Home/End · N notes · T story
// arc · F fullscreen · Esc closes the arc. Wheel and swipe move one slide.
// Same mechanism as the homepage and the unakin decks: the slides are a
// fixed stack, GSAP paints the hand-off, the document scroll is parked.
import { gsap, ScrollTrigger } from '../lib/gsap.js';

const params = new URLSearchParams(location.search);
export const isDeck = params.get('deck') === '1';

if (isDeck) {
  const root = document.documentElement;
  root.classList.add('deck');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || params.has('nomotion');

  // The deck owns the screen: drop the read-mode scroll choreography.
  ScrollTrigger.getAll().forEach((t) => t.kill());

  const main = document.querySelector('main');
  const beats = [...document.querySelectorAll('[data-beat]')].sort(
    (a, b) => Number(a.dataset.beat) - Number(b.dataset.beat),
  );

  if (main && beats.length) {
    // Lift every beat into one stage, in deck order; hide the rest of main.
    const stage = document.createElement('div');
    stage.className = 'deck-stage';
    beats.forEach((b) => {
      b.classList.add('deck-beat');
      b.querySelectorAll('details').forEach((d) => { d.open = true; });
      stage.appendChild(b);
    });
    [...main.children].forEach((c) => c.classList.add('deck-hidden')); // a class: author display rules beat the hidden attribute
    main.appendChild(stage);

    // Presenter chrome
    const ui = document.createElement('div');
    ui.className = 'deck-ui';
    ui.innerHTML = `
      <div class="deck-bar" aria-hidden="true"><span class="deck-fill"></span></div>
      <div class="deck-num" aria-hidden="true"></div>
      <p class="deck-hint" aria-hidden="true">→ next · ← back · N notes · T story arc · F fullscreen</p>
      <aside class="deck-notes" hidden><p class="deck-eyebrow">Talking points · N to hide</p><div class="deck-notes-body"></div></aside>`;
    document.body.appendChild(ui);
    const fill = ui.querySelector('.deck-fill');
    const num = ui.querySelector('.deck-num');
    const hint = ui.querySelector('.deck-hint');
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
            const frag = document.createDocumentFragment();
            for (const ch of n.textContent) {
              if (ch === ' ' || ch === '\n') { frag.appendChild(document.createTextNode(' ')); continue; }
              const sp = document.createElement('span');
              sp.className = 'ltr';
              sp.textContent = ch;
              frag.appendChild(sp);
            }
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

    // --- navigation -------------------------------------------------------
    let cur = -1;
    let busy = false;
    let numT = 0;
    const paint = (i) => {
      fill.style.width = `${((i + 1) / beats.length) * 100}%`;
      num.innerHTML = i === 0 ? '' : `${String(i + 1).padStart(2, '0')}<small> / ${beats.length}</small>`;
      num.classList.add('show');
      clearTimeout(numT);
      numT = setTimeout(() => num.classList.remove('show'), 2000);
      notesBody.textContent = beats[i].dataset.notes ?? '(no notes for this beat)';
      hint.style.opacity = i >= beats.length - 1 ? '0' : '';
      history.replaceState(null, '', `${location.pathname}${location.search}#b${i + 1}`);
      toc.querySelectorAll('.dot').forEach((d) => { const k = Number(d.dataset.i); d.classList.toggle('now', k === i); d.classList.toggle('past', k < i); });
      toc.querySelectorAll('.arc-col button').forEach((btn) => { const k = Number(btn.dataset.i); btn.classList.toggle('now', k === i); btn.classList.toggle('past', k < i); });
      const st = stageOf(i);
      toc.querySelectorAll('.arc-col h4').forEach((h) => h.classList.toggle('on', h.parentElement.dataset.stage === st));
      toc.querySelectorAll('.stage').forEach((t) => t.classList.toggle('on', t.dataset.stage === st));
      donePath.style.strokeDashoffset = `${doneLen * (1 - (beats.length > 1 ? i / (beats.length - 1) : 1))}`;
    };
    const go = (i) => {
      i = Math.max(0, Math.min(beats.length - 1, i));
      if (i === cur || busy) return;
      busy = true;
      const prev = cur >= 0 ? beats[cur] : null;
      const next = beats[i];
      const dir = i > cur ? 1 : -1;
      cur = i;
      paint(i);
      const done = () => { busy = false; };
      if (reduced) {
        prev?.classList.remove('active');
        next.classList.add('active');
        done();
        return;
      }
      const heroOut = !!prev?.classList.contains('cs-hero');
      const inAt = !prev ? 0 : heroOut ? 0.6 : 0.12;
      const t = gsap.timeline({ onComplete: done });
      if (prev) {
        t.to(prev, heroOut ? { opacity: 0, duration: 0.55, ease: 'power2.inOut' } : { opacity: 0, yPercent: -7 * dir, scale: 0.94, filter: 'blur(6px)', duration: 0.7, ease: 'power2.inOut' }, 0);
        t.add(() => { prev.classList.remove('active'); gsap.set(prev, { clearProps: 'transform,opacity,filter' }); }, 0.7);
      }
      t.add(() => { next.classList.add('active'); next.scrollTop = 0; }, inAt);
      t.fromTo(next, { opacity: 0, yPercent: 9 * dir, scale: 1.06, filter: 'blur(4px)' }, { opacity: 1, yPercent: 0, scale: 1, filter: 'blur(0px)', duration: 0.9, ease: 'power3.out', clearProps: 'transform,filter' }, inAt);
      t.add(() => enter(next), inAt + (prev ? 0.2 : 0.1));
    };

    // wheel: one slide per gesture; a tall slide scrolls inside itself first
    let lastWheel = 0;
    window.addEventListener('wheel', (e) => {
      if (e.target.closest('.deck-notes, .arc-toc')) return;
      const b = e.target.closest('.deck-beat');
      if (b && b.scrollHeight > b.clientHeight + 4) {
        const atEnd = e.deltaY > 0 ? b.scrollTop + b.clientHeight >= b.scrollHeight - 2 : b.scrollTop <= 0;
        if (!atEnd) return;
      }
      e.preventDefault();
      const now = performance.now();
      if (now - lastWheel < 900 || Math.abs(e.deltaY) < 8) return;
      lastWheel = now;
      go(cur + (e.deltaY > 0 ? 1 : -1));
    }, { passive: false });
    // touch: a vertical swipe moves one slide
    let touchY = null;
    window.addEventListener('touchstart', (e) => { touchY = e.touches[0].clientY; }, { passive: true });
    window.addEventListener('touchend', (e) => {
      if (touchY == null) return;
      const dy = touchY - e.changedTouches[0].clientY;
      touchY = null;
      if (Math.abs(dy) > 48) go(cur + (dy > 0 ? 1 : -1));
    }, { passive: true });
    // keys and the arc
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
      else if (e.key === 'Escape') closeToc();
    });
    toc.addEventListener('click', (e) => {
      const i = e.target.closest('[data-i]')?.dataset.i;
      if (i !== undefined) { closeToc(); go(Number(i)); return; }
      if (e.target.closest('.arc-close') || e.target === toc) closeToc();
    });

    // start: the hash remembers the slide
    const m = /#b(\d+)/.exec(location.hash);
    go(m ? Number(m[1]) - 1 : 0);
  }
}
