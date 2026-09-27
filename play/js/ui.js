/* Ink Town: The HUD, the build dock and its trays, item icons, the info sheet, toasts, hints and callouts. */
"use strict";
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const txtCache={};
function setText(id,v){ if(txtCache[id]!==v){ txtCache[id]=v; $(id).textContent=v; } }
const sign=v=>(v>=0?'+':'−')+money(Math.abs(v)).replace('−','');

/* ---------- item icons, drawn with the same ink as the map ---------- */
const ICON_CACHE={};
function drawIcon(cvs,k,w,h){
  const dpr=Math.min(2,devicePixelRatio||1); cvs.width=Math.round(w*dpr); cvs.height=Math.round(h*dpr);
  const src=iconSource(k), g=cvs.getContext('2d');
  // fit the drawing's inked area into the icon, keeping its shape
  const s=Math.min(w*dpr*.92/src.bw,h*dpr*.92/src.bh), dw=src.bw*s, dh=src.bh*s;
  g.drawImage(src.c,src.bx,src.by,src.bw,src.bh,(cvs.width-dw)/2,(cvs.height-dh)/2,dw,dh);
}
// each item is drawn once, large, onto a spare canvas; the icon is cropped from its inked area
function iconSource(k){
  if(ICON_CACHE[k]) return ICON_CACHE[k];
  const d=IT[k], S0=90, c=document.createElement('canvas'); c.width=c.height=S0*4; const g=c.getContext('2d');
  g.setTransform(S0,0,0,S0,S0*1,S0*2.4); g.lineCap='round'; g.lineJoin='round';
  const oX=X, oL=LW; X=g; LW=INK*1.1/(S0/2);
  try{
    const bar={segs:[[0,.5,2,.5]],dots:[]};
    if(k==='road'){ strokeNet(bar,.8+ln(3),'#000','butt'); strokeNet(bar,.8,'#fff','butt'); P(); X.moveTo(.2,.5); X.lineTo(.6,.5); X.moveTo(1.4,.5); X.lineTo(1.8,.5); X.lineWidth=ln(); X.strokeStyle='#000'; X.stroke(); }
    else if(k==='path'){ strokeNet(bar,.34+ln(3),'#000'); strokeNet(bar,.34,PAT.gravel); }
    else if(k==='hedge'){ const bl=[.25,.55,.85,1.15,1.45,1.75].map((x,i)=>[x,.5,.2+(i%2)*.02]);
      P(); bl.forEach(([x,y,r])=>circ(x,y,r+ln(1.2))); X.fillStyle='#000'; X.fill(); P(); bl.forEach(([x,y,r])=>circ(x,y,r)); X.fillStyle=PAT.hatchW; X.fill(); }
    else if(k==='flowers'){ flowerTile(0,0,false,true,false,false); flowerTile(1,0,true,false,false,false); }
    else if(k==='pond'){ P(); X.ellipse(1,.5,.95+ln(1.6),.45+ln(1.6),0,0,TAU); X.fillStyle='#000'; X.fill(); P(); X.ellipse(1,.5,.95,.45,0,0,TAU); X.fillStyle=PAT.water; X.fill(); }
    else if(k==='clear'){ P(); rect(.3,.1,1.4,.8); X.setLineDash([.1,.08]); ink(null); X.setLineDash([]); line(.7,.25,1.3,.75,1.6); line(1.3,.25,.7,.75,1.6); }
    else if(DRAW[k]) DRAW[k](0,0,0,null);
  }catch(e){ console.error(e); }
  X=oX; LW=oL;
  // find the inked area
  const px=g.getImageData(0,0,c.width,c.height).data; let x0=c.width,y0=c.height,x1=0,y1=0;
  for(let y=0;y<c.height;y+=2) for(let x=0;x<c.width;x+=2) if(px[(y*c.width+x)*4+3]>20){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
  if(x1<x0){ x0=0;y0=0;x1=c.width-1;y1=c.height-1; }
  return ICON_CACHE[k]={c,bx:Math.max(0,x0-3),by:Math.max(0,y0-3),bw:Math.min(c.width,x1-x0+6),bh:Math.min(c.height,y1-y0+6)};
}

/* ---------- category icons for the dock ---------- */
const CAT_ICON={
  roads:'<path d="M8 25C9 17 7 9 10 1M18 25c-1-8 1-16-2-24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M13.3 22v-3M13 14.5v-3M13.2 7V4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  homes:'<path d="M4 12 13 4l9 8v11H4z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M11 23v-6h4v6" fill="currentColor"/>',
  shops:'<path d="M4 23V12M22 23V12M3 23h20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M3 6h20l-1 6H4z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M8 6v6M13 6v6M18 6v6" stroke="currentColor" stroke-width="2.2"/><rect x="8" y="15" width="10" height="5" fill="currentColor"/>',
  work:'<path d="M3 23V12l5 3v-3l5 3v-3l5 3V4h4v19z" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round"/><rect x="7" y="18" width="3" height="3" fill="currentColor"/><rect x="13" y="18" width="3" height="3" fill="currentColor"/>',
  nature:'<path d="M13 24v-8" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M13 3c4.5 0 7 3 7 6.5S17.5 16 13 16s-7-3-7-6.5S8.5 3 13 3z" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M9 24h8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  services:'<path d="M3 10 13 4l10 6z" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round"/><path d="M6 12v9M10.5 12v9M15.5 12v9M20 12v9M3 23h20" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  clear:'<rect x="4" y="5" width="18" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2.3" stroke-dasharray="4 3"/><path d="M9 10l8 6M17 10l-8 6" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>'};
function buildDock(){
  $('cats').innerHTML=CATS.map(c=>`<button class="cat" type="button" data-cat="${c.id}" aria-pressed="false"><svg viewBox="0 0 26 26" aria-hidden="true">${CAT_ICON[c.id]}</svg>${c.name}</button>`).join('');
  document.querySelectorAll('.cat').forEach(b=>b.onclick=()=>{ audioInit(); sfx('tap'); openCat(S.cat===b.dataset.cat?null:b.dataset.cat); });
  $('trayX').onclick=()=>{ sfx('tap'); openCat(null); };
}
const CAT_SUB={roads:'Everything needs a road to the town hall',homes:'Homes bring people. People pay taxes.',shops:'People need shops nearby',work:'People need jobs',nature:'Trees and gardens make people happier',services:'Growing towns need services'};
function openCat(id){
  S.cat=id; closeSheet();
  document.querySelectorAll('.cat').forEach(b=>{ const on=b.dataset.cat===id; b.classList.toggle('on',on); b.setAttribute('aria-pressed',on); });
  if(!id){ $('tray').hidden=true; setTool(null); return; }
  if(id==='clear'){ $('tray').hidden=true; setTool('clear'); return; }
  const list=ITEMS.filter(d=>d.cat===id&&!d.hidden);
  $('trayT').textContent=CATS.find(c=>c.id===id).name; $('trayS').textContent=CAT_SUB[id]||'';
  $('items').innerHTML=list.map((d,i)=>{ const lock=d.rank>T.rank;
    return `<button class="it${lock?' lock':''}" type="button" data-id="${d.id}" style="animation-delay:${i*.04}s" aria-label="${d.name}${lock?', unlocks at '+RANKS[d.rank].name:', '+money(d.cost)}">
      <canvas width="66" height="42"></canvas><b>${d.name}</b><small>${lock?RANKS[d.rank].name:money(d.cost)+(d.mode==='single'?'':' each')}</small></button>`; }).join('');
  $('tray').hidden=false; $('tray').style.animation='none'; void $('tray').offsetWidth; $('tray').style.animation='';
  document.querySelectorAll('.it').forEach(b=>{ drawIcon(b.querySelector('canvas'),b.dataset.id,66,42);
    b.onclick=()=>{ const d=IT[b.dataset.id]; audioInit();
      if(d.rank>T.rank){ sfx('nope'); b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); toast(`${d.name} unlocks when you reach ${RANKS[d.rank].name}`); return; }
      sfx('tap'); setTool(S.tool===d.id?null:d.id); }; });
  // pick the first item straight away, so the tray is ready to build with
  const first=list.find(d=>d.rank<=T.rank); setTool(first?first.id:null);
  refreshTray();
}
function refreshTray(){ document.querySelectorAll('.it').forEach(b=>{ const d=IT[b.dataset.id]; b.classList.toggle('on',S.tool===d.id); b.classList.toggle('poor',d.rank<=T.rank&&d.cost>T.money); }); }
const HINTS={single:'Tap the map to build · drag to look around',line:'Drag to lay a line · two fingers to move the map',area:'Drag out a patch · two fingers to move the map',brush:'Drag over the grass to plant · two fingers to move the map'};
function setTool(id){
  S.tool=id; S.ghost=null; S.drag=null;
  const d=id&&IT[id];
  hint(d?(d.id==='clear'?'Drag over anything to knock it down. You get half its price back.':`${d.name}: ${d.blurb}`):null);
  if(d) hintLater(HINTS[d.mode],3000,id);
  refreshTray();
}
// a short note under the task, which tidies itself away after a few seconds
let hintTO=0,hint2TO=0;
function hint(text,ms){ clearTimeout(hintTO); const el=$('hint');
  if(!text){ el.hidden=true; return; }
  const dk=$('dock'); el.style.bottom=(dk.hidden?24:innerHeight-dk.getBoundingClientRect().top+10)+'px';
  $('hintT').textContent=text; el.hidden=false; el.classList.remove('out'); const sp=$('hintT'); sp.style.animation='none'; void sp.offsetWidth; sp.style.animation='';
  hintTO=setTimeout(()=>{ el.classList.add('out'); hintTO=setTimeout(()=>el.hidden=true,420); },ms||2800); }
function hintLater(text,ms,id){ clearTimeout(hint2TO); hint2TO=setTimeout(()=>{ if(S.tool===id&&S.st==='play') hint(text,3200); },ms); }

/* ---------- HUD ---------- */
const SPEED_ICON=['M10 8h4v16h-4zM18 8h4v16h-4z','M11 7l14 9-14 9z','M5 8l11 8-11 8zM16 8l11 8-11 8z','M2 9l9 7-9 7zM11.5 9l9 7-9 7zM21 9l9 7-9 7z'];
function hudShow(on){ ['top','menuBtn','side','dock'].forEach(id=>$(id).hidden=!on); if(!on) hint(null); $('taskPill').hidden=!on||!TASKS[T&&T.task]; if(!on) closeSheet(); }
function updHUD(){
  if(!T||!ST) return;
  setText('tname',T.name); setText('tsub',`Day ${T.day} · ${RANKS[T.rank].name}`);
  setText('money',money(T.money)); setText('net',`${sign(ST.net)} a day`);
  setText('pop',String(ST.pop)); setText('hap',ST.pop?ST.hap+'%':'–');
  const mh=ST.hap>=60?'M6.5 12q3.5 3 7 0':ST.hap>=40?'M6.5 13h7':'M6.5 14q3.5-3 7 0';
  if(txtCache.mouth!==mh){ txtCache.mouth=mh; $('mouth').setAttribute('d',mh); }
  [['dH','homes'],['dS','shops'],['dW','work']].forEach(([id,k])=>{ const v=ST.dem[k], key=id+(v*10|0);
    if(txtCache[id]!==key){ txtCache[id]=key; const h=Math.abs(v)*50; $(id).innerHTML=`<b class="${v<0?'neg':''}" style="${v>=0?`bottom:50%;height:${h}%`:`top:50%;height:${h}%`}"></b>`; } });
  $('dayArc').style.setProperty('--p',(S.dayT/DAY_SECONDS*100).toFixed(1)+'%');
  const cur=RANKS[T.rank], nx=RANKS[T.rank+1];
  setText('rankL',cur.name); setText('rankR',nx?`${nx.name} at ${nx.pop.toLocaleString()}`:'Top rank');
  const f=nx?clamp((ST.pop-cur.pop)/(nx.pop-cur.pop),0,1):1; if(txtCache.rf!==f){ txtCache.rf=f; $('rankFill').style.transform=`scaleX(${f})`; }
  const t=TASKS[T.task];
  if(t){ const v=Math.min(t.goal,t.val(ST)), s=`<b>${esc(t.text)}</b><small>${t.goal>1?`${v.toLocaleString()} of ${t.goal.toLocaleString()} · `:''}+${money(t.pay)}</small>`;
    if(txtCache.task!==s){ txtCache.task=s; $('taskT').innerHTML=s; } }
  $('taskPill').hidden=!t||S.st!=='play';
  $('undoBtn').disabled=!UNDO.length;
  const si=SPEED_ICON[S.speed]; if(txtCache.sp!==si){ txtCache.sp=si; $('speedIcon').setAttribute('d',si); $('speedBtn').classList.toggle('on',S.speed===0); $('speedBtn').setAttribute('aria-label',S.speed?`Speed ×${SPEEDS[S.speed]}`:'Paused'); }
}
function cashPop(bad){ const b=$('cashBtn'), c=bad?'broke':'pop'; b.classList.remove('pop','broke'); void b.offsetWidth; b.classList.add(c); }

/* ---------- messages ---------- */
function toast(text){ const el=$('toast'); el.textContent=text; el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); }
function callout(big,small){ const el=$('callout'); el.innerHTML=`<b>${big}</b>`+(small?`<span>${small}</span>`:''); el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); }

