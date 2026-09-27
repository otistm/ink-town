/* Ink Town: The town itself (map, buildings, money), saving and loading, building and clearing, and undo. */
"use strict";
/* ============================================================
   SAVED PROGRESS (localStorage; never rename these keys or fields)
   inktown-save: {v:1, name, seed, day, money, tax, loan, rank, task, hist, created, ground, objs:[[k,x,y,pop]]}
     ground is one digit per tile (0 grass, 1 river, 2 pond), row by row.
   inktown-meta: {v:1, sound, seen:{tip ids}}
   ============================================================ */
function load(k,d){ try{ const v=JSON.parse(localStorage.getItem(k)); return v&&typeof v==='object'?v:d; }catch(e){ return d; } }
function store(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }
const meta=Object.assign({v:1,sound:true,seen:{}},load('inktown-meta',{}));
if(!meta.seen||typeof meta.seen!=='object') meta.seen={};
const saveMeta=()=>store('inktown-meta',meta);

let T=null;         // the town being played
const UNDO=[];      // recent build actions, newest last

function blankTown(name,seed){
  return {v:1,name,seed,day:1,money:START_MONEY,tax:'fair',loan:null,rank:0,task:0,hist:[],created:Date.now(),
    ground:new Uint8Array(N*N),cell:new Int32Array(N*N).fill(-1),objs:new Map(),nextId:1};
}
function newTown(name){
  const seed=1+Math.floor(Math.random()*999999), land=makeLand(seed);
  T=blankTown(name,seed); T.ground=land.ground;
  const hx=N/2-1, hy=N/2-2;
  addObj('hall',hx,hy);
  // a short stub of road outside the town hall door shows where the town begins
  addObj('road',hx,hy+2); addObj('road',hx+1,hy+2);
  land.wild.forEach(([x,y])=>{ if(T.cell[idx(x,y)]<0) addObj('wild',x,y); });
  UNDO.length=0; simRefresh(); saveTown();
}
function saveTown(){
  if(!T) return;
  const objs=[]; T.objs.forEach(o=>objs.push(o.pop?[o.k,o.x,o.y,o.pop]:[o.k,o.x,o.y]));
  store('inktown-save',{v:1,name:T.name,seed:T.seed,day:T.day,money:Math.round(T.money),tax:T.tax,loan:T.loan,rank:T.rank,task:T.task,
    hist:T.hist,created:T.created,ground:Array.from(T.ground).join(''),objs});
}
function loadTown(){
  const s=load('inktown-save',null); if(!s||!s.objs||!s.ground) return false;
  try{
    const t=blankTown(s.name||'Inkwell',s.seed||1);
    Object.assign(t,{day:s.day||1,money:isFinite(s.money)?s.money:START_MONEY,tax:TAX[s.tax]?s.tax:'fair',loan:s.loan||null,
      rank:s.rank||0,task:s.task||0,hist:Array.isArray(s.hist)?s.hist:[],created:s.created||Date.now()});
    for(let i=0;i<N*N;i++) t.ground[i]=+s.ground[i]||0;
    T=t; s.objs.forEach(([k,x,y,pop])=>{ if(IT[k]){ const o=addObj(k,x,y); if(o){ o.pop=pop||0; o.born=-9; } } });
    UNDO.length=0; simRefresh(); return true;
  }catch(e){ console.error(e); T=null; return false; }
}
function hasSave(){ const s=load('inktown-save',null); return !!(s&&s.objs); }

