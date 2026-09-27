/* Ink Town: Canvas, ink patterns and the camera. The map is seen from above, with buildings leaning up the screen
   so you see their fronts, like a drawing on a planner's desk. */
"use strict";
const cv=document.getElementById('c'), ctx=cv.getContext('2d');
let W=0,Hh=0,DPR=1;
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
// x,y: the world point in the middle of the view; z: pixels per tile
const cam={x:N/2,y:N/2,z:46,tz:46,vx:0,vy:0};
const ZMIN=18, ZMAX=110;
let PAT={};
const INK=2, PZ=48; // patterns are drawn at PZ pixels per tile and stay stuck to the ground

function tile(w,h,draw,bg){
  const c=document.createElement('canvas'); c.width=Math.round(w*DPR); c.height=Math.round(h*DPR);
  const g=c.getContext('2d'); g.scale(DPR,DPR); if(bg!==null){ g.fillStyle=bg||'#fff'; g.fillRect(0,0,w,h); }
  g.strokeStyle='#000'; g.fillStyle='#000'; g.lineCap='round'; g.lineJoin='round'; draw(g);
  const p=ctx.createPattern(c,'repeat'); if(p.setTransform) p.setTransform(new DOMMatrix([1/(DPR*PZ),0,0,1/(DPR*PZ),0,0])); return p;
}
function makePatterns(){
  // meadow: little ink tufts, sparse enough to read as open paper
  PAT.grass=tile(144,144,g=>{ const r=seeded(11); g.lineWidth=1.1; g.globalAlpha=.32;
    for(let i=0;i<9;i++){ const x=8+r()*128,y=8+r()*128,s=2.2+r()*1.2; g.beginPath(); g.moveTo(x-s,y+s*.7); g.lineTo(x-s*.2,y-s); g.moveTo(x+s*.2,y-s*.9); g.lineTo(x+s,y+s*.7); g.stroke(); } });
  // water: short wavy strokes
  PAT.water=tile(48,32,g=>{ g.lineWidth=1.3; g.globalAlpha=.55;
    [[6,8],[28,22]].forEach(([x,y])=>{ g.beginPath(); g.moveTo(x,y); g.quadraticCurveTo(x+3,y-3,x+6,y); g.quadraticCurveTo(x+9,y+3,x+12,y); g.stroke(); }); });
  PAT.hatch=tile(8,8,g=>{ g.lineWidth=1; g.globalAlpha=.55; g.beginPath(); g.moveTo(-2,10); g.lineTo(10,-2); g.moveTo(-2,2); g.lineTo(2,-2); g.moveTo(6,10); g.lineTo(10,6); g.stroke(); },null);
  PAT.hatchW=tile(8,8,g=>{ g.lineWidth=1; g.globalAlpha=.55; g.beginPath(); g.moveTo(-2,10); g.lineTo(10,-2); g.moveTo(-2,2); g.lineTo(2,-2); g.moveTo(6,10); g.lineTo(10,6); g.stroke(); });
  PAT.dense=tile(5,5,g=>{ g.lineWidth=1; g.globalAlpha=.8; g.beginPath(); g.moveTo(-1,6); g.lineTo(6,-1); g.moveTo(-1,1); g.lineTo(1,-1); g.moveTo(4,6); g.lineTo(6,4); g.stroke(); });
  PAT.roof=tile(10,6,g=>{ g.lineWidth=1; g.globalAlpha=.5; g.beginPath(); g.moveTo(0,5.5); g.lineTo(10,5.5); g.stroke(); });
  PAT.dots=tile(12,12,g=>{ g.globalAlpha=.5; [[3,3],[9,9]].forEach(([x,y])=>{ g.beginPath(); g.arc(x,y,.9,0,TAU); g.fill(); }); });
  PAT.soil=tile(10,10,g=>{ const r=seeded(4); g.globalAlpha=.55; for(let i=0;i<5;i++){ g.beginPath(); g.arc(1+r()*8,1+r()*8,.7,0,TAU); g.fill(); } });
  PAT.gravel=tile(14,14,g=>{ const r=seeded(5); g.globalAlpha=.4; for(let i=0;i<4;i++){ g.beginPath(); g.arc(2+r()*10,2+r()*10,.7,0,TAU); g.fill(); } });
  PAT.lawn=tile(24,24,g=>{ g.lineWidth=1; g.globalAlpha=.25; g.beginPath(); g.moveTo(0,6); g.lineTo(24,6); g.moveTo(0,18); g.lineTo(24,18); g.stroke(); });
}
function resize(){
  DPR=Math.min(2,window.devicePixelRatio||1); W=innerWidth; Hh=innerHeight;
  cv.width=Math.round(W*DPR); cv.height=Math.round(Hh*DPR);
  makePatterns(); clampCam();
}
function clampCam(){ cam.x=clamp(cam.x,0,N); cam.y=clamp(cam.y,-1,N+1); }
// draw in world tiles from here on; line widths must be divided by cam.z to stay the same on screen
function worldTransform(){ const s=cam.z*DPR; ctx.setTransform(s,0,0,s,DPR*(W/2-cam.x*cam.z),DPR*(Hh/2-cam.y*cam.z)); }
function screenTransform(){ ctx.setTransform(DPR,0,0,DPR,0,0); }
const toWorld=(sx,sy)=>({x:(sx-W/2)/cam.z+cam.x,y:(sy-Hh/2)/cam.z+cam.y});
const toScreen=(wx,wy)=>({x:(wx-cam.x)*cam.z+W/2,y:(wy-cam.y)*cam.z+Hh/2});
// the tiles on screen, with a margin for tall buildings that lean up into view
function viewBox(){ const a=toWorld(0,0), b=toWorld(W,Hh); return {x0:Math.max(0,Math.floor(a.x)-1),y0:Math.max(0,Math.floor(a.y)-1),x1:Math.min(N-1,Math.ceil(b.x)),y1:Math.min(N-1,Math.ceil(b.y)+3)}; }
// zoom about a point on the screen, keeping that point still under the finger
function zoomAt(sx,sy,z){ const before=toWorld(sx,sy); cam.z=clamp(z,ZMIN,ZMAX); const after=toWorld(sx,sy); cam.x+=before.x-after.x; cam.y+=before.y-after.y; clampCam(); }
