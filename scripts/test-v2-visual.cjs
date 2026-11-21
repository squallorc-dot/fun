/* Phase 1A: render-only visual tiers must not change game authority or bytes. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const visualCode=read('arcade/assets/visual-v2.js'),coreCode=read('arcade/assets/games-core.js');
let checks=0;const check=(value,message)=>{assert(value,message);checks++;};
const gradients=()=>({addColorStop(){}});
const ink=()=>{const words=[];const raw={canvas:{width:960,height:800},createLinearGradient:gradients,createRadialGradient:gradients,measureText:s=>({width:String(s).length*8}),fillText:(text,x,y,font)=>words.push({text,x,y,font})};const ctx=new Proxy(raw,{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>{o[k]=v;return true;}});return {ctx,words};};
function create(seed=741){
 let state=seed>>>0,time=0;
 const math=Object.create(Math);math.random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 const scope={window:{},Math:math,console,performance:{now:()=>time},Date,Map,Set,Promise,Uint8Array};
 vm.runInNewContext(visualCode,scope,{filename:'visual-v2.js'});
 vm.runInNewContext(coreCode,scope,{filename:'games-core.js'});
 return {scope,advance:()=>time+=8.33333};
}
const modes=['low','standard','high'],games=['g01','g03','g04','g05','g06'];
for(const id of games){
 const results=[];
 for(const quality of modes){
  const {scope,advance}=create(8741),visual=scope.window.BioVisualV2;
  check(visual.setQuality(quality)&&visual.getQuality()===quality,'valid quality '+quality);
  const output=[],env={hero:0,remoteHero:3,multiplayer:true,authority:true,sessionCountdown:true,mode:id==='g05'?'pong':'coop',chapter:1,difficulty:'normal',I:{hero:['Burner','MJ','Moo','Ye Bao','Jelly','Veggie','Oracle'],skillLabels:['Fire']},sfx(){},ga(){},finish:(...args)=>output.push(args),renderScale:1,cupPoints:null,clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),rnd:(a,b)=>a+(b-a)*.5};
  const game=scope.window.BioSuiteGames[id](env);
  const size={g01:[800,600],g03:[480,720],g04:[600,720],g05:[640,480],g06:[640,800]}[id];
  game.w=size[0];game.h=size[1];game.start();
  const {ctx}=ink();
  for(let n=0;n<90;n++){
   const input={moveX:n%40<20?.38:-.38,moveY:0,left:n%40>=20,right:n%40<20,up:n%30===0,down:false,fire:n%9===0,jump:n%23===0,dodge:false,skill:false};
   if(game.setRemoteInput)game.setRemoteInput({...input,fire:n%11===0});
   game.update(1/120,input);advance();
   if(n%30===0)game.draw(ctx);
  }
  const value=game.networkSnapshot(),json=JSON.stringify(value);
  const result={json,bytes:Buffer.byteLength(json,'utf8'),finished:!!game._finished,finish:JSON.stringify(output)};
  check(!json.includes('BioVisualV2')&&!json.includes('particleCap')&&!json.includes('activeParticles'),'no visual fields in '+id);
  check(visual.inspect().particleCap===64&&visual.inspect().eventCap===128,'bounded visual bookkeeping');
  results.push(result);
 }
 for(const [i,r]of results.entries())check(r.json===results[0].json&&r.bytes===results[0].bytes&&r.finished===results[0].finished&&r.finish===results[0].finish,id+' tier '+modes[i]+' keeps identical serialized authority and result');
}
// Both the existing score and chapter caption must fit inside the safe top band.
for(const mode of ['pong','volley']){
 const {scope}=create(42),output=[],g=scope.window.BioSuiteGames.g05({mode,multiplayer:false,hero:0,remoteHero:3,chapter:1,difficulty:'normal',I:{hero:['Burner']},finish:(...v)=>output.push(v),sfx(){}});
 g.w=640;g.h=480;g.start();const {ctx,words}=ink();g.draw(ctx);
 const caption=words.find(w=>w.text.includes('CH 1')),score=words.find(w=>/^\d+\s+:\s+\d+$/.test(w.text));
 check(caption&&score&&score.y-caption.y>=34&&score.y<110,mode+' G05 chapter caption clears score baseline and playfield');
}
// Duplicated guest events are suppressed and never exceed bounded local storage.
const {scope}=create(),v=scope.window.BioVisualV2,{ctx}=ink();
check(v.emit('g06','collision-1','impact',50,70,'#fff',.5),'first visual event accepted');
check(!v.emit('g06','collision-1','impact',50,70,'#fff',.5),'same guest event rejected');
for(let i=0;i<200;i++)v.emit('g06','evt-'+i,'impact',50,70,'#fff',i);
check(v.inspect().activeParticles<=64,'all local FX respect preallocated pool');
check(Number.isFinite(v.holdFrame('g06',10))&&v.paint(ctx,'g06')<=64,'visual hit hold and draw do not need simulation stepping');
check(!v.setQuality('invalid'),'invalid quality rejected');
const core=coreCode,world=read('arcade/assets/world-art.js'),guardian=read('arcade/assets/guardian-art.js');
check(core.includes("window.BioVisualV2?.trackImpact")&&core.includes("window.BioVisualV2?.paint")&&core.includes("window.BioVisualV2?.vehicleGlint"),'G01 and G06 hooks installed');
check(world.includes('BioVisualV2?.ambient')&&guardian.includes('BioVisualV2?.spriteLight'),'common world and sprite hooks installed');
const rawWorld=world.slice(world.indexOf('function draw('),world.indexOf('function livingScene('));
const overlayWorld=world.slice(world.indexOf('function chapterAtmosphere('),world.indexOf('function chapterLandmarks('));
check(!rawWorld.includes('BioVisualV2?.ambient')&&overlayWorld.includes('BioVisualV2?.ambient?.(ctx,key,w,h)'),'DPR raw WebP/cache draw stays pixel-identical while separate atmosphere holds v2 lighting');
check(core.includes("window.BioVisualV2?.ambient?.(ctx,'race',w,h)"),'G06 race lighting remains in presentation-only draw path');
check(world.includes("key==='street'&&c===4?.055:.17")&&world.includes("key==='street'&&c===4?.10"),'G01 fourth-chapter art strips are attenuated');
const css=read('assets/arcade.css');
check(css.includes('#arcade-root.arcade-embedded .arcade-top-actions [data-ar-command="sound"]')&&css.includes('#arcade-root.arcade-embedded .arcade-top-actions [data-ar-command="controls"]'),'G02 redundant embedded controls hidden without removing DOM');
for(const locale of ['zh','ja']){
 for(const file of ['arcade/'+locale+'/index.html','arcade/'+locale+'/shooter.html',locale+'/play.html'])check(read(file).includes('visual-v2.js'),'common v2 rendering loaded in '+file);
}
check(read('arcade/friends/index.html').includes('visual-v2.js'),'friend lobby loads same visual module');

// The first G03/G04/G05 material pass is local, deterministic and mode-shared.
// Each render must leave the authoritative bytes unchanged, and all three
// quality tiers must serialize exactly the same state (including volleyball).
for(const [id,mode,size] of [
 ['g03','stairs',[480,720]],['g04','pinball',[600,720]],
 ['g05','pong',[640,480]],['g05','volley',[640,480]]
]){
 const tierResults=[];
 for(const tier of modes){
  const {scope,advance}=create(1221);
  const visual=scope.window.BioVisualV2;
  check(visual.setQuality(tier),'material quality selectable '+tier);
  const env={hero:0,remoteHero:3,multiplayer:true,authority:true,mode,chapter:2,difficulty:'normal',finish(){},sfx(){},I:{hero:['Burner','MJ','Moo','Ye Bao','Jelly','Veggie','Oracle']},testMode:true};
  const game=scope.window.BioSuiteGames[id](env);
  game.w=size[0];game.h=size[1];game.start();
  const {ctx}=ink();
  for(let frame=0;frame<64;frame++){
   const input={moveX:frame%23<11?.5:-.5,moveY:0,jump:frame===9,fire:frame===12,up:false,down:false,left:frame%23>=11,right:frame%23<11};
   game.setRemoteInput?.({moveX:-.5,fire:frame===15});
   game.update(1/120,input);advance();
   if(frame%8===0){
    const before=JSON.stringify(game.networkSnapshot()),bytes=Buffer.byteLength(before,'utf8');
    game.draw(ctx);
    const after=JSON.stringify(game.networkSnapshot());
    check(before===after&&bytes===Buffer.byteLength(after,'utf8'),id+'/'+mode+'/'+tier+' drawing preserves identical bytes');
   }
  }
  const snapshot=JSON.stringify(game.networkSnapshot());
  tierResults.push({snapshot,bytes:Buffer.byteLength(snapshot,'utf8')});
 }
 const phase1ABytes={'g03:stairs':3269,'g04:pinball':641,'g05:pong':459,'g05:volley':1183};
 check(tierResults[0].bytes===phase1ABytes[id+':'+mode],id+'/'+mode+' retains exact 9c483524 Phase 1A fixture byte size');
 for(const result of tierResults)check(result.snapshot===tierResults[0].snapshot&&result.bytes===tierResults[0].bytes,id+'/'+mode+' identical authority across material quality levels');
}
// Every platform type must have its own visible channel, and all other
// foreground functions must work at low/standard/high with no persistent data.
for(const tier of modes){
 const {scope}=create(31),v=scope.window.BioVisualV2;
 v.setQuality(tier);
 const colors=[];
 const gradientStops=()=>({addColorStop(){}});
 const props={createLinearGradient:gradientStops,createRadialGradient:gradientStops,canvas:{width:640,height:480}};
 const ctx=new Proxy(props,{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,value)=>{if(k==='fillStyle')colors.push(value);o[k]=value;return true;}});
 for(const [type,tone] of [['safe','#79f0df'],['moving','#6ebcff'],['fragile','#ffc875'],['trap','#ff668c']]){
  colors.length=0;
  check(v.platform(ctx,45,130,140,type)===undefined&&colors.includes(tone),tier+' distinct '+type+' platform material');
 }
 v.bumper(ctx,180,160,21,.14);v.target(ctx,320,150,22,2,1,.2);
 v.launcher(ctx,320,420,.3,65,480);
 v.pongSurface(ctx,{left:64,right:576,top:110,bottom:394,mid:320});
 v.paddle(ctx,110,180,0,.15);v.paddle(ctx,530,180,1,0);
 v.volleyCourt(ctx,640,480,{floor:413,netTop:260});
 check(v.inspect().activeParticles===0&&v.inspect().channels===0,tier+' material drawing does not add locally serialized or event state');
}
check(['platform','bumper','target','launcher','pongSurface','paddle','volleyCourt'].every(k=>typeof scope.window.BioVisualV2[k]==='function'),'all material painters shared by solo and multiplayer');
check(coreCode.includes('BioVisualV2?.platform')&&coreCode.includes('BioVisualV2?.target')&&coreCode.includes('BioVisualV2?.launcher')&&coreCode.includes('BioVisualV2?.pongSurface')&&coreCode.includes('BioVisualV2?.paddle')&&coreCode.includes('BioVisualV2?.volleyCourt'),'all three games use the shared local presentation module');
check(!visualCode.includes('networkSnapshot')&&!visualCode.includes('applyNetworkState'),'v2 material library cannot alter multiplayer serializer');


// G06 second foreground-material pass: golden network bytes/digest taken
// verbatim from the green 735ad3ee host+guest fixed-input race baseline.
// Local rendering may change light/air/vehicle geometry, never authority.
const g06Gold={
 1:{bytes:5153,digest:'194451dc'},
 2:{bytes:5155,digest:'d3a666ee'},
 3:{bytes:5162,digest:'5073d1bb'},
 4:{bytes:5167,digest:'e24520cb'},
 5:{bytes:5158,digest:'970831fd'}
};
function g06Digest(text){
 let h=2166136261>>>0;
 for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619)>>>0;
 return h.toString(16).padStart(8,'0');
}
for(let chapter=1;chapter<=5;chapter++){
 const results=[];
 for(const tier of modes){
  const {scope,advance}=create(741),v=scope.window.BioVisualV2,hero=chapter-1;
  check(v.setQuality(tier),'G06 material tier '+tier);
  const game=scope.window.BioSuiteGames.g06({
   hero,remoteHero:(hero+3)%7,multiplayer:true,authority:true,chapter,
   mode:'race',difficulty:'normal',sessionCountdown:true,
   finish(){},sfx(){},I:{hero:['Burner','MJ','Moo','Ye Bao','Jelly','Veggie','Oracle']}
  });
  game.w=640;game.h=800;game.start();
  const {ctx}=ink();
  for(let n=0;n<90;n++){
   game.setRemoteInput({moveX:-.25,up:true,fire:n%27<8});
   game.update(1/120,{moveX:n%30<15?.45:-.4,fire:n%22<8,up:true,left:false,right:false,down:false});
   advance();
   if(n%30===0){
    const before=JSON.stringify(game.networkSnapshot());
    game.draw(ctx);game.drawGuest(ctx);
    const after=JSON.stringify(game.networkSnapshot());
    check(before===after&&Buffer.byteLength(before,'utf8')===Buffer.byteLength(after,'utf8'),
     'G06 chapter '+chapter+'/'+tier+' host and guest drawings preserve exact snapshot bytes');
   }
  }
  const json=JSON.stringify(game.networkSnapshot()),bytes=Buffer.byteLength(json,'utf8');
  check(bytes===g06Gold[chapter].bytes&&g06Digest(json)===g06Gold[chapter].digest,
   'G06 chapter '+chapter+'/'+tier+' equals 735ad3ee golden serialized authority');
  results.push(json);
 }
 for(const value of results)check(value===results[0],'G06 chapter '+chapter+' all three visual tiers have identical network content');
}
for(let hero=0;hero<7;hero++){
 const {scope}=create(741),game=scope.window.BioSuiteGames.g06({
  hero,remoteHero:(hero+3)%7,multiplayer:true,authority:true,chapter:3,
  mode:'race',difficulty:'normal',sessionCountdown:true,
  finish(){},sfx(){},I:{hero:['Burner','MJ','Moo','Ye Bao','Jelly','Veggie','Oracle']}
 });
 game.w=640;game.h=800;game.start();
 const before=JSON.stringify(game.networkSnapshot()),{ctx}=ink();
 scope.window.BioVisualV2.setQuality('high');game.draw(ctx);game.drawGuest(ctx);
 check(JSON.stringify(game.networkSnapshot())===before,'G06 both views retain original seven vehicle model authority '+hero);
}
for(const tier of modes){
 const {scope}=create(741),v=scope.window.BioVisualV2,{ctx}=ink();
 v.setQuality(tier);
 v.raceSkyline(ctx,640,800,3,20);
 v.raceWheel(ctx,42,80,.5);v.raceBody(ctx,42,'blade','#fff3a0',.4,true);
 v.raceExhaust(ctx,42,true,.5,85);v.raceFixture(ctx,80,300,14,-1,1,42);
 v.raceRail(ctx,{x:100,y:320},{x:104,y:310},5);
 v.raceRoadGrain(ctx,{x:100,y:600},{x:300,y:600},40);
 v.raceSpeedLines(ctx,640,800,95,true,.5);
 check(v.inspect().channels===0&&v.inspect().activeParticles===0,tier+' G06 new material methods are stateless');
 check(v.emit('g06','pass-proof','pass',100,200,'#fff',.5),'G06 pass flash enters bounded local event pool');
 check(v.shake('g06').x===0&&v.shake('g06').y===0,'G06 near pass never causes impact shudder');
 v.emit('g06','impact-proof','impact',100,200,'#fff',.5);
 check(v.shake('g06').y!==0,'G06 collision keeps presentation-only micro-shake');
}
check(['raceSkyline','raceWheel','raceBody','raceExhaust','raceFixture','raceRail','raceRoadGrain','raceSpeedLines'].every(k=>typeof scope.window.BioVisualV2[k]==='function'),
 'all G06 foreground functions exported to the same solo/multiplayer visual layer');
check(coreCode.includes('BioVisualV2?.raceSkyline')&&coreCode.includes('BioVisualV2?.raceWheel')&&coreCode.includes('BioVisualV2?.raceBody')&&coreCode.includes('BioVisualV2?.raceExhaust')&&coreCode.includes('BioVisualV2?.raceFixture')&&coreCode.includes('BioVisualV2?.raceRail')&&coreCode.includes('BioVisualV2?.raceRoadGrain')&&coreCode.includes('BioVisualV2?.raceSpeedLines'),
 'G06 road, vehicle and speed visual hooks installed');
check(coreCode.includes('roadHalf=5.2,vehicleWidth=1.75,carContact=vehicleWidth/roadHalf')&&
 coreCode.includes('checkpointDistances=Array.from({length:laps*3}')&&
 coreCode.includes("Math.abs(a.lane-b.lane)>=carContact")&&
 coreCode.includes("g.networkSnapshot=()=>{"),
 'G06 original lane, contact, 9-checkpoint chapter-1 and network serializer contracts intact');
check(!visualCode.includes('networkSnapshot')&&!visualCode.includes('applyNetworkState')&&!visualCode.includes('drawImage('),
 'visual-only G06 additions neither serialize authority nor touch source texture pixels');

console.log('V2 VISUAL NODE PASS '+checks+' tier, snapshot byte, event cap, G05 layout, G02 controls and entry checks');
