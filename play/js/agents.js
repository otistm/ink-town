/* Ink Town: Game state S, and the little lives on the map: cars on the roads, people strolling the paths and
   pavements, dust when things are built or knocked down, smoke from factories, and floating money. */
"use strict";
const S={t:0,st:'boot',speed:1,stepAcc:0,cat:null,tool:null,sel:null,ghost:null,drag:null,parts:[],cars:[],folk:[],floats:[],smokeT:0,spawnT:0};
const SPEEDS=[0,1,2,4];

/* ---------- particles ---------- */
function puff(x,y,n,size){ if(RM) n=Math.ceil(n/3);
  for(let i=0;i<n;i++){ const a=Math.random()*TAU, v=.3+Math.random()*.9;
    S.parts.push({k:'dust',x:x+(Math.random()-.5)*.6,y:y+(Math.random()-.5)*.4,vx:Math.cos(a)*v,vy:Math.sin(a)*v*.5-.2,r:(.07+Math.random()*.08)*(size||1),t:0,life:.5+Math.random()*.5}); } }
function sparkle(x,y){ for(let i=0;i<6;i++){ const a=i/6*TAU; S.parts.push({k:'star',x,y,vx:Math.cos(a)*1.4,vy:Math.sin(a)*1.4-.6,r:.06,t:0,life:.6}); } }
function floatText(x,y,text,big){ S.floats.push({x,y,text,t:0,big:!!big}); if(S.floats.length>24) S.floats.shift(); }

