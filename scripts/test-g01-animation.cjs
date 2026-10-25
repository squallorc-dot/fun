// Animation-driven damage, bounded input buffering, interruption, dodge cancellation and boss phase regression.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),artSource=fs.readFileSync(path.join(root,'arcade/assets/guardian-art.js'),'utf8'),engine=fs.readFileSync(path.join(root,'arcade/assets/games-core.js'),'utf8');
const neutral={fire:false,skill:false,jump:false,dodge:false,left:false,right:false,up:false,down:false,pointer:{down:false}};
function setup(hero=0,difficulty='normal') {let state=91;const rng=Object.create(Math);rng.random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);const s={window:{},Math:rng};vm.runInNewContext(artSource,s);vm.runInNewContext(engine,s);let result;const g=s.window.BioSuiteGames.g01({hero,difficulty,testMode:true,I:{hero:[]},sfx(){},finish(...r){result=r}});g.start();return {g,art:s.window.BioGuardianArt,state:()=>g.inspectCombat(),result:()=>result};}
const {art}=setup(),manifest=JSON.parse(fs.readFileSync(path.join(root,'arcade/assets/guardians/manifest.json'),'utf8'));
assert.equal(art.keys.length,11);assert.equal(art.totalFrames,71);assert.equal(Object.keys(art.clips).length,12);
for(const [name,c]of Object.entries(art.clips)){assert.equal(art.frameFor(name,0),c.offset);assert.equal(art.frameFor(name,NaN),c.offset);if(!c.loop)assert.equal(art.frameFor(name,c.duration*10),c.offset+c.frames-1);if(c.hit)assert(c.hit>0&&c.hit<c.duration);}
for(const item of manifest.atlases){const b=fs.readFileSync(path.join(root,'arcade/assets/guardians',item.file));assert.equal(b.readUInt32BE(16),1280);assert.equal(b.readUInt32BE(20),1440);assert.equal(b.length,item.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),item.sha256);}
let cases=0;
for(const level of ['normal','hard','expert'])for(let hero=0;hero<7;hero++)for(const fps of [120,60,30]){
 const {g,state}=setup(hero,level),dt=1/fps,step=(input={})=>g.update(dt,{...neutral,...input});
 const target=g.testSetup({dx:45,hp:5000,remaining:0,waveNumber:2});
 step({fire:true});assert.equal(target.hp,5000,'no damage during startup');assert.equal(state().player.clip,'attack1');
 let guard=0;while(state().player.action&&guard++<200)step();
 assert.equal(target.hp,5000-17*(hero===3?1.35:hero===2?1.2:1),'each attack deals damage once on its active frame');
 // A tap shortly before recovery ends is queued for the next combo, without auto-attacking forever.
 g.start();g.testSetup({dx:45,hp:5000,remaining:0,waveNumber:2});step({fire:true});
 while(state().player.action.time<art.clips.attack1.duration-.10)step();
 step({fire:true});guard=0;while(state().player.combo===1&&guard++<100)step();
 assert.equal(state().player.combo,2,'late attack tap is buffered');for(let n=0;n<fps;n++)step();assert.equal(state().player.combo,2,'buffer does not create unlimited attacks');
 // Being hit or dodging during startup cancels the pending strike.
 g.start();const blocked=g.testSetup({dx:45,hp:5000,remaining:0,waveNumber:2});step({fire:true});g.testWound(1);const x=state().player.x;
 for(let n=0;n<Math.floor(fps*.2);n++)step({right:true});assert.equal(state().player.x,x,'hurt stun stops movement');assert.equal(blocked.hp,5000,'interrupted attack cannot hit later');
 g.start();const missed=g.testSetup({dx:45,hp:5000,remaining:0,waveNumber:2});step({fire:true});step({dodge:true});for(let n=0;n<Math.ceil(fps*.15);n++)step();assert.equal(missed.hp,5000,'dodge cancels startup');assert(state().player.inv>0);
 g.start();step();assert.equal(state().player.clip,'idle','standing hero must not run in place');step({right:true});assert.equal(state().player.clip,'walk');g.start();assert.equal(state().player.action,null);assert.equal(state().player.clipTime,0);cases++;
}
// A half-health boss exposes three attacks, and its dash keeps the advertised target position.
for(const level of ['normal','hard','expert']){
 const {g,state}=setup(0,level),boss=g.testSetup({kind:'boss',dx:90,hp:1000,remaining:0,waveNumber:3});boss.hp=400;boss.attackCount=2;
 g.update(1/60,neutral);assert.equal(boss.stage,2);assert.equal(boss.attackKind,'charge');const targetY=boss.targetY;
 for(let i=0;i<65;i++)g.update(1/60,{...neutral,up:true});assert.equal(boss.targetY,targetY,'target does not silently track player');assert.equal(state().player.hp,state().player.max,'moving out of the advertised charge avoids damage');
 g.start();const victor=g.testSetup({kind:'boss',dx:42,hp:1,remaining:0,waveNumber:3});g.update(1/60,{...neutral,fire:true});let wonPose=false;
 for(let i=0;i<100&&!state().finished;i++){g.update(1/60,neutral);if(state().player.clip==='celebrate')wonPose=true;}assert(wonPose,'victory animation precedes the result');assert(state().finished);assert(victor.hp<=0);
}
{
 const {g,state}=setup(),target=g.testSetup({dx:45,hp:5000,remaining:0,waveNumber:2});g.update(1/120,{...neutral,fire:true});
 while(state().player.action.time<.09)g.update(1/120,neutral);g.update(1/120,{...neutral,dodge:true});assert.equal(target.hp,5000,'last-frame dodge cancels the strike before its active frame');
}
{
 const {g}=setup(1),boss=g.testSetup({kind:'boss',dx:150,hp:1000,remaining:0,waveNumber:3});boss.hp=400;boss.attackCount=2;
 for(let i=0;i<100&&!(boss.chargeTime>0);i++)g.update(1/60,{...neutral,up:true});assert(boss.chargeTime>0,'boss starts a visible dash');const x=boss.x;
 g.update(1/60,{...neutral,up:true});assert(boss.x<x&&boss.x>boss.chargeTargetX,'dash crosses space over multiple frames');g.testCharge();g.update(1/60,{...neutral,skill:true});assert.equal(boss.chargeTime,0,'electric interruption cancels dash instead of deferring it');
}
console.log(`G01 animation: ${cases} hero/difficulty/FPS cases; 781 authored frames; boss phase, targeting, interruption and result poses PASS`);
