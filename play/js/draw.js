/* Ink Town: Drawing the map, the roads and water, and every building, tree and garden, in ink.
   Everything is drawn in world tiles. X is the canvas being drawn on (the map, or a little icon), and LW is one ink
   line's width in tiles, so lines look the same at any zoom. */
"use strict";
let X=ctx, LW=INK/46;
const ln=k=>LW*(k||1);
function P(){ X.beginPath(); }
function ink(fill,w){ if(fill){ X.fillStyle=fill; X.fill(); } X.lineWidth=ln(w); X.strokeStyle='#000'; X.stroke(); }
function rect(x,y,w,h){ X.rect(x,y,w,h); }
function poly(pts){ pts.forEach(([x,y],i)=>i?X.lineTo(x,y):X.moveTo(x,y)); X.closePath(); }
function circ(x,y,r){ X.moveTo(x+r,y); X.arc(x,y,r,0,TAU); }
function line(x1,y1,x2,y2,w){ P(); X.moveTo(x1,y1); X.lineTo(x2,y2); X.lineWidth=ln(w); X.strokeStyle='#000'; X.stroke(); }

/* ---------- building blocks ---------- */
// a hatched shadow cast down and to the right by a box of height H
function shadow(x,y,w,d,H){ const sx=H*.55, sy=H*.18; P(); poly([[x+w,y+d*.1],[x+w+sx,y+d*.1+sy],[x+w+sx,y+d+sy],[x+sx,y+d+sy],[x,y+d]]); X.fillStyle=PAT.hatch; X.fill(); }
/* a box: footprint x..x+w, y..y+d, front wall H tall. The roof is the footprint lifted up the screen by H.
   roof: flat, gable (ridge left to right), front (gable end faces you), saw, glass */
