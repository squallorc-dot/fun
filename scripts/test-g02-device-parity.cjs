/* Same real shooter, seed and input across device sizes and frame cadences. */
'use strict';
const assert=require('node:assert/strict');
const {shooter}=require('./lib/arcade-engine-probe.cjs');
const devices=[
 {name:'desktop',viewport:{width:1440,height:900},coarse:false,fps:60},
 {name:'portrait',viewport:{width:390,height:844},coarse:true,fps:15},
 {name:'landscape',viewport:{width:844,height:390},coarse:true,fps:10}
];
let cases=0,checks=0;
async function run(){
 for(const difficulty of ['normal','hard','expert'])for(let chapter=1;chapter<=5;chapter++)for(let hero=0;hero<7;hero++)for(let wave=1;wave<=3;wave++){
  const label=[difficulty,chapter,hero,wave].join('/');let expected;
  for(const device of devices){
   const p=await shooter({hero,chapter,difficulty,seed:71+hero,...device});
   p.beginWave(wave);
   const initial=JSON.parse(p.snapshot()).game;
   // A six-second no-input sample includes real spawns, pursuit, damage,
   // hazards and (wave 3) boss fire. No enemy removal or invulnerability fixture.
   assert.equal(initial.spawnLeft,[8,12,7][wave-1]+Math.min(chapter-1,3)*2,label+' full wave quota');checks++;
   for(let n=1;n<=device.fps*6;n++)p.loop(n/device.fps*1000);
   const sample=JSON.parse(p.snapshot());
   assert.equal(sample.phase,'playing',label+' sample must run to completion');
   assert.equal(p.state().simulation.ticks,720,label+' six seconds at 120 Hz');
   assert(sample.game.enemies.length>0&&sample.game.spawnLeft<initial.spawnLeft,label+' actual enemies spawned');
   assert.equal(sample.game.enemies.length+sample.game.spawnLeft,initial.spawnLeft,label+' every enemy retained');checks+=4;
   if(expected){assert.equal(p.snapshot(),expected,label+' '+device.name+' enemy counts, spawn timer, stats, damage, positions and effects match desktop');checks++;}
   else expected=p.snapshot();
   cases++;
  }
 }
 console.log(`G02 DEVICE PARITY PASS ${checks} checks; ${cases} device/wave samples, 7 heroes, 5 chapters, 3 difficulties, all 3 waves, desktop 60 / portrait 15 / landscape 10 FPS.`);
}
run().catch(error=>{console.error(error);process.exitCode=1;});
