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

console.log('V2 VISUAL NODE PASS '+checks+' tier, snapshot byte, event cap, G05 layout, G02 controls and entry checks');
