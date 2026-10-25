// Contact shadows must stay on actual support surfaces while the rendered body jumps.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../arcade/assets/games-core.js'),'utf8');
const empty={left:false,right:false,up:false,down:false,jump:false,fire:false,pointer:{down:false}};
function create(id){
 const sprites=[],window={BioGuardianArt:{preload(){},draw(...args){sprites.push({id:args[1],x:args[4],feet:args[5]});return true;}}};
 vm.runInNewContext(source,{window,Math});const game=window.BioSuiteGames[id]({hero:0,mode:'volley',difficulty:'normal',testMode:true,I:{hero:['Hero']},sfx(){},finish(){}});game.w=id==='g03'?480:640;game.h=id==='g03'?720:480;game.start();
 function render(){
  const fills=[];let ellipse=null;const style=[];
  const target={fillStyle:'',beginPath(){ellipse=null;},ellipse(...args){ellipse=args;},fill(){if(ellipse)fills.push({x:ellipse[0],y:ellipse[1],color:target.fillStyle});},save(){style.push(target.fillStyle);},restore(){target.fillStyle=style.pop()||'';},createLinearGradient(){return {addColorStop(){}};}};
  const ctx=new Proxy(target,{get:(o,key)=>key in o?o[key]:()=>{}});sprites.length=0;game.draw(ctx);
  return {shadows:fills.filter(p=>p.color==='#020a14'),sprites:[...sprites]};
 }
 return {game,render};
}
const platform=create('g03');
for(let i=0;i<90&&!platform.game.debugGeometry().player.ground;i++)platform.game.update(1/60,empty);
let state=platform.game.debugGeometry();assert(state.player.ground);
let picture=platform.render();assert(Math.abs(picture.shadows[0].y-(state.player.y+state.player.r-state.camera))<.001);
platform.game.update(1/60,{...empty,jump:true});for(let i=0;i<8;i++)platform.game.update(1/60,empty);
state=platform.game.debugGeometry();picture=platform.render();
assert(!state.player.ground);assert(picture.shadows[0].y>picture.sprites[0].feet+10,'jumping sprite separates from its platform shadow');
assert(state.platforms.some(p=>Math.abs(p.y-state.camera-picture.shadows[0].y)<.001),'shadow belongs to a real platform');
platform.game.testFreeFall();assert.equal(platform.render().shadows.length,0,'unsupported free fall cannot cast a floating contact ellipse');
const volley=create('g05');let match=volley.game.inspectMatch();const floor=match.field.floor;
picture=volley.render();assert.equal(picture.shadows.filter(p=>Math.abs(p.y-floor)<.001).length,2);
volley.game.update(1/60,{...empty,jump:true});for(let i=0;i<8;i++)volley.game.update(1/60,empty);
match=volley.game.inspectMatch();picture=volley.render();const player=picture.sprites.find(p=>p.id===0),shadow=picture.shadows.find(p=>Math.abs(p.x-match.player.x)<.001);
assert(!match.player.ground);assert.equal(shadow.y,floor,'volleyball shadow stays on the court');
assert(Math.abs(player.feet-(match.player.y+match.field.body))<.001,'sprite feet follow the actual jumping body');
assert(player.feet<shadow.y-10);
console.log('GROUNDING PASS: platform contact, jumping support, unsupported free fall and volleyball court shadows.');