/* ---------- traffic ---------- */
// every road tile joined to the town hall, gathered when a car or walker needs somewhere to start
function spots(k){ const out=[]; T.objs.forEach(o=>{ if(o.k===k&&(k!=='road'||ST.reach[idx(o.x,o.y)])) out.push(o); }); return out; }
const walkable=(x,y)=>{ const o=objAt(x,y); return !!o&&(o.k==='path'||o.k==='road'); };
function pickNext(a,ok){
  const opts=NB.filter(([dx,dy])=>ok(a.x+dx,a.y+dy)&&!(dx===-a.dx&&dy===-a.dy));
  if(!opts.length){ if(ok(a.x-a.dx,a.y-a.dy)) return [-a.dx,-a.dy]; return null; }
  // keep going straight more often than not
  const str=opts.find(([dx,dy])=>dx===a.dx&&dy===a.dy); if(str&&Math.random()<.6) return str;
  return opts[Math.floor(Math.random()*opts.length)];
}
function agentsStep(dt,live){
  const sp=live?1:0;
  // how many cars and walkers the town has, from how many people live here
  if(ST){
    S.spawnT-=dt;
    // fewer people are out walking at night
    const dk=darkness(T.clock), wantCars=Math.floor(Math.min(28,Math.floor(ST.pop/7))*(1-dk*.5)), wantFolk=Math.floor((Math.min(34,Math.floor(ST.pop/5)+Math.min(6,ST.n.path?3:0)))*(1-dk*.8));
    if(S.spawnT<=0){ S.spawnT=.25;
      if(S.cars.length<wantCars){ const r=spots('road'); if(r.length){ const o=r[Math.floor(Math.random()*r.length)], d=NB[Math.floor(Math.random()*4)]; S.cars.push({x:o.x,y:o.y,dx:d[0],dy:d[1],u:0,v:1.3+Math.random()*.6,a:0,style:Math.floor(Math.random()*3)}); } }
      else if(S.cars.length>wantCars) S.cars.shift();
      if(S.folk.length<wantFolk){ const p=spots('path'), r=p.length&&Math.random()<.65?p:spots('road'); if(r.length){ const o=r[Math.floor(Math.random()*r.length)], d=NB[Math.floor(Math.random()*4)];
        S.folk.push({x:o.x,y:o.y,dx:d[0],dy:d[1],u:Math.random(),v:.35+Math.random()*.25,side:Math.random()<.5?-1:1,a:0,hat:Math.random()<.3}); } }
      else if(S.folk.length>wantFolk) S.folk.shift();
    }
  }
  const mv=(a,ok)=>{ a.a=Math.min(1,a.a+dt*2);
    if(!ok(a.x,a.y)) return false;
    a.u+=a.v*dt*sp; while(a.u>=1){ a.u-=1; a.x+=a.dx; a.y+=a.dy; if(!ok(a.x,a.y)) return false; const n=pickNext(a,ok); if(!n) return false; a.dx=n[0]; a.dy=n[1]; }
    return true; };
  S.cars=S.cars.filter(c=>mv(c,isRoad));
  S.folk=S.folk.filter(f=>mv(f,walkable));
  // smoke from busy factory chimneys
  S.smokeT-=dt*sp; if(S.smokeT<=0&&ST){ S.smokeT=.35; T.objs.forEach(o=>{ if(o.k==='factory'&&o.conn&&ST.fill>0) S.parts.push({k:'smoke',x:o.x+1.73,y:o.y+.52-1.34,vx:.15+Math.random()*.1,vy:-.35,r:.08,t:0,life:2.4}); }); }
  for(let i=S.parts.length-1;i>=0;i--){ const p=S.parts[i]; p.t+=dt; if(p.t>p.life){ S.parts.splice(i,1); continue; }
    p.x+=p.vx*dt; p.y+=p.vy*dt; if(p.k==='dust'){ p.vx*=Math.exp(-dt*3); p.vy*=Math.exp(-dt*3); } }
  for(let i=S.floats.length-1;i>=0;i--){ const f=S.floats[i]; f.t+=dt; if(f.t>1.6) S.floats.splice(i,1); }
}
// where a car or walker is right now, part-way from its tile to the next
function agentPos(a,lane){ const cx=a.x+.5+a.dx*a.u, cy=a.y+.5+a.dy*a.u; return [cx-a.dy*lane,cy+a.dx*lane]; }
function drawAgents(t){
  S.cars.forEach(c=>{ const [x,y]=agentPos(c,.18), hz=c.dx!==0; X.save(); X.translate(x,y); X.globalAlpha=c.a;
    if(!hz) X.rotate(Math.PI/2); X.scale(c.dx<0||c.dy<0?-1:1,1);
    P(); rect(-.17+.03,-.09+.05,.34,.18); X.fillStyle=PAT.hatch; X.fill();
    P(); X.roundRect?X.roundRect(-.17,-.09,.34,.18,.05):rect(-.17,-.09,.34,.18); ink(c.style===1?PAT.hatchW:'#fff',.9);
    P(); rect(.02,-.07,.07,.14); X.fillStyle='#000'; X.fill(); if(c.style===2){ P(); rect(-.13,-.07,.08,.14); X.fillStyle='#000'; X.fill(); }
    X.restore(); });
  S.folk.forEach(f=>{ const o=objAt(f.x,f.y), lane=o&&o.k==='road'?.34*f.side:.06*f.side, [x,y]=agentPos(f,lane);
    const bob=RM?0:Math.abs(Math.sin((t+f.u)*9))*.025; X.globalAlpha=f.a; person(x,y+.12-bob,.9,f.hat?'#000':'#fff'); X.globalAlpha=1; });
  X.globalAlpha=1;
}
function drawParts(){
  const dust=S.parts.filter(p=>p.k==='dust'), R=p=>{ const k=p.t/p.life; return (p.r+.1*Math.sqrt(k))*(k>.6?1-(k-.6)/.4:1); };
  if(dust.length){ P(); dust.forEach(p=>circ(p.x,p.y,R(p)+ln(1.4))); X.fillStyle='#000'; X.fill(); P(); dust.forEach(p=>circ(p.x,p.y,R(p))); X.fillStyle='#fff'; X.fill(); }
  S.parts.forEach(p=>{ const k=p.t/p.life;
    if(p.k==='smoke'){ X.globalAlpha=(1-k)*.9; P(); circ(p.x+Math.sin(p.t*2)*.05,p.y,p.r+k*.22); ink('#fff',.8); X.globalAlpha=1; }
    else if(p.k==='star'){ X.globalAlpha=1-k; P(); circ(p.x,p.y,p.r*(1-k*.5)); X.fillStyle='#000'; X.fill(); X.globalAlpha=1; } });
}
