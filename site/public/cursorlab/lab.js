// VISIBLE CLICK LOG — any real click that reaches the DOM lands here (blink, voice, hand, pointer all funnel through .click())
const actLog=document.getElementById('actLog'); let actN=0;
function logAct(t){ actN++; actLog.textContent='last action #'+actN+': '+t; actLog.style.color='#ffd479';
  setTimeout(()=>actLog.style.color='#8fe08f',250); }
document.addEventListener('click', e=>{ const el=e.target.closest('a,button,[data-cursor],input,select'); if(!el) return;
  logAct((el.tagName)+' “'+(el.textContent||el.value||el.name||el.getAttribute('data-cursor')||'').trim().slice(0,28)+'”');
  if(el.classList.contains('tile')){ el.style.outline='3px solid var(--accent)'; setTimeout(()=>el.style.outline='',600); } }, true);

// demo: animate a download %
function dl(){ let p=0; SLCursor.setState('download',0);
  const id=setInterval(()=>{ p+=0.08; SLCursor.setState('download',Math.min(1,p)); if(p>=1){ clearInterval(id); setTimeout(()=>SLCursor.setState('idle'),700);} },120); }

// HUD state / nav buttons + form — wired here because the CSP forbids inline handlers
document.querySelectorAll("[data-state]").forEach(b=>b.addEventListener("click",()=>{
  const v=b.dataset.value; SLCursor.setState(b.dataset.state, v!=null?parseFloat(v):undefined); }));
document.querySelectorAll("[data-action=download]").forEach(b=>b.addEventListener("click",dl));
document.querySelectorAll("[data-nav]").forEach(b=>b.addEventListener("click",()=>SLCursor.nav(b.dataset.nav)));
document.getElementById("demoForm").addEventListener("submit",function(e){ e.preventDefault(); logAct("FORM SUBMITTED: "+(this.q.value||"(empty)")); });

// Phase 2: gaze + voice toggles (camera/mic need a user gesture; on-device)
const hd=document.getElementById('handBtn'); let hdOn=false;
hd.onclick=async()=>{ try{
    if(hdOn){ SLCursor.stopHand(); hdOn=false; hd.textContent='✋ Hand drive'; hd.setAttribute('aria-pressed','false'); }
    else { hd.textContent='Hand…'; await SLCursor.startHand(); hdOn=true; hd.textContent='✋ Hand ON'; hd.setAttribute('aria-pressed','true'); }
  }catch(e){ console.error('hand error:', e); hd.textContent='Hand: '+((e&&e.name)||e); } };
const gz=document.getElementById('gazeBtn'); let gzOn=false;
gz.onclick=async()=>{ try{
    if(gzOn){ SLCursor.stopGaze(); gzOn=false; gz.textContent='Gaze drive'; gz.setAttribute('aria-pressed','false'); }
    else { gz.textContent='Gaze…'; await SLCursor.startGaze(); gzOn=true; gz.textContent='Gaze ON'; gz.setAttribute('aria-pressed','true'); }
  }catch(e){ console.error('gaze error:', e); gz.textContent='Gaze: '+((e&&e.name)||e); } };
const vc=document.getElementById('voiceBtn'); let vcOn=false;
vc.onclick=()=>{ try{
    if(vcOn){ SLCursor.stopVoice(); vcOn=false; vc.textContent='Voice nav'; vc.setAttribute('aria-pressed','false'); }
    else { SLCursor.startVoice(); vcOn=true; vc.textContent='Voice ON'; vc.setAttribute('aria-pressed','true'); }
  }catch(e){ vc.textContent='Voice n/a'; } };

// LIVE EYE READOUT — calibrate wink/blink thresholds to YOUR face (through glasses)
const eyeBox=document.createElement('div');   // NB: never name a global 'dbg' — collides with MediaPipe's emscripten debug fn
eyeBox.style.cssText='position:fixed;top:10px;right:10px;z-index:2147483647;font:13px/1.6 ui-monospace,Menlo,monospace;background:rgba(11,8,6,.92);color:#e6a15c;padding:10px 12px;border:1px solid rgba(230,161,92,.4);border-radius:10px;white-space:pre;pointer-events:none';
eyeBox.textContent='eye readout — turn Gaze on'; document.body.appendChild(eyeBox);
setInterval(()=>{ const d=SLCursor.gazeDebug; if(!d){ return; }
  const bar=v=>'█'.repeat(Math.round(Math.min(1,v/0.35)*12)).padEnd(12,'·');
  eyeBox.textContent =
    'earL '+d.earL.toFixed(3)+' '+bar(d.earL)+(d.bthL!=null?('  blink<'+d.bthL):'')+'\n'+
    'earR '+d.earR.toFixed(3)+' '+bar(d.earR)+(d.bthR!=null?('  blink<'+d.bthR):'')+'\n'+
    'state: '+d.state+'\n'+
    'SLCursor.calibrate() to redo';
}, 90);

// CHOREOGRAPHED LOGGED EYE TEST — guides you through each gesture, records EAR ranges, prints a report to paste
document.getElementById('eyeTestBtn').onclick=async()=>{
  if(!SLCursor.gazeDebug){ eyeBox.textContent='Turn 👁 Gaze on first + wait for “calibrated”, then run.'; return; }
  const phases=[['① LOOK CENTER (eyes open)',2500],['② WINK LEFT only',2500],['③ WINK RIGHT only',2500],['④ CLOSE BOTH',2000],['⑤ HOLD one eye + tilt head down',3000]];
  const rep=[];
  for(const [label,ms] of phases){
    const s={lm:9,lM:0,rm:9,rM:0,st:{}}, t0=performance.now();
    await new Promise(r=>{ const id=setInterval(()=>{ const d=SLCursor.gazeDebug;
      eyeBox.textContent='▶ '+label+'\n… '+Math.ceil((ms-(performance.now()-t0))/1000)+'s';
      if(d){ s.lm=Math.min(s.lm,d.earL); s.lM=Math.max(s.lM,d.earL); s.rm=Math.min(s.rm,d.earR); s.rM=Math.max(s.rM,d.earR); s.st[d.state]=(s.st[d.state]||0)+1; }
      if(performance.now()-t0>ms){ clearInterval(id); r(); } },80); });
    rep.push(label+'\n   earL '+s.lm.toFixed(3)+'–'+s.lM.toFixed(3)+'  earR '+s.rm.toFixed(3)+'–'+s.rM.toFixed(3)+'  states['+Object.keys(s.st).join(',')+']');
  }
  const th=SLCursor.gazeDebug;
  rep.push('thresholds: L c<'+(th.thL?th.thL.c:'?')+' o>'+(th.thL?th.thL.o:'?')+'  |  R c<'+(th.thR?th.thR.c:'?')+' o>'+(th.thR?th.thR.o:'?'));
  const out=rep.join('\n');
  console.log('[MMC EYE TEST]\n'+out);
  eyeBox.textContent='DONE ✅ — paste this to Claude:\n\n'+out;
};
