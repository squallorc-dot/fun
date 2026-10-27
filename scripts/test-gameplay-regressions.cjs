'use strict';const assert=require('node:assert/strict');const {create}=require('./lib/gameplay-probe.cjs');const {shooter}=require('./lib/arcade-engine-probe.cjs');
let checks=0;const check=(v,s)=>{assert(v,s);checks++;};
async function run(){
 if(!process.argv[2]||process.argv[2]==='g01'){
  const v=create({id:'g01',hero:3,testMode:true});for(let tick=0;tick<600;tick++)v.g.update(1/120,{moveX:1,jump:tick%120===0,dodge:tick%120===60});v.g.testSetup({kind:'ranged',dx:100,hp:10000,waveNumber:2,remaining:0});
  for(let tick=0;tick<240;tick++)v.g.update(1/120,{moveX:0,jump:tick%120===0,dodge:tick%120===60});
  const s=v.snapshot();check(s.enemies.filter(e=>e.type==='ranged').every(e=>e.x<=v.g.w-24),'G01 ranged enemy cannot retreat forever beyond the playable right edge');check(s.enemies.some(e=>e.type==='ranged'&&Math.abs(e.x-s.player.x)<90),'G01 ranged enemy remains reachable by normal melee');
 }
 if(!process.argv[2]||process.argv[2]==='g02'){
  // Arrange a dead boss with enemies still due; the production cleanup must
  // continue the third wave instead of invoking a fake/test-only win.
  const clocked=await shooter();for(let tick=0;tick<156;tick++)clocked.updateStep(1/120);clocked.refreshHud();check(!clocked.element('#arcade-banner').classList.contains('is-visible'),'G02 wave banner follows simulation time, not elapsed wall time');
  const p=await shooter({chapter:5});p.beginWave(3);p.liveGame().boss.hp=0;p.loop(1000/120);
  check(p.state().phase==='playing','G02 killing Boss cannot skip pending third-wave enemies');check(p.liveGame().spawnLeft>0,'G02 complete enemy quota remains pending after Boss defeat');
  const lost=await shooter();lost.beginWave(3);const dying=lost.liveGame();dying.p.hp=1;dying.boss.hp=0;dying.hostiles.push({x:dying.p.x,y:dying.p.y,vx:0,vy:0,r:6,damage:99,life:1});lost.loop(1000/120);check(lost.state().phase==='defeat','G02 lethal collision settles defeat once');check(lost.liveGame().score===0,'G02 score cannot change after the defeat was reported');
 }
 if(!process.argv[2]||process.argv[2]==='g03'){
  const v=create({id:'g03',chapter:2,testMode:true}),y=v.g.testPlatformRide();let s=v.snapshot(),offset=s.player.x-s.platforms.find(f=>f.y===y).actualX;
  for(let tick=0;tick<120;tick++){const old=s;v.g.update(1/120,{});s=v.snapshot();const f=s.platforms.find(f=>f.y===y);check(s.player.ground&&Math.abs(s.player.x-f.actualX-offset)<1e-6,'G03 moving platform carries a standing player without slipping');check(Math.abs(s.player.x-old.player.x)<=35*2.1/120+.001,'G03 carried motion is bounded, never a teleport');}
 }
 if(!process.argv[2]||process.argv[2]==='g05'){
  const v=create({id:'g05',mode:'pong',testMode:true});v.g.testTableBall({});v.ctx.Math.random=()=>.999;v.g.update(1/120,{});check(v.snapshot().ball.lastHitter===0,'G05 fixture rolls a genuine first AI miss');check(v.snapshot().ai.swing>0,'G05 missed AI stroke still shows its original swing animation');v.ctx.Math.random=()=>0;v.g.update(1/120,{});check(v.snapshot().ball.lastHitter===0,'G05 AI cannot reroll a missed stroke on the next physics tick');
  for(const chapter of [1,5])for(const difficulty of ['normal','hard','expert']){const p=create({id:'g05',mode:'pong',chapter,difficulty,testMode:true});let returned=0;for(let shot=0;shot<1000;shot++){p.g.testTableBall({});let first=true;p.ctx.Math.random=()=>{if(first){first=false;return (shot+.5)/1000;}return 0;};for(let n=0;n<6;n++)p.g.update(1/120,{});if(p.snapshot().ball.lastHitter===1)returned++;}const expected=Math.round(Math.min(.997,({normal:.955,hard:.985,expert:.997})[difficulty]+(chapter-1)*.008)*1000);check(returned===expected,'G05 configured per-stroke accuracy is honored: '+chapter+'/'+difficulty);console.log('TABLE ACCURACY '+chapter+'/'+difficulty+' '+returned+'/1000 (configured '+expected+'/1000)');}
 }
 if(!process.argv[2]||process.argv[2]==='g04'){
  const v=create({id:'g04',chapter:5,testMode:true});for(let i=0;i<100;i++)v.g.update(1/120,{});let s=v.snapshot();const target=s.targets[0];v.g.testBall({x:target.x,y:target.y,vx:0,vy:0});v.g.update(1/120,{});s=v.snapshot();check(s.targets[0].hp===target.hp-1&&s.hits===1,'G04 stationary contact cannot fabricate repeated hits on armor');check(s.balls.length===0,'G04 motionless ball is retired instead of blocking input');
  v.g.testBall({x:17,y:620,vx:0,vy:-20});for(let i=0;i<970;i++)v.g.update(1/120,{});check(v.snapshot().balls.length===0&&!v.result(),'G04 bounded ball lifetime preserves a playable next shot');const before=v.snapshot().shots;v.g.update(1/120,{fire:true});check(v.snapshot().shots===before-1&&v.snapshot().balls.length===1,'G04 ordinary fire works after retirement');
 }
 console.log('GAMEPLAY REGRESSION PASS '+checks+' checks');
}run().catch(e=>{console.error(e);process.exitCode=1;});
