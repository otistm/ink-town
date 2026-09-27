/* Ink Town: Drawing one frame of the town: ground, water, gardens, roads, traffic, buildings in front-to-back order,
   status bubbles, the build preview and floating money. */
"use strict";
// everything that stands up off the ground, sorted so nearer things (lower on screen) are drawn over further ones
function tallList(vb){
  const seen=new Set(), out=[];
  for(let y=vb.y0;y<=vb.y1;y++) for(let x=vb.x0-1;x<=vb.x1;x++){ const o=objAt(x,y); if(!o||seen.has(o.id)) continue; seen.add(o.id);
    const d=IT[o.k]; if(d.flat||o.k==='hedge') continue; out.push(o); }
  return out.sort((a,b)=>(a.y+IT[a.k].h)-(b.y+IT[b.k].h)||a.x-b.x);
}
function drawObj(o,t){
  const d=IT[o.k], age=S.t-(o.born||-9);
  if(age<.7&&!RM){ // new buildings pop up out of the ground with a squash and a settle
    const u=clamp(age/.7,0,1), sy=easeOutBack(u), sx=1+(1-u)*.25*Math.sin(u*Math.PI), cx=o.x+d.w/2, by=o.y+d.h;
    X.save(); X.translate(cx,by); X.scale(sx,Math.max(.01,sy)); X.translate(-cx,-by); DRAW[o.k](o.x,o.y,t,o); X.restore(); }
  else DRAW[o.k](o.x,o.y,t,o);
}
function drawGrid(vb){
  P(); for(let x=vb.x0;x<=vb.x1+1;x++){ X.moveTo(x,vb.y0); X.lineTo(x,vb.y1+1); } for(let y=vb.y0;y<=vb.y1+1;y++){ X.moveTo(vb.x0,y); X.lineTo(vb.x1+1,y); }
  X.lineWidth=ln(.6); X.strokeStyle='rgba(0,0,0,.14)'; X.setLineDash([ln(2),ln(3)]); X.stroke(); X.setLineDash([]);
}
function rangeRing(cx,cy,r,t,label){
  P(); X.arc(cx,cy,r,0,TAU); X.fillStyle='rgba(0,0,0,.035)'; X.fill();
  X.setLineDash([ln(6),ln(5)]); X.lineDashOffset=RM?0:-t*ln(8); X.lineWidth=ln(1.6); X.strokeStyle='#000'; X.stroke(); X.setLineDash([]); X.lineDashOffset=0;
}
function bubble(x,y,kind,t){
  const b=RM?0:Math.sin(t*3+x)*.04, r=.2; y+=b;
  P(); X.moveTo(x-.06,y+r*.8); X.lineTo(x,y+r+.1); X.lineTo(x+.06,y+r*.8); circ(x,y,r); ink('#fff',1.2);
  if(kind==='road'){ line(x,y-.11,x,y+.03,2.2); P(); circ(x,y+.1,.025); X.fillStyle='#000'; X.fill(); }
  else if(kind==='sad'){ P(); circ(x-.06,y-.04,.022); circ(x+.06,y-.04,.022); X.fillStyle='#000'; X.fill(); P(); X.arc(x,y+.1,.07,Math.PI*1.15,Math.PI*1.85); X.lineWidth=ln(1.2); X.stroke(); }
  else if(kind==='staff'){ person(x,y+.1,.9,'#000'); }
}
function drawGhost(t){
  const g=S.ghost; if(!g) return;
  if(g.tiles){
    g.tiles.forEach(([x,y,ok,skip])=>{ if(skip) return; P(); rect(x+.04,y+.04,.92,.92);
      if(ok){ X.fillStyle=g.d.id==='clear'?PAT.dense:'rgba(0,0,0,.14)'; X.fill(); X.setLineDash([ln(4),ln(3)]); X.lineWidth=ln(1.4); X.strokeStyle='#000'; X.stroke(); X.setLineDash([]); }
      else { X.fillStyle=PAT.hatch; X.fill(); line(x+.3,y+.3,x+.7,y+.7,1.4); line(x+.7,y+.3,x+.3,y+.7,1.4); } });
    return;
  }
  const d=g.d;
  if(g.placed) return; // just built: the building itself is showing now
  if(d.svc) rangeRing(g.x+d.w/2,g.y+d.h/2,d.r,t);
  if(d.noise) rangeRing(g.x+d.w/2,g.y+d.h/2,d.noise[1],t);
  X.globalAlpha=g.ok?.6:.35; try{ DRAW[d.id](g.x,g.y,t,null); }catch(e){} X.globalAlpha=1;
  P(); rect(g.x+.03,g.y+.03,d.w-.06,d.h-.06); X.setLineDash([ln(4),ln(3)]); X.lineWidth=ln(1.6); X.strokeStyle='#000'; X.stroke(); X.setLineDash([]);
  if(!g.ok){ P(); rect(g.x,g.y,d.w,d.h); X.fillStyle=PAT.hatch; X.fill(); }
}
// the cost label that follows a drag or hovering building, in screen space
function drawCostTag(){
  const g=S.ghost; if(!g||g.placed) return; let wx,wy,txt;
  if(g.tiles){ if(!g.n) return; wx=g.end.x+.5; wy=g.end.y-.4; txt=g.d.id==='clear'?(g.cost<=0?`+${money(-g.cost)}`:`−${money(g.cost)}`):`${money(g.cost)} · ${g.n}`; }
  else { wx=g.x+g.d.w/2; wy=g.y-(TALL[g.d.id]||.6)-.35; txt=g.ok?money(g.cost):g.why||'Can’t build here'; }
  const p=toScreen(wx,wy); screenTransform(); ctx.font='800 14px Figtree, system-ui, sans-serif';
  const lim=$('dock').hidden?Hh:$('dock').getBoundingClientRect().top; // keep it clear of the build dock
  const w=ctx.measureText(txt).width+22, h=28, x=clamp(p.x-w/2,8,W-w-8), y=clamp(p.y-h,250,Math.max(250,lim-h-8));
  const poor=g.cost>T.money&&g.cost>0;
  ctx.beginPath(); ctx.roundRect?ctx.roundRect(x,y,w,h,14):ctx.rect(x,y,w,h); ctx.fillStyle=poor?'#fff':'#000'; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle='#000'; ctx.stroke();
  ctx.fillStyle=poor?'#000':'#fff'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(txt,x+w/2,y+h/2+1);
  if(poor){ ctx.beginPath(); ctx.moveTo(x+10,y+h/2+1); ctx.lineTo(x+w-10,y+h/2+1); ctx.lineWidth=1.6; ctx.stroke(); }
}
function drawFloats(){
  screenTransform(); ctx.textAlign='center'; ctx.textBaseline='middle';
  S.floats.forEach(f=>{ const p=toScreen(f.x,f.y), k=f.t/1.6, up=k*38, sc=k<.15?easeOutBack(k/.15):1;
    ctx.globalAlpha=k>.7?1-(k-.7)/.3:1; ctx.font=`italic 900 ${f.big?22:17}px Fraunces, Georgia, serif`;
    ctx.save(); ctx.translate(p.x,p.y-up); ctx.scale(sc,sc); ctx.lineWidth=5; ctx.strokeStyle='#fff'; ctx.lineJoin='round'; ctx.strokeText(f.text,0,0); ctx.fillStyle='#000'; ctx.fillText(f.text,0,0); ctx.restore(); });
  ctx.globalAlpha=1;
}
function draw(t){
  screenTransform(); ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,Hh);
  if(!T||!ST) return;
  X=ctx; LW=INK/cam.z; worldTransform(); ctx.lineCap='round'; ctx.lineJoin='round';
  const vb=viewBox();
  // beyond the edge of the map: hatched margins, like the edge of a planning sheet
  ctx.fillStyle=PAT.hatchW; ctx.fillRect(-30,-30,N+60,N+60);
  ctx.fillStyle=PAT.grass; ctx.fillRect(0,0,N,N);
  P(); rect(0,0,N,N); X.lineWidth=ln(2.5); X.strokeStyle='#000'; X.stroke();
  drawWater(vb); drawFlat(vb,t); drawNets(vb);
  if(S.tool&&S.st==='play') drawGrid(vb);
  const sel=S.sel&&T.objs.has(S.sel.id)?S.sel:null, sd=sel&&IT[sel.k];
  if(sd&&sd.svc) rangeRing(sel.x+sd.w/2,sel.y+sd.h/2,sd.r,t);
  if(sd&&sd.noise) rangeRing(sel.x+sd.w/2,sel.y+sd.h/2,sd.noise[1],t);
  drawAgents(t);
  const list=tallList(vb);
  list.forEach(o=>drawObj(o,t));
  drawParts();
  // status bubbles: no road, unhappy, or short of staff
  if(cam.z>20&&S.st!=='home') list.forEach(o=>{ const d=IT[o.k]; if(!(d.cap||d.jobs||d.svc)) return; if(S.t-(o.born||-9)<1) return;
    const kind=!o.conn?'road':d.cap&&o.pop>0&&o.hap<35?'sad':d.jobs&&ST.fill<.5?'staff':null;
    if(kind) bubble(o.x+d.w/2,o.y-(TALL[o.k]||.6)-.25,kind,t); });
  if(sel){ const w=sd.w,h=sd.h,top=sd.flat||sel.k==='hedge'?0:TALL[sel.k]||.6, k=RM?0:Math.sin(t*5)*.03;
    P(); X.roundRect?X.roundRect(sel.x-.08-k,sel.y-top-.08-k,w+.16+k*2,h+top+.16+k*2,.15):rect(sel.x-.08,sel.y-top-.08,w+.16,h+top+.16);
    X.setLineDash([ln(5),ln(4)]); X.lineWidth=ln(2); X.strokeStyle='#000'; X.stroke(); X.setLineDash([]); }
  if(S.st==='play') drawGhost(t);
  drawFloats();
  if(S.st==='play') drawCostTag();
}
