/* Ink Town: Maths helpers, the map grid and the starting landscape (river and woods). */
"use strict";
const TAU=Math.PI*2;
const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,u)=>a+(b-a)*u;
function seeded(s){ s=(s%2147483646)+1; return ()=>{ s=(s*16807)%2147483647; return (s-1)/2147483646; }; }
const easeOutBack=u=>{ const c=1.9; return 1+(c+1)*Math.pow(u-1,3)+c*Math.pow(u-1,2); };

// The map is N×N tiles. One tile is one world unit.
const N=48;
const idx=(x,y)=>y*N+x, inMap=(x,y)=>x>=0&&y>=0&&x<N&&y<N;
const NB=[[1,0],[-1,0],[0,1],[0,-1]];
// ground: 0 grass, 1 river (always there), 2 pond (dug by the player)
const GRASS=0, RIVER=1, POND=2;

/* A fresh landscape: a river winding down one side, a few woods, and a clear meadow in the middle for the town hall. */
function makeLand(seed){
  const r=seeded(seed), ground=new Uint8Array(N*N), wild=[];
  const side=r()<.5?-1:1; let cx=N/2+side*(9+r()*5), drift=0;
  for(let y=0;y<N;y++){
    drift=clamp(drift+(r()-.5)*.5,-.7,.7); cx=clamp(cx+drift,side<0?4:N/2+6,side<0?N/2-6:N-5);
    const wdt=2+(Math.sin(y*.3+seed)>.4?1:0);
    for(let x=Math.round(cx-wdt/2);x<Math.round(cx-wdt/2)+wdt;x++) if(inMap(x,y)) ground[idx(x,y)]=RIVER;
  }
  // woods: clumps of wild trees, kept clear of the meadow round the town hall
  for(let c=0;c<16;c++){
    const wx=r()*N, wy=r()*N, rad=2+r()*3.5;
    if(Math.hypot(wx-N/2,wy-N/2)<9) continue;
    for(let y=Math.floor(wy-rad);y<=wy+rad;y++) for(let x=Math.floor(wx-rad);x<=wx+rad;x++){
      if(!inMap(x,y)||ground[idx(x,y)]) continue;
      const d=Math.hypot(x-wx,y-wy)/rad; if(d<1&&r()>d*.8) wild.push([x,y]);
    }
  }
  return {ground,wild};
}
