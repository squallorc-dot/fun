/* Input geometry and real engine behavior. No renderer or physics stubs. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.resolve(__dirname,'..'),saved=new Map([['bio_arcade_pref_v1','{"volume":31,"sfx":23,"playMode":"manual"}'],['bio_arcade_campaign_v11_g01_normal','keep-progress']]);
const scope={localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)}};
vm.runInNewContext(fs.readFileSync(path.join(dir,'arcade/assets/control-profiles.js'),'utf8'),scope);const C=scope.BioControlProfiles;let checks=0,cases=0;
function check(ok,msg){assert(ok,msg);checks++;}
check(C.prefs.profile==='two'&&C.prefs.stickSize===108,'default dual-hand controls');
for(const corrupt of [null,0,'bad',[],{profile:'invalid',joystick:'invalid',deadzone:NaN,sensitivity:Infinity}])check(C.normalize(corrupt).profile==='two','corrupt prefs have safe defaults');
const bounded=C.normalize({stickSize:999,buttonScale:-8,gap:999,inset:999,raise:-1,sensitivity:999,deadzone:0,smoothing:999});
check(bounded.stickSize===136&&bounded.buttonScale===.8&&bounded.gap===18&&bounded.inset===48&&bounded.raise===0&&bounded.sensitivity===1.6&&bounded.deadzone===.1&&bounded.smoothing===100,'preference ranges');
C.set({...C.defaults,profile:'left'});check(saved.get('bio_arcade_pref_v1')==='{"volume":31,"sfx":23,"playMode":"manual"}'&&saved.get('bio_arcade_campaign_v11_g01_normal')==='keep-progress','input settings preserve audio and campaign');
C.set(C.defaults);check(C.prefs.profile==='two'&&saved.size===3,'reset only changes control storage');
const p=C.defaults;
check(C.vector(.17,0,p).x===0&&C.vector(0,-.18,p).y===0,'18% deadzone');
check(C.vector(1,1,p).x<1&&Math.hypot(...Object.values(C.vector(1,1,p)))<=1.000001,'diagonal unit circle');
check(C.vector(.5,0,{...p,sensitivity:1.5}).x>C.vector(.5,0,p).x,'sensitivity changes analog output');
check(C.vector(.5,.9,p,'x').y===0&&C.vector(.5,.9,p,'y').x===0,'game-specific axes');
const smoothed=C.smooth({x:0,y:0},{x:1,y:0},.02,20);check(smoothed.x>.6&&smoothed.x<.64,'20ms smoothing');
check(C.smooth({x:1,y:-1},{x:0,y:0},.001,100).x===0,'release has no smoothing delay');
const separated=(a,b)=>a.x+a.w<=b.x+.01||b.x+b.w<=a.x+.01||a.y+a.h<=b.y+.01||b.y+b.h<=a.y+.01;
for(const viewport of [{width:320,height:300,compact:false},{width:390,height:300,compact:false},{width:430,height:300,compact:false},{width:768,height:300,compact:false},{width:568,height:130,compact:true},{width:568,height:180,compact:true},{width:844,height:220,compact:true}])
for(const g02 of [false,true])for(const profile of ['two','left','right','desktop'])for(const joystick of ['fixed','floating'])for(const stickSize of [88,108,136])for(const buttonScale of [.8,1,1.2])for(const gap of [8,12,18])for(const inset of [0,48])for(const raise of [0,48])for(const mirror of [false,true])for(let n=0;n<=4;n++){
 const prefs={...p,profile,joystick,stickSize,buttonScale,gap,inset,raise,mirror},L=C.layout({...viewport,g02,keys:['fire','jump','dodge','skill'].slice(0,n),prefs}),all=[L.stick,...L.buttons];cases++;
 for(const r of all)assert(r.x>=-.01&&r.y>=-.01&&r.x+r.w<=viewport.width+.01&&r.y+r.h<=L.height+.01,JSON.stringify({viewport,prefs,n,L}));
 for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++)assert(separated(all[i],all[j]),JSON.stringify({viewport,prefs,n,L}));
 assert(L.buttons.every((r,i)=>r.w>=(i?48:56)),'44px accessibility floor retained');
 if(viewport.compact){assert(L.reservedLeft+L.reservedRight<viewport.width-60,'room for full game canvas '+JSON.stringify({viewport,prefs,n,L}));for(const r of all)assert(r.x+r.w<=L.reservedLeft+.01||r.x>=viewport.width-L.reservedRight-.01,'controls stay inside reserved rails');}
}
check(cases>100000,'broad real viewport geometry sweep');
const normal=C.layout({width:390,keys:['fire','skill'],prefs:p}),mirror=C.layout({width:390,keys:['fire','skill'],prefs:{...p,mirror:true}});
check(Math.abs(normal.stick.x+mirror.stick.x+normal.stick.w-390)<.001,'exact standard mirror');
// Identical seeded worlds compare analog movement without changing game rules.
const source=fs.readFileSync(path.join(dir,'arcade/assets/games-core.js'),'utf8');
function game(id,mode='volley'){let seed=7;const math=Object.create(Math);math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);const ctx={window:{},Math:math};vm.runInNewContext(source,ctx);const g=ctx.window.BioSuiteGames[id]({hero:0,difficulty:'normal',mode,testMode:true,I:{hero:['B']},sfx(){},finish(){}});g.w=id==='g03'?480:640;g.h=id==='g03'?720:480;g.start();return g;}
const neutral={pointer:{down:false},fire:false,up:false,down:false,left:false,right:false};
for(const [id,mode,read,key]of [['g01','volley',g=>g.inspectCombat().player,'x'],['g03','volley',g=>g.debugGeometry().player,'vx'],['g05','volley',g=>g.inspectMatch().player,'x'],['g05','pong',g=>g.inspectMatch().player,'y'],['g06','volley',g=>g.inspectRace().car,'steer']]){
 const a=game(id,mode),b=game(id,mode),initial=read(a)[key],field=mode==='pong'?'moveY':'moveX';for(let i=0;i<10;i++){a.update(1/60,{...neutral,[field]:.5});b.update(1/60,{...neutral,[field]:1});}const half=read(a)[key]-initial,full=read(b)[key]-initial;check(full>0&&Math.abs(half/full-.5)<1e-6,id+'/'+mode+' true proportional analog movement');
}
{
 const g=game('g04');for(let i=0;i<70;i++)g.update(1/60,neutral);const before=g.debugPhysics();
 g.update(1/60,{pointer:{down:true,aiming:true,x:400,y:250,moved:true,dragRatio:.8}});check(g.debugPhysics().shots===before.shots&&g.debugPhysics().balls.length===0,'drag does not launch on pointerdown');
 check(Math.abs(g.debugPhysics().power-87)<1e-8,'drag distance sets power');
 g.update(1/60,neutral);check(g.debugPhysics().shots===before.shots,'pointer cancel cannot fire');
 g.update(1/60,{pointer:{down:false,aiming:true,released:true,x:400,y:250,moved:true,dragRatio:.8}});check(g.debugPhysics().shots===before.shots-1&&g.debugPhysics().balls.length===1,'release launches once');
 g.update(1/60,neutral);check(g.debugPhysics().shots===before.shots-1,'release pulse does not repeat');
}
for(const dx of [-80,55,200]){
 const assisted=game('g01'),manual=game('g01');const enemy=assisted.testSetup({dx,hp:500}),equivalent=manual.testSetup({dx,hp:500});
 for(let i=0;i<14;i++){assisted.update(1/60,{...neutral,actionAssist:true});manual.update(1/60,{...neutral,fire:dx===55});}
 check(enemy.hp===equivalent.hp,'assist uses existing attack range, facing, startup and damage: '+dx);
}
{
 const a=game('g05'),b=game('g05'),c=game('g05');
 for(const g of [a,b,c]){const s=g.inspectMatch();g.testVolleyBall({x:s.player.x,y:s.player.y-s.field.body*.55,vx:0,vy:-100});}
 a.update(1/120,{...neutral,actionAssist:true});b.update(1/120,{...neutral,fire:true});c.update(1/120,neutral);
 check(a.inspectMatch().player.hitCool>0&&c.inspectMatch().player.hitCool===0,'optional volley assist triggers an ordinary ascending contact');
 check(a.inspectMatch().ball.vx===b.inspectMatch().ball.vx&&a.inspectMatch().ball.vy===b.inspectMatch().ball.vy,'volley assist uses same swing and ball physics');
}
console.log('CONTROLS PASS '+checks+' behavior checks; '+cases+' non-overlapping layouts, settings isolation, analog movement, legal G01 assist and G04 drag/release.');