/* ---------- objects on the map ---------- */
function objAt(x,y){ if(!inMap(x,y)) return null; const id=T.cell[idx(x,y)]; return id<0?null:T.objs.get(id)||null; }
function addObj(k,x,y){
  const d=IT[k]; if(!d) return null;
  const o={id:T.nextId++,k,x,y,pop:0,born:typeof S!=='undefined'?S.t:0,v:(x*7+y*13)%5};
  for(let j=0;j<d.h;j++) for(let i=0;i<d.w;i++) T.cell[idx(x+i,y+j)]=o.id;
  T.objs.set(o.id,o); return o;
}
function removeObj(o){ const d=IT[o.k]; for(let j=0;j<d.h;j++) for(let i=0;i<d.w;i++) if(T.cell[idx(o.x+i,o.y+j)]===o.id) T.cell[idx(o.x+i,o.y+j)]=-1; T.objs.delete(o.id); }
const isWater=(x,y)=>inMap(x,y)&&T.ground[idx(x,y)]>0;
const isRoad=(x,y)=>{ const o=objAt(x,y); return !!o&&o.k==='road'; };
function refundOf(o){ const d=IT[o.k]; if(o.k==='hall') return 0; if(d.clearCost) return -d.clearCost;
  const c=(o.k==='road'||o.k==='path')&&isWater(o.x,o.y)?d.bridge:d.cost; return Math.floor(c*.5); }

/* ---------- planning a build: what it would cost and whether it fits ---------- */
// one tile of a line, area or brush build: returns {ok, cost, clear:[objects], skip, why}
function planTile(d,x,y){
  if(!inMap(x,y)) return {ok:false,why:'Off the map'};
  const o=objAt(x,y), g=T.ground[idx(x,y)];
  if(d.id==='clear'){
    if(o){ if(o.k==='hall') return {ok:false,skip:1,why:'The town hall stays'}; return {ok:true,clear:[o],cost:-refundOf(o)}; }
    if(g===POND) return {ok:true,cost:0,fill:1,clear:[]};
    return {ok:false,skip:1};
  }
  if(o&&o.k===d.id) return {ok:false,skip:1};
  let cost=d.cost, clear=[];
  if(o){ const od=IT[o.k];
    if(od.nature||(d.id==='road'&&o.k==='path')){ clear=[o]; if(od.clearCost) cost+=od.clearCost; }
    else return {ok:false,why:'Something is already there'}; }
  if(g>0){
    if(d.id==='pond') return {ok:false,skip:1};
    if(d.bridge) cost=d.bridge; else return {ok:false,why:'That is water'};
  }
  return {ok:true,cost,clear};
}
// a whole building: every tile of its footprint must be free land (nature is cleared)
function planSingle(d,x,y){
  let cost=d.cost; const clear=new Set();
  for(let j=0;j<d.h;j++) for(let i=0;i<d.w;i++){
    const tx=x+i, ty=y+j; if(!inMap(tx,ty)) return {ok:false,why:'Off the map'};
    if(T.ground[idx(tx,ty)]>0) return {ok:false,why:'That is water'};
    const o=objAt(tx,ty); if(o){ if(o.k===d.id&&d.w===1) return {ok:false,skip:1,why:'Already built'}; if(!IT[o.k].nature) return {ok:false,why:'Something is already there'};
      if(!clear.has(o)){ clear.add(o); if(IT[o.k].clearCost) cost+=IT[o.k].clearCost; } }
  }
  // is there a road beside it? (it can still be built, but nobody will use it until there is)
  let road=false; for(let j=-1;j<=d.h&&!road;j++) for(let i=-1;i<=d.w;i++){ if((i<0||i>=d.w)!==(j<0||j>=d.h)&&isRoad(x+i,y+j)){ road=true; break; } }
  return {ok:true,cost,clear:[...clear],road};
}
// which tiles a drag covers, for each build mode
function lineTiles(a,b,firstX){
  const out=[], sx=Math.sign(b.x-a.x), sy=Math.sign(b.y-a.y); let x=a.x,y=a.y; out.push([x,y]);
  if(firstX){ while(x!==b.x){ x+=sx; out.push([x,y]); } while(y!==b.y){ y+=sy; out.push([x,y]); } }
  else { while(y!==b.y){ y+=sy; out.push([x,y]); } while(x!==b.x){ x+=sx; out.push([x,y]); } }
  return out;
}
function areaTiles(a,b){ const out=[]; for(let y=Math.min(a.y,b.y);y<=Math.max(a.y,b.y);y++) for(let x=Math.min(a.x,b.x);x<=Math.max(a.x,b.x);x++) out.push([x,y]); return out; }
// sum up a drag: total cost, and how many tiles will change
function planTiles(d,tiles){
  let cost=0,n=0; const plans=[];
  tiles.forEach(([x,y])=>{ const p=planTile(d,x,y); plans.push(p); if(p.ok){ cost+=p.cost; n++; } });
  return {cost,n,plans};
}

