/* Ink Town: How the town lives. Roads connect buildings to the town hall; gardens and water make places nicer;
   noise makes them worse; services cover the homes around them. Each day people move in or out, businesses
   hire, taxes come in and upkeep goes out. */
"use strict";
let ST=null; // live stats, worked out from the town by simRefresh()
const WORK_SHARE=.55;       // share of residents who want a job
const TAX_RES=.9, TAX_JOB=2.5, TAX_SALE=.4; // dollars a day: per resident, per filled job, per shopper served

// spread a value over the tiles round a footprint, fading with distance
function spread(map,o,d,val,r){
  const cx=o.x+d.w/2, cy=o.y+d.h/2;
  for(let y=Math.floor(cy-r-1);y<=cy+r;y++) for(let x=Math.floor(cx-r-1);x<=cx+r;x++){
    if(!inMap(x,y)) continue; const dd=Math.hypot(x+.5-cx,y+.5-cy)-Math.max(d.w,d.h)/2+.5;
    if(dd<=r) map[idx(x,y)]+=val*(1-Math.max(0,dd)/(r+1));
  }
}
// mark every tile within reach of a service
function cover(map,o,d,r){ const cx=o.x+d.w/2, cy=o.y+d.h/2;
  for(let y=Math.floor(cy-r-1);y<=cy+r;y++) for(let x=Math.floor(cx-r-1);x<=cx+r;x++) if(inMap(x,y)&&Math.hypot(x+.5-cx,y+.5-cy)<=r) map[idx(x,y)]=1; }
function footAvg(map,o){ const d=IT[o.k]; let s=0; for(let j=0;j<d.h;j++) for(let i=0;i<d.w;i++) s+=map[idx(o.x+i,o.y+j)]; return s/(d.w*d.h); }
function footAny(map,o){ const d=IT[o.k]; for(let j=0;j<d.h;j++) for(let i=0;i<d.w;i++) if(map[idx(o.x+i,o.y+j)]) return true; return false; }