/* ---------- the info sheet for whatever you tapped ---------- */
function statusOf(o){
  const d=IT[o.k], out={lines:[],why:[],meter:null};
  if(d.cap){ out.sub=`${o.pop} of ${d.cap} residents`; out.meter=['Happy',o.hap||0]; out.why=(o.why||[]).slice(0,6); }
  else if(d.jobs){ const staff=o.conn?Math.round(ST.fill*d.jobs):0;
    out.sub=`${staff} of ${d.jobs} jobs filled`+(d.serve?` · serves ${d.serve}`:'');
    if(!o.conn) out.why.push([-1,'No road to the town hall, so it can’t open']);
    else { if(ST.fill<.99) out.why.push([-1,'Short of workers: build more homes nearby']); else out.why.push([1,'Fully staffed']);
      if(d.serve) out.why.push(ST.pop>=ST.serve?[1,'Busy with shoppers']:[0,'Quiet: there are more shops than shoppers']);
      if(d.noise) out.why.push([0,`Noisy for homes within ${d.noise[1]} tiles`]); } }
  else if(d.svc){ out.sub=`Covers homes within ${d.r} tiles · ${money(d.upkeep)} a day`;
    out.why.push(o.conn?[1,'Open and running']:[-1,'No road to the town hall, so it can’t open']);
    const n=NEEDS.find(n=>n.svc===d.svc); if(n) out.why.push([0,`Residents start to expect ${n.name} at ${n.at} people`]); }
  else if(o.k==='hall'){ out.sub=`Day ${T.day} · ${RANKS[T.rank].name} of ${ST.pop} people`; out.why.push([0,'Every road must lead back here']); }
  else if(o.k==='road'){ out.sub=ST.reach[idx(o.x,o.y)]?'Joined to the town hall':'Not joined to the town hall'; out.why.push(ST.reach[idx(o.x,o.y)]?[1,'Buildings beside it can open']:[-1,'Link it to a road from the town hall']); }
  else { out.sub=d.blurb; if(d.appeal) out.why.push([1,`Cheers up homes within ${d.appeal[1]} tiles`]); if(d.upkeep) out.why.push([0,`Upkeep ${money(d.upkeep)} a day`]); }
  return out;
}
function showSheet(o,quiet){
  if(!o){ closeSheet(); return; }
  S.sel=o; const d=IT[o.k], st=statusOf(o), up=upgradeCost(o), ref=refundOf(o);
  const nm=o.k==='road'&&isWater(o.x,o.y)?'Bridge':d.name;
  $('sheetIn').innerHTML=`<div class="top"><canvas width="74" height="60"></canvas><div><h2>${nm}</h2><small>${esc(st.sub||'')}</small></div><button class="x" id="shX" type="button" aria-label="Close">×</button></div>
    ${st.meter?`<div class="meter"><span>${st.meter[0]}</span><div class="bar"><i style="transform:scaleX(${st.meter[1]/100})"></i></div><span>${st.meter[1]}%</span></div>`:''}
    ${st.why.length?`<ul class="why">${st.why.map(([g,t])=>`<li class="${g>0?'g':g<0?'b':''}">${esc(t)}</li>`).join('')}</ul>`:''}
    <div class="sbtns">${up?`<button class="btn" id="shUp" type="button">Upgrade to townhouse · ${money(up)}</button>`:''}
    ${o.k!=='hall'?`<button class="btn ghost" id="shClear" type="button" style="margin-top:0">${ref>=0?`Clear · +${money(ref)}`:`Clear · ${money(-ref)}`}</button>`:`<button class="btn ghost" id="shLedger" type="button" style="margin-top:0">Town ledger</button>`}</div>`;
  $('sheet').hidden=false; $('sheetIn').style.animation='none'; if(!quiet){ void $('sheetIn').offsetWidth; $('sheetIn').style.animation=''; }
  drawIcon($('sheetIn').querySelector('canvas'),o.k,74,60);
  $('shX').onclick=()=>{ sfx('tap'); closeSheet(); };
  if($('shUp')) $('shUp').onclick=()=>{ const r=upgradeObj(o); if(!r.ok){ sfx('nope'); toast(r.why||'Can’t upgrade yet'); cashPop(true); return; }
    sfx('place',1.2); puff(o.x+.5,o.y+.7,10); sparkle(o.x+.5,o.y-.4); floatText(o.x+.5,o.y-.3,'−'+money(up).slice(0)); cashPop(); showSheet(r.obj); };
  if($('shClear')) $('shClear').onclick=()=>{ const d2=IT[o.k]; if(ref<0&&-ref>T.money){ sfx('nope'); toast('Not enough money'); return; }
    clearObj(o); sfx('clear'); puff(o.x+d2.w/2,o.y+d2.h/2,14,d2.w); floatText(o.x+d2.w/2,o.y,(ref>=0?'+':'−')+money(Math.abs(ref))); cashPop(); closeSheet(); };
  if($('shLedger')) $('shLedger').onclick=()=>showLedger();
}
function closeSheet(){ S.sel=null; $('sheet').hidden=true; }
