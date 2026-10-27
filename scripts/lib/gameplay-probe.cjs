// Deterministic human-sized inputs into the real engines. No result/health/
// enemy/target setters are used by the completion controllers.
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),source=fs.readFileSync(path.join(root,'arcade/assets/games-core.js'),'utf8'),runtime=fs.readFileSync(path.join(root,'arcade/assets/session-runtime.js'),'utf8');
const raceDriver=require('./race-probe.cjs').pilot;
const clamp=(x,a=-1,b=1)=>Math.max(a,Math.min(b,x));
function create({id,mode='volley',chapter=1,difficulty='normal',hero=0,seed=7,testMode=false,sourceText=source}={}){
 let n=seed>>>0;const math=Object.create(Math);math.random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);const ctx={window:{},Math:math};vm.runInNewContext(runtime,ctx);vm.runInNewContext(sourceText,ctx);let result;
 const g=ctx.window.BioSuiteGames[id]({mode,chapter,difficulty,hero,testMode,I:{hero:['Burner','MJ','Moo','Ye Bao','Jelly','Veggie','Oracle']},sfx(){},finish:(...v)=>{result=v;}});[g.w,g.h]=({g01:[800,600],g03:[480,720],g04:[600,720],g05:[640,480],g06:[960,540]})[id];g.start();
 return {g,ctx,reset:()=>{result=undefined;g.start();return g.inspectCombat?.()||g.debugGeometry?.()||g.debugPhysics?.()||g.inspectMatch?.()||g.inspectRace?.();},clock:ctx.window.BioArcadeSession.simulation(),result:()=>result,snapshot:()=>g.inspectCombat?.()||g.debugGeometry?.()||g.debugPhysics?.()||g.inspectMatch?.()||g.inspectRace?.()};
}
function fighter(s,tick){const p=s.player,targets=s.enemies.filter(e=>e.hp>0).sort((a,b)=>Math.hypot(a.x-p.x,(a.y-p.y)*1.5)-Math.hypot(b.x-p.x,(b.y-p.y)*1.5));const e=targets[0];if(!e)return {};
 const dx=e.x-p.x,dy=e.y-p.y,close=Math.abs(dx)<65&&Math.abs(dy)<28;
 const imminent=targets.some(e=>e.tele>0&&e.tele<.16&&Math.hypot(e.x-p.x,(e.y-p.y)*1.5)<150)||s.projectiles.some(b=>Math.hypot(b.x-p.x,b.y+28-p.y)<50);
 return {moveX:close?Math.sign(dx)*.06:clamp(dx/65),moveY:clamp(dy/35),fire:close&&p.energy<100,skill:p.energy>=100&&Math.abs(dx)<125&&tick%12===0,dodge:imminent&&p.dodge===0,jump:false};
}
function stairs(s,tick){const p=s.player,below=s.platforms.filter(f=>!f.broken&&f.y>p.y+p.r+5&&f.y-p.y<295&&f.y<s.camera+720);let best;
 const safe=below.filter(f=>f.type!=='trap');for(const target of (safe.length?safe:below)){
  const x=target.actualX??target.x,lo=x+18,hi=x+target.w-18;
  for(const aim of [lo,(lo+hi)/2,hi,clamp(p.x,lo,hi)]){
   const traps=below.filter(f=>f.type==='trap'&&f.y<target.y&&aim+p.r+5>f.x&&aim-p.r-5<f.x+f.w).length;
   const cost=(target.type==='trap'?(p.inv>.5?20:300):0)+traps*600+(target.y-p.y)*.08+Math.abs(aim-p.x)*.25-(target.pickup&&!target.collected&&p.hp<3&&Math.abs(aim-(x+target.w/2))<20?100:0);
   if(!best||cost<best.cost)best={aim,cost,target};
  }
 }
 if(!best)return {};const distance=best.aim-p.x;
 return {moveX:clamp((distance-p.vx*.12)/24),down:p.ground&&Math.abs(distance)<12&&tick%18===0};
}
function pinball(s,tick){const target=s.targets.filter(q=>q.hp>0).sort((a,b)=>b.y-a.y||Math.abs(a.x-300)-Math.abs(b.x-300))[0];if(!target)return {};
 const aimed=Math.atan2(-(target.x-300),690-target.y),ready=Math.abs(s.angle-aimed)<.01&&s.power>=98;
 return {moveY:-1,moveX:clamp((s.angle-aimed)/.04),fire:s.balls.length===0&&ready&&s.transition<=0,pointer:{down:false}};
}
function sport(s,tick){const b=s.ball,p=s.player;if(!b)return {};
 if(s.mode==='pong'){
  const aim=b.lastHitter===1?b.y:250;
  const reach=b.lastHitter===1&&b.bouncedReceiver&&Math.abs(b.x-p.x)<45&&b.z>=6&&b.z<94;
  return {moveY:clamp((aim-p.y)/12),fire:reach,up:false,down:false};
 }
 const f=s.field,interceptY=f.floor-f.body*1.55,disc=b.vy*b.vy+2*f.gravity*(interceptY-b.y),flight=disc>=0?Math.max(0,(-b.vy+Math.sqrt(disc))/f.gravity):0,aim=b.lastHitter===1?b.x+b.vx*flight:140;
 const fire=b.lastHitter===1&&b.vy>0&&Math.abs(b.x-p.x)<45&&b.y>interceptY-45,moveX=fire?(s.chapter>=4?-1:1):clamp((aim-p.x)/20);return {moveX,fire,right:moveX>.2,left:moveX<-.2,jump:false};
}
function driver(s){return raceDriver(s);}
function defense(s){const p=s.p,keysFor=[[1,0,['d']],[1,1,['d','s']],[0,1,['s']],[-1,1,['a','s']],[-1,0,['a']],[-1,-1,['a','w']],[0,-1,['w']],[1,-1,['d','w']]];let best;
 for(const [xx,yy,keys]of keysFor){const norm=Math.hypot(xx,yy),dx=xx/norm,dy=yy/norm,x=p.x+dx*s.hero.speed*.3,y=p.y+dy*s.hero.speed*.3;
  let cost=(x<32||x>568||y<32||y>568?500:0)+Math.abs(Math.hypot(x-300,y-300)-190)*.15;
  for(const e of [...s.enemies,...(s.boss?[s.boss]:[])]){const distance=Math.hypot(x-e.x,y-e.y);cost+=Math.max(0,100-distance)**2*.08;}
  for(const b of s.hostiles){const distance=Math.hypot(x-(b.x+b.vx*.3),y-(b.y+b.vy*.3));cost+=Math.max(0,50-distance)**2*.2;}
  for(const h of s.hazards)if(h.active||h.warning)cost+=Math.max(0,h.r+22-Math.hypot(x-h.x,y-h.y))**2*.3;
  cost-=(dx*-(p.y-300)+dy*(p.x-300))*.015;
  if(!best||cost<best.cost)best={cost,keys};
 }
 const danger=s.enemies.some(e=>Math.hypot(e.x-p.x,e.y-p.y)<e.r+35)||s.hostiles.some(b=>Math.hypot(b.x-p.x,b.y-p.y)<35)||s.hazards.some(h=>h.active&&Math.hypot(h.x-p.x,h.y-p.y)<h.r+15);
 return {keys:[...best.keys,' '],dodge:danger&&p.dash===0,skill:p.skill>=100&&(s.enemies.some(e=>Math.hypot(e.x-p.x,e.y-p.y)<160)||s.boss&&Math.hypot(s.boss.x-p.x,s.boss.y-p.y)<160)};
}
function policy(id,s,tick){return id==='g01'?fighter(s,tick):id==='g03'?stairs(s,tick):id==='g04'?pinball(s,tick):id==='g05'?sport(s,tick):driver(s);}
function decide(options,id,state,tick,recorded){
 const slot=Math.floor(tick/6);let value;
 if(options.replay){if(!options.replay[slot])throw Error('Recorded input exhausted at tick '+tick);value=options.replay[slot];}
 else value=options.controller?options.controller(state,tick):id==='g02'?defense(state):policy(id,state,tick);
 if(recorded)recorded.push(JSON.parse(JSON.stringify(value)));return value;
}
function run(options={}){const v=create(options),{id}=options,fps=options.fps||60,max=options.max||900,initial=v.snapshot(),inputs=options.recordInputs||options.replay?[]:null;let tick=0,input={};
 for(let frame=0;frame<fps*max&&!v.result();frame++)v.clock.advance(1/fps,dt=>{if(tick%6===0)input=decide(options,id,v.snapshot(),tick,inputs);v.g.update(dt,{pointer:{down:false},...input});tick++;return !v.result();});
 return {outcome:v.result(),initial,state:v.snapshot(),ticks:tick,inputs,retry:v.reset};
}
async function runDefense(options={}){const {shooter}=require('./arcade-engine-probe.cjs'),v=await shooter(options),clockScope={window:{}};vm.runInNewContext(runtime,clockScope);const clock=clockScope.window.BioArcadeSession.simulation(),fps=options.fps||60,max=options.max||180,initial=JSON.parse(v.snapshot()).game,inputs=options.recordInputs||options.replay?[]:null;let tick=0;
 for(let frame=0;frame<fps*max&&v.state().phase==='playing';frame++)clock.advance(1/fps,dt=>{if(tick%6===0){const input=decide(options,'g02',v.liveGame(),tick,inputs);v.setKeys(input.keys);if(input.dodge)v.dash();if(input.skill)v.skill();}v.updateStep(dt);tick++;return v.state().phase==='playing';});
 const state=JSON.parse(v.snapshot());return {outcome:['victory','defeat'].includes(state.phase)?[state.phase==='victory',state.game.score]:null,state:state.game,initial,ticks:tick,inputs,retry:async()=>{await v.start();return JSON.parse(v.snapshot()).game;}};
}
const browserDrivers=()=>`const clamp=${clamp.toString()};const raceControl=${require('./race-strategies.cjs').control.toString()};const raceDriver=${raceDriver.toString()};${[fighter,stairs,pinball,sport,driver,defense,policy].map(fn=>fn.toString()).join('\n')};window.BioGameplayDriver={policy,defense};`;
module.exports={create,policy,run,defense,runDefense,browserDrivers};
