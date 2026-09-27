/* Ink Town: Touch, mouse and keys.
   One finger: tap to build (or to look at something), drag to look around. With a road, path, hedge, flower bed,
   pond, tree or Clear picked, one finger drags out what you're building instead, and you let go to build it.
   Two fingers always move and zoom the map. On a computer the mouse wheel zooms, a right-drag moves the map,
   and the arrow keys pan. */
"use strict";
const PTR=new Map();
let G=null; // the current gesture: {k:'tap'|'pan'|'drag'|'pinch', ...}
const tileAt=(sx,sy)=>{ const w=toWorld(sx,sy); return {x:Math.floor(w.x),y:Math.floor(w.y),wx:w.x,wy:w.y}; };
const dragTool=()=>{ const d=S.tool&&IT[S.tool]; return d&&d.mode!=='single'?d:null; };
const live=()=>S.st==='play';

// where a building would go if placed under this point: its footprint is centred on the finger
function anchorFor(d,wx,wy){ return {x:Math.floor(wx-d.w/2+.5),y:Math.floor(wy-d.h/2+.5)}; }
// the frontmost thing drawn under a point: buildings lean up the screen, so their roofs can cover the tiles behind
function hitTest(wx,wy){
  const tx=Math.floor(wx), ty=Math.floor(wy);
  for(let dy=3;dy>=0;dy--) for(let dx=-1;dx<=0;dx++){ const o=objAt(tx+dx,ty+dy); if(!o||IT[o.k].flat||o.k==='hedge') continue;
    const d=IT[o.k], top=o.y-(TALL[o.k]||.6); if(wx>=o.x&&wx<o.x+d.w&&wy>=top&&wy<o.y+d.h) return o; }
  return objAt(tx,ty);
}
function updateDrag(){
  const d=dragTool(); if(!d||!G||G.k!=='drag'){ return; }
  const a=G.a, b=G.b;
  if(G.firstX===undefined&&(a.x!==b.x||a.y!==b.y)) G.firstX=Math.abs(b.x-a.x)>=Math.abs(b.y-a.y);
  let tiles;
  if(d.mode==='line') tiles=lineTiles(a,b,G.firstX!==false);
  else if(d.mode==='area') tiles=areaTiles(a,b);
  else { tiles=G.brush; }
  tiles=tiles.filter(([x,y])=>inMap(x,y));
  const p=planTiles(d,tiles);
  S.ghost={d,tiles:tiles.map(([x,y],i)=>[x,y,p.plans[i].ok,p.plans[i].skip]),cost:p.cost,n:p.n,end:b};
}
function hoverGhost(sx,sy){
  const d=S.tool&&IT[S.tool]; if(!d||d.mode!=='single'){ if(!G) S.ghost=null; return; }
  const w=toWorld(sx,sy), a=anchorFor(d,w.x,w.y), p=planSingle(d,a.x,a.y);
  S.ghost={d,x:a.x,y:a.y,ok:p.ok,cost:p.cost,why:p.why,road:p.road};
}
function commitDrag(){
  const d=dragTool(), gh=S.ghost, tiles=gh&&gh.tiles?gh.tiles.filter(t=>t[2]).map(t=>[t[0],t[1]]):[];
  S.ghost=null; if(!d) return;
  if(!tiles.length){ // explain why nothing was built, unless it was all already there
    const bad=gh&&gh.tiles&&gh.tiles.find(t=>!t[2]&&!t[3]); if(bad){ sfx('nope'); toast(planTile(d,bad[0],bad[1]).why||'Can’t build there'); } return; }
  const r=buildTiles(d,tiles);
  if(!r.ok){ sfx('nope'); toast(r.why); if(r.broke) cashPop(true); return; }
  afterBuild(d,r.tiles,r.cost);
}
function afterBuild(d,tiles,cost){
  const n=tiles.length;
  tiles.forEach(([x,y],i)=>{ if(n<40||i%3===0) puff(x+.5,y+.6,d.id==='clear'?4:2,d.id==='clear'?1.2:.8); });
  if(d.id==='clear') sfx('clear'); else if(d.id==='tree'||d.id==='flowers'||d.id==='hedge') sfx('plant'); else if(d.mode==='single') sfx('place'); else tiles.slice(0,8).forEach((_,i)=>setTimeout(()=>sfx('lay'),i*40));
  if(cost){ const [x,y]=tiles[tiles.length-1]; floatText(x+.5,y,(cost>0?'−':'+')+money(Math.abs(cost))); cashPop(); }
  const t=checkTask(); if(t) taskDone(t);
}
function tapAt(sx,sy){
  const d=S.tool&&IT[S.tool], w=toWorld(sx,sy);
  if(d&&d.mode==='single'){
    const a=anchorFor(d,w.x,w.y), r=buildSingle(d,a.x,a.y);
    if(!r.ok){ if(!r.skip){ sfx('nope'); toast(r.why); if(r.broke) cashPop(true); } return; }
    puff(a.x+d.w/2,a.y+d.h*.8,8+d.w*6,d.w); afterBuild(d,[[a.x+Math.floor(d.w/2),a.y]],r.cost);
    if(!r.road&&(d.cap||d.jobs||d.svc)){ toast('It needs a road beside it to open'); }
    S.ghost={d,x:a.x,y:a.y,ok:false,cost:0,placed:S.t};
    return;
  }
  if(d&&d.mode!=='single'){ // a tap with a drag tool builds just that tile
    const t=tileAt(sx,sy); G={k:'drag',a:{x:t.x,y:t.y},b:{x:t.x,y:t.y},brush:[[t.x,t.y]]}; updateDrag(); commitDrag(); G=null; return; }
  const o=hitTest(w.x,w.y);
  if(o){ sfx('tap'); showSheet(o); } else closeSheet();
}
cv.addEventListener('pointerdown',e=>{
  if(!live()) return; audioInit();
  try{ cv.setPointerCapture(e.pointerId); }catch(_){}
  PTR.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY});
  cam.vx=cam.vy=0;
  if(PTR.size===2){ // a second finger: stop drawing, start moving the map
    const [p1,p2]=[...PTR.values()]; S.ghost=S.ghost&&S.ghost.tiles?null:S.ghost;
    G={k:'pinch',d0:Math.hypot(p1.x-p2.x,p1.y-p2.y)||1,z0:cam.z,m:toWorld((p1.x+p2.x)/2,(p1.y+p2.y)/2)}; return; }
  if(PTR.size>2) return;
  const t=tileAt(e.clientX,e.clientY), d=dragTool();
  if(e.button===2||e.button===1||e.pointerType==='mouse'&&e.shiftKey){ G={k:'pan',lx:e.clientX,ly:e.clientY,id:e.pointerId}; return; }
  if(d){ G={k:'drag',id:e.pointerId,a:{x:t.x,y:t.y},b:{x:t.x,y:t.y},brush:[[t.x,t.y]],sx:e.clientX,sy:e.clientY}; updateDrag(); }
  else G={k:'tap',id:e.pointerId,sx:e.clientX,sy:e.clientY,lx:e.clientX,ly:e.clientY,t:performance.now()};
});
cv.addEventListener('pointermove',e=>{
  const p=PTR.get(e.pointerId);
  if(!p){ if(e.pointerType==='mouse'&&live()&&!G) hoverGhost(e.clientX,e.clientY); return; }
  p.x=e.clientX; p.y=e.clientY;
  if(!G) return;
  if(G.k==='pinch'&&PTR.size>=2){ const [p1,p2]=[...PTR.values()], dd=Math.hypot(p1.x-p2.x,p1.y-p2.y);
    cam.z=clamp(G.z0*dd/G.d0,ZMIN,ZMAX); const mx=(p1.x+p2.x)/2, my=(p1.y+p2.y)/2;
    cam.x=G.m.x-(mx-W/2)/cam.z; cam.y=G.m.y-(my-Hh/2)/cam.z; clampCam(); return; }
  if(G.id!==e.pointerId) return;
  if(G.k==='tap'&&Math.hypot(e.clientX-G.sx,e.clientY-G.sy)>9){ G.k='pan'; }
  if(G.k==='pan'){ const dx=e.clientX-G.lx, dy=e.clientY-G.ly; G.lx=e.clientX; G.ly=e.clientY;
    cam.x-=dx/cam.z; cam.y-=dy/cam.z; clampCam(); const now=performance.now(), dt=Math.max(1,now-(G.mt||now-16)); G.mt=now;
    cam.vx=-dx/cam.z/(dt/1000)*.9; cam.vy=-dy/cam.z/(dt/1000)*.9; if(e.pointerType==='mouse') hoverGhost(e.clientX,e.clientY); return; }
  if(G.k==='drag'){ const t=tileAt(e.clientX,e.clientY);
    if(t.x!==G.b.x||t.y!==G.b.y){ G.b={x:t.x,y:t.y}; if(!G.brush.some(([x,y])=>x===t.x&&y===t.y)) G.brush.push([t.x,t.y]); updateDrag(); if(meta.sound&&AC) tone(900+G.brush.length*8,.02,'sine',.02); } }
});
function endPtr(e,cancel){
  if(!PTR.has(e.pointerId)) return; PTR.delete(e.pointerId);
  if(!G) return;
  if(G.k==='pinch'){ if(PTR.size===1){ const [id,p]=[...PTR.entries()][0]; G={k:'pan',id,lx:p.x,ly:p.y}; } else if(!PTR.size) G=null; return; }
  if(G.id!==e.pointerId) return;
  if(G.k==='drag'&&!cancel) commitDrag();
  else if(G.k==='drag') S.ghost=null;
  else if(G.k==='tap'&&!cancel) tapAt(e.clientX,e.clientY);
  else if(G.k==='pan'&&performance.now()-(G.mt||0)>80){ cam.vx=cam.vy=0; }
  G=null;
}
cv.addEventListener('pointerup',e=>endPtr(e,false));
cv.addEventListener('pointercancel',e=>endPtr(e,true));
cv.addEventListener('pointerleave',e=>{ if(e.pointerType==='mouse'&&!PTR.size&&S.ghost&&!S.ghost.tiles) S.ghost=null; });
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('wheel',e=>{ if(!live()) return; e.preventDefault();
  const k=Math.exp(-e.deltaY*(e.ctrlKey?.01:.0015)); zoomAt(e.clientX,e.clientY,cam.z*k); },{passive:false});