function box(x,y,w,d,H,roof,peak){
  peak=peak||0; const ry=y-H, fy=y+d-H;
  shadow(x,y,w,d,H+peak*.6);
  // front wall
  P(); rect(x,fy,w,H); ink('#fff');
  if(roof==='front'){
    const cx=x+w/2;
    P(); poly([[x,ry],[cx,ry-peak],[cx,fy-peak],[x,fy]]); ink('#fff');
    P(); poly([[cx,ry-peak],[x+w,ry],[x+w,fy],[cx,fy-peak]]); ink(PAT.roof);
    P(); poly([[x,fy],[cx,fy-peak],[x+w,fy],[x+w,fy+ln(1)],[x,fy+ln(1)]]); ink('#fff');
    return;
  }
  const o=.04; // eaves hang over the walls a touch
  P(); rect(x-o,ry,w+o*2,d); ink('#fff');
  if(roof==='gable'){ P(); rect(x-o,ry+d/2,w+o*2,d/2); ink(PAT.roof); }
  else if(roof==='flat'){ P(); rect(x+.05,ry+.05,w-.1,d-.1); X.lineWidth=ln(.6); X.stroke(); }
  else if(roof==='saw'){ const n=Math.max(2,Math.round(w*3)); P(); for(let i=0;i<n;i++){ const a=x+w*i/n, b=x+w*(i+1)/n; X.moveTo(a,ry+d); X.lineTo(a,ry+.02); X.lineTo(b,ry+d); } X.lineWidth=ln(); X.stroke();
    P(); for(let i=0;i<n;i++){ const a=x+w*i/n, b=x+w*(i+1)/n; poly([[a,ry+.02],[a+(b-a)*.35,ry+d*.35],[a,ry+d*.35]]); } X.fillStyle='#000'; X.fill(); }
  else if(roof==='glass'){ P(); for(let i=1;i<w*4;i++){ X.moveTo(x+i/4,ry); X.lineTo(x+i/4,ry+d); } X.lineWidth=ln(.5); X.stroke(); line(x,ry+d/2,x+w,ry+d/2,.8); }
}
function windows(x,y,w,H,cols,rows,opt){
  opt=opt||{}; const fy=y-H, ww=w/cols*.42, wh=H/(rows+.6)*.5;
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
    if(opt.door&&r===rows-1&&c===Math.floor(cols/2)) continue;
    const wx=x+w*(c+.5)/cols-ww/2, wy=fy+H*(r+.35)/(rows+.3);
    P(); rect(wx,wy,ww,wh); ink(opt.dark&&(r+c+opt.dark)%3===0?'#000':'#fff',.7);
    if(!opt.plain){ line(wx+ww/2,wy,wx+ww/2,wy+wh,.5); }
  }
}
function door(cx,by,w,h,fill){ P(); rect(cx-w/2,by-h,w,h); ink(fill||'#000',.8); }
function awning(x,y,w,h,n,scallop){ // a striped shop awning hanging off the front wall
  const s=w/n; for(let i=0;i<n;i++){ P(); poly([[x+s*i,y],[x+s*(i+1),y],[x+s*(i+1)+.02,y+h],[x+s*i-.02,y+h]]); ink(i%2?'#fff':'#000',.7); }
  if(scallop){ P(); for(let i=0;i<n;i++){ X.moveTo(x+s*i,y+h); X.arc(x+s*(i+.5),y+h,s/2,Math.PI,0,true); } ink('#fff',.7); }
}
function chimney(x,y,h){ P(); rect(x,y-h,.09,h); ink('#fff',.8); P(); rect(x-.015,y-h,.12,.04); ink('#000',.6); }
function scallop(cx,cy,r,n,fill,rot){ P(); for(let k=0;k<=n*2;k++){ const a=k/(n*2)*TAU+(rot||0), rr=r*(k%2?.8:1); k?X.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr):X.moveTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr); } X.closePath(); ink(fill||'#fff'); }
function treeAt(cx,cy,s,t,v){
  const sway=RM?0:Math.sin(t*1.3+v*1.7)*.018*s;
  P(); X.ellipse(cx+.12*s,cy+.02,.3*s,.12*s,0,0,TAU); X.fillStyle=PAT.hatch; X.fill();
  line(cx,cy,cx+sway*.5,cy-.28*s,1.2);
  scallop(cx+sway,cy-.46*s,.3*s,7,'#fff',v);
  P(); X.arc(cx+sway+.08*s,cy-.4*s,.14*s,-.2,1.6); X.lineWidth=ln(.6); X.stroke();
}
function pineAt(cx,cy,s,t,v){
  const sway=RM?0:Math.sin(t*1.1+v*2.3)*.015*s;
  P(); X.ellipse(cx+.12*s,cy+.02,.26*s,.1*s,0,0,TAU); X.fillStyle=PAT.hatch; X.fill();
  line(cx,cy,cx,cy-.15*s,1.2);
  for(let k=0;k<3;k++){ const by=cy-.12*s-k*.2*s, hw=(.3-k*.07)*s;
    P(); poly([[cx-hw+sway*k*.4,by],[cx+sway*(k+1)*.5,by-.34*s],[cx+hw+sway*k*.4,by]]); ink('#fff');
    P(); poly([[cx+sway*(k+1)*.5,by-.34*s],[cx+hw+sway*k*.4,by],[cx+sway*k*.4+.02,by]]); X.fillStyle=PAT.hatch; X.fill(); }
}
function person(x,y,s,fill){ P(); X.ellipse(x,y-.06*s,.045*s,.07*s,0,0,TAU); ink(fill||'#fff',.7); P(); circ(x,y-.16*s,.04*s); ink('#fff',.7); }

