/* Ink Town: Main loop, the passing of days, and startup. Loaded last. */
"use strict";
let lastT=performance.now();
function taskDone(t){
  sfx('task'); toast(`Task done · +${money(t.pay)}`); cashPop();
  const p=$('taskPill'); p.classList.remove('done'); void p.offsetWidth; p.classList.add('done');
  const h=[...T.objs.values()].find(o=>o.k==='hall'); if(h){ sparkle(h.x+1,h.y-1); floatText(h.x+1,h.y-1.2,'+'+money(t.pay),true); }
}
// the end of a day: people move in or out, the money comes in, and maybe a new rank
function onDay(rep){
  let shown=0;
  rep.moved.forEach(([o,n])=>{ if(n>0&&shown<6&&Math.random()<.7){ const d=IT[o.k]; floatText(o.x+d.w/2,o.y-(TALL[o.k]||.6),`+${n}`); shown++; if(shown===1) sfx('movein'); } });
  if(rep.net){ const h=[...T.objs.values()].find(o=>o.k==='hall'); if(h) floatText(h.x+1,h.y-.9,sign(rep.net)); if(rep.net>0) sfx('coin'); cashPop(rep.net<0); }
  if(T.money<0&&rep.net<0&&T.day%5===0) toast('In the red: raise taxes, take a loan, or cut upkeep');
  if(rep.loanDone) toast('Loan paid off');
  if(rep.task) taskDone(rep.task);
  if(rep.rank){ sfx('rank'); callout(RANKS[rep.rank].name+'!',`+${money(RANKS[rep.rank].grant)} grant`); setTimeout(()=>{ if(S.st==='play') showRank(rep.rank); },1600); }
  if(S.sel&&T.objs.has(S.sel.id)&&!$('sheet').hidden) showSheet(S.sel,true);
  refreshTray();
}
function tick(now){
  const dt=Math.max(0,Math.min(.05,(now-lastT)/1000)); lastT=now; S.t+=dt;
  const running=S.st==='play'&&S.speed>0;
  if(T&&ST){
    if(running){ S.dayT+=dt*SPEEDS[S.speed]; if(S.dayT>=DAY_SECONDS){ S.dayT-=DAY_SECONDS; if(S.dayT>DAY_SECONDS) S.dayT=0; onDay(dayTick()); } }
    if(S.st==='home'){ // drift slowly over the town behind the home screen
      const h=[...T.objs.values()].find(o=>o.k==='hall'); if(h){ cam.x=h.x+1+Math.sin(S.t*.05)*3; cam.y=h.y+2+Math.cos(S.t*.04)*2; cam.z=clamp(Math.min(W,Hh)/9,30,56); } }
    else keysStep(dt);
    agentsStep(dt,S.st==='play'?(S.speed>0):S.st==='home');
    ambientStep(dt,running);
    if(S.st==='play') updHUD();
  }
  draw(S.t);
}
// an unexpected error must never freeze the game: the next frame is always scheduled
function frame(now){ requestAnimationFrame(frame); try{ tick(now); }catch(e){ console.error(e); } }

/* boot */
addEventListener('resize',resize);
resize();
buildDock();
if(loadTown()){ centreCam(true); }
showHome();
requestAnimationFrame(frame);