// Safari's own pinch gesture must not zoom the page
['gesturestart','gesturechange'].forEach(n=>document.addEventListener(n,e=>e.preventDefault()));

const KEYS={};
addEventListener('keydown',e=>{
  if(e.target&&(e.target.tagName==='INPUT')) return;
  if(e.key==='Escape'){ if(!$('card').hidden&&S.st==='card'){ closeCard(); return; } if(S.sel){ closeSheet(); return; } if(S.cat){ openCat(null); return; } if(live()) showMenu(); return; }
  if(!live()) return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){ e.preventDefault(); doUndo(); return; }
  if(e.key===' '){ e.preventDefault(); cycleSpeed(S.speed?0:1); return; }
  if(e.key==='+'||e.key==='='){ zoomAt(W/2,Hh/2,cam.z*1.2); return; }
  if(e.key==='-'||e.key==='_'){ zoomAt(W/2,Hh/2,cam.z/1.2); return; }
  if(/^Arrow/.test(e.key)||'wasd'.includes(e.key)){ KEYS[e.key]=true; e.preventDefault(); }
});
addEventListener('keyup',e=>{ delete KEYS[e.key]; });
addEventListener('blur',()=>{ for(const k in KEYS) delete KEYS[k]; });
function keysStep(dt){
  const v=14*dt*46/cam.z; if(KEYS.ArrowLeft||KEYS.a) cam.x-=v; if(KEYS.ArrowRight||KEYS.d) cam.x+=v; if(KEYS.ArrowUp||KEYS.w) cam.y-=v; if(KEYS.ArrowDown||KEYS.s) cam.y+=v; clampCam();
  // a flicked map glides to a stop
  if(!G&&(cam.vx||cam.vy)){ cam.x+=cam.vx*dt; cam.y+=cam.vy*dt; const k=Math.exp(-dt*5); cam.vx*=k; cam.vy*=k; if(Math.hypot(cam.vx,cam.vy)<.05) cam.vx=cam.vy=0; clampCam(); }
}
function doUndo(){ const A=undo(); if(!A){ sfx('nope'); return; } sfx('undo'); cashPop(); closeSheet();
  toast(A.money>0?`Undone · +${money(A.money)}`:A.money<0?`Undone · −${money(-A.money)}`:'Undone'); }
