// Seven Guardian specials should differ in mechanics, not only color or raw damage.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../arcade/assets/games-core.js'),'utf8');
const idle={left:false,right:false,up:false,down:false,jump:false,dodge:false,skill:false,fire:false,pointer:{down:false,x:0,y:0}};
function setup(hero,difficulty='normal'){
 let seed=371;const rng=Object.create(Math);rng.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const scope={window:{},console,Math:rng};vm.runInNewContext(source,scope);
 let result=null;const game=scope.window.BioSuiteGames.g01({hero,difficulty,testMode:true,I:{hero:['Burner','MJ','Moo','Ye Bao','Jelly','Veggie','Oracle'],skillLabels:['Flame','Chain','Fortify','Rush','Echo','Garden','Stasis']},sfx:()=>{},finish:(...args)=>{result=args;}});
 game.w=960;game.h=540;game.start();
 return{g:game,state:()=>game.inspectCombat(),result:()=>result};
}
function tick(g,n=1,input=idle){for(let i=0;i<n;i++)g.update(1/60,input);}
let count=0;
for(const level of ['normal','hard','expert'])for(let hero=0;hero<7;hero++){
 const {g,state}=setup(hero,level);
 g.testCharge();if(hero===5)g.testHealth(60);
 const close=g.testSetup({kind:'brute',dx:90,hp:2500,remaining:0,waveNumber:2});
 const far=g.testSetup({kind:'ranged',dx:155,hp:2500,remaining:0,waveNumber:2});
 const hp0=close.hp,playerBefore=state().player;
 tick(g,1,{...idle,skill:true});
 const info=state(),p=info.player;
 assert.equal(p.energy<100,true,`hero ${hero} energy must be consumed`);
 assert.equal(info.skill,['burn','chain','fortify','rush','echo','garden','stasis'][hero]);
 assert.equal(p.skillFlash>0,true,`hero ${hero} distinctive animation active`);
 switch(hero){
 case 0:assert(close.burn>1.9);assert(hp0>close.hp);{
  const before=close.hp;tick(g,42);assert(close.hp<before-2,'Burner deals damage over time');
 }break;
 case 1:assert(close.stun>.6&&far.stun>.6,'MJ chains to multiple targets');assert(info.effects.some(e=>e.type==='beam'),'electric beam visible');break;
 case 2:assert(p.shield>=2,'Moo grants armor');tick(g,42);{
  const hp=state().player.hp;const absorbed=g.testWound(40);assert.equal(absorbed,false);assert.equal(state().player.hp,hp,'shield prevents damage');
 }break;
 case 3:assert(p.x>playerBefore.x+180,'Ye Bao rushes forward');assert(p.haste>2.8,'Ye Bao gets haste');break;
 case 4:assert(p.echoTime>4,'Jelly echoes active');{
   const hp=close.hp;tick(g,45);assert(close.hp<hp,'echo companions deal repeat damage');
  }break;
 case 5:assert(p.hp>60,'Veggie heals');assert(p.gardenTime>4&&p.shield>=1,'Veggie casts a protecting garden');break;
 case 6:assert(close.stun>1.3&&far.stun>1.3,'Oracle freezes enemies');assert(info.effects.some(e=>e.type==='ring'&&e.r>230),'Oracle wave visible');break;
 }
 // Replaying must clear every temporary effect, shield and hero cooldown state.
 g.start();const again=state();assert.equal(again.player.energy,38);assert.equal(again.player.shield,0);assert.equal(again.player.echoTime,0);assert.equal(again.player.gardenTime,0);assert.equal(again.player.haste,0);assert.equal(again.enemies.length,0);count++;
}
console.log('G01 Guardian abilities:',count,'hero/difficulty scenarios PASS');