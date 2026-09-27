/* Ink Town: Tiny procedural sounds. Soft pops for building, a crunch for clearing, coins, and birdsong now and then. */
"use strict";
let AC=null;
function audioInit(){
  if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} }
  if(AC&&AC.state==='suspended') AC.resume();
}
function tone(f,d,type,v,f2,delay){ if(!AC||!meta.sound) return; const t=AC.currentTime+(delay||0),o=AC.createOscillator(),g=AC.createGain();
  o.type=type||'sine'; o.frequency.setValueAtTime(f,t); if(f2) o.frequency.exponentialRampToValueAtTime(f2,t+d);
  g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(v,t+.008); g.gain.exponentialRampToValueAtTime(.0001,t+d); o.connect(g).connect(AC.destination); o.start(t); o.stop(t+d+.02); }
function noise(d,v,fc,q){ if(!AC||!meta.sound) return; const t=AC.currentTime,n=Math.floor(AC.sampleRate*d),buf=AC.createBuffer(1,n,AC.sampleRate),a=buf.getChannelData(0);
  for(let i=0;i<n;i++) a[i]=Math.random()*2-1; const s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();
  s.buffer=buf; f.type='bandpass'; f.frequency.value=fc; f.Q.value=q||1; g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+d);
  s.connect(f).connect(g).connect(AC.destination); s.start(t); }
function sfx(k,p=1){
  if(k==='place'){ tone(420*p,.09,'triangle',.16,260*p); noise(.08,.12,1200,.9); tone(840*p,.12,'sine',.06,null,.05); }
  else if(k==='lay'){ noise(.07,.1,700+Math.random()*300,1.4); tone(300+Math.random()*60,.05,'triangle',.05); }
  else if(k==='plant'){ tone(660+Math.random()*200,.07,'sine',.08,990); }
  else if(k==='clear'){ noise(.28,.3,320,.7); tone(110,.2,'triangle',.2,55); }
  else if(k==='coin'){ tone(1320,.06,'square',.03); tone(1760,.12,'triangle',.05,null,.05); }
  else if(k==='nope'){ tone(190,.16,'square',.05,120); }
  else if(k==='tap'){ tone(880,.04,'sine',.06); }
  else if(k==='open'){ tone(520,.06,'triangle',.07,780); }
  else if(k==='undo'){ tone(700,.08,'triangle',.07,420); }
  else if(k==='task'){ [784,988,1175].forEach((f,i)=>tone(f,.18,'triangle',.1,null,i*.09)); }
  else if(k==='rank'){ [523,659,784,1047,1319].forEach((f,i)=>tone(f,.3,'triangle',.14,null,i*.11)); }
  else if(k==='movein'){ tone(1046,.05,'sine',.03); }
}
// birdsong by day and crickets by night, every so often while the town is running
let birdT=6;
function ambientStep(dt,live){
  if(!AC||!meta.sound||!live) return; birdT-=dt; if(birdT>0) return;
  if(T&&isNight(T.clock)){ birdT=3+Math.random()*5; for(let i=0;i<4;i++) tone(4200,.03,'sine',.012,null,i*.07); return; }
  birdT=5+Math.random()*9; const f=2200+Math.random()*1400, n=2+Math.floor(Math.random()*3);
  for(let i=0;i<n;i++) tone(f*(1+(i%2)*.12),.07,'sine',.018,f*1.3,i*.11);
}
