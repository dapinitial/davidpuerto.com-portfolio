/*
 * cursor.js — a global custom cursor that is also a radial HUD.
 *
 * ONE cursor, driven by any input (pointer/keyboard now; gaze/voice via the bus later).
 * Around it: an outer ring = page-scroll progress, an inner arc = state
 * (idle · link · dwell · loading · download · error). It BLOOMS open into a
 * tooltip + image preview, with a GSAP fall/bounce cascade (folded in from the
 * Codrops "Made With GSAP" effect).
 *
 * Accessibility (this is GLOBAL, so these are load-bearing):
 *   - Activates ONLY on a fine pointer with motion allowed. Coarse pointer / touch /
 *     prefers-reduced-motion → we never hide the native cursor; the API becomes a no-op.
 *   - Keyboard focus gets the same reveal as hover (focus parity).
 *   - No info lives only in the cursor: bloom mirrors the target's own title/desc,
 *     and an aria-live region announces state changes.
 *
 * API:  SLCursor.setState(mode, value) · SLCursor.pos(x,y) · SLCursor.activate()
 *       SLCursor.bloom(target|null) · SLCursor.bus (on/emit) · SLCursor.enabled
 * Debug: window.__cur mirrors the API.
 */
(function () {
  'use strict';

  const fine   = matchMedia('(pointer: fine)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ENABLED = fine && !reduce;

  // ---- tiny bus (same shape as the hero's) ----
  const bus = (() => { const m = {}; const B = {
    on:(t,f)=>((m[t]=m[t]||[]).push(f),B), emit:(t,d)=>{(m[t]||[]).forEach(f=>f(d));} }; return B; })();

  // ---- config: where MediaPipe loads + who supplies the camera. Webpage = CDN + in-page camera;
  // the extension overrides via window.MMC_CONFIG (local bundled files + 'external' camera fed by the offscreen doc). ----
  const CFG = Object.assign({
    mediapipeBase: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14',
    handModel: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
    faceModel: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
    cameraSource: 'in-page'
  }, window.MMC_CONFIG || {});

  // Public API stub — becomes real only when ENABLED; otherwise safe no-ops.
  const API = { bus, enabled:ENABLED, config:CFG, setState(){}, pos(){}, activate(){}, bloom(){},
    nav(){}, dwellMode(){}, stopGaze(){}, stopVoice(){}, startVoice(){}, stopHand(){}, feed(){},
    startHand(){ return Promise.reject(new Error('disabled')); },
    startGaze(){ return Promise.reject(new Error('cursor disabled on this device')); } };
  window.SLCursor = API; window.__cur = API;
  if (!ENABLED) return;   // native cursor stays; nothing hidden. That's the inclusive default.

  // ---- styles (self-contained) ----
  const R_OUT = 30, R_IN = 22, C_OUT = 2*Math.PI*R_OUT, C_IN = 2*Math.PI*R_IN;
  const css = `
  html.sl-cur-on, html.sl-cur-on * { cursor: none !important; }
  #sl-cursor{ position:fixed; top:0; left:0; width:72px; height:72px; z-index:2147483000;
    pointer-events:none; transform:translate(-100px,-100px); will-change:transform;
    --accent:#e6a15c; --err:#e0684a; --fg:#f2e9dd; }
  #sl-cursor svg{ position:absolute; inset:0; overflow:visible; transform:rotate(-90deg); }
  #sl-cursor circle{ fill:none; stroke-linecap:round; }
  #sl-cursor .track{ stroke:rgba(242,233,221,.14); stroke-width:2; }
  #sl-cursor .scroll{ stroke:rgba(242,233,221,.30); stroke-width:2;
    stroke-dasharray:${C_OUT}; stroke-dashoffset:${C_OUT}; transition:stroke-dashoffset .12s linear; }
  #sl-cursor .state{ stroke:var(--accent); stroke-width:3;
    stroke-dasharray:${C_IN}; stroke-dashoffset:${C_IN}; transition:stroke-dashoffset .12s linear, stroke .2s; }
  #sl-cursor .dot{ position:absolute; left:50%; top:50%; width:7px; height:7px; border-radius:50%;
    background:var(--fg); transform:translate(-50%,-50%) scale(1); transition:transform .18s, background .2s; }
  #sl-cursor .glyph{ position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
    font:600 15px/1 ui-monospace,Menlo,monospace; color:var(--accent); opacity:0; }
  #sl-cursor .label{ position:absolute; left:50%; top:calc(100% + 6px); transform:translate(-50%,0);
    white-space:nowrap; font:600 11px/1 ui-monospace,Menlo,monospace; letter-spacing:.12em;
    text-transform:uppercase; color:var(--fg); background:rgba(11,8,6,.8); border:1px solid rgba(230,161,92,.3);
    padding:4px 8px; border-radius:6px; opacity:0; transition:opacity .15s; }
  /* states */
  #sl-cursor[data-state="idle"] .dot{ transform:translate(-50%,-50%) scale(1); }
  #sl-cursor[data-state="link"] .dot{ transform:translate(-50%,-50%) scale(.4); }
  #sl-cursor[data-state="link"] .label, #sl-cursor[data-state="download"] .label{ opacity:1; }
  #sl-cursor[data-state="link"] .state{ stroke-dashoffset:0; }
  #sl-cursor[data-state="loading"] .dot{ transform:translate(-50%,-50%) scale(.4); }
  #sl-cursor[data-state="loading"] svg{ animation:sl-spin 1s linear infinite; }
  #sl-cursor[data-state="download"] .glyph, #sl-cursor[data-state="error"] .glyph{ opacity:1; }
  #sl-cursor[data-state="download"] .dot{ opacity:0; }
  #sl-cursor[data-state="error"] .state{ stroke:var(--err); stroke-dashoffset:0; }
  #sl-cursor[data-state="error"] .dot{ background:var(--err); }
  #sl-cursor.sl-shake{ animation:sl-shake .4s; }
  @keyframes sl-spin{ to{ transform:rotate(270deg); } }
  @keyframes sl-shake{ 0%,100%{}25%{transform:translate(calc(var(--x)*1px - 5px),var(--y))}75%{transform:translate(calc(var(--x)*1px + 5px),var(--y))} }
  /* bloom */
  #sl-bloom{ position:fixed; top:0; left:0; z-index:2147482999; pointer-events:none;
    transform:translate(-9999px,-9999px); }
  #sl-bloom .inner{ position:absolute; transform:translate(-50%,-50%) scale(.6); opacity:0;
    transform-origin:center; transition:transform .28s cubic-bezier(.2,.9,.2,1), opacity .2s;
    width:240px; background:rgba(22,17,11,.92); border:1px solid rgba(230,161,92,.28);
    border-radius:12px; overflow:hidden; box-shadow:0 24px 60px rgba(0,0,0,.5); backdrop-filter:blur(6px); }
  #sl-bloom.open .inner{ transform:translate(-50%,-50%) scale(1); opacity:1; }
  #sl-bloom img{ display:block; width:100%; height:150px; object-fit:cover; }
  #sl-bloom .txt{ padding:.7rem .8rem; }
  #sl-bloom h4{ margin:0 0 .2rem; font:600 .82rem/1.2 Georgia,serif; color:var(--fg,#f2e9dd); }
  #sl-bloom p{ margin:0; font:400 .72rem/1.4 system-ui,sans-serif; color:rgba(242,233,221,.62); }
  /* GSAP fall previews */
  .sl-fall-img{ position:fixed; width:15vw; height:15vw; max-width:150px; max-height:150px;
    object-fit:cover; border-radius:8px; z-index:2147482998; pointer-events:none; will-change:transform; }
  .sl-sr{ position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; }`;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  // ---- DOM ----
  document.documentElement.classList.add('sl-cur-on');
  const el = document.createElement('div'); el.id='sl-cursor'; el.dataset.state='idle';
  el.innerHTML = `
    <svg viewBox="0 0 72 72" width="72" height="72" aria-hidden="true">
      <circle class="track" cx="36" cy="36" r="${R_OUT}"></circle>
      <circle class="scroll" cx="36" cy="36" r="${R_OUT}"></circle>
      <circle class="track" cx="36" cy="36" r="${R_IN}"></circle>
      <circle class="state" cx="36" cy="36" r="${R_IN}"></circle>
    </svg><div class="dot"></div><div class="glyph"></div><div class="label"></div>`;
  document.body.appendChild(el);
  const scrollArc = el.querySelector('.scroll'), stateArc = el.querySelector('.state');
  const glyph = el.querySelector('.glyph'), label = el.querySelector('.label');

  const bloom = document.createElement('div'); bloom.id='sl-bloom';
  bloom.innerHTML = `<div class="inner"><img alt=""><div class="txt"><h4></h4><p></p></div></div>`;
  document.body.appendChild(bloom);
  const bImg = bloom.querySelector('img'), bH = bloom.querySelector('h4'), bP = bloom.querySelector('p');

  const live = document.createElement('div'); live.className='sl-sr'; live.setAttribute('aria-live','polite');
  document.body.appendChild(live);

  // ---- state ----
  let tx = innerWidth/2, ty = innerHeight/2, x = tx, y = ty;
  let mode = 'idle';
  const setStateArc = p => stateArc.style.strokeDashoffset = C_IN*(1-Math.max(0,Math.min(1,p)));

  function setState(m, v){
    mode = m; el.dataset.state = m;
    if (m === 'download'){ setStateArc(v||0); glyph.textContent = Math.round((v||0)*100)+'%'; live.textContent='Downloading '+Math.round((v||0)*100)+'%'; }
    else if (m === 'dwell'){ setStateArc(v||0); }
    else if (m === 'loading'){ setStateArc(0.28); glyph.textContent=''; live.textContent='Loading'; }
    else if (m === 'error'){ glyph.textContent='!'; live.textContent='Error'; el.classList.remove('sl-shake'); void el.offsetWidth; el.classList.add('sl-shake'); }
    else if (m === 'link'){ setStateArc(0); glyph.textContent=''; }
    else { setStateArc(0); glyph.textContent=''; label.textContent=''; }
  }
  API.setState = setState;

  function pos(px, py){ tx = px; ty = py; }
  API.pos = pos;
  API.snap = (px, py) => { tx = x = px; ty = y = py; render(); };   // debug: position + paint without the loop

  // ---- bloom (tooltip + image), with GSAP fall cascade ----
  function showBloom(t){
    const img = t.getAttribute('data-cursor-img');
    bH.textContent = t.getAttribute('data-cursor') || t.getAttribute('aria-label') || '';
    bP.textContent = t.getAttribute('data-cursor-desc') || '';
    if (img){ bImg.src = img; bImg.style.display='block'; } else bImg.style.display='none';
    positionBloom(); bloom.classList.add('open');
    fallCascade(t);
  }
  function hideBloom(){ bloom.classList.remove('open'); }
  API.bloom = t => t ? showBloom(t) : hideBloom();
  function positionBloom(){
    // place to the side that has room
    const bx = ex > innerWidth-280 ? ex-140 : ex+140;
    const by = Math.max(120, Math.min(innerHeight-120, ey));
    bloom.style.transform = `translate(${bx}px,${by}px)`;
  }

  // Folded-in GSAP physics: spawn a couple of preview thumbnails that drop & bounce.
  const FALL = (() => { const a=[]; for(let i=1;i<=10;i++) a.push('cursor-media/'+String(i).padStart(2,'0')+'.png'); return a; })();
  let fallIdx = 0;
  function fallCascade(t){
    if (typeof gsap === 'undefined') return;
    const imgs = (t.getAttribute('data-cursor-fall') ? FALL : FALL).slice(0,3);
    imgs.forEach((src,i) => {
      const im = document.createElement('img'); im.src = src; im.className='sl-fall-img'; document.body.appendChild(im);
      const H = innerHeight, startX = x + (i-1)*70, startY = y;
      const tl = gsap.timeline({ onComplete:()=>{ im.remove(); tl.kill(); } });
      tl.fromTo(im, { x:startX, y:startY, xPercent:-50, yPercent:-50, scale:1.3, rotation:(Math.random()-.5)*24 },
                    { scale:1, rotation:(Math.random()-.5)*10, ease:'elastic.out(2,0.6)', duration:.4 });
      tl.to(im, { y:H+120, yPercent:-50, ease:'back.in(1.4)', duration:.5 }, '<');
      fallIdx = (fallIdx+1) % FALL.length;
    });
  }
  API.fall = fallCascade;

  // ---- inputs. targetOf matches REAL interactive elements (works on any site) + demo [data-cursor]. ----
  const INTERACTIVE = 'a[href],button,input:not([type="hidden"]),select,textarea,[role="button"],[role="link"],[onclick],[tabindex]:not([tabindex="-1"]),label,summary';
  const targetOf = n => (n && n.closest) ? n.closest('[data-cursor],'+INTERACTIVE) : null;
  let hovered = null;
  function enter(t){ if (t===hovered) return; hovered=t;
    label.textContent = t.getAttribute('data-cursor') || t.getAttribute('aria-label') || (t.textContent||'').trim().slice(0,24) || t.tagName.toLowerCase();
    setState('link');
    if (t.hasAttribute('data-cursor-img') || t.hasAttribute('data-cursor-desc')) showBloom(t); }
  function leave(){ hovered=null; hideBloom(); if (mode==='link') setState('idle'); }

  addEventListener('pointermove', e => bus.emit('cursor:move',{ x:e.clientX, y:e.clientY, src:'pointer' }), {passive:true});
  addEventListener('touchmove', e => { const t=e.touches&&e.touches[0]; if(t) bus.emit('cursor:move',{ x:t.clientX, y:t.clientY, src:'touch' }); }, {passive:true});
  addEventListener('pointerdown', () => { el.querySelector('.dot').style.transform='translate(-50%,-50%) scale(.3)'; });
  addEventListener('pointerup',   () => { el.querySelector('.dot').style.transform=''; });

  // keyboard: nudge the cursor; Enter/Space activates whatever's under it. Focus gets the same reveal.
  addEventListener('keydown', e => {
    const s = 40;
    if (e.key.startsWith('Arrow')){
      if (e.key==='ArrowLeft') tx-=s; if (e.key==='ArrowRight') tx+=s;
      if (e.key==='ArrowUp') ty-=s; if (e.key==='ArrowDown') ty+=s;
      tx=Math.max(0,Math.min(innerWidth,tx)); ty=Math.max(0,Math.min(innerHeight,ty));
      const t = targetOf(document.elementFromPoint(tx,ty)); if (t) enter(t); else if (hovered) leave();
      e.preventDefault();
    } else if (e.key==='Enter' || e.key===' '){ if (hovered){ hovered.click?.(); bus.emit('cursor:activate',{target:hovered}); } }
  });
  // focus parity: focusing a target reveals the same bloom + moves the HUD to it
  addEventListener('focusin', e => { const t = targetOf(e.target); if (t){ const r=t.getBoundingClientRect(); pos(r.left+r.width/2, r.top+r.height/2); enter(t); } });
  addEventListener('focusout', () => leave());

  // scroll ring = page progress
  function onScroll(){ const max = document.documentElement.scrollHeight - innerHeight;
    const p = max>0 ? scrollY/max : 0; scrollArc.style.strokeDashoffset = C_OUT*(1-p); }
  addEventListener('scroll', onScroll, {passive:true}); onScroll();

  // bus intents (so gaze/voice/nav feed the same core)
  // input arbiter: pointer/touch > hand > gaze. A higher-priority source takes over instantly and
  // suppresses lower ones for DOM_TTL, then control hands back. (Voice commands bypass this.)
  const PRIO = { pointer:3, touch:3, hand:2, gaze:1 };
  let domSrc = null, domAt = 0; const DOM_TTL = 700;
  bus.on('cursor:move', d => { const src = d.src || 'pointer', now = performance.now();
    if (!domSrc || PRIO[src] >= PRIO[domSrc] || (now - domAt) > DOM_TTL){ domSrc = src; domAt = now; pos(d.x, d.y); } });
  bus.on('cursor:state', d => setState(d.mode, d.value));
  function clickPulse(){ setState('dwell',1); setTimeout(()=>setState(hovered?'link':'idle'),240); }  // brief full-ring flash = "click landed"
  API.pulse = clickPulse;
  bus.on('cursor:activate', d => {                       // click the given target, else hovered, else whatever's under the cursor
    const t = (d&&d.target) || hovered || targetOf(document.elementFromPoint(ex,ey));
    if (t){ try{ t.focus?.(); }catch(_){} t.click?.(); clickPulse(); if(live) live.textContent='Activated: '+(t.textContent||t.getAttribute?.('aria-label')||t.tagName).trim().slice(0,32); } });
  API.activate = () => bus.emit('cursor:activate', {});

  // ---- MAGNETIC cursor: snap toward the nearest interactive target so imprecise head/gaze
  //      input reliably lands. This is what makes hands-free selection actually usable. ----
  let ex = x, ey = y, magnetOn = true, mTargets = [], mAt = 0, prevRX = x, prevRY = y, settleAt = 0;
  const MAG_R = 120;
  function refreshTargets(){
    mTargets = [];
    for (const el of document.querySelectorAll('[data-cursor],'+INTERACTIVE)){
      const r = el.getBoundingClientRect();
      if (r.width>6 && r.height>6 && r.bottom>0 && r.top<innerHeight && r.right>0 && r.left<innerWidth)
        mTargets.push({ cx:r.left+r.width/2, cy:r.top+r.height/2 });
    }
  }
  function magnetize(){
    const inst = Math.hypot(x-prevRX, y-prevRY); prevRX=x; prevRY=y;
    if (inst > 2) settleAt = performance.now();                    // ANY real movement → keep steering FREE
    if (!magnetOn || (performance.now()-settleAt) < 300){ ex=x; ey=y; return; }  // engage only after ~300ms of genuine REST
    if (performance.now()-mAt > 400){ refreshTargets(); mAt = performance.now(); }
    let best=null, bd=MAG_R;
    for (const t of mTargets){ const d=Math.hypot(x-t.cx, y-t.cy); if (d<bd){ bd=d; best=t; } }
    if (best){ const k = Math.min(0.85, (1 - bd/MAG_R)); ex = x+(best.cx-x)*k; ey = y+(best.cy-y)*k; }
    else { ex=x; ey=y; }
  }
  API.magnet = on => { magnetOn = on !== false; };

  // ---- ESC = stop ALL modalities (kill switch) ----
  addEventListener('keydown', e => { if (e.key==='Escape'){
    try{API.stopHand();}catch(_){}
    try{API.stopGaze();}catch(_){}
    try{API.stopVoice();}catch(_){}
    live.textContent='Stopped all inputs (Esc).';
  } });

  // ---- dwell-to-select (gaze / switch) + directional nav (voice / keys) ----
  let dwellOn=false, dwellCur=null, dwellStart=0, dwellCool=0; const DWELL_MS=1100;
  API.dwellMode = on => { dwellOn=!!on; if(!on){ dwellCur=null; if(mode==='dwell') setState(hovered?'link':'idle'); } };
  function dwellTick(){ if(!dwellOn) return;
    const under = targetOf(document.elementFromPoint(ex,ey));
    if(under && performance.now()>dwellCool){
      if(under!==dwellCur){ dwellCur=under; dwellStart=performance.now(); enter(under); }
      const p=Math.min(1,(performance.now()-dwellStart)/DWELL_MS); setState('dwell',p);
      if(p>=1){ bus.emit('cursor:activate',{target:under}); dwellCool=performance.now()+1000; dwellCur=null; }
    } else if(!under && dwellCur){ dwellCur=null; if(mode==='dwell') setState('idle'); }
  }
  const targets = () => [...document.querySelectorAll('[data-cursor]')];
  let navIdx=-1;
  function navTo(i){ const ts=targets(); if(!ts.length) return; navIdx=(i+ts.length)%ts.length;
    const t=ts[navIdx], r=t.getBoundingClientRect(); pos(r.left+r.width/2, r.top+r.height/2); enter(t);
    if(t.focus){ try{ t.focus({preventScroll:true}); }catch(e){} }
    t.scrollIntoView({block:'center', behavior: reduce?'auto':'smooth'}); }
  bus.on('cursor:nav', d => { const dir=(d&&d.dir)||'next'; navTo(/next|right|down|forward/.test(dir)?navIdx+1:navIdx-1); });
  API.nav = dir => bus.emit('cursor:nav',{dir});

  // ---- gaze / head adapter → cursor:move + BLINK-TWICE to click (on-device, opt-in) ----
  // Tunable live via SLCursor.gazeConfig — if an axis is reversed, flip invX or invY; slower = lower gain / higher smooth.
  const GAZE = { invX:-1, invY:1, gain:1.4, smooth:0.12, head:1.6, iris:0.4, dead:0.05,
    blinkThresh:0.4, earClose:0.16, earOpen:0.22, blinkWindow:900, holdMs:1200, invertScroll:false };  // holdMs = one-eye hold to arm scroll
  API.gazeConfig = GAZE;
  let gazeOn=false, gStream=null, gVideo=null, gLM=null, gRaf=0, ggx=0, ggy=0, sEarL=.3, sEarR=.3, blinkStart=0, blinkCool=0, calPhase='idle', calAt=0, calOpen=[], calClose=[], bthL=.14, bthR=.14, selfView=null, oneStart=0, scrollMode=false, scrollBaseY=0;
  API.invertScroll = on => { GAZE.invertScroll = on===undefined ? !GAZE.invertScroll : !!on; if(live) live.textContent='Scroll direction '+(GAZE.invertScroll?'inverted':'normal')+'.'; return GAZE.invertScroll; };
  API.calibrate = () => { calPhase='open'; calAt=performance.now(); calOpen=[]; calClose=[]; if(selfView) selfView.style.display='block'; if(live) live.textContent='Recalibrating — center your face, eyes open…'; };
  // Build the self-view: a small mirrored camera feed with an oval face-guide overlay,
  // so you can see whether you're centered + in frame while the wizard calibrates you.
  function buildSelfView(){
    if(selfView) return selfView;
    const box=document.createElement('div'); selfView=box;
    box.style.cssText='position:fixed;right:16px;bottom:16px;z-index:2147483646;width:176px;border-radius:14px;overflow:hidden;background:#000;border:1px solid rgba(230,161,92,.4);box-shadow:0 12px 34px rgba(0,0,0,.55);font:600 11px/1.35 ui-monospace,Menlo,monospace;color:#f2e9dd;pointer-events:none';
    const vidWrap=document.createElement('div'); vidWrap.style.cssText='position:relative;width:176px;height:132px;background:#000';
    // gVideo lives inside here, mirrored — MediaPipe still reads it fine while it's visible.
    gVideo.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scaleX(-1)';
    vidWrap.appendChild(gVideo);
    // oval face guide + shoulders — a rough human form to line yourself up against
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 176 132'); svg.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
    svg.innerHTML='<ellipse cx="88" cy="60" rx="40" ry="52" fill="none" stroke="rgba(230,161,92,.85)" stroke-width="2" stroke-dasharray="5 6"/>'+
      '<path d="M40 132 Q56 104 88 104 Q120 104 136 132" fill="none" stroke="rgba(230,161,92,.55)" stroke-width="2" stroke-dasharray="5 6"/>'+
      '<line x1="88" y1="30" x2="88" y2="14" stroke="rgba(230,161,92,.35)" stroke-width="1"/>';
    vidWrap.appendChild(svg);
    const cap=document.createElement('div'); cap.id='sl-selfcap'; cap.style.cssText='padding:.5rem .6rem;color:#e6a15c;letter-spacing:.02em';
    cap.textContent='centering…';
    box.appendChild(vidWrap); box.appendChild(cap);
    document.body.appendChild(box);
    return box;
  }
  function selfCap(t){ if(selfView){ const c=selfView.querySelector('#sl-selfcap'); if(c) c.textContent=t; } }

  API.startGaze = async function(){ if(gazeOn) return true;
    try{
      const V=await import(CFG.mediapipeBase+'/vision_bundle.mjs');
      const fs=await V.FilesetResolver.forVisionTasks(CFG.mediapipeBase+'/wasm');
      gLM=await V.FaceLandmarker.createFromOptions(fs,{ baseOptions:{ modelAssetPath:CFG.faceModel }, runningMode:'VIDEO', numFaces:1, outputFaceBlendshapes:true });
      gStream=await navigator.mediaDevices.getUserMedia({video:{width:640,height:480}});
      gVideo=document.createElement('video'); gVideo.autoplay=gVideo.playsInline=gVideo.muted=true; gVideo.srcObject=gStream;
      buildSelfView(); await gVideo.play();                        // visible mirrored self-view w/ face guide
      gazeOn=true; sEarL=sEarR=.3;
      API.calibrate();                                             // auto-run the wizard on Gaze click (David's ask)
      gLoop(); return true;
    }catch(e){ API.stopGaze(); live.textContent='Gaze unavailable.'; throw e; }
  };
  const med=a=>{ if(!a.length) return .2; const s=a.slice().sort((x,y)=>x-y); return s[Math.floor(s.length/2)]; };
  const CAL_OPEN_MS=2600, CAL_CLOSE_MS=2200;   // wizard phase durations
  function gLoop(){ if(!gazeOn) return; let res=null; try{ res=gLM.detectForVideo(gVideo, performance.now()); }catch(e){}
    const p=res&&res.faceLandmarks&&res.faceLandmarks[0];
    const now=performance.now();
    if(!p){ selfCap('◇ no face — center in the oval'); API.gazeDebug={earL:0,earR:0,state:'no-face'}; gRaf=requestAnimationFrame(gLoop); return; }

    // --- raw EAR, then SMOOTH with an EMA (glasses make raw EAR extremely noisy) ---
    const earL=Math.abs(p[159].y-p[145].y)/Math.max(1e-4,Math.abs(p[33].x-p[133].x));
    const earR=Math.abs(p[386].y-p[374].y)/Math.max(1e-4,Math.abs(p[263].x-p[362].x));
    sEarL+=(earL-sEarL)*0.35; sEarR+=(earR-sEarR)*0.35;

    // --- CALIBRATION WIZARD: open-sample → closed-sample → live. Thresholds sit at the midpoint. ---
    if(calPhase!=='done'){
      const t=now-calAt;
      if(calPhase==='open'){
        selfCap('① EYES OPEN — look around  '+Math.max(0,Math.ceil((CAL_OPEN_MS-t)/1000))+'s');
        if(t>600) calOpen.push([sEarL,sEarR]);                     // skip first 600ms (settling)
        if(t>CAL_OPEN_MS){ calPhase='close'; calAt=now; live.textContent='Now gently CLOSE both eyes…'; }
      } else if(calPhase==='close'){
        selfCap('② CLOSE both eyes  '+Math.max(0,Math.ceil((CAL_CLOSE_MS-t)/1000))+'s');
        if(t>500) calClose.push([sEarL,sEarR]);
        if(t>CAL_CLOSE_MS){
          const oL=med(calOpen.map(v=>v[0])), oR=med(calOpen.map(v=>v[1]));
          const cL=med(calClose.map(v=>v[0])), cR=med(calClose.map(v=>v[1]));
          // threshold = midpoint between your open and closed medians (fall back if closed≈open)
          bthL = cL<oL-0.02 ? (oL+cL)/2 : oL*0.7;
          bthR = cR<oR-0.02 ? (oR+cR)/2 : oR*0.7;
          calPhase='done'; if(selfView) selfView.style.display='block';
          live.textContent='Calibrated ✓ Move with head/eyes; BLINK both eyes to select. Say “down” to scroll.';
          selfCap('✓ ready — blink to select');
        }
      }
      API.gazeDebug={ earL:+sEarL.toFixed(3), earR:+sEarR.toFixed(3), state:'calibrating:'+calPhase };
      gRaf=requestAnimationFrame(gLoop); return;                  // no steering/clicking until calibrated
    }

    // --- eye states off SMOOTHED EAR. one-eye = XOR (exactly one eye under threshold) — robust through glasses ---
    const lC = sEarL<bthL, rC = sEarR<bthR;
    const bothClosed = lC && rC;
    const oneClosed = (lC || rC) && !bothClosed;         // one shut, the other open — no fragile margin test
    const eyeDown = sEarL < bthL*1.25 || sEarR < bthR*1.25;   // any eye closing → freeze steering (blink won't yank cursor)
    const nose=p[1];

    // --- ONE-EYE + HEAD-TILT = SCROLL, engaging fast (~300ms) like a hand-fist. Keep one eye shut, the OTHER
    //     open to see & tilt. Tilt head UP → scroll DOWN, tilt DOWN → scroll UP (SLCursor.invertScroll() flips). ---
    if(oneClosed){ if(oneStart===0){ oneStart=now; scrollBaseY=nose.y; }
      if(!scrollMode && now-oneStart>300){ scrollMode=true; setState('loading'); live.textContent='Scroll on — tilt head up/down (say “invert” to flip).'; selfCap('▲▼ scroll — tilt head'); }
    } else { oneStart=0; if(scrollMode){ scrollMode=false; setState('idle'); selfCap('✓ ready — blink to select'); } }
    if(scrollMode){
      let d = (scrollBaseY - nose.y);                    // tilt up (nose rises → nose.y smaller) → positive → scroll down
      if(GAZE.invertScroll) d = -d;
      if(Math.abs(d) > 0.010) window.scrollBy({ top: Math.max(-60,Math.min(60, d*1400)) });   // dead-zone + clamp; continuous while held
    }

    // --- STEER (head + iris) unless an eye is closing or we're in scroll mode ---
    if(!eyeDown && !scrollMode){
      const c=(a,b)=>(a.x+b.x)/2, w=(a,b)=>Math.max(1e-4,Math.abs(a.x-b.x)), h=(a,b)=>Math.max(1e-4,Math.abs(a.y-b.y));
      const irisX=((p[473].x-c(p[263],p[362]))/w(p[263],p[362]) + (p[468].x-c(p[33],p[133]))/w(p[33],p[133]))/2;
      const irisY=((p[473].y-(p[386].y+p[374].y)/2)/h(p[386],p[374]) + (p[468].y-(p[159].y+p[145].y)/2)/h(p[159],p[145]))/2;
      let rx=((nose.x-0.5)*GAZE.head + irisX*GAZE.iris) * GAZE.invX * GAZE.gain;
      let ry=((nose.y-0.5)*GAZE.head + irisY*GAZE.iris) * GAZE.invY * GAZE.gain;
      if(Math.abs(rx)<GAZE.dead) rx=0; if(Math.abs(ry)<GAZE.dead) ry=0;
      rx=Math.max(-1,Math.min(1,rx)); ry=Math.max(-1,Math.min(1,ry));
      ggx+=(rx-ggx)*GAZE.smooth; ggy+=(ry-ggy)*GAZE.smooth;
      bus.emit('cursor:move',{ x: innerWidth*(0.5+ggx*0.5), y: innerHeight*(0.5+ggy*0.5), src:'gaze' });
    }

    // --- DELIBERATE BLINK-TO-CLICK: BOTH eyes below threshold, held 120–650ms (not noise, not a rest-close).
    //     Feedback only fires when a real target was actually clicked. ---
    if(bothClosed){ if(blinkStart===0) blinkStart=now; }
    else { if(blinkStart>0 && !scrollMode){ const dur=now-blinkStart;
             if(dur>120 && dur<650 && now>blinkCool){ blinkCool=now+500;
               const t=targetOf(document.elementFromPoint(ex,ey));
               if(t){ bus.emit('cursor:activate',{target:t}); selfCap('✓ clicked'); }
               else { live.textContent='Blink — but nothing under the cursor to click.'; selfCap('· nothing here'); } } }
           blinkStart=0; }
    API.gazeDebug={ earL:+sEarL.toFixed(3), earR:+sEarR.toFixed(3),
      bthL:+bthL.toFixed(3), bthR:+bthR.toFixed(3),
      state: scrollMode?'SCROLL':(bothClosed?'BLINK':(oneClosed?'one-eye':(eyeDown?'eye-down':'open'))) };
    gRaf=requestAnimationFrame(gLoop);
  }
  API.stopGaze = function(){ gazeOn=false; calPhase='idle'; blinkStart=0; oneStart=0; scrollMode=false; API.dwellMode(false); cancelAnimationFrame(gRaf);
    if(selfView&&selfView.parentNode){ selfView.parentNode.removeChild(selfView); selfView=null; }
    if(gStream){ gStream.getTracks().forEach(t=>t.stop()); gStream=null; } gVideo=null; };

  // ---- hand adapter → point:move · pinch:click · fist-drag:scroll (on-device, opt-in) ----
  let handOn=false, hStream=null, hVideo=null, hLM=null, hRaf=0, hPrevWristY=null, hWasPinch=false;
  const HD=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,(a.z||0)-(b.z||0));
  API.startHand = async function(){ if(handOn) return true;
    try{
      const V=await import(CFG.mediapipeBase+'/vision_bundle.mjs');
      const fs=await V.FilesetResolver.forVisionTasks(CFG.mediapipeBase+'/wasm');
      hLM=await V.HandLandmarker.createFromOptions(fs,{ baseOptions:{ modelAssetPath:CFG.handModel }, runningMode:'VIDEO', numHands:1 });
      hStream=await navigator.mediaDevices.getUserMedia({video:{width:640,height:480}});
      hVideo=document.createElement('video'); hVideo.autoplay=hVideo.playsInline=hVideo.muted=true; hVideo.srcObject=hStream;
      hVideo.style.cssText='position:fixed;left:-9999px;width:2px;height:2px;opacity:0'; document.body.appendChild(hVideo); await hVideo.play();
      handOn=true; live.textContent='Hand on — point to move, pinch to click, fist-drag to scroll. On-device.'; hLoop(); return true;
    }catch(e){ API.stopHand(); live.textContent='Hand tracking unavailable.'; throw e; }
  };
  function hLoop(){ if(!handOn) return; let res=null; try{ res=hLM.detectForVideo(hVideo, performance.now()); }catch(e){}
    const p=res&&res.landmarks&&res.landmarks[0];
    if(p){
      const fingers=[[6,8],[10,12],[14,16],[18,20]];
      const nCurled=fingers.filter(([pip,tip])=>p[tip].y>p[pip].y).length;
      const pinchD=HD(p[4],p[8]), isPinch=pinchD<0.06, isFist=nCurled>=3&&pinchD>0.06;
      if(isFist){ if(hPrevWristY!=null){ const dy=(p[0].y-hPrevWristY)*1800; if(Math.abs(dy)>1) window.scrollBy({top:dy}); } hPrevWristY=p[0].y; }
      else { hPrevWristY=null; bus.emit('cursor:move',{ x:innerWidth*(1-p[8].x), y:innerHeight*p[8].y, src:'hand' });
             if(isPinch&&!hWasPinch) bus.emit('cursor:activate',{}); }
      hWasPinch=isPinch;
    }
    hRaf=requestAnimationFrame(hLoop);
  }
  API.stopHand = function(){ handOn=false; cancelAnimationFrame(hRaf);
    if(hStream){ hStream.getTracks().forEach(t=>t.stop()); hStream=null; } if(hVideo&&hVideo.parentNode){ hVideo.parentNode.removeChild(hVideo); hVideo=null; } hPrevWristY=null; hWasPinch=false; };

  // ---- feed(): 'external' camera source (the extension's offscreen doc) pipes gestures in here ----
  API.feed = function(m){ if(!m) return;
    if(m.type==='cursor') bus.emit('cursor:move',{ x:m.x*innerWidth, y:m.y*innerHeight, src:m.src||'hand' });
    else if(m.type==='click') bus.emit('cursor:activate',{});
    else if(m.type==='scroll') window.scrollBy({top:m.dy}); };

  // ---- voice adapter → activate + directional nav + DICTATION into fields ----
  let vRec=null, voiceOn=false, dictating=false, dictTarget=null, consumed=0;
  function enterDictation(el){ if(!el) return; dictating=true; dictTarget=el; try{ el.focus(); }catch(_){}
    live.textContent='Dictating — speak your text; say “done” to stop, “submit” to send, “clear” to erase.'; }
  function exitDictation(){ dictating=false; const t=dictTarget; dictTarget=null; try{ t&&t.blur(); }catch(_){}
    live.textContent='Dictation off.'; }
  API.dictate = on => on===false ? exitDictation() : enterDictation(document.querySelector('input:not([type="hidden"]),textarea'));
  API.dictating = () => dictating;

  API.startVoice = function(){ const SR=window.SpeechRecognition||window.webkitSpeechRecognition; if(!SR) throw new Error('no Web Speech');
    voiceOn=true; vRec=new SR(); vRec.continuous=true; vRec.interimResults=true; vRec.lang='en-US'; consumed=0;
    vRec.onresult=e=>{
      const last=e.results[e.results.length-1], interim=last[0].transcript.trim();

      // ---- DICTATION MODE: append only newly-FINAL results into the field; a few control words exit/act ----
      if(dictating){
        for(let i=consumed;i<e.results.length;i++){ if(!e.results[i].isFinal) continue;
          let txt=e.results[i][0].transcript.trim(); const low=txt.toLowerCase(); consumed=i+1;
          if(/^(done|stop dictation|stop typing|finished?|that'?s it)\b/.test(low)){ exitDictation(); return; }
          if(/^(submit|send it|go ahead)\b/.test(low)){ const f=dictTarget&&dictTarget.form; exitDictation(); if(f){ f.requestSubmit?f.requestSubmit():f.submit(); } return; }
          if(/^(clear|erase|delete all|scratch that)\b/.test(low)){ if(dictTarget){ dictTarget.value=''; dictTarget.dispatchEvent(new Event('input',{bubbles:true})); } continue; }
          if(dictTarget){ dictTarget.value += (dictTarget.value && !/\s$/.test(dictTarget.value)?' ':'')+txt;
            dictTarget.dispatchEvent(new Event('input',{bubbles:true})); live.textContent='Typed: '+txt; }
        }
        if(!last.isFinal) live.textContent='… '+interim;
        return;
      }

      // ---- COMMAND MODE ----
      const ph=interim.toLowerCase();
      if(last.isFinal) consumed=e.results.length;                 // keep index synced so dictation starts clean
      if(/\b(input|field|search|dictate|type)\b/.test(ph)){ consumed=e.results.length; enterDictation(document.querySelector('input:not([type="hidden"]),textarea')); }
      else if(/\b(open|select|go|click|activate|choose)\b/.test(ph)) bus.emit('cursor:activate',{});
      else if(/\bnext\b/.test(ph)) API.nav('next');
      else if(/\b(previous|back|prev)\b/.test(ph)) API.nav('prev');
      else if(/\bup\b/.test(ph)) window.scrollBy({top:-450,behavior:'smooth'});
      else if(/\bdown\b/.test(ph)) window.scrollBy({top:450,behavior:'smooth'});
      else if(/\bleft\b/.test(ph)) window.scrollBy({left:-450,behavior:'smooth'});
      else if(/\bright\b/.test(ph)) window.scrollBy({left:450,behavior:'smooth'});
      else if(/\b(invert|flip|reverse)\b/.test(ph)) API.invertScroll();
      else if(/\btop\b/.test(ph)) window.scrollTo({top:0,behavior:'smooth'});
      else if(/\bbottom\b/.test(ph)) window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'});
      else if(/\btab\b/.test(ph)){ const f=[...document.querySelectorAll('a[href],button,input:not([type="hidden"]),select,textarea,[tabindex]:not([tabindex="-1"])')].filter(el=>el.offsetParent); const i=f.indexOf(document.activeElement); (f[(i+1)%(f.length||1)]||f[0])?.focus?.(); }
      else live.textContent='Heard: '+ph; };
    vRec.onend=()=>{ if(voiceOn){ try{vRec.start();}catch(e){} } };
    try{ vRec.start(); }catch(e){} live.textContent='Voice on. Say next, previous, open, or “input” to dictate.'; };
  API.stopVoice = function(){ voiceOn=false; dictating=false; dictTarget=null; vRec&&vRec.stop(); vRec=null; };

  // ---- input-agnostic hover: highlight/bloom whatever the cursor is over (gaze/keyboard/pointer) ----
  let lastUnder=null;
  function hoverTick(){ const under=targetOf(document.elementFromPoint(ex,ey));
    if(under!==lastUnder){ lastUnder=under; under?enter(under):leave(); } }

  // ---- render loop (spring follow) ----
  function render(){ x += (tx-x)*0.22; y += (ty-y)*0.22;
    magnetize();                                   // ex,ey = magnetized effective point
    el.style.setProperty('--x', ex); el.style.setProperty('--y', ey+'px');
    el.style.transform = `translate(${ex-36}px,${ey-36}px)`;
    hoverTick(); dwellTick();
    if (bloom.classList.contains('open')) positionBloom();
  }
  (function frame(){ render(); requestAnimationFrame(frame); })();
})();
