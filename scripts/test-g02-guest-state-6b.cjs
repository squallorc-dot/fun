'use strict';
const assert=require('node:assert/strict'),{shooter}=require('./lib/arcade-engine-probe.cjs');
(async()=>{
 for(let chapter=1;chapter<=5;chapter++)for(const difficulty of ['normal','hard','expert']){
  const host=await shooter({hero:0,coopHero:3,chapter,difficulty,networkHost:true}),guest=await shooter({hero:0,coopHero:3,chapter,difficulty,networkGuest:true});
  assert.equal(guest.rafCalls,0);assert.equal(guest.networkStep({},{}),false,'guest cannot advance authority physics');
  for(let tick=0;tick<1200;tick++){
   assert(host.networkStep({moveX:-.2,fire:true},{moveX:.2,fire:true}));
   if(tick%12===0){const s=host.encode(host.coopSnapshot());assert(s,`valid snapshot chapter ${chapter} ${difficulty} tick ${tick}`);assert(guest.networkApply(s));const received=guest.coopSnapshot();assert.equal(received.game.t,s.game.t);assert.equal(received.game.score,s.game.score);assert.equal(received.game.p2.x,s.game.p2.x);assert.equal(received.game.enemies.length,s.game.enemies.length);}
  }
  const s=host.encode(host.coopSnapshot()),bad=JSON.parse(JSON.stringify(s)),before=JSON.stringify(guest.coopSnapshot());bad.game.p2.x=999;assert(!guest.networkApply(bad));assert.equal(JSON.stringify(guest.coopSnapshot()),before,'rejected data cannot modify guest state');
  assert(!guest.valid({...s,unexpected:true}));assert(!guest.valid({...s,game:{...s.game,fx:Array(513).fill({x:0,y:0})}}));
 }
 let bossCases=0,terminalCases=0,maxBytes=0;
 for(let chapter=1;chapter<=5;chapter++)for(const difficulty of ['normal','hard','expert'])for(const seed of [7,29]){
  const host=await shooter({hero:0,coopHero:3,chapter,difficulty,seed,networkHost:true});let boss=false;
  for(let i=0;i<14400;i++){
   const [x,y]=[[.6,0],[0,-.6],[-.6,0],[0,.6]][Math.floor(i/360)%4];
   if(!host.networkStep({moveX:x,moveY:y,fire:true,skill:i%360===0},{moveX:-x,moveY:-y,fire:true,skill:i%360===0}))break;
   if(i%24===0){const raw=host.coopSnapshot(),state=host.encode(raw);assert(state,`bounded state, ch${chapter} ${difficulty} seed${seed} tick${i}`);maxBytes=Math.max(maxBytes,JSON.stringify(state).length);if(raw.game.boss)boss=true;}
   if(['victory','defeat'].includes(host.state().phase))break;
  }
  if(boss)bossCases++;if(['victory','defeat'].includes(host.state().phase)){terminalCases++;assert(host.encode(host.coopSnapshot()),'terminal state must be transferable');}
 }
 assert(bossCases>0&&terminalCases>0,'samples must cover actual bosses and terminal states');
 console.log('G02 GUEST SNAPSHOT PASS: 15 chapter/difficulty cases, render-only guest, bounded and corrupt state rejection; no RTC');
 console.log(`G02 STATE STRESS: 30 natural scripted scenarios, ${bossCases} boss, ${terminalCases} terminal, max ${maxBytes} code units; no RTC`);
})().catch(e=>{console.error(e);process.exitCode=1;});
