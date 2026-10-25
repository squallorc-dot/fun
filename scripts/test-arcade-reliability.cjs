// Additional geometry and fixed-step regression tests for G03 and G04.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const code=fs.readFileSync(path.resolve(__dirname,'../arcade/assets/games-core.js'),'utf8');
function instance(game,seed,difficulty='normal',size={w:640,h:510}){
 let state=seed>>>0;const random=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296};
 const rng=Object.create(Math);rng.random=random;
 const ctx={Math:rng,window:{},console};vm.runInNewContext(code,ctx);
 let finished=null;const env={hero:0,difficulty,testMode:true,mode:'volley',I:{hero:Array.from({length:7},(_,i)=>String(i))},sfx:()=>{},finish:(...r)=>finished=r,ga:()=>{}};
 const g=ctx.window.BioSuiteGames[game](env);g.w=size.w;g.h=size.h;g.start();return{g,result:()=>finished};
}
const idle={left:false,right:false,up:false,down:false,jump:false,fire:false,skill:false,pointer:{down:false,x:0,y:0}};
let geometries=0;
for(const size of [{w:375,h:440},{w:640,h:510},{w:960,h:540}])for(const difficulty of ['normal','hard','expert'])for(let seed=1;seed<=100;seed++){
 const {g}=instance('g03',seed,difficulty,size);const geo=g.debugGeometry();assert.ok(geo.platforms.length>=8);
 const grav=650*(difficulty==='normal'?1:difficulty==='hard'?1.18:1.35);
 for(let i=1;i<geo.platforms.length;i++){
  const a=geo.platforms[i-1],b=geo.platforms[i],gap=b.y-a.y;
  assert.ok(gap>0&&gap<=114,`vertical gap ${gap}`);
  const left=a.x,right=a.x+a.w,nextLeft=b.x,nextRight=b.x+b.w;
  const horizontalGap=Math.max(0,nextLeft-right,left-nextRight)+ (b.type==='moving'?26:0);
  const transit=Math.sqrt(2*Math.max(gap,30)/grav);
  assert.ok(horizontalGap<260*transit+10,`unreachable platforms seed ${seed} size ${size.w} difficulty ${difficulty} ${i}`);
 }
 geometries++;
}
// Verify down-control drops through the start platform instead of forcing players to walk off its edge.
const {g:stairs}=instance('g03',7);for(let i=0;i<60;i++)stairs.update(.016,idle);
const before=stairs.debugGeometry();assert.ok(before.player.ground,'G03 player needs to start on the initial platform');
for(let i=0;i<27;i++)stairs.update(.016,{...idle,down:true});
const after=stairs.debugGeometry();assert.ok(after.player.y>before.player.y+15,`Down should drop through platforms ${before.player.y} -> ${after.player.y}`);
console.log('G03 geometry: 900 seeded maps + down-control PASS');
// Holding down consumes one platform only; the next safe platform still catches the player.
const {g:held}=instance('g03',1,'normal',{w:480,h:720});
for(let i=0;i<60;i++)held.update(1/60,idle);
let landed=false;
for(let i=0;i<180;i++){
 held.update(1/60,{...idle,down:true});
 const state=held.debugGeometry();
 if(i>20&&state.player.ground){landed=true;assert(state.depth<330,'one press cannot skip the entire shaft');break;}
}
assert(landed,'holding down must land on the next reachable platform');
console.log('G03 held drop catches next platform: PASS');
const falling=instance('g03',17,'normal',{w:480,h:720});falling.g.testFreeFall();
for(let i=0;i<300&&!falling.result();i++)falling.g.update(1/60,idle);
assert.equal(falling.result()?.[0],false,'uninterrupted freefall must not clear the game');
assert(falling.g.debugGeometry().depth<1700,'freefall loses lives before reaching the goal');
assert.equal(falling.g.debugGeometry().player.hp,0);
const landing=instance('g03',1,'normal',{w:480,h:720}).g;
for(let i=0;i<60;i++)landing.update(1/60,idle);
let landedAfterDrop=false;
for(let i=0;i<180;i++){landing.update(1/60,{...idle,down:true});const state=landing.debugGeometry();if(i>20&&state.player.ground){landedAfterDrop=true;assert.equal(state.player.fallFrom,state.player.y,'landing resets fall distance');assert.equal(state.player.hp,3,'ordinary platform descent stays safe');break;}}
assert(landedAfterDrop);
console.log('G03 freefall defeat and safe landing reset: PASS');
function simulateMarble(dt){const {g}=instance('g04',117,'normal');let time=0,started=false;
 while(time<5-0.00001){const step=Math.min(dt,5-time);g.update(step,{...idle,fire:!started});started=true;time+=step;}
 return g.debugPhysics();}
const a=simulateMarble(1/120),b=simulateMarble(1/30),c=simulateMarble(1/20);
for(const [x,label] of [[b,'30fps'],[c,'20fps']]){
 assert.equal(x.shots,a.shots,`shot count at ${label}`);
 assert.equal(x.hits,a.hits,`hit count at ${label}`);
 assert.ok(Math.abs(x.balls[0]?.x-a.balls[0]?.x||0)<5,`marble x ${label}`);
}
console.log('G04 fixed physics: 120/30/20 fps outcomes PASS');
const {g:recall}=instance('g04',117);
for(let i=0;i<60;i++)recall.update(1/60,idle);
recall.update(1/60,{...idle,fire:true});const fired=recall.debugPhysics();
assert(fired.balls.length>0);
recall.update(1/60,{...idle,skill:true});
assert.equal(recall.debugPhysics().balls.length,0,'recall immediately clears the active shot');
assert.equal(recall.debugPhysics().shots,fired.shots,'recall does not refund ammunition');
recall.update(1/60,{...idle,fire:true});
assert.equal(recall.debugPhysics().shots,fired.shots-1,'player can aim and fire again after recall');
console.log('G04 recall and next shot: PASS');