/* ---------- every item, drawn with its footprint's top-left at x,y ---------- */
const DRAW={
  cottage(x,y,t,o){ const v=o?o.v:0; box(x+.14,y+.3,.72,.52,.34,'front',.24); door(x+.5,y+.82,.13,.2); windows(x+.14,y+.82,.72,.34,2,1,{door:1,plain:1}); chimney(x+.66,y+.3-.34+.04,.18); if(v%2) { P(); circ(x+.9,y+.9,.06); ink('#fff',.6); } },
  townhouse(x,y){ box(x+.18,y+.3,.64,.5,.72,'gable'); windows(x+.18,y+.8,.64,.72,2,3,{door:1}); door(x+.5,y+.8,.13,.2); chimney(x+.26,y+.3-.72+.08,.16); P(); rect(x+.4,y+.8,.2,.05); ink('#fff',.6); },
  apartments(x,y){ box(x+.15,y+.4,1.7,1.2,1.15,'flat'); windows(x+.15,y+1.6,1.7,1.15,5,4,{door:1,dark:1}); door(x+1,y+1.6,.24,.22);
    P(); X.ellipse(x+.5,y+.4-1.15+.35,.16,.1,0,0,TAU); ink('#fff'); line(x+.34,y-.4,x+.34,y-.34,.8); P(); rect(x+1.2,y-.63,.36,.2); ink(PAT.hatchW,.8); },
  tower(x,y){ box(x+.25,y+.45,1.5,1.1,2.1,'flat'); windows(x+.25,y+1.55,1.5,2.1,4,8,{door:1,dark:2}); door(x+1,y+1.55,.24,.2);
    P(); rect(x+.65,y+.45-2.1+.18,.7,.5); ink('#fff'); line(x+1,y-1.47,x+1,y-2.05,1); P(); circ(x+1,y-2.07,.035); ink('#000',.6); },
  shop(x,y){ box(x+.12,y+.32,.76,.5,.44,'flat'); P(); rect(x+.2,y+.82-.26,.42,.2); ink('#fff',.7); door(x+.74,y+.82,.12,.24,'#fff'); awning(x+.12,y+.82-.44+.02,.76,.14,6);
    P(); rect(x+.3,y+.32-.44-.06,.4,.1); ink('#fff',.7); line(x+.36,y-.17,x+.64,y-.17,.6); },
  cafe(x,y,t){ box(x+.14,y+.2,.72,.46,.42,'gable'); P(); rect(x+.2,y+.66-.24,.3,.18); ink('#fff',.7); door(x+.66,y+.66,.12,.22,'#fff'); awning(x+.14,y+.66-.42+.02,.72,.1,5,1);
    [[.3,.86],[.7,.88]].forEach(([a,b])=>{ P(); circ(x+a,y+b,.07); ink('#fff',.6); P(); X.moveTo(x+a,y+b-.05); X.arc(x+a,y+b-.05,.12,Math.PI,0); X.closePath(); ink('#fff',.7); line(x+a,y+b-.17,x+a,y+b-.05,.5); }); },
  market(x,y){ P(); rect(x+.1,y+.1,1.8,1.8); ink(PAT.gravel,.6);
    [[.15,.25],[1.05,.25],[.15,1.1],[1.05,1.1]].forEach(([a,b],i)=>{ const sx=x+a, sy=y+b; box(sx,sy+.3,.8,.35,.22,'flat');
      P(); poly([[sx-.04,sy+.3-.22-.02],[sx+.84,sy+.3-.22-.02],[sx+.84,sy+.1],[sx-.04,sy+.1]]); ink('#fff',.8); awning(sx-.04,sy+.1-.02,.88,.12,6);
      P(); circ(sx+.2,sy+.78,.06); circ(sx+.35,sy+.8,.06); ink(i%2?'#fff':PAT.dense,.6); }); },
  arcade(x,y){ box(x+.12,y+.45,1.76,1.25,.62,'flat'); const ry=y+.45-.62;
    for(let i=0;i<3;i++){ P(); X.ellipse(x+1,ry+.2+i*.4,.8,.14,0,Math.PI,0); ink('#fff',.8); }
    for(let i=0;i<5;i++){ P(); rect(x+.2+i*.33,y+1.7-.42,.18,.3); ink(i===2?'#000':'#fff',.7); } awning(x+.12,y+1.7-.62+.02,1.76,.12,12); },
  workshop(x,y){ box(x+.12,y+.28,.76,.52,.42,'saw'); P(); rect(x+.22,y+.8-.3,.34,.3); ink(PAT.hatchW,.8); for(let i=1;i<4;i++) line(x+.22,y+.8-.3+i*.075,x+.56,y+.8-.3+i*.075,.4);
    P(); rect(x+.66,y+.8-.26,.14,.14); ink('#fff',.6); P(); rect(x+.78,y+.86,.12,.1); ink('#fff',.6); },
  greenhouse(x,y){ P(); rect(x+.15,y+.2,1.7,1.6); ink(PAT.soil,.5); const H=.45;
    shadow(x+.2,y+.4,1.6,1.3,H*.6); P(); rect(x+.2,y+1.7-H,1.6,H); X.fillStyle='rgba(255,255,255,.75)'; X.fill(); X.lineWidth=ln(); X.stroke();
    P(); rect(x+.2,y+.4-H,1.6,1.3); X.fillStyle='rgba(255,255,255,.7)'; X.fill(); X.lineWidth=ln(); X.stroke();
    for(let i=1;i<8;i++) line(x+.2+i*.2,y+.4-H,x+.2+i*.2,y+1.7,.45); line(x+.2,y+1.05-H,x+1.8,y+1.05-H,.8);
    for(let i=0;i<7;i++) for(let j=0;j<3;j++){ P(); circ(x+.32+i*.23,y+.62-H+j*.38,.06); ink('#fff',.5); } door(x+1,y+1.7,.2,.3,'#fff'); },
  factory(x,y){ box(x+.1,y+.5,1.5,1.2,.62,'saw'); P(); rect(x+.3,y+1.7-.34,.5,.34); ink(PAT.hatchW,.8); windows(x+.9,y+1.7,.7,.62,2,1,{plain:1});
    shadow(x+1.62,y+.3,.22,.22,1.3); P(); rect(x+1.62,y+.52-1.3,.22,1.3); ink('#fff'); P(); X.ellipse(x+1.73,y+.52-1.3,.11,.05,0,0,TAU); ink('#000',.6); line(x+1.62,y+.52-1.1,x+1.84,y+.52-1.1,.8); line(x+1.62,y+.52-1.03,x+1.84,y+.52-1.03,.8); },
  office(x,y){ box(x+.16,y+.34,.68,.48,1.12,'flat'); windows(x+.16,y+.82,.68,1.12,3,5,{door:1,dark:1,plain:1}); door(x+.5,y+.82,.14,.18); P(); rect(x+.3,y+.34-1.12+.1,.3,.2); ink('#fff',.7); },
  studio(x,y){ box(x+.15,y+.45,1.7,1.15,1.2,'flat'); const fy=y+1.6-1.2;
    for(let i=0;i<4;i++){ P(); rect(x+.15,fy+.1+i*.27,1.7,.13); ink(i%2?'#000':PAT.dense,.6); } door(x+1,y+1.6,.3,.2,'#fff');
    P(); X.ellipse(x+.6,y+.45-1.2+.5,.24,.18,0,0,TAU); ink(PAT.lawn,.8); treeAt(x+.6,y+.45-1.2+.55,.5,0,1); },
  hall(x,y,t){ box(x+.1,y+.45,1.8,1.2,.72,'gable'); const fy=y+1.65-.72;
    P(); poly([[x+.55,fy],[x+1,fy-.28],[x+1.45,fy]]); ink('#fff');
    for(let i=0;i<5;i++){ P(); rect(x+.6+i*.19,fy+.04,.06,.62); ink('#fff',.6); }
    door(x+1,y+1.65,.16,.3); P(); rect(x+.45,y+1.65,1.1,.08); ink('#fff',.7); P(); rect(x+.52,y+1.73,.96,.08); ink('#fff',.7);
    windows(x+.1,y+1.65,.45,.72,1,2,{}); windows(x+1.45,y+1.65,.45,.72,1,2,{});
    // the clock tower
    const tx=x+.78, ty=y+.45-.72; box(tx,ty+.05,.44,.3,.52,'front',.3); P(); circ(tx+.22,ty+.05+.3-.3,.11); ink('#fff',.8);
    const a=(t||0)*.4; line(tx+.22,ty+.05,tx+.22+Math.cos(a)*.07,ty+.05+Math.sin(a)*.07,.7); line(tx+.22,ty+.05,tx+.22,ty-.03,.7);
    line(tx+.22,ty-.77,tx+.22,ty-1.05,.9); const fl=RM?0:Math.sin((t||0)*4)*.03; P(); poly([[tx+.22,ty-1.05],[tx+.46,ty-.99+fl],[tx+.22,ty-.92]]); ink('#000',.6); },
  school(x,y){ P(); rect(x+.12,y+1.1,1.76,.78); ink(PAT.gravel,.6);
    for(let i=0;i<4;i++){ P(); rect(x+.3+i*.16,y+1.45,.14,.14); ink('#fff',.5); } P(); circ(x+1.5,y+1.5,.14); X.lineWidth=ln(.6); X.stroke();
    box(x+.12,y+.35,1.76,.7,.55,'gable'); windows(x+.12,y+1.05,1.76,.55,6,1,{door:1}); door(x+1,y+1.05,.18,.26);
    const bx=x+.9, by=y+.35-.55+.36; box(bx,by,.2,.14,.22,'front',.14); P(); circ(bx+.1,by-.08,.045); ink('#000',.6); },
  clinic(x,y){ box(x+.14,y+.3,.72,.5,.46,'flat'); windows(x+.14,y+.8,.72,.46,3,1,{door:1}); door(x+.5,y+.8,.15,.24,'#fff');
    const cx=x+.5, cy=y+.3-.46+.25; P(); circ(cx,cy,.16); ink('#000',.6); P(); rect(cx-.1,cy-.035,.2,.07); rect(cx-.035,cy-.1,.07,.2); X.fillStyle='#fff'; X.fill(); },
  fire(x,y,t){ box(x+.1,y+.3,.6,.52,.5,'flat'); P(); X.moveTo(x+.18,y+.82); X.lineTo(x+.18,y+.82-.24); X.arc(x+.4,y+.82-.24,.22,Math.PI,0); X.lineTo(x+.62,y+.82); X.closePath(); ink(PAT.hatchW,.8);
    box(x+.7,y+.32,.2,.5,.78,'front',.12); P(); circ(x+.8,y+.82-.62,.05); ink('#000',.6); P(); rect(x+.2,y+.3-.5+.12,.4,.1); ink('#000',.6); },
  library(x,y){ box(x+.12,y+.36,.76,.46,.46,'flat'); const fy=y+.82-.46; for(let i=0;i<4;i++){ P(); rect(x+.2+i*.18,fy+.05,.05,.41); ink('#fff',.6); } P(); poly([[x+.12,fy],[x+.5,fy-.16],[x+.88,fy]]); ink('#fff',.8);
    P(); X.arc(x+.5,y+.36-.46+.18,.18,Math.PI,0); X.closePath(); ink(PAT.roof); },
  police(x,y){ box(x+.14,y+.32,.72,.5,.46,'flat'); windows(x+.14,y+.82,.72,.46,3,1,{door:1}); door(x+.5,y+.82,.14,.22);
    const cx=x+.5, cy=y+.32-.46+.24; P(); for(let k=0;k<10;k++){ const a=-Math.PI/2+k*Math.PI/5, r=k%2?.07:.16; k?X.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r):X.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r); } X.closePath(); ink('#000',.6);
    line(x+.8,y+.82,x+.8,y+.82-.62,.8); P(); circ(x+.8,y+.82-.66,.05); ink('#fff',.7); },
  tree(x,y,t,o){ const v=o?o.v:0; treeAt(x+.5+(v-2)*.04,y+.8,1,t,v); },
  wild(x,y,t,o){ const v=o?o.v:0; if(v%3===0) treeAt(x+.5,y+.85,1.1,t,v); else pineAt(x+.5+(v-2)*.05,y+.85,1.1,t,v); },
  bench(x,y){ P(); rect(x+.25,y+.52,.5,.1); ink('#fff',.8); P(); rect(x+.25,y+.62,.5,.08); ink('#000',.6); line(x+.3,y+.7,x+.3,y+.78,.8); line(x+.7,y+.7,x+.7,y+.78,.8); },
  park(x,y,t,o){ P(); X.roundRect?X.roundRect(x+.08,y+.08,1.84,1.84,.3):rect(x+.08,y+.08,1.84,1.84); ink(PAT.lawn,.8);
    P(); X.ellipse(x+1,y+1.05,.6,.45,0,0,TAU); X.lineWidth=.13; X.strokeStyle='#000'; X.stroke(); P(); X.ellipse(x+1,y+1.05,.6,.45,0,0,TAU); X.lineWidth=.13-ln(1.6); X.strokeStyle='#fff'; X.stroke();
    P(); X.ellipse(x+1,y+1.05,.18,.12,0,0,TAU); ink(PAT.soil,.7);
    DRAW.bench(x+.5,y+1.1); treeAt(x+.35,y+.55,.9,t,1); treeAt(x+1.6,y+.7,.8,t,2); treeAt(x+1.55,y+1.75,.85,t,3); treeAt(x+.4,y+1.8,.7,t,4); },
  fountain(x,y,t){ const cx=x+.5, cy=y+.6; P(); X.ellipse(cx,cy,.4,.26,0,0,TAU); ink('#fff'); P(); X.ellipse(cx,cy,.32,.19,0,0,TAU); ink(PAT.water,.6);
    P(); rect(cx-.04,cy-.3,.08,.3); ink('#fff',.7);
    const k=RM?0:t*3; P(); for(let i=0;i<6;i++){ const a=i/6*TAU+k*.2, u=((k+i*.37)%1); const px=cx+Math.cos(a)*.26*u, py=cy-.32+Math.pow(u*2-1,2)*.3-.02+Math.sin(a)*.08*u; circ(px,py,.022); } X.fillStyle='#000'; X.fill(); },
  statue(x,y){ box(x+.3,y+.5,.4,.3,.3,'flat'); const cx=x+.5, by=y+.5-.3+.1;
    P(); poly([[cx-.08,by],[cx-.05,by-.3],[cx+.05,by-.3],[cx+.08,by]]); ink('#000',.6); P(); circ(cx,by-.37,.06); ink('#000',.6); line(cx+.05,by-.28,cx+.16,by-.42,1.4); },
  bandstand(x,y,t){ P(); X.ellipse(x+1,y+1.2,.85,.6,0,0,TAU); ink(PAT.gravel);
    const cx=x+1, cy=y+1.25, H=.55; shadow(x+.3,y+.8,1.4,.8,.6); P(); X.ellipse(cx,cy,.7,.42,0,0,TAU); ink('#fff');
    for(let i=0;i<7;i++){ const a=Math.PI*(i/6); line(cx-Math.cos(a)*.62,cy+Math.sin(a)*.3,cx-Math.cos(a)*.62,cy+Math.sin(a)*.3-H,.9); }
    P(); X.ellipse(cx,cy-H,.78,.44,0,0,TAU); ink('#fff'); P(); poly([[cx-.78,cy-H],[cx,cy-H-.5],[cx+.78,cy-H]]); ink(PAT.roof); P(); X.ellipse(cx,cy-H,.78,.1,0,0,Math.PI); ink('#fff',.8); line(cx,cy-H-.5,cx,cy-H-.66,.8); },
  road(){}, path(){}, flowers(){}, hedge(){}, pond(){}, clear(){}
};
// how tall each item stands, for placing status bubbles above it
const TALL={cottage:.7,townhouse:.8,apartments:1.3,tower:2.3,shop:.6,cafe:.6,market:.4,arcade:.8,workshop:.6,greenhouse:.5,factory:.8,office:1.2,studio:1.3,hall:1.8,school:.8,clinic:.7,fire:.9,library:.7,police:.8};