function simRefresh(){
  const reach=new Uint8Array(N*N), appeal=new Float32Array(N*N), noise=new Float32Array(N*N), cov={};
  NEEDS.forEach(n=>cov[n.svc]=new Uint8Array(N*N));
  const st={n:{},pop:0,cap:0,jobs:0,serve:0,workers:0,employed:0,unemp:0,short:0,hap:0,roads:0,roadsConn:0,bridges:0,
    homes:[],biz:[],upkeep:0,reach,appeal,noise,cov};
  // 1. roads: flood out from the roads touching the town hall
  let hall=null; const q=[];
  T.objs.forEach(o=>{ st.n[o.k]=(st.n[o.k]||0)+1; if(o.k==='hall') hall=o; if(o.k==='road'){ st.roads++; if(isWater(o.x,o.y)) st.bridges++; } });
  if(hall) for(let j=-1;j<=2;j++) for(let i=-1;i<=2;i++){ if((i<0||i>1)!==(j<0||j>1)&&isRoad(hall.x+i,hall.y+j)){ reach[idx(hall.x+i,hall.y+j)]=1; q.push([hall.x+i,hall.y+j]); } }
  while(q.length){ const [x,y]=q.pop(); st.roadsConn++;
    NB.forEach(([dx,dy])=>{ const nx=x+dx, ny=y+dy; if(inMap(nx,ny)&&!reach[idx(nx,ny)]&&isRoad(nx,ny)){ reach[idx(nx,ny)]=1; q.push([nx,ny]); } }); }
  // 2. which buildings have a connected road beside them
  T.objs.forEach(o=>{ const d=IT[o.k]; if(d.flat||d.nature&&!d.cap) { o.conn=false; return; }
    let c=false; for(let j=-1;j<=d.h&&!c;j++) for(let i=-1;i<=d.w;i++){ if((i<0||i>=d.w)!==(j<0||j>=d.h)){ const x=o.x+i,y=o.y+j; if(inMap(x,y)&&reach[idx(x,y)]){ c=true; break; } } }
    o.conn=c||o.k==='hall';
    st.upkeep+=d.upkeep;
    if(d.cap) st.homes.push(o);
    if(d.jobs&&o.conn){ st.biz.push(o); st.jobs+=d.jobs; if(d.serve) st.serve+=d.serve; }
    if(d.svc&&o.conn) cover(cov[d.svc],o,d,d.r);
    if(d.noise&&o.conn) spread(noise,o,d,d.noise[0],d.noise[1]);
  });
  // 3. appeal: gardens, trees, paths and water make the tiles around them nicer
  T.objs.forEach(o=>{ const d=IT[o.k]; if(d.flat) st.upkeep+=d.upkeep; if(d.appeal&&(!d.jobs||o.conn)) spread(appeal,o,d,d.appeal[0],d.appeal[1]); });
  for(let y=0;y<N;y++) for(let x=0;x<N;x++) if(T.ground[idx(x,y)]){ const w=T.ground[idx(x,y)]===POND?1.2:.7; // ponds are made to be admired
    for(let j=-2;j<=2;j++) for(let i=-2;i<=2;i++){ const nx=x+i,ny=y+j; if(inMap(nx,ny)&&!T.ground[idx(nx,ny)]) appeal[idx(nx,ny)]+=w*(1-Math.hypot(i,j)/3.2); } }
  // 4. people and jobs
  st.homes.forEach(o=>{ st.pop+=o.pop; st.cap+=IT[o.k].cap; });
  st.workers=Math.round(st.pop*WORK_SHARE); st.employed=Math.min(st.workers,st.jobs);
  st.unemp=st.workers?(st.workers-st.employed)/st.workers:0;
  st.short=st.pop>10?clamp((st.pop-st.serve)/st.pop,0,1):0;
  st.fill=st.jobs?st.employed/st.jobs:0;          // share of jobs that have someone in them
  st.sales=Math.min(st.pop,st.serve);              // shoppers served today
  // 5. happiness, home by home, with the reasons residents give
  const tax=TAX[T.tax]; let hs=0,hw=0;
  st.homes.forEach(o=>{ const why=[]; let h=50;
    const ap=Math.min(25,footAvg(appeal,o)*1.3); if(ap>=4) why.push([1,ap>=12?'Loves the gardens and trees nearby':'Likes the greenery nearby']); else why.push([0,'Wishes there were more trees or gardens']);
    h+=ap;
    const nz=Math.min(30,footAvg(noise,o)*3); if(nz>=3){ h-=nz; why.push([-1,nz>=12?'Can’t sleep for the factory noise':'A bit noisy round here']); }
    NEEDS.forEach(n=>{ const has=footAny(cov[n.svc],o);
      if(has){ h+=st.pop>=n.at?n.bonus:n.bonus*.5; why.push([1,`Glad to have ${n.name} nearby`]); }
      else if(st.pop>=n.at){ h-=n.miss; why.push([-1,`Needs ${n.name} nearby`]); } });
    if(st.unemp>.08){ h-=22*st.unemp; why.push([-1,st.unemp>.4?'Can’t find any work':'Jobs are hard to find']); }
    if(st.short>.05){ h-=16*st.short; why.push([-1,'Wants more shops']); }
    if(tax.hap){ h+=tax.hap; why.push([tax.hap>0?1:-1,tax.hap>0?'Enjoys the low taxes':'Grumbles about high taxes']); }
    if(!o.conn) why.unshift([-1,'No road to the town hall, so nobody can move in']);
    o.hap=clamp(Math.round(h),0,100); o.why=why;
    const wgt=o.pop||.5*IT[o.k].cap*(o.conn?1:0); hs+=o.hap*wgt; hw+=wgt;
  });
  st.hap=hw?Math.round(hs/hw):0;
  // 6. what the town wants next: homes when there are spare jobs, shops when shoppers go without, work when people are idle
  st.dem={
    homes:st.pop<12?.8:clamp((st.jobs-st.workers)/Math.max(6,st.workers*.4),-1,1)*.9+(st.hap-55)/200,
    shops:clamp((st.pop-st.serve)/Math.max(20,st.pop*.5),-1,1),
    work:clamp((st.workers-st.jobs)/Math.max(6,st.workers*.4),-1,1)};
  st.dem.homes=clamp(st.dem.homes,-1,1);
  // 7. the day's money
  const m=tax.mul;
  st.inc={res:st.pop*TAX_RES*m*(.5+st.hap/100), jobs:st.employed*TAX_JOB*m, sales:st.sales*TAX_SALE*m};
  st.out={upkeep:st.upkeep, loan:T.loan?LOAN.perDay:0};
  st.income=st.inc.res+st.inc.jobs+st.inc.sales; st.spend=st.out.upkeep+st.out.loan;
  st.net=Math.round(st.income-st.spend);
  ST=st; return st;
}

/* one day passes */
function dayTick(){
  simRefresh();
  const st=ST, rep={day:T.day,net:st.net,moved:[]};
  T.money+=st.net; T.day++;
  T.hist.push(st.net); if(T.hist.length>30) T.hist.shift();
  if(T.loan){ T.loan.left--; if(T.loan.left<=0){ T.loan=null; rep.loanDone=true; } }
  // people move in to homes that are connected and pleasant, and drift away from ones that aren't
  st.homes.forEach(o=>{ const d=IT[o.k];
    const tgt=o.conn?Math.round(d.cap*clamp(.35+o.hap/100*.8+st.dem.homes*.15,0,1)):0;
    if(o.pop<tgt){ const n=Math.min(tgt-o.pop,Math.max(1,Math.round(d.cap*.25))); o.pop+=n; rep.moved.push([o,n]); }
    else if(o.pop>tgt){ const n=Math.min(o.pop-tgt,Math.max(1,Math.round(d.cap*.1))); o.pop-=n; rep.moved.push([o,-n]); }
  });
  simRefresh();
  rep.st=ST;
  // a new rank pays a grant and unlocks buildings
  const nx=RANKS[T.rank+1]; if(nx&&ST.pop>=nx.pop){ T.rank++; T.money+=nx.grant; rep.rank=T.rank; }
  rep.task=checkTask();
  saveTown(); return rep;
}
// the current task: finish it and the reward is paid straight away
function checkTask(){
  const t=TASKS[T.task]; if(!t||!ST) return null;
  if(t.val(ST)>=t.goal){ T.task++; T.money+=t.pay; saveTown(); return t; }
  return null;
}
