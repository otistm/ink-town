/* Ink Town: Cards. The home screen, naming a town, the menu, the town ledger (taxes and loans), tasks, how people feel,
   what the town wants, and the new-rank card. Any card pauses the town while it's open. */
"use strict";
function openCard(html,home,still){ const c=$('card'), P=$('panel'); P.innerHTML=html; c.classList.toggle('home',!!home); c.hidden=false; c.scrollTop=0;
  P.classList.toggle('still',!!still); if(!still){ P.style.animation='none'; void P.offsetWidth; P.style.animation=''; }
  if(S.st==='play') S.st='card'; }
function closeCard(){ $('card').hidden=true; if(S.st==='card') S.st='play'; }
function backToTown(){ closeCard(); S.st='play'; hudShow(true); }

/* a little ink map of the whole town, for the home screen */
function drawMini(cvs){
  const r=cvs.getBoundingClientRect(), w=Math.max(200,r.width||380), h=150, dpr=Math.min(2,devicePixelRatio||1);
  cvs.width=w*dpr; cvs.height=h*dpr; const g=cvs.getContext('2d');
  // frame the built-up part of the map
  let x0=N,y0=N,x1=0,y1=0; T.objs.forEach(o=>{ if(o.k==='wild') return; x0=Math.min(x0,o.x); y0=Math.min(y0,o.y); x1=Math.max(x1,o.x+IT[o.k].w); y1=Math.max(y1,o.y+IT[o.k].h); });
  const pad=6, cx=(x0+x1)/2, cy=(y0+y1)/2, span=Math.max(14,x1-x0+pad*2,(y1-y0+pad*2)*w/h), s=w/span;
  g.setTransform(s*dpr,0,0,s*dpr,dpr*(w/2-cx*s),dpr*(h/2-cy*s));
  const oX=X, oL=LW; X=g; LW=INK/s*.8;
  try{ g.fillStyle='#fff'; g.fillRect(-5,-5,N+10,N+10); g.fillStyle=PAT.grass; g.fillRect(0,0,N,N);
    const vb={x0:0,y0:0,x1:N-1,y1:N-1}; drawWater(vb); drawFlat(vb,0); drawNets(vb);
    tallList(vb).forEach(o=>DRAW[o.k](o.x,o.y,0,o)); }
  catch(e){ console.error(e); }
  X=oX; LW=oL;
}
function showHome(){
  S.st='home'; hudShow(false); closeSheet(); openCat(null);
  const has=!!T;
  openCard(`<h2 class="logo">Ink Town</h2><p style="margin-bottom:4px">Plan it. Plant it. Watch it grow.</p>
    ${has?`<div class="towncard"><canvas id="mini"></canvas><div class="tc"><b>${esc(T.name)}</b><small>Day ${T.day} · ${clockText(T.clock)} · ${RANKS[T.rank].name} · ${ST.pop.toLocaleString()} people · ${money(T.money)}</small></div></div>
      <button class="btn" id="hGo" type="button">Keep building</button><button class="btn ghost" id="hNew" type="button">Start a new town</button>`
    :`<p class="note" style="text-align:center;margin:18px 0 !important">You're the new town planner. The county has given you <b>${money(START_MONEY)}</b> and an empty meadow by a river.</p>
      <button class="btn" id="hNew" type="button">Found a town</button>`}
    <details class="how" style="margin-top:16px"><summary>How to play</summary><ul>
      <li><b>Roads first.</b> Every home, shop and workplace needs a road that leads back to the town hall.</li>
      <li><b>Homes bring people</b>, and people pay taxes. They need <b>jobs</b> (Work) and <b>shops</b> nearby.</li>
      <li>The three little bars at the top show what the town wants next: homes, shops or work.</li>
      <li><b>Trees, gardens, ponds and parks</b> make neighbours happier. Happy towns grow faster. Keep noisy factories away from homes.</li>
      <li>As the town grows, people expect a <b>clinic, school, fire station</b> and more. Services cost upkeep every day, so build them when you need them.</li>
      <li>A day lasts 15 minutes: a long day and a short night. Taxes trickle in all the time.</li>
      <li>Tap your money to set taxes or take a loan. Tap any building to see how it's doing.</li>
      <li>Drag roads, paths, hedges, flower beds and ponds. Two fingers move and zoom the map.</li>
    </ul></details>
    <button class="fbc${meta.sound?' on':''}" id="hSound" type="button" aria-pressed="${meta.sound}">Sound: ${meta.sound?'on':'off'}</button>
    <p class="ver">Version ${VERSION}</p>`,true);
  if(has){ requestAnimationFrame(()=>{ const m=$('mini'); if(m) drawMini(m); });
    $('hGo').onclick=()=>{ audioInit(); sfx('open'); backToTown(); };
    $('hNew').onclick=()=>{ sfx('tap'); confirmNew(); }; }
  else $('hNew').onclick=()=>{ audioInit(); sfx('tap'); showName(); };
  $('hSound').onclick=()=>{ meta.sound=!meta.sound; saveMeta(); audioInit(); showHome(); sfx('tap'); };
}
function confirmNew(){
  openCard(`<h2>Start a new town?</h2><p>${esc(T.name)} will be gone for good. Its ${ST.pop.toLocaleString()} people will have to find somewhere else to live.</p>
    <button class="btn" id="cYes" type="button">Start fresh</button><button class="btn ghost" id="cNo" type="button">Keep ${esc(T.name)}</button>`,true);
  $('cYes').onclick=()=>{ sfx('tap'); showName(); };
  $('cNo').onclick=()=>{ sfx('tap'); showHome(); };
}
function showName(){
  const sug=TOWN_NAMES[Math.floor(Math.random()*TOWN_NAMES.length)];
  openCard(`<h2 class="logo" style="font-size:40px !important">Found a town</h2><p>Every good town starts with a name.</p>
    <form id="nameForm" class="nameform" autocomplete="off"><label for="nameIn">Town name</label>
    <input id="nameIn" maxlength="22" placeholder="${esc(sug)}" autocapitalize="words" spellcheck="false" enterkeyhint="go">
    <button class="linkbtn" type="button" id="sugg">Suggest a name</button>
    <p class="nerr" id="nerr"></p><button class="btn" type="submit">Found the town</button>
    <button class="btn ghost" type="button" id="nBack">Back</button></form>`,true);
  const inp=$('nameIn'); setTimeout(()=>inp.focus(),150);
  $('sugg').onclick=()=>{ sfx('tap'); let n; do n=TOWN_NAMES[Math.floor(Math.random()*TOWN_NAMES.length)]; while(n===inp.value&&TOWN_NAMES.length>1); inp.value=n; };
  $('nBack').onclick=()=>{ sfx('tap'); showHome(); };
  $('nameForm').onsubmit=e=>{ e.preventDefault(); audioInit();
    const v=(inp.value||inp.placeholder).replace(/\s+/g,' ').trim().slice(0,22);
    if(!v){ $('nerr').textContent='Give your town a name.'; inp.classList.remove('nope'); void inp.offsetWidth; inp.classList.add('nope'); sfx('nope'); return; }
    newTown(v); S.cars=[]; S.folk=[]; S.parts=[]; S.floats=[]; S.stepAcc=0; S.speed=1; centreCam(true);
    sfx('rank'); showWelcome(); };
}
function showWelcome(){
  openCard(`<h2>Welcome, planner</h2><p>${esc(T.name)} is yours. The town hall is built and the county has given you ${money(T.money)} to spend.</p>
    <ul class="why" style="margin:0 0 16px">
      <li class="g">Follow the <b>task</b> at the top left. Each one pays a small reward.</li>
      <li class="g">Pick what to build from the <b>dock</b> at the bottom.</li>
      <li class="g">Taxes trickle in all day and night. Watch the <b>+ an hour</b> under your money.</li>
      <li class="g">A day lasts 15 minutes, with a short night. The little dial at the top shows the time.</li>
    </ul><button class="btn" id="wGo" type="button">Let's build</button>`);
  S.st='card'; $('wGo').onclick=()=>{ sfx('open'); backToTown(); openCat('roads'); };
}
function showMenu(){
  if(S.st!=='play') return; closeSheet();
  openCard(`<h2>${esc(T.name)}</h2><p>Day ${T.day} · ${clockText(T.clock)} · ${RANKS[T.rank].name} · paused</p>
    <button class="btn" id="mGo" type="button">Keep building</button>
    <button class="btn ghost" id="mLedger" type="button">Town ledger</button>
    <button class="btn ghost" id="mTasks" type="button">Tasks</button>
    <button class="btn ghost" id="mHome" type="button">Home screen</button>
    <button class="fbc${meta.sound?' on':''}" id="mSound" type="button" aria-pressed="${meta.sound}">Sound: ${meta.sound?'on':'off'}</button>`);
  $('mGo').onclick=()=>{ sfx('tap'); closeCard(); };
  $('mLedger').onclick=()=>{ sfx('tap'); showLedger(); };
  $('mTasks').onclick=()=>{ sfx('tap'); showTasks(); };
  $('mHome').onclick=()=>{ sfx('tap'); saveTown(); showHome(); };
  $('mSound').onclick=()=>{ meta.sound=!meta.sound; saveMeta(); S.st='play'; showMenu(); sfx('tap'); };
}
/* ---------- the town ledger: where the money comes from and goes, taxes, and the bank ---------- */
function showLedger(still){
  closeSheet(); const st=ST, i=st.inc, o=st.out;
  const rows=[['Residents’ taxes',`${st.pop.toLocaleString()} people`,i.res],['Business taxes',`${st.employed.toLocaleString()} people at work`,i.jobs],['Shop sales',`${st.sales.toLocaleString()} shoppers served`,i.sales],
    ['Upkeep','roads, parks and services',-o.upkeep]]; if(o.loan) rows.push(['Loan repayment',`about ${Math.ceil(T.loan.left*STEP_HOURS)} hours left`,-o.loan]);
  const h=T.hist.slice(-30), mx=Math.max(20,...h.map(Math.abs));
  const spark=h.length?`<div class="spark" aria-label="Money made each hour, last ${h.length} hours">${h.map(v=>`<i><b class="${v<0?'neg':''}" style="${v>=0?`bottom:50%;height:${v/mx*50}%`:`top:50%;height:${-v/mx*50}%`}"></b></i>`).join('')}</div>`:'';
  const owed=T.loan?T.loan.left*LOAN.perStep:0, perHour=LOAN.perStep/STEP_HOURS, hoursOf=n=>Math.ceil(n*STEP_HOURS);
  openCard(`<h2>Town ledger</h2><p>${esc(T.name)} · Day ${T.day} · ${clockText(T.clock)}</p><div class="big">${money(T.money)}</div>
    <p style="margin-bottom:12px">${sign(st.net)} an hour</p>
    <div class="board">${rows.map((r,k)=>`<div class="row" style="animation-delay:${.1+k*.05}s"><span>${r[0]}<small>${r[1]}</small></span><b>${sign(Math.round(r[2]))}</b></div>`).join('')}
    <div class="row tot" style="animation-delay:.4s"><span>Each hour<small>paid a little at a time, day and night</small></span><b>${sign(st.net)}</b></div></div>
    ${spark}
    <h3>Taxes</h3><div class="seg" id="taxSeg">${Object.entries(TAX).map(([k,t])=>`<button type="button" data-k="${k}" class="${T.tax===k?'on':''}">${t.name}<small>${k==='low'?'happier, less money':k==='fair'?'balanced':'more money, grumpier'}</small></button>`).join('')}</div>
    <h3>The bank</h3>
    ${T.loan?`<p class="note">You owe ${money(owed)}: ${money(perHour)} an hour for about ${hoursOf(T.loan.left)} more hours.</p><button class="btn ghost" id="lPay" type="button" ${owed>T.money?'disabled':''}>Pay it all off · ${money(owed)}</button>`
      :`<p class="note">Borrow ${money(LOAN.amount)} now and pay back ${money(perHour)} an hour for about ${hoursOf(LOAN.steps)} hours (${money(LOAN.perStep*LOAN.steps)} in all).</p><button class="btn ghost" id="lTake" type="button">Borrow ${money(LOAN.amount)}</button>`}
    <button class="btn" id="lBack" type="button" style="margin-top:14px">Back to town</button>`,false,still);
  document.querySelectorAll('#taxSeg button').forEach(b=>b.onclick=()=>{ T.tax=b.dataset.k; sfx('tap'); simRefresh(); saveTown(); showLedger(true); });
  if($('lTake')) $('lTake').onclick=()=>{ T.loan={left:LOAN.steps}; T.money+=LOAN.amount; sfx('coin'); simRefresh(); saveTown(); cashPop(); showLedger(true); };
  if($('lPay')) $('lPay').onclick=()=>{ if(owed>T.money) return; T.money-=owed; T.loan=null; sfx('task'); simRefresh(); saveTown(); cashPop(); showLedger(true); };
  $('lBack').onclick=()=>{ sfx('tap'); closeCard(); };
}
function showTasks(){
  const rows=TASKS.map((t,k)=>{ const cls=k<T.task?'done':k===T.task?'now':'later'; if(k>T.task+3) return '';
    const v=k===T.task?` (${Math.min(t.goal,t.val(ST)).toLocaleString()}/${t.goal.toLocaleString()})`:'';
    return `<li class="${cls}" style="animation-delay:${Math.max(0,k-T.task+3)*.05}s"><span>${esc(t.text)}${t.goal>1?v:''}</span><small>+${money(t.pay)}</small></li>`; }).join('');
  openCard(`<h2>Tasks</h2><p>${T.task>=TASKS.length?'Every task is done. The town is yours to shape.':`${T.task} of ${TASKS.length} done. Each pays a reward straight away.`}</p>
    <ul class="tasks">${rows}</ul><button class="btn" id="tBack" type="button">Back to town</button>`);
  $('tBack').onclick=()=>{ sfx('tap'); closeCard(); };
}
function showPeople(){
  const tally=new Map(); let hs=0;
  ST.homes.forEach(o=>{ (o.why||[]).forEach(([g,t])=>{ const w=Math.max(1,o.pop), c=tally.get(t)||{g,t,w:0}; c.w+=w; tally.set(t,c); }); hs+=o.pop; });
  const list=[...tally.values()].filter(r=>r.g!==0||r.w>hs*.3).sort((a,b)=>b.w-a.w).slice(0,7);
  openCard(`<h2>How people feel</h2><p>${ST.pop?`${ST.pop.toLocaleString()} residents`:'Nobody lives here yet'}</p>
    ${ST.pop?`<div class="big">${ST.hap}%</div><p>${ST.hap>=75?'Delighted with the place':ST.hap>=55?'Mostly content':ST.hap>=35?'Some grumbling':'Unhappy, and some are leaving'}</p>`:''}
    ${list.length?`<h3>What they say</h3><ul class="why" style="margin:0 0 16px">${list.map(r=>`<li class="${r.g>0?'g':r.g<0?'b':''}">${esc(r.t)}</li>`).join('')}</ul>`:'<p class="note">Build some homes beside a road and people will start moving in.</p>'}
    <p class="note">Happier homes fill up faster and pay more tax. Tap any home to hear from its residents.</p>
    <button class="btn" id="pBack" type="button">Back to town</button>`);
  $('pBack').onclick=()=>{ sfx('tap'); closeCard(); };
}
function showGlance(){
  const d=ST.dem, say=(v,yes,no,meh)=>v>.15?yes:v<-.15?no:meh;
  const rows=[['Homes',d.homes,say(d.homes,'People want to move in. Build homes.','Plenty of empty homes for now.','About right.')],
    ['Shops',d.shops,say(d.shops,`Shoppers are going without (${ST.pop.toLocaleString()} people, room for ${ST.serve.toLocaleString()}).`,'More shops than shoppers.','About right.')],
    ['Work',d.work,say(d.work,`People need jobs (${ST.workers.toLocaleString()} want work, ${ST.jobs.toLocaleString()} jobs).`,'Businesses are short of workers. Build homes.','About right.')]];
  openCard(`<h2>What the town wants</h2><p>The three bars at the top of the screen</p>
    <div class="board">${rows.map((r,k)=>`<div class="row" style="animation-delay:${.1+k*.06}s"><span>${r[0]}<small>${esc(r[2])}</small></span><b>${r[1]>.15?'▲':r[1]<-.15?'▼':'–'}</b></div>`).join('')}</div>
    <div class="board">
      <div class="row"><span>Residents</span><b>${ST.pop.toLocaleString()}</b></div>
      <div class="row"><span>Room in homes</span><b>${ST.cap.toLocaleString()}</b></div>
      <div class="row"><span>Want a job</span><b>${ST.workers.toLocaleString()}</b></div>
      <div class="row"><span>Jobs</span><b>${ST.jobs.toLocaleString()}</b></div>
      <div class="row"><span>Shoppers the shops can serve</span><b>${ST.serve.toLocaleString()}</b></div></div>
    <button class="btn" id="gBack" type="button">Back to town</button>`);
  $('gBack').onclick=()=>{ sfx('tap'); closeCard(); };
}
function showRank(r){
  const R=RANKS[r], unl=ITEMS.filter(d=>d.rank===r&&!d.hidden);
  openCard(`<h2 class="logo" style="font-size:46px !important">${R.name}!</h2><p>${esc(T.name)} has ${ST.pop.toLocaleString()} people. The county sends a grant of <b style="color:#000">${money(R.grant)}</b>.</p>
    ${unl.length?`<h3 style="text-align:center">New to build</h3><div class="unl">${unl.map((d,k)=>`<span style="animation-delay:${.2+k*.07}s"><canvas data-k="${d.id}"></canvas>${d.name}</span>`).join('')}</div>`:''}
    <button class="btn" id="rGo" type="button">Wonderful</button>`);
  document.querySelectorAll('.unl canvas').forEach(c=>drawIcon(c,c.dataset.k,74,50));
  $('rGo').onclick=()=>{ sfx('tap'); closeCard(); if(S.cat) openCat(S.cat); };
}