/* ---------- ground layers ---------- */
function flowerTile(x,y,L,R,U,D){
  const x0=x+(L?0:.08), x1=x+1-(R?0:.08), y0=y+(U?0:.08), y1=y+1-(D?0:.08);
  P(); rect(x0,y0,x1-x0,y1-y0); X.fillStyle=PAT.soil; X.fill();
  P(); if(!L){X.moveTo(x0,y0);X.lineTo(x0,y1);} if(!R){X.moveTo(x1,y0);X.lineTo(x1,y1);} if(!U){X.moveTo(x0,y0);X.lineTo(x1,y0);} if(!D){X.moveTo(x0,y1);X.lineTo(x1,y1);} X.lineWidth=ln(); X.strokeStyle='#000'; X.stroke();
  const r=seeded(Math.abs(x*31+y*17)+1); for(let i=0;i<4;i++){ const fx=x+.2+r()*.6, fy=y+.2+r()*.6, s=.07+r()*.03; P(); for(let k=0;k<5;k++){ const a=k/5*TAU; circ(fx+Math.cos(a)*s*.7,fy+Math.sin(a)*s*.7,s*.5); } ink('#fff',.55); P(); circ(fx,fy,s*.3); X.fillStyle='#000'; X.fill(); }
}
function waterShape(tiles,e){
  P(); tiles.forEach(([x,y])=>{ const cx=x+.5, cy=y+.5; circ(cx,cy,.6+e);
    NB.forEach(([dx,dy])=>{ if(isWater(x+dx,y+dy)){ if(dx) rect(Math.min(cx,cx+dx),y-e,1,1+e*2); else rect(x-e,Math.min(cy,cy+dy),1+e*2,1); } }); });
}
function drawWater(vb){
  const tiles=[]; for(let y=vb.y0-1;y<=vb.y1;y++) for(let x=vb.x0-1;x<=vb.x1+1;x++) if(isWater(x,y)) tiles.push([x,y]);
  if(!tiles.length) return;
  waterShape(tiles,ln(1.6)); X.fillStyle='#000'; X.fill();
  waterShape(tiles,0); X.fillStyle=PAT.water; X.fill();
  // reeds on pond edges
  tiles.forEach(([x,y])=>{ if(T.ground[idx(x,y)]!==POND||((x*3+y*5)%4)) return; for(let k=0;k<3;k++) line(x+.2+k*.08,y+.95,x+.18+k*.1,y+.72-k*.04,.7); });
}
// roads and paths are drawn as one network: thick ink lines between neighbouring tiles, then paper on top
function netSegs(vb,k,also){
  const segs=[], dots=[];
  for(let y=vb.y0-1;y<=vb.y1+1;y++) for(let x=vb.x0-1;x<=vb.x1+1;x++){ const o=objAt(x,y); if(!o||o.k!==k) continue;
    let n=0; NB.forEach(([dx,dy])=>{ const p=objAt(x+dx,y+dy); if(p&&(p.k===k||also&&also.includes(p.k))){ n++; segs.push([x+.5,y+.5,x+.5+dx*.5,y+.5+dy*.5]); } });
    dots.push([x+.5,y+.5,n]); }
  return {segs,dots};
}
function strokeNet(net,w,style,cap){ P(); net.segs.forEach(s=>{ X.moveTo(s[0],s[1]); X.lineTo(s[2],s[3]); }); net.dots.forEach(d=>{ X.moveTo(d[0],d[1]); X.lineTo(d[0]+.0001,d[1]); });
  X.lineCap=cap||'round'; X.lineJoin='round'; X.lineWidth=w; X.strokeStyle=style; X.stroke(); X.lineCap='butt'; }