/* ---------- building for real (every build can be undone) ---------- */
function act(){ return {added:[],removed:[],ground:[],money:0}; }
function actRemove(A,o){ removeObj(o); A.removed.push(Object.assign({},o)); }
function actAdd(A,k,x,y){ const o=addObj(k,x,y); A.added.push(o.id); return o; }
function actGround(A,i,v){ A.ground.push([i,T.ground[i]]); T.ground[i]=v; }
function finishAct(A,cost){
  T.money-=cost; A.money=cost; UNDO.push(A); if(UNDO.length>40) UNDO.shift();
  simRefresh(); saveTown();
}
function buildTiles(d,tiles){
  const P=planTiles(d,tiles);
  if(!P.n) return {ok:false,why:P.plans.find(p=>p.why)?.why||'Nothing to change there'};
  if(P.cost>0&&P.cost>T.money) return {ok:false,why:`Needs ${money(P.cost-T.money)} more`,broke:1};
  const A=act(), done=[]; let cost=0;
  tiles.forEach(([x,y],i)=>{ if(!P.plans[i].ok) return;
    // plans were made before anything changed; check again so a tile is never built twice
    const q=planTile(d,x,y); if(!q.ok) return; cost+=q.cost;
    q.clear.forEach(o=>{ if(T.objs.has(o.id)) actRemove(A,o); });
    if(q.fill) actGround(A,idx(x,y),GRASS);
    else if(d.id==='pond') actGround(A,idx(x,y),POND);
    else if(d.id!=='clear') actAdd(A,d.id,x,y);
    done.push([x,y]);
  });
  finishAct(A,cost); return {ok:true,cost,tiles:done};
}
function buildSingle(d,x,y){
  const p=planSingle(d,x,y); if(!p.ok) return p;
  if(p.cost>T.money) return {ok:false,why:`Needs ${money(p.cost-T.money)} more`,broke:1};
  const A=act(); p.clear.forEach(o=>actRemove(A,o)); const o=actAdd(A,d.id,x,y); finishAct(A,p.cost);
  return {ok:true,cost:p.cost,obj:o,road:p.road};
}
// knock down one building from its info card
function clearObj(o){ const A=act(), r=refundOf(o); actRemove(A,o); finishAct(A,-r); return r; }
// a cottage can become a townhouse once the town is a village
function upgradeCost(o){ return o.k==='cottage'&&T.rank>=IT.townhouse.rank?IT.townhouse.cost-Math.floor(IT.cottage.cost*.5):0; }
function upgradeObj(o){
  const c=upgradeCost(o); if(!c) return {ok:false}; if(c>T.money) return {ok:false,why:`Needs ${money(c-T.money)} more`,broke:1};
  const A=act(); actRemove(A,o); const n=actAdd(A,'townhouse',o.x,o.y); n.pop=o.pop; finishAct(A,c); return {ok:true,obj:n};
}
function undo(){
  const A=UNDO.pop(); if(!A) return null;
  A.added.forEach(id=>{ const o=T.objs.get(id); if(o) removeObj(o); });
  // put back what was removed, unless something new has since been built on the spot
  A.removed.slice().reverse().forEach(o=>{ const d=IT[o.k]; let free=true;
    for(let j=0;j<d.h;j++) for(let i=0;i<d.w;i++) if(T.cell[idx(o.x+i,o.y+j)]>=0) free=false;
    if(free){ for(let j=0;j<d.h;j++) for(let i=0;i<d.w;i++) T.cell[idx(o.x+i,o.y+j)]=o.id; T.objs.set(o.id,Object.assign({},o,{born:S.t})); } });
  A.ground.slice().reverse().forEach(([i,v])=>T.ground[i]=v);
  T.money+=A.money; simRefresh(); saveTown(); return A;
}
function money(v){ const n=Math.round(Math.abs(v)); return (v<0?'−':'')+'$'+n.toString().replace(/\B(?=(\d{3})+(?!\d))/g,','); }
