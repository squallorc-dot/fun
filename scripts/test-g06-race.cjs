/* G06 track regressions — mandatory gates, 3 verified laps, retry, AI pilot and frame cadences.
   Runs in Node without network, browsers, or game art. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../arcade/assets/games-core.js'),'utf8');
function setup(seed=1,difficulty='normal'){
 let state=seed>>>0;
 const math=Object.create(Math);
 math.random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 const cx={window:{},Math:math,console};vm.runInNewContext(source,cx);
 let finish=null;
 const g=cx.window.BioSuiteGames.g06({hero:3,difficulty,testMode:true,sfx:()=>{},finish:(...args)=>{finish=args}});
 g.w=960;g.h=540;g.start();
 return {g,getFinish:()=>finish,resetFinish:()=>{finish=null}};
}
const empty={up:true,down:false,fire:false,skill:false,left:false,right:false};
function inputFor(g){const r=g.inspectRace(),lane=r.car.lane;
 const next=r.traffic.filter(o=>!o.hit&&o.z>r.progress).sort((a,b)=>a.z-b.z)[0];
 let target=0;
 if(next&&next.z-r.progress<115)target=next.lane>0?-.85:.85;
 return {...empty,left:lane>target+.025,right:lane<target-.025};
}
// A player who drives off the road is physically blocked at an unmet checkpoint,
// and can recover by steering into the valid lane before crossing.
const blocked=setup(3);
for(let i=0;i<1800;i++){blocked.g.update(.016,{...empty,right:true});if(blocked.g.inspectRace().progress>=399.98)break;}
let r=blocked.g.inspectRace();
assert.equal(r.checkpointIndex,0);assert(r.car.lane>.93);assert(r.progress<400);assert.equal(blocked.getFinish(),null);
for(let i=0;i<250;i++){blocked.g.update(.016,{...empty,left:r.car.lane>.65});r=blocked.g.inspectRace();if(r.checkpointIndex>0)break;}
assert.equal(r.checkpointIndex,1,'entering the road should unlock the checkpoint');
console.log('G06 mandatory checkpoint rejection and recovery: PASS');

let victories=0;
for(const difficulty of ['normal','hard','expert']){
 for(const dt of [1/120,1/60,1/30]){
  for(let seed=1;seed<=12;seed++){
   const sim=setup(seed,difficulty);
   for(let step=0;step<Math.ceil(110/dt)&&!sim.getFinish();step++){
    sim.g.update(dt,inputFor(sim.g));
    const p=sim.g.inspectRace();
    assert(p.checkpointIndex<=9&&p.checkpointIndex>=0,'gate counter bounds');
    assert(p.lap>=1&&p.lap<=3,'lap counter bounds');
    assert(p.progress<=3601,'progress bounds');
   }
   const result=sim.getFinish(),end=sim.g.inspectRace();
   assert(result&&result[0]===true,`seed ${seed} ${difficulty} ${dt} failed (${JSON.stringify(result)}, ${JSON.stringify(end).slice(0,230)})`);
   assert.equal(end.checkpointIndex,9,'victory requires all nine gates');
   assert.equal(end.lap,3);
   assert.equal(end.finished,true);
   victories++;
   // Restarting the same instance must clear completion latch and all race counters.
   sim.g.start();const restarted=sim.g.inspectRace();
   assert.equal(restarted.finished,false);
   assert.equal(restarted.progress,0);
   assert.equal(restarted.checkpointIndex,0);
   assert.equal(restarted.car.health,100);
  }
 }
}
console.log(`G06 ${victories} seeded complete 3-lap races at 120/60/30 fps and 3 difficulties: PASS`);
console.log('G06 same-instance retry and state reset: PASS');

// Braking must stop distance and projected road movement, while rivals keep driving.
const stopped=setup(5).g;
stopped.testPlace({speed:36,keepTraffic:true});
for(let i=0;i<120;i++)stopped.update(1/60,{...empty,down:true});
const parked=stopped.inspectRace();assert.equal(parked.car.speed,0);
for(let i=0;i<120;i++)stopped.update(1/60,{...empty,down:true});
const later=stopped.inspectRace();assert.equal(later.progress,parked.progress);
assert.deepEqual(later.roadSample,parked.roadSample,'road cannot scroll when the car is stopped');
assert(later.traffic.find(o=>o.type==='car').z>parked.traffic.find(o=>o.type==='car').z,'rivals drive independently');

stopped.testPlace({lane:1.2,speed:30});
for(let i=0;i<120;i++)stopped.update(1/60,{...empty,down:true});
assert.equal(stopped.inspectRace().car.speed,0,'brakes also stop the car on the shoulder');

// A displayed obstacle shares the player's road projection and lane collision rules.
const collision=setup(6).g;
collision.testPlace({distance:100,lane:.5,obstacle:{lane:.5}});
collision.update(1/120,{...empty,down:true});assert.equal(collision.inspectRace().collisions,1);
collision.testPlace({distance:100,lane:-.6,obstacle:{lane:.5}});
collision.update(1/120,{...empty,down:true});assert.equal(collision.inspectRace().collisions,1,'clear adjacent lane must not collide');
const firstLap=collision.inspectRace().roadSample;
collision.testPlace({distance:1300,lane:-.6});
const secondLap=collision.inspectRace().roadSample;
assert(Math.abs(firstLap.x-secondLap.x)<.001&&Math.abs(firstLap.y-secondLap.y)<.001,'each lap uses the same closed track');

// Passing an independently moving rival awards exactly one overtake bonus.
const overtake=setup(7).g;
overtake.testPlace({distance:100,lane:-.5,speed:74,obstacle:{type:'car',lane:.5,ahead:1,speed:38}});
for(let i=0;i<60;i++)overtake.update(1/60,empty);
assert.equal(overtake.inspectRace().passes,1);
for(let distance=0;distance<3600;distance+=30)for(const lane of [-.93,0,.93]){
 collision.testPlace({distance,lane});const screen=collision.inspectRace().playerScreen;
 assert(screen&&screen.x>20&&screen.x<collision.w-20,'car stays inside horizontal camera frame');
 assert(screen.y>collision.h*.65&&screen.y<collision.h*.90,'slopes cannot clip the car below the screen');
}
console.log('G06 stationary camera, independent rivals, world collisions, closed track, overtaking and 360 camera positions: PASS');