function drawNets(vb){
  // bridges first: a deck with rails where roads or paths cross water
  for(let y=vb.y0;y<=vb.y1;y++) for(let x=vb.x0;x<=vb.x1;x++){ const o=objAt(x,y); if(!o||!(o.k==='road'||o.k==='path')||!isWater(x,y)) continue;
    const L=objAt(x-1,y), R=objAt(x+1,y), hz=(L&&L.k===o.k)||(R&&R.k===o.k), wd=o.k==='road'?.58:.34;
    P(); if(hz) rect(x-.02,y+.5-wd,1.04,wd*2); else rect(x+.5-wd,y-.02,wd*2,1.04); X.fillStyle=PAT.hatch; X.fill();
    P(); if(hz) rect(x-.02,y+.5-wd-.05,1.04,wd*2); else rect(x+.5-wd,y-.05-.02,wd*2,1.04); ink('#fff'); }
  const path=netSegs(vb,'path',['road']), road=netSegs(vb,'road');
  strokeNet(path,.34+ln(3),'#000'); strokeNet(path,.34,PAT.gravel);
  strokeNet(road,.8+ln(3),'#000'); strokeNet(road,.8,'#fff');
  // railings along the sides of bridges
  for(let y=vb.y0;y<=vb.y1;y++) for(let x=vb.x0;x<=vb.x1;x++){ const o=objAt(x,y); if(!o||!(o.k==='road'||o.k==='path')||!isWater(x,y)) continue;
    const L=objAt(x-1,y), R=objAt(x+1,y), hz=(L&&L.k===o.k)||(R&&R.k===o.k), wd=o.k==='road'?.58:.34;
    P(); for(const sd of [-1,1]){ if(hz){ X.moveTo(x,y+.5+sd*wd); X.lineTo(x+1,y+.5+sd*wd); for(let k=0;k<3;k++){ X.moveTo(x+.17+k*.33,y+.5+sd*wd); X.lineTo(x+.17+k*.33,y+.5+sd*(wd-.16)); } }
      else { X.moveTo(x+.5+sd*wd,y); X.lineTo(x+.5+sd*wd,y+1); for(let k=0;k<3;k++){ X.moveTo(x+.5+sd*wd,y+.17+k*.33); X.lineTo(x+.5+sd*(wd-.16),y+.17+k*.33); } } }
    X.lineWidth=ln(1.3); X.strokeStyle='#000'; X.stroke(); }
  // a dashed centre line on straight stretches
  P(); road.dots.forEach(([x,y,n])=>{ const l=objAt(x-.5-1,y-.5), r=objAt(x+.5,y-.5), u=objAt(x-.5,y-1.5), d=objAt(x-.5,y+.5);
    const h=(l&&l.k==='road')+(r&&r.k==='road'), v=(u&&u.k==='road')+(d&&d.k==='road');
    if(n===2&&h===2){ X.moveTo(x-.18,y); X.lineTo(x+.18,y); } else if(n===2&&v===2){ X.moveTo(x,y-.18); X.lineTo(x,y+.18); } });
  X.lineWidth=ln(1); X.strokeStyle='rgba(0,0,0,.55)'; X.stroke();
}
function drawFlat(vb,t){
  for(let y=vb.y0;y<=vb.y1;y++) for(let x=vb.x0;x<=vb.x1;x++){ const o=objAt(x,y); if(!o) continue;
    if(o.k==='flowers'){ const f=(dx,dy)=>objAt(x+dx,y+dy)?.k==='flowers'; flowerTile(x,y,f(-1,0),f(1,0),f(0,-1),f(0,1)); }
  }
  // hedges: a chain of clipped bushes along the hedge line, with a hatched shadow
  const hedge=netSegs(vb,'hedge'), blobs=[];
  hedge.dots.forEach(([x,y])=>blobs.push([x,y,.23]));
  hedge.segs.forEach(([x1,y1,x2,y2])=>{ [.5,1].forEach(u=>blobs.push([x1+(x2-x1)*u,y1+(y2-y1)*u,.21+((x1*7+y1*3+u*4)%3)*.015])); });
  if(blobs.length){
    P(); blobs.forEach(([x,y,r])=>circ(x+.07,y+.06,r)); X.fillStyle=PAT.hatch; X.fill();
    P(); blobs.forEach(([x,y,r])=>circ(x,y-.04,r+ln(1.2))); X.fillStyle='#000'; X.fill();
    P(); blobs.forEach(([x,y,r])=>circ(x,y-.04,r)); X.fillStyle=PAT.hatchW; X.fill();
    P(); blobs.forEach(([x,y,r],i)=>{ if(i%2) return; circ(x+r*.3,y+r*.1-.04,r*.09); circ(x-r*.25,y+r*.3-.04,r*.07); }); X.fillStyle='#000'; X.fill(); }
}