function cycleSpeed(to){ S.speed=to!==undefined?to:(S.speed+1)%SPEEDS.length; sfx('tap'); toast(S.speed?`Speed ×${SPEEDS[S.speed]}`:'Paused'); }
function centreCam(snap){ const h=[...T.objs.values()].find(o=>o.k==='hall'); if(h){ cam.x=h.x+1; cam.y=h.y+2.8; } if(snap){ cam.z=clamp(Math.min(W,Hh)/10,30,56); } cam.vx=cam.vy=0; }

$('menuBtn').onclick=()=>{ audioInit(); sfx('open'); showMenu(); };
$('speedBtn').onclick=()=>{ audioInit(); cycleSpeed(); };
$('undoBtn').onclick=()=>{ audioInit(); doUndo(); };
$('homeBtn').onclick=()=>{ audioInit(); sfx('tap'); centreCam(false); };
$('cashBtn').onclick=()=>{ audioInit(); sfx('open'); if(live()) showLedger(); };
$('popChip').onclick=()=>{ audioInit(); sfx('open'); if(live()) showGlance(); };
$('demBtn').onclick=()=>{ audioInit(); sfx('open'); if(live()) showGlance(); };
$('hapChip').onclick=()=>{ audioInit(); sfx('open'); if(live()) showPeople(); };
$('taskPill').onclick=()=>{ audioInit(); sfx('open'); if(live()) showTasks(); };
document.addEventListener('visibilitychange',()=>{ if(document.hidden&&T) saveTown(); });
