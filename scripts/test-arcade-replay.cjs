/* Regression: retries and viewport rotations must not corrupt mini-game state. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const file=path.resolve(__dirname,'../arcade/assets/games-core.js');
const src=fs.readFileSync(file,'utf8');
let seed=0x1025;
const rng=Object.create(Math);
rng.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const context={window:{},Math:rng,console};
vm.runInNewContext(src,context,{filename:file});
const R=context.window.BioSuiteGames;
const input={left:false,right:false,up:false,down:false,fire:false,jump:false,dodge:false,skill:false,pointer:{down:false,x:0,y:0}};
function make(id,mode='volley',difficulty='normal'){
 let result;
 const g=R[id]({hero:0,difficulty,mode,I:{hero:['Burner','MJ','Moo','Leaf','Jelly','Veggie','Oracle']},sfx:()=>{},finish:(...v)=>{result=v}});
 g.w=640;g.h=510;g.start();
 return {g,result:()=>result};
}
for(const level of ['normal','hard','expert']){
 // G03: start() must reset depth, lives, score, danger timer and terminal state.
 const a=make('g03','volley',level), g=a.g;
 for(let j=0;j<24;j++)g.update(1/60,{...input,down:true});
 const before=g.debugGeometry();
 assert(before.depth>0,`G03 ${level}: player advanced`);
 g.start();
 const reset=g.debugGeometry();
 assert.equal(reset.depth,0,`G03 ${level}: depth reset`);
 assert.equal(reset.player.hp,3,`G03 ${level}: health reset`);
 assert.equal(reset.player.y,90,`G03 ${level}: position reset`);
 assert.equal(reset.goal,1700,`G03 ${level}: fixed goal`);
 assert.equal(reset.camera,0,`G03 ${level}: camera reset`);
 assert.equal(g._finished,false,`G03 ${level}: clears result`);
 assert.equal(reset.platforms[0].y,135,`G03 ${level}: platform initial world position`);
 const startX=reset.player.x;
 const startY=reset.player.y;
 const y0=reset.platforms[0].y;
 g.onResize(640,510,375,812);g.w=375;g.h=812;
 const tall=g.debugGeometry();
 assert.equal(tall.goal,1700,`G03 ${level}: resize cannot change goal`);
 assert.equal(tall.player.y,startY,`G03 ${level}: resize cannot teleport player vertically`);
 assert.equal(tall.platforms[0].y,y0,`G03 ${level}: platforms keep world coordinates`);
 assert(Math.abs(tall.player.x-startX*375/640)<.01,`G03 ${level}: horizontal scaling`);
 assert(tall.platforms.every(v=>v.x>=0&&v.x+v.w<=375),`G03 ${level}: platforms fit viewport`);
 g.onResize(375,812,812,375);g.w=812;g.h=375;
 const wide=g.debugGeometry();
 assert.equal(wide.goal,1700,`G03 ${level}: repeated rotation cannot change goal`);
 assert.equal(wide.player.y,startY,`G03 ${level}: repeated rotation cannot warp height`);
 g.update(1/60,input);
 assert.equal(g._finished,false,`G03 ${level}: rotation cannot instantly finish`);

 // G04: a replay while the fire key was held must permit a new shot.
 const b=make('g04','volley',level),m=b.g;
 m.update(1/60,{...input,fire:true});
 assert.equal(m.debugPhysics().shots,level==='expert'?8:level==='hard'?10:13);
 m.start();
 const fresh=m.debugPhysics();
 assert.equal(fresh.hits,0,`G04 ${level}: clears hits`);
 assert.equal(fresh.score,0,`G04 ${level}: clears score`);
 assert.equal(fresh.balls.length,0,`G04 ${level}: clears active shots`);
 assert.equal(fresh.physicsDebt,0,`G04 ${level}: clears physics debt`);
 assert.equal(m._finished,false,`G04 ${level}: clears result`);
 m.update(1/60,{...input,fire:true});
 assert.equal(m.debugPhysics().shots,(level==='expert'?9:level==='hard'?11:14)-1,`G04 ${level}: first shot after replay registers`);

 // G05: every new match starts at 0–0, both volleyball and table tennis.
 for(const mode of ['volley','pong']){
  const c=make('g05',mode,level),v=c.g;
  for(let i=0;i<3000&&!c.result()&&v.hud().includes('YOU <b>0</b>')&&v.hud().includes('AI <b>0</b>');i++)v.update(1/60,input);
  assert(!v.hud().includes('YOU <b>0</b>')||!v.hud().includes('AI <b>0</b>')||c.result(),`G05 ${mode}: test reached scoring condition`);
  v.start();
  assert(v.hud().includes('YOU <b>0</b>'),`G05 ${mode}: your points reset`);
  assert(v.hud().includes('AI <b>0</b>'),`G05 ${mode}: AI points reset`);
  assert.equal(v._finished,false,`G05 ${mode}: result reset`);
  v.update(1/60,input);
  assert.equal(v._finished,false,`G05 ${mode}: new match remains active`);
 }
 console.log(`G03/G04/G05 replay and viewport rotation ${level}: PASS`);
}