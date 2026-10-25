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
 const g=cx.window.BioSuiteGames.g06({hero:3,difficulty,sfx:()=>{},finish:(...args)=>{finish=args}});
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