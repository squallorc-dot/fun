/* G01 real-time combat regression: combo, telegraphs, projectiles, dodge, retry, endings. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../arcade/assets/games-core.js'),'utf8');
function harness(seed=17,difficulty='normal',hero=0){
 let state=seed>>>0;const math=Object.create(Math);math.random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 const sandbox={window:{},Math:math,console};vm.runInNewContext(source,sandbox);
 let result=null;const g=sandbox.window.BioSuiteGames.g01({hero,difficulty,testMode:true,I:{hero:['Burner','MJ','Moo','Leaf','Jelly','Veggie','Oracle']},sfx:()=>{},finish:(...args)=>{result=args}});g.w=960;g.h=540;g.start();
 return {g,finish:()=>result,reset:()=>{result=null}};
}
const neutral={up:false,down:false,left:false,right:false,jump:false,dodge:false,skill:false,fire:false,pointer:{down:false,x:0,y:0}};
function tick(g,n,action={}){for(let i=0;i<n;i++)g.update(1/60,{...neutral,...action});}
for(const level of ['normal','hard','expert']){
 const {g,finish,reset}=harness(18,level),before=g.inspectCombat();assert.equal(before.player.combo,0);assert.equal(before.finished,false);assert.equal(before.enemies.length,0);
 const grunt=g.testSetup({dx:55,hp:350});tick(g,1,{fire:true});assert.equal(grunt.hp,350,'startup does not damage target');tick(g,8);assert(grunt.hp<350,'active animation frame damages target');assert.equal(g.inspectCombat().player.combo,1);
 tick(g,22);tick(g,1,{fire:true});assert.equal(g.inspectCombat().player.combo,2,'second strike increments combo');
 tick(g,26);tick(g,1,{fire:true});assert.equal(g.inspectCombat().player.combo,3,'third strike increments combo');
 tick(g,18);assert(grunt.hp<290,'three-hit combo accumulated damage');
 g.start();const restart=g.inspectCombat();assert.equal(restart.enemies.length,0);assert.equal(restart.player.hp,restart.player.max);assert.equal(restart.player.combo,0);
 // Ranged attacks must emit an actual projectile, not instantly decrement player HP.
 const ranged=g.testSetup({kind:'ranged',dx:148,hp:900,remaining:0,waveNumber:2});let appeared=false,tele=false;
 for(let j=0;j<145;j++){g.update(1/60,neutral);const v=g.inspectCombat();if(v.enemies[0]?.tele>0)tele=true;if(v.projectiles.length>0){appeared=true;break;}}
 assert(tele,'ranged threat announces attack');assert(appeared,'ranged projectile materializes after telegraph');
 const shot=g.inspectCombat().projectiles[0];assert(Math.hypot(shot.vx,shot.vy)>100,'projectile travels in space');
 const hp=g.inspectCombat().player.hp;g.update(1/60,{...neutral,dodge:true});assert(g.inspectCombat().player.inv>0,'dodge grants brief invulnerability');
 assert.equal(g.inspectCombat().player.hp,hp);
 g.start();g.testSetup({kind:'boss',dx:84,hp:300,remaining:0,waveNumber:3});let warned=false;
 for(let i=0;i<95;i++){g.update(1/60,neutral);if(g.inspectCombat().enemies.some(e=>e.tele>0)){warned=true;break;}}
 assert(warned,'boss displays a warning phase');
 g.start();g.testSetup({kind:'boss',dx:42,hp:2,remaining:0,waveNumber:3});tick(g,1,{fire:true});
 for(let i=0;i<90&&!finish();i++)tick(g,1);
 assert(finish()&&finish()[0]===true,'boss defeat wins final wave');
 g.start();assert.equal(g.inspectCombat().finished,false,'retry clears ending state');
 const h2=harness(29,level,3);let outcome=null;
 for(let i=0;i<12000&&!h2.finish();i++){h2.g.update(1/60,neutral);}
 outcome=h2.finish();assert(outcome&&outcome[0]===false,'idle hero is defeated with result');
 console.log('G01',level,'combos projectile telegraph dash boss victory defeat restart: PASS');
}