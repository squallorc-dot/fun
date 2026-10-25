'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.resolve(__dirname,'../arcade/assets/games-core.js'),'utf8');
const neutral={left:false,right:false,up:false,down:false,fire:false,jump:false,skill:false,dodge:false,pointer:{down:false,x:0,y:0}};
function newGame(difficulty='normal',w=640,h=510){
 const ctx={window:{},Math,console};vm.runInNewContext(source,ctx);let result=null;
 const env={hero:0,difficulty,mode:'volley',testMode:true,I:{hero:['Burner']},sfx:()=>{},finish:(...args)=>{result=args;}};
 const g=ctx.window.BioSuiteGames.g04(env);g.w=w;g.h=h;g.start();return {g,result:()=>result,clear:()=>{result=null;}};
}
let cases=0;
for(const difficulty of ['normal','hard','expert'])for(const size of [{w:375,h:440},{w:640,h:510},{w:960,h:540}]){
 const {g,result}=newGame(difficulty,size.w,size.h);const s=g.debugPhysics();
 assert.equal(s.stage,1);assert.equal(s.totalStages,3);assert.equal(s.targets.length,4);
 assert(s.shots>=7);assert(!result());
 // Stage 1 centre target must be hittable by a real straight shot.
 for(let i=0;i<52;i++)g.update(1/60,neutral);
 g.update(1/60,{...neutral,fire:true});assert.equal(g.debugPhysics().shots,s.shots-1);
 for(let i=0;i<82;i++)g.update(1/60,neutral);
 assert(g.debugPhysics().hits>=1,`real shot should hit centre target on ${size.w} ${difficulty}`);
 // The new model preserves game progress across stages without granting victory after stage 1.
 g.testClearStage();g.update(1/60,neutral);const two=g.debugPhysics();
 assert.equal(two.stage,2);assert.equal(two.targets.length,6);assert(!result());assert(two.score>s.score);
 assert(two.stageHistory.length===1&&two.stageHistory[0].won);
 g.testClearStage();g.update(1/60,neutral);const three=g.debugPhysics();
 assert.equal(three.stage,3);assert.equal(three.targets.length,8);assert.equal(three.targets.find(q=>q.maxHp===3).hp,3);
 assert(!result());g.testClearStage();g.update(1/60,neutral);
 assert(result()&&result()[0]===true,`winning all three stages (${difficulty})`);
 assert.equal(g.debugPhysics().stageHistory.length,3);
 g.start();assert.equal(g.debugPhysics().stage,1);assert.equal(g.debugPhysics().score,0);
 assert.equal(g.debugPhysics().stageHistory.length,0);assert(!g._finished);
 cases++;
}
// Losing stage 1 must not silently skip to subsequent stages.
const lost=newGame('expert'),g=lost.g;
for(let i=0;i<55;i++)g.update(1/60,neutral);
// Once the player runs out of ammunition the match must produce an actual defeat.
for(let shots=0;shots<25&&!lost.result();shots++){
 g.update(1/60,{...neutral,fire:true});g.update(1/60,neutral);
 for(let i=0;i<520&&!lost.result();i++)g.update(1/60,neutral);
}
assert(lost.result()&&lost.result()[0]===false,'no ammo -> defeat on first stage');
assert.equal(g.debugPhysics().stage,1);
function replayAt(fps){const v=newGame('normal'),g=v.g;for(let i=0;i<Math.round(fps*.9);i++)g.update(1/fps,neutral);
 g.update(1/fps,{...neutral,fire:true});g.update(1/fps,neutral);
 for(let i=0;i<Math.round(fps*3);i++)g.update(1/fps,neutral);
 return g.debugPhysics();}
const a=replayAt(120);for(const hz of [30,20]){const b=replayAt(hz);assert.equal(a.stage,b.stage);assert.equal(a.shots,b.shots);assert.equal(a.hits,b.hits);assert(Math.abs((a.balls[0]?.x||0)-(b.balls[0]?.x||0))<6,`fixed-step ${hz} x`);}
console.log(`G04: ${cases} three-stage completion/retry suites, natural hit, ammo defeat, 120/30/20 fps PASS`);