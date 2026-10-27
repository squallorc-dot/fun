/* Real six-car races: identical physics input at 120Hz, varied rendering cadence. */
'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {setup,pilot}=require('./lib/race-probe.cjs');
const {canvasContext}=require('./lib/arcade-engine-probe.cjs');
let checks=0,races=0,aiPasses=0,brakingSamples=0,interpolated=false;const results=[];
const check=(ok,label)=>{assert(ok,label);checks++;};
const hash=s=>crypto.createHash('sha256').update(JSON.stringify(s)).digest('hex');
{
 const {g}=setup(),initial=g.inspectRace();
 for(let n=0;n<359;n++)g.update(1/120,{fire:true,right:true});const waiting=g.inspectRace();
 check(waiting.phase==='countdown'&&waiting.elapsed===0&&waiting.progress===0&&waiting.nitro===100,'formal grid holds player, race clock and nitro');
 check(waiting.traffic.filter(r=>r.type==='car').every((r,i)=>r.z===initial.traffic.filter(r=>r.type==='car')[i].z&&r.speed===0),'all five AI obey the same lights');
 g.update(1/120,{});check(g.inspectRace().phase==='racing'&&g.inspectRace().elapsed===0,'exact three-second lights');
 g.update(1/120,{});check(g.inspectRace().elapsed>0&&g.inspectRace().car.speed>0,'all competitors launch after GO');
}
for(let chapter=1;chapter<=5;chapter++)for(const difficulty of ['normal','hard','expert'])for(const seed of [1,29]){
 let canonical;
 for(const fps of [120,60,30,10]){
  const sim=setup({chapter,difficulty,seed}),g=sim.g,initial=g.inspectRace(),label=[chapter,difficulty,seed,fps].join('/');
  const ai=initial.traffic.filter(r=>r.type==='car');check(ai.length===5&&new Set(ai.map(r=>r.driver.style)).size===5,label+' five distinct drivers');
  check(initial.traffic.filter(r=>r.type==='barrier').length<=3,label+' sparse fixed hazards');
  let previous=initial,frames=0;
  while(!sim.result()&&frames++<fps*160){
   sim.clock.advance(1/fps,dt=>{
    const before=g.inspectRace();g.update(dt,pilot(before));const after=g.inspectRace();
    const cars=after.traffic.filter(r=>r.type==='car');
    for(const r of cars){const old=before.traffic.find(o=>o.id===r.id);
     assert(r.z>=old.z-1e-9&&r.z-old.z<=96.2/120+1e-7,label+' no teleport / reverse');
     assert(Math.abs(r.lane-old.lane)<=2/120+1e-7&&Math.abs(r.lane)<=1.04,label+' physical steering stays on road');
     assert(r.maxSpeed===ai.find(o=>o.id===r.id).maxSpeed,label+' no rank-dependent speed multiplier');
     if(r.status==='racing'&&old.inv===0&&r.inv===0){assert(r.speed-old.speed<=17/120+.002,label+' bounded acceleration');assert(r.speed-old.speed>=-39/120-.002,label+' bounded braking');}
     if(old.status==='finished'){assert(r.coastDistance>=old.coastDistance&&r.coastDistance-old.coastDistance<=96.2/120+1e-7,label+' finish coasts without teleport');assert(Math.abs(r.coastLane-old.coastLane)<=.4/120+1e-7,label+' physical cooldown steering');assert(Math.abs(r.coastLane)<=.9,label+' finished cars remain inside the guardrail');}
     if(r.braking)brakingSamples++;
    }
    previous=after;return !g._finished;
   });
  }
  const end=previous,report=g.raceResult();check(!!sim.result(),label+' real race must settle');
  check(sim.result()[0]===true&&report.rank<=3,label+' feasible podium with real driver');
  check(end.checkpointIndex===end.checkpointTotal&&report.lapTimes.length===(chapter===1?3:2),label+' all laps and gates');
  check(report.standings.length===6&&report.standings.every(r=>r.status==='finished'&&Number.isFinite(r.time)),label+' six actual finish times, no stuck AI');
  check(report.standings.every((r,i,a)=>!i||r.time>=a[i-1].time),label+' official order uses finish times');
  check(Math.abs(report.lapTimes.reduce((a,b)=>a+b,0)-report.totalTime)<1e-7&&report.bestLap===Math.min(...report.lapTimes),label+' interpolated lap/total time');
  check(report.passes===report.events.filter(e=>e.by==='player').length,label+' recorded overtakes reconcile');
  interpolated||=Math.abs(report.totalTime*120-Math.round(report.totalTime*120))>1e-4;
  const signature=hash(end);if(canonical)check(signature===canonical,label+' identical race at every cadence');else canonical=signature;
  aiPasses+=end.events.filter(e=>e.by!=='player'&&e.against!=='player').length;races++;
  results.push({chapter,difficulty,seed,fps,rank:report.rank,time:report.totalTime,bestLap:report.bestLap});
 }
}
check(brakingSamples>0&&aiPasses>0&&interpolated,'AI brake and pass; finish times interpolate the actual line crossing');
{
 const close=setup().g,clear=setup().g;
 close.testPlace({distance:100,lane:0,speed:50,obstacle:{type:'car',lane:.30,speed:50}});clear.testPlace({distance:100,lane:0,speed:50,obstacle:{type:'car',lane:.45,speed:50}});
 close.update(1/120,{});clear.update(1/120,{});
 check(close.inspectRace().collisions===1&&clear.inspectRace().collisions===0,'collision footprint matches car bodies, with a clear adjacent lane');
}
{
 const a=setup().g,b=setup().g;
 a.testPlace({distance:100,lane:0,speed:74});b.testPlace({distance:100,lane:0,speed:74,obstacle:{type:'car',ahead:24,lane:0,speed:74}});
 a.testRaceState({energy:20});b.testRaceState({energy:20});
 for(let n=0;n<84;n++){a.update(1/120,{});b.update(1/120,{});}
 check(b.inspectRace().slipstream&&b.inspectRace().car.speed>a.inspectRace().car.speed&&b.inspectRace().nitro>a.inspectRace().nitro,'slipstream gives real speed and energy recovery');
 a.testPlace({distance:100,speed:74});b.testPlace({distance:100,speed:74});
 for(let n=0;n<120;n++){a.update(1/120,{});b.update(1/120,{fire:true});}
 check(b.inspectRace().progress>a.inspectRace().progress&&b.inspectRace().nitro<a.inspectRace().nitro,'nitro costs energy and actually gains distance');
}
{
 const a=setup(),b=setup();a.g.testPlace({distance:400,keepTraffic:true});b.g.testPlace({distance:800,keepTraffic:true});
 for(let n=0;n<240;n++){a.g.update(1/120,{down:true});b.g.update(1/120,{down:true});}
 const rivals=g=>JSON.stringify(g.inspectRace().traffic.filter(o=>o.type==='car'));
 check(rivals(a.g)===rivals(b.g),'distant player progress cannot change AI acceleration or route');
}
{
 const {g}=setup();g.testPlace({distance:100,keepTraffic:true});const ctx=canvasContext();
 for(let n=0;n<240;n++){g.update(1/60,{down:true});g.draw(ctx);assert(g.inspectRenderStats().projectionSamples<180,'parked-player projection cache stays bounded while rivals move');}
 check(g.inspectRace().traffic.some(r=>r.type==='car'&&r.z>100),'stationary rendering still animates real rivals');
 g.testPlace({distance:2500,lane:0,obstacle:{type:'car',ahead:-2390,lane:0,speed:50}});g.update(1/120,{});
 check(g.inspectRace().slipstream&&g.inspectRace().rank===1,'lapped cars share physical road space without changing lap-based ranking');
}
{
 const sim=setup({difficulty:'expert'});let n=0;
 while(!sim.result()&&n++<120*150){const r=sim.g.inspectRace();sim.g.update(1/120,pilot(r,{slow:true}));}
 const r=sim.g.raceResult();check(sim.result()&&r.status==='finished'&&r.rank>3&&!sim.result()[0],'finishing behind the podium is a real loss');
 check(r.events.some(e=>e.against==='player'),'AI can overtake the player in a real race');
}
{
 const sim=setup();const rivals=sim.g.inspectRace().traffic.filter(r=>r.type==='car');
 sim.g.testRaceState({time:50,player:{z:3599,speed:74,lapTimes:[18,17],lastLapAt:35},rivals:rivals.map((r,i)=>({id:r.id,z:3590-i*2,speed:65,lapTimes:[19,18],lastLapAt:37}))});
 let finishingScore,stable=true;for(let i=0;i<1200&&!sim.result();i++){sim.g.update(1/120,{down:false});const r=sim.g.inspectRace();if(r.car.status==='finished'){if(finishingScore===undefined)finishingScore=r.score;else stable&&=r.score===finishingScore;}}
 check(sim.g.raceResult().standings.every(r=>r.status==='finished')&&sim.g.raceResult().rank===1,'post-finish classification waits for actual opponents');
 check(finishingScore>0&&stable,'waiting for other finishers cannot penalize the player score');
 const old=sim.g.raceResult();sim.g.start();const fresh=sim.g.inspectRace();check(old.totalTime>0&&fresh.phase==='countdown'&&fresh.elapsed===0&&fresh.passes===0&&fresh.events.length===0,'retry resets grid, lights, history and official timings');
}
{
 const {g,result}=setup();g.testRaceState({time:109.999});g.update(1/120,{});
 check(result()&&!result()[0]&&g.raceResult().standings.every(r=>r.status==='dnf'&&r.time===null),'timeout classifies DNF without fabricated finish times');
}
{
 const late=setup(),early=setup();late.g.testRaceState({time:109.999,player:{z:3599.8,speed:74}});early.g.testRaceState({time:109.999,player:{z:3599.96,speed:74}});
 late.g.update(1/120,{});early.g.update(1/120,{});
 check(!late.result()[0]&&late.g.raceResult().totalTime===null,'a crossing after the deadline cannot sneak through the last physics tick');
 check(early.result()[0]&&early.g.raceResult().totalTime<110,'a crossing before the deadline is valid within the same tick');
}
console.log(`G06 RACING PASS ${checks} checks; ${races} complete races, five chapters, three difficulties, two seeds, 120/60/30/10 FPS; AI passes ${aiPasses}.`);
if(process.argv.includes('--json'))console.log(JSON.stringify({checks,races,aiPasses,brakingSamples,results}));
