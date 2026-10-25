/* Bio-City original standalone mini-game engines. No copied game assets. */
(()=>{'use strict';
const R={};window.BioSuiteGames=R;
const pi=Math.PI,TAU=2*pi,between=(x,a,b)=>Math.max(a,Math.min(b,x)),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),rnd=(a,b)=>Math.random()*(b-a)+a,pick=a=>a[(Math.random()*a.length)|0];
const pal=['#ff6b88','#68ddfc','#ffc576','#f5e28b','#bfa2ff','#8bf1b8','#a8f1ff'];
function back(ctx,w,h,color='#081b2f',grid=54){ctx.fillStyle=color;ctx.fillRect(0,0,w,h);ctx.strokeStyle='#3c89a51c';ctx.lineWidth=1;for(let x=0;x<w;x+=grid){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}for(let y=0;y<h;y+=grid){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}}
function words(ctx,text,x,y,font=14,color='#e9f7ff',align='left'){ctx.fillStyle=color;ctx.font=`700 ${font}px system-ui,sans-serif`;ctx.textAlign=align;ctx.fillText(text,x,y);ctx.textAlign='left'}
function bar(ctx,x,y,w,h,rate,color='#65e6d3'){ctx.fillStyle='#334353';ctx.fillRect(x,y,w,h);ctx.fillStyle=color;ctx.fillRect(x,y,w*between(rate,0,1),h)}
function orb(ctx,x,y,r,c){ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle=c;ctx.fill()}
function trace(ctx,x,y,r,c){ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.strokeStyle=c;ctx.lineWidth=2;ctx.stroke()}
function rect(ctx,x,y,w,h,fill,stroke){ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);if(stroke){ctx.strokeStyle=stroke;ctx.strokeRect(x,y,w,h)}}
function arena(ctx,w,h,t){if(window.BioWorldArt?.draw(ctx,'street',w,h,{shade:.16}))return;back(ctx,w,h,'#071423',44);let horizon=h*.42;ctx.fillStyle='#0b2c41';for(let x=-10;x<w;x+=52){let size=30+((x*11)%80);ctx.fillRect(x,horizon-size,35,size);rect(ctx,x+11,horizon-size+9,3,3,'#62d2e955')}rect(ctx,0,horizon,w,h-horizon,'#122537');ctx.strokeStyle='#5ae4ec24';for(let j=0;j<9;j++){let y=horizon+j*j*(h-horizon)/64;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}for(let i=0;i<10;i++){ctx.beginPath();ctx.moveTo(w/2,horizon);ctx.lineTo(i*w/9,h);ctx.stroke()}}
// Ground anchor never follows the jumping body; actual poses come from authored PNG frames.
function fighter(ctx,x,y,z,size,color,time,state='idle',dir=1,id=0,alpha=1){
 ctx.save();ctx.globalAlpha=.23;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(x,y,18*size/46,5*size/46,0,0,TAU);ctx.fill();ctx.restore();
 if(!window.BioGuardianArt?.draw(ctx,id,state,time,x,y-z,size/46,dir,alpha)){
  // Small loading/error marker keeps the battlefield usable when an image cannot load.
  orb(ctx,x,y-z-32,15,color);trace(ctx,x,y-z-32,19,'#e1f8ff');
 }
}
// Shared Bio-City scenery, while each game keeps its own playable geometry.
function jaText(env,zh,ja){return env.I?.hero?.[0]?.includes('バーナー')?ja:zh;}
function cityBackdrop(ctx,w,h,t,tone='#082238'){
 const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#061525');sky.addColorStop(1,tone);ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
 const horizon=h*.38;
 for(let n=0;n<Math.ceil(w/48)+1;n++){const x=n*48-10,bh=35+(Math.sin(n*17.3)+1)*h*.09;rect(ctx,x,horizon-bh,35,bh,'#103249');rect(ctx,x+2,horizon-bh,31,2,'#30758b');for(let y=horizon-bh+12;y<horizon-8;y+=13){rect(ctx,x+7,y,3,3,'#5addd866');rect(ctx,x+23,y,3,3,'#f6bf6d55');}}
 ctx.strokeStyle='#69d9ea16';ctx.lineWidth=1;for(let y=horizon;y<h;y+=38){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
 for(let n=0;n<7;n++){const x=(n*137+t*8)%w;orb(ctx,x,h*.08+(n%3)*h*.055,1.2,'#86e0e755');}
}
function ends(g,win,score,note){if(g._finished)return;g._finished=true;g.finish(win,score,note)}
function cObj(x,y,rest={}){return {x,y,...rest}}
R.g01=env=>{
const chapter=Math.max(1,Math.min(5,Number(env.chapter)||1));
let p,enemies=[],fallen=[],bolts=[],effects=[],wave=1,spawn=0,spawnClock=0,elapsed=0,score=0,kills=0,t=0,button={},bossSpawned=false,impactStop=0,ending=null;
const mode=(env.difficulty==='expert'?1.65:env.difficulty==='hard'?1.3:1)*(1+(chapter-1)*.12);
const pace=env.difficulty==='expert'?.88:env.difficulty==='hard'?.94:1;
const health=[140,130,180,115,125,150,120];
const attacks=[null,{duration:.30,hit:.10},{duration:.34,hit:.12},{duration:.44,hit:.17}];
function animate(e,clip,dt){if(e.clip!==clip){e.clip=clip;e.clipTime=0;}else e.clipTime+=dt;}
function playerAnimation(dt){animate(p,ending?(ending.win?'celebrate':'ko'):p.stun>0?'hurt':p.skillFlash>0?'skill':p.dash>0?'dodge':p.action?'attack'+p.action.combo:p.z>0?'jump':p.land>0?'land':p.moving?'walk':'idle',dt);if(p.action)p.clipTime=p.action.time;}
function conclude(win,result,note){if(ending)return;ending={win,result,note,time:0};p.action=null;p.attackBuffer=0;p.moving=false;playerAnimation(0);}
// Every Guardian has a distinct combat mechanic; the visible ring alone is not the skill.
const skillIds=['burn','chain','fortify','rush','echo','garden','stasis'];
function strike(e,damage,push=0,stun=0,color='#8eefff'){
 if(e.hp<=0)return false;
 e.hp=Math.max(0,e.hp-damage);e.hit=Math.max(e.hit,.24);
 e.tele=0;e.chargeTime=0;e.attackKind='';e.stun=Math.max(e.stun||0,stun);
 e.x=between(e.x+(push||0),20,g.w+40);sparks(e.x,e.y-35,color,9);
 return true;
} 
function addEnemy(type='grunt'){
 const w=g.w,h=g.h;
 const e=cObj(w+35,between(h*.58+Math.random()*h*.3,h*.52,h*.87),{type,hp:(type==='boss'?520:type==='brute'?105:type==='ranged'?65:55)*mode,max:1,speed:type==='boss'?75:type==='brute'?47:type==='ranged'?64:80,hit:0,attack:0,tele:0,dir:-1,phase:0,stage:1,attackCount:0,clip:'idle',clipTime:0,attackKind:'',targetX:0,targetY:0});
 e.max=e.hp;if(type==='boss')e.x=w-80;enemies.push(e);
}
function getWave(n){wave=n;spawn=(n===1?6:n===2?9:3)+(chapter-1)*(n===3?1:2);spawnClock=.65;bossSpawned=false;bolts=[];}
function sparks(x,y,col,n=8){for(let i=0;i<n;i++){const a=rnd(0,TAU),v=rnd(45,170);effects.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,r:rnd(1,3.6),life:rnd(.12,.35),color:col});}}
function wound(amt,source){if(p.inv>0||p.z>32||p.dash>0)return false;
 if(p.shield>0){p.shield--;p.inv=.4;sparks(p.x,p.y-35,'#c8fdee',12);env.sfx(560,.08);return false;}
 p.hp=Math.max(0,p.hp-amt);p.inv=.6;p.stun=.25;p.action=null;p.attack=0;p.attackBuffer=0;impactStop=.065;sparks(p.x,p.y-32,'#ff8298',12);env.sfx(125,.12);return true;}
function aimAt(target,source,speed,damage,col='#ed94f8'){
 let dx=target.x-source.x,dy=target.y-source.y,mag=Math.hypot(dx,dy)||1;
 bolts.push({x:source.x,y:source.y-28,vx:dx/mag*speed,vy:dy/mag*speed,r:7,life:3.0,damage,color:col});
}
function attack(){if(p.action||p.attackCool>0||p.stun>0||p.skillFlash>0||p.dash>0)return;const combo=p.comboTimer>0?(p.combo%3)+1:1,clip=window.BioGuardianArt?.clips['attack'+combo]||attacks[combo];p.combo=combo;p.comboTimer=.88;p.attack=clip.duration;p.attackCool=clip.duration;p.dir=p.lastDir||p.dir;p.attackBuffer=0;
 p.action={combo,time:0,duration:clip.duration,hit:clip.hit,connected:false,dir:p.dir};p.clip='attack'+combo;p.clipTime=0;
}
function resolveAttack(action){const combo=action.combo;
 effects.push({type:'slash',x:p.x,y:p.y-p.z-45,dir:action.dir,combo,life:.18,color:pal[p.hero]});
 const range=48+combo*14;let hits=0;
 for(const e of enemies){if(e.hp<=0)continue;const dx=e.x-p.x,dy=e.y-p.y;
  if(dx*action.dir>-18&&dx*action.dir<range&&Math.abs(dy)<38&&p.z<40){
   e.hp-=([0,17,24,37][combo])*(p.hero===3?1.35:p.hero===2?1.2:1);
   e.hit=.23;e.tele=0;e.chargeTime=0;e.attackKind='';e.x=between(e.x+action.dir*(10+combo*7),20,g.w+40);hits++;
   sparks(e.x,e.y-35,combo===3?'#fff0ab':'#8eefff',combo===3?13:7);
  }
 }
 if(hits){p.energy=Math.min(100,p.energy+hits*10);score+=hits*(5+combo*3);impactStop=combo===3?.09:.045;env.sfx(355+combo*95,.07)}else env.sfx(160,.025);
}
function skill(){
 if(p.energy<100||p.stun>0||p.skillFlash>0||p.dash>0||p.action)return;
 p.energy=0;p.attack=.64;p.attackCool=.64;p.skillFlash=.64;p.attackBuffer=0;p.clip='skill';p.clipTime=0;
 const targets=(range)=>enemies.filter(e=>e.hp>0&&Math.hypot(e.x-p.x,(e.y-p.y)*1.6)<range);
 let hits=0;
 switch(p.hero){
  case 0: // Burner: facing flame wall plus damage-over-time. Enemies can still escape the cone.
   for(const e of enemies){const dx=(e.x-p.x)*p.dir;if(e.hp>0&&dx>=-18&&dx<215&&Math.abs(e.y-p.y)<74){
    if(strike(e,63,p.dir*29,.15,'#ffb36d'))hits++;
    e.burn=Math.max(e.burn||0,2.8);e.burnTick=0;
   }}
   effects.push({type:'beam',style:'flame',x:p.x,y:p.y-34,x2:p.x+p.dir*215,y2:p.y-38,color:'#ff8a59',life:.43});
   break;
  case 1: // MJ: seek the four closest enemies, chain electric damage and interrupt attacks.
   for(const e of targets(290).sort((x,y)=>Math.hypot(x.x-p.x,x.y-p.y)-Math.hypot(y.x-p.x,y.y-p.y)).slice(0,4)){
    if(strike(e,Math.max(34,74-hits*11),0,.95,'#80f5ff'))hits++;
    effects.push({type:'beam',style:'lightning',x:p.x,y:p.y-38,x2:e.x,y2:e.y-35,color:'#84edff',life:.37});
   }
   break;
  case 2: // Moo: area ground shock plus a two-hit protective shield.
   p.shield=Math.min(3,p.shield+2);p.inv=Math.max(p.inv,.48);
   for(const e of targets(166))if(strike(e,78,(e.x>=p.x?1:-1)*42,.68,'#ffe1a0'))hits++;
   effects.push({type:'ring',x:p.x,y:p.y-12,r:170,life:.45,color:'#ffe1a0'});
   break;
  case 3: { // Ye Bao EX: fast, steerable forward rush across one combat lane.
   const x0=p.x,limit=235;p.haste=Math.max(p.haste,3.3);
   for(const e of enemies){const dx=(e.x-x0)*p.dir;if(e.hp>0&&dx>=-15&&dx<=limit+20&&Math.abs(e.y-p.y)<58){
    if(strike(e,104,p.dir*49,.3,'#e2fb8e'))hits++;
   }}
   p.x=between(x0+p.dir*limit,24,g.w-24);p.inv=Math.max(p.inv,.38);
   effects.push({type:'beam',style:'rush',x:x0,y:p.y-36,x2:p.x,y2:p.y-36,color:'#e4ff8a',life:.37});
   break;
  }
  case 4: // Jelly Trio: three echoes continue auto-striking while the player moves.
   p.echoTime=4.6;p.echoTick=.15;
   for(const e of targets(160).slice(0,3))if(strike(e,40,0,.15,'#c6a2ff'))hits++;
   break;
  case 5: // Veggie Kid: restore health, grant shielding and short lived healing garden.
   p.hp=Math.min(p.max,p.hp+38);p.shield=Math.min(3,p.shield+1);
   p.gardenTime=4.2;p.gardenTick=.18;
   for(const e of targets(95))if(strike(e,26,0,.12,'#88f6ae'))hits++;
   break;
  case 6: // Oracle: freeze a wide radius, dispel nearby incoming enemy projectiles.
   for(const e of targets(255))if(strike(e,61,0,1.6,'#bdc2ff'))hits++;
   bolts=bolts.filter(b=>Math.hypot(b.x-p.x,b.y+28-p.y)>255);
   p.inv=Math.max(p.inv,.32);
   effects.push({type:'ring',x:p.x,y:p.y-36,r:255,life:.56,color:'#aab7ff'});
   break;
 }
 if(p.hero!==6)bolts=bolts.filter(b=>Math.hypot(b.x-p.x,b.y+28-p.y)>95);
 p.energy=Math.min(100,p.energy+Math.max(0,hits-1)*3);
 effects.push({type:'ring',x:p.x,y:p.y-42,r:120,life:.46,color:pal[p.hero]});
 sparks(p.x,p.y-42,pal[p.hero],18);env.sfx(790,.19);
}

function jump(){if(p.z>0||p.vz>0||p.stun>0||p.action||p.skillFlash>0)return;p.vz=400;env.sfx(530,.05)}
function dodge(){if(p.dodge>0||p.stun>0||p.skillFlash>0)return;p.inv=.38;p.dodge=.9;p.dash=.28;p.dashDir=p.lastDir||1;p.action=null;p.attack=0;p.attackBuffer=0;p.clip='dodge';p.clipTime=0;env.sfx(660,.05)}
function moveEnemy(e,dt){
 e.hit=Math.max(0,e.hit-dt);e.attack=Math.max(0,e.attack-dt);
 if(e.type==='boss'&&e.hp<=e.max*.5)e.stage=2;
 if(e.burn>0){e.burn=Math.max(0,e.burn-dt);e.burnTick=(e.burnTick||0)+dt;
  while(e.burnTick>=.42){e.burnTick-=.42;e.hp=Math.max(0,e.hp-6);}
 }
 if(e.stun>0){e.stun=Math.max(0,e.stun-dt);e.tele=0;e.chargeTime=0;e.attackKind='';return;}
 const dist=Math.abs(e.x-p.x),lane=Math.abs(e.y-p.y);e.dir=p.x<e.x?-1:1;
 if(e.hit>0){e.chargeTime=0;return;}
 if(e.chargeTime>0){
  e.chargeTime=Math.max(0,e.chargeTime-dt);const progress=1-e.chargeTime/.20;
  e.x=e.chargeStartX+(e.chargeTargetX-e.chargeStartX)*progress;e.y=e.chargeStartY+(e.chargeTargetY-e.chargeStartY)*progress;
  if(!e.chargeHit&&Math.hypot(p.x-e.x,(p.y-e.y)*1.5)<(e.type==='boss'?65:45)){e.chargeHit=true;wound((e.type==='boss'?24:17)*mode,e);}
  if(e.chargeTime===0)effects.push({type:'ring',x:e.x,y:e.y-8,r:72,life:.4,color:'#ff8cae'});
  return;
 }
 if(e.tele>0){const old=e.tele;e.tele=Math.max(0,e.tele-dt);if(old>0&&e.tele===0){
   if(e.type==='boss'&&e.attackKind==='slam'){
    effects.push({type:'ring',x:e.targetX,y:e.targetY-8,r:60,life:.38,color:'#fd7895'});
    if(Math.hypot(p.x-e.targetX,(p.y-e.targetY)*1.5)<63)wound(27*mode,e);
   }else if(e.type==='boss'&&e.attackKind==='volley'){
    for(let i=-(e.stage===2?2:1);i<=(e.stage===2?2:1);i++){
     const target={x:p.x+i*28,y:p.y+i*20};aimAt(target,e,195,16*mode,'#ff6c9d');
    }
   }else if(e.attackKind==='charge'){
    // Dash towards the advertised position, never track the player after the warning.
    e.chargeTime=.20;e.chargeHit=false;e.chargeStartX=e.x;e.chargeStartY=e.y;
    e.chargeTargetX=between(e.targetX,26,g.w-26);e.chargeTargetY=between(e.targetY,g.h*.55,g.h*.88);
   }else if(e.type==='ranged')aimAt(p,e,215,12*mode);
   else if(dist<47&&lane<39)wound((e.type==='brute'?19:10)*mode,e);
   e.attackKind='';
  }
  return;
 }
 if(e.type==='boss'){
  e.phase+=dt;
  if(dist>67)e.x+=e.dir*e.speed*(e.stage===2?1.2:1)*dt;
  if(lane>18)e.y+=(p.y>e.y?1:-1)*27*dt;
  if(e.attack<=0&&dist<235&&lane<100){
   const cycle=e.attackCount++%3;
   e.attackKind=e.stage===2&&cycle===2?'charge':(dist<115&&cycle!==1)?'slam':'volley';
   e.tele=e.attackKind==='charge'?.68:e.attackKind==='slam'?(e.stage===2?.62:.76):1.0;e.attack=e.stage===2?1.65:2.05;
   e.tele*=pace;e.attack*=pace;
   e.targetX=p.x;e.targetY=p.y;
  }
 }else if(e.type==='ranged'){
  if(dist>160)e.x+=e.dir*e.speed*dt;else if(dist<112)e.x-=e.dir*e.speed*.5*dt;
  if(lane>17)e.y+=(p.y>e.y?1:-1)*24*dt;
  if(e.attack<=0&&dist<270&&lane<75){e.tele=.57*pace;e.attack=2.1*pace;e.attackKind='bolt';}
 }else{
  if(dist>37)e.x+=e.dir*e.speed*dt;
  if(lane>7)e.y+=(p.y>e.y?1:-1)*e.speed*.45*dt;
  if(e.type==='brute'&&dist>70&&dist<180&&lane<50&&e.attack<=0){e.tele=.65*pace;e.attack=1.9*pace;e.attackKind='charge';e.targetX=p.x;e.targetY=p.y;}
  else if(dist<47&&lane<38&&e.attack<=0){e.tele=(e.type==='brute'?.53:.36)*pace;e.attack=(e.type==='brute'?1.7:1.3)*pace;e.attackKind='melee';}
 }
}
const g={w:960,h:540,finish:env.finish,
 start(){g._finished=false;let w=g.w,h=g.h;p={hero:env.hero,x:w*.25,y:h*.75,z:0,vz:0,dir:1,lastDir:1,hp:health[env.hero],max:health[env.hero],energy:38,combo:0,comboTimer:0,attack:0,attackCool:0,action:null,attackBuffer:0,land:0,clip:'idle',clipTime:0,moving:false,dodge:0,dash:0,dashDir:1,inv:0,stun:0,shield:0,haste:0,echoTime:0,echoTick:0,gardenTime:0,gardenTick:0,skillFlash:0};enemies=[];fallen=[];bolts=[];effects=[];t=0;elapsed=0;score=0;kills=0;button={};ending=null;impactStop=0;getWave(1);window.BioGuardianArt?.preload([env.hero,'enemy-grunt','enemy-brute','enemy-ranged','enemy-boss']);},
 onResize(ow,oh,w,h){if(!p)return;const sx=w/(ow||w),sy=h/(oh||h);p.x*=sx;p.y*=sy;for(const group of [enemies,fallen,bolts,effects])for(const e of group){e.x*=sx;e.y*=sy;if(e.targetX)e.targetX*=sx;if(e.targetY)e.targetY*=sy;if(e.x2!==undefined)e.x2*=sx;if(e.y2!==undefined)e.y2*=sy;}},
 update(dt,input){if(g._finished)return;
  dt=Math.max(0,Math.min(dt,.045));t+=dt;elapsed+=dt;
  if(ending){ending.time+=dt;for(const e of fallen)e.clipTime+=dt;fallen=fallen.filter(e=>e.clipTime<.55);playerAnimation(dt);if(ending.time>=.76)ends(g,ending.win,ending.result,ending.note);return;}
  if(input.fire&&!button.fire)p.attackBuffer=.16;button.fire=!!input.fire;
  if(impactStop>0){impactStop=Math.max(0,impactStop-dt);return;}
  const keys=['attack','attackCool','comboTimer','dodge','dash','inv','stun','haste','echoTime','gardenTime','skillFlash','land','attackBuffer'];for(const key of keys)p[key]=Math.max(0,p[key]-dt);
  // Companion strikes and garden pulses use bounded intervals, not per-frame damage.
  if(p.echoTime>0){p.echoTick-=dt;if(p.echoTick<=0){p.echoTick+=.52;
    for(const e of enemies.filter(e=>e.hp>0&&Math.hypot(e.x-p.x,(e.y-p.y)*1.6)<165).slice(0,3)){
      strike(e,16,0,.09,'#d3acff');score+=3;
    }
  }}
  if(p.gardenTime>0){p.gardenTick-=dt;if(p.gardenTick<=0){p.gardenTick+=.6;
    p.hp=Math.min(p.max,p.hp+3);
    for(const e of enemies.filter(e=>e.hp>0&&Math.hypot(e.x-p.x,(e.y-p.y)*1.6)<110))strike(e,11,0,0,'#a1ffbd');
  }}
  const vx=(input.right?1:0)-(input.left?1:0),vy=(input.down?1:0)-(input.up?1:0);
  if(vx){p.lastDir=vx>0?1:-1;if(!p.action&&p.skillFlash<=0)p.dir=p.lastDir;}
  const rising=(key,pressed)=>{if(pressed&&!button[key]){button[key]=true;return true}if(!pressed)button[key]=false;return false};
  if(rising('jump',input.jump))jump();if(rising('dodge',input.dodge))dodge();if(rising('skill',input.skill))skill();
  if(p.action){const action=p.action;action.time+=dt;if(!action.connected&&action.time>=action.hit){action.connected=true;resolveAttack(action);}if(action.time>=action.duration)p.action=null;}
  if(input.fire||p.attackBuffer>0)attack();
  const speed=(env.hero===3?190:env.hero===2?125:163)*(p.haste>0?1.38:1);
  const control=p.stun>0 ? 0 : p.action ? (p.action.time<p.action.hit ? .35 : .65) : 1;
  const moveX=p.stun>0?0:p.dash>0?p.dashDir*speed*2.0:vx*speed*control;
  p.x=between(p.x+moveX*dt,24,g.w-24);p.y=between(p.y+vy*speed*.65*control*dt,g.h*.55,g.h*.88);p.moving=!!(moveX||vy*control);
  const oldZ=p.z;p.z=Math.max(0,p.z+p.vz*dt);p.vz-=920*dt;if(p.z===0){p.vz=0;if(oldZ>0)p.land=.15;}
  playerAnimation(dt);
  spawnClock-=dt;if(spawn>0&&spawnClock<=0){addEnemy(wave===1?'grunt':wave===2?pick(['grunt','ranged','brute']):pick(['brute','ranged']));spawn--;spawnClock=wave===1?.85:.75;}
  if(wave===3&&spawn===0&&!bossSpawned){addEnemy('boss');bossSpawned=true;}
  for(const e of enemies){if(e.hp>0){const ox=e.x,oy=e.y;moveEnemy(e,dt);animate(e,e.hit>0?'hurt':e.chargeTime>0?'dodge':e.tele>0?(e.type==='ranged'||e.type==='boss'?'skill':'attack1'):Math.abs(e.x-ox)+Math.abs(e.y-oy)>.01?'walk':'idle',dt);}}
  for(const e of fallen)e.clipTime+=dt;fallen=fallen.filter(e=>e.clipTime<.55);
  for(let i=bolts.length-1;i>=0;i--){const b=bolts[i];b.life-=dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
   if(b.life<=0||b.x<-25||b.x>g.w+25||b.y<0||b.y>g.h){bolts.splice(i,1);continue;}
   if(Math.hypot(b.x-p.x,(b.y+28-p.y)*1.3)<b.r+14){wound(b.damage,b);bolts.splice(i,1);}
  }
  for(const f of effects){f.life-=dt;if(f.vx){f.x+=f.vx*dt;f.y+=f.vy*dt;}}effects=effects.filter(f=>f.life>0);
  enemies=enemies.filter(e=>{if(e.hp>0)return true;fallen.push({...e,clip:'ko',clipTime:0});score+=e.type==='boss'?1200:e.type==='brute'?80:40;kills++;p.energy=Math.min(100,p.energy+6);return false});
  if(p.hp<=0){conclude(false,score,`WAVE ${wave} · ${kills} KO`);return;}
  if(spawn===0&&enemies.length===0){if(wave===3){conclude(true,score+Math.floor(p.hp)*8,`${kills} KO`);return;}getWave(++wave);p.hp=Math.min(p.max,p.hp+20);}
 },
 draw(ctx){const w=g.w,h=g.h;arena(ctx,w,h,t);if(chapter>1){ctx.fillStyle=['','#26492b22','#2741602d','#49312e2b','#5c236033'][chapter-1];ctx.fillRect(0,0,w,h);for(let i=0;i<chapter+2;i++){const x=(i*233+chapter*67)%w;rect(ctx,x,h*.41,6+(chapter%3)*5,h*.46,chapter===5?'#d35da528':'#9ce9dc21');}}
  words(ctx,`CH ${chapter} · SECTOR 0${wave} / CORE DEFENSE`,18,31,13,'#89eff7');
  for(const b of bolts){ctx.strokeStyle=b.color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(b.x-b.vx*.04,b.y-b.vy*.04);ctx.lineTo(b.x,b.y);ctx.stroke();orb(ctx,b.x,b.y,b.r,b.color);}
  for(const e of enemies){if(e.tele>0){if((e.type==='boss'&&e.attackKind==='slam')||e.attackKind==='charge'){
     ctx.strokeStyle='#ff7795';ctx.lineWidth=3;ctx.setLineDash([10,8]);ctx.beginPath();ctx.ellipse(e.targetX,e.targetY-8,58,37,0,0,TAU);ctx.stroke();ctx.setLineDash([]);
     if(e.attackKind==='charge'){ctx.beginPath();ctx.moveTo(e.x,e.y-8);ctx.lineTo(e.targetX,e.targetY-8);ctx.stroke();}
   }else{ctx.strokeStyle='#ff8399';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(e.x,e.y-30);ctx.lineTo(e.type==='boss'?p.x:e.x+e.dir*85,e.type==='boss'?p.y-30:e.y-30);ctx.stroke();}}}
  const sorted=[...fallen,...enemies,{...p,type:'hero'}].sort((a,b)=>a.y-b.y);
  for(const e of sorted){if(e.type==='hero'){fighter(ctx,p.x,p.y,p.z,between(Math.min(w,h)*.095,34,55),pal[p.hero],p.clipTime,p.clip,p.action?.dir||p.dir,p.hero,p.inv>.05&&Math.floor(t*16)%2===0?.5:1);if(p.dash>0)trace(ctx,p.x,p.y-20,35,pal[p.hero]);
   if(p.shield>0){ctx.strokeStyle='#9aefdc';ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(p.x,p.y-34,35,57,0,0,TAU);ctx.stroke();}
   if(p.echoTime>0)for(let i=0;i<3;i++){const x=p.x+(i-1)*58+Math.sin(t*4+i)*11,y=p.y-5+Math.cos(t*3+i)*9;window.BioGuardianArt?.draw(ctx,4,'attack1',t*.3+i,x,y,.42,p.dir,.6);}
   if(p.gardenTime>0){ctx.strokeStyle='#72e5a1';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,105,33,0,0,TAU);ctx.stroke();for(let i=0;i<8;i++){const a=i*TAU/8,x=p.x+Math.cos(a)*83,y=p.y+Math.sin(a)*25;orb(ctx,x,y-5,4,'#d8f7ad');rect(ctx,x-1,y-4,2,10,'#6cdc9a');}}
   }
   else{const col=e.type==='boss'?'#ff3b80':e.type==='brute'?'#fc995a':e.type==='ranged'?'#e09cff':'#ff6b8a',size=e.type==='boss'?between(Math.min(w,h)*.15,67,87):e.type==='brute'?between(Math.min(w,h)*.115,45,66):between(Math.min(w,h)*.082,31,48);fighter(ctx,e.x,e.y,0,size,col,e.clipTime,e.clip,e.dir,'enemy-'+e.type,e.hp<=0?Math.min(1,(.55-e.clipTime)*4):1);if(e.hp>0){bar(ctx,e.x-26,e.y-size*2.65,e.type==='boss'?66:52,4,e.hp/e.max,'#fa748d');if(e.type==='boss'&&e.stage===2)words(ctx,'II',e.x,e.y-size*2.65-6,14,'#ffc0db','center');}}}
  for(const f of effects){ctx.globalAlpha=Math.min(1,f.life/.2);if(f.type==='beam'){ctx.strokeStyle=f.color;ctx.lineWidth=f.style==='flame'?22:6;ctx.beginPath();ctx.moveTo(f.x,f.y);for(let i=1;i<=8;i++)ctx.lineTo(f.x+(f.x2-f.x)*i/8,f.y+(f.y2-f.y)*i/8+(f.style==='lightning'&&i<8?(i%2?9:-9):0));ctx.stroke();ctx.lineWidth=2;ctx.strokeStyle='#f0ffda';ctx.stroke();}
   else if(f.type==='slash'){ctx.save();ctx.translate(f.x,f.y);ctx.scale(f.dir,1);ctx.strokeStyle=f.color;ctx.lineWidth=3+f.combo;ctx.beginPath();ctx.arc(14,0,30+f.combo*7,-1.1,.8);ctx.stroke();ctx.restore();}
   else if(f.type==='ring'){ctx.strokeStyle=f.color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(f.x,f.y,f.r*(1-f.life/.6),0,TAU);ctx.stroke();}else orb(ctx,f.x,f.y,f.r,f.color);}ctx.globalAlpha=1;
  words(ctx,`HERO  ${env.I.hero[env.hero]}`,16,h-18,12);bar(ctx,16,h-44,Math.min(200,w*.48),10,p.hp/p.max,'#72e9ca');bar(ctx,16,h-55,Math.min(200,w*.48),5,p.energy/100,'#b4a2ff');
 },
 hud(){return `<span>WAVE <b>${wave}/3</b></span><span>HP <b>${Math.ceil(p?.hp||0)}</b></span><span>COMBO <b>${p?.combo||0}</b></span><span>ENERGY <b>${Math.round(p?.energy||0)}%</b></span><span>SKILL <b>${env.I?.skillLabels?.[env.hero]||skillIds[env.hero]}</b></span><span>SCORE <b>${score}</b></span>`;}
};
 g.inspectCombat=()=>({wave,spawn,score,kills,player:{...p,action:p.action?{...p.action}:null},enemies:enemies.map(e=>({...e})),projectiles:bolts.map(b=>({...b})),effects:effects.map(f=>({...f})),skill:skillIds[p.hero],elapsed,finished:!!g._finished});
 if(env.testMode)g.testCharge=()=>{p.energy=100;};
 if(env.testMode)g.testHealth=(v)=>{p.hp=between(v,1,p.max);};
 if(env.testMode)g.testWound=(amount)=>wound(amount,{type:'test'});
 if(env.testMode)g.testSetup=({kind='grunt',dx=65,hp=null,waveNumber=null,remaining=null}={})=>{if(waveNumber!==null)wave=waveNumber;if(remaining!==null)spawn=remaining;addEnemy(kind);const e=enemies[enemies.length-1];e.x=p.x+dx;e.y=p.y;if(hp!==null){e.hp=hp;e.max=Math.max(hp,1);}if(kind==='boss')bossSpawned=true;return e;};
 return g;
};
R.g03=env=>{
let p=null,platforms=[],camera=0,depth=0,level=0,t=0,score=0,bonus=0,pickups=0,button={},goal=1700,mult=env.difficulty==='expert'?1.35:env.difficulty==='hard'?1.18:1,spawny=0,crush=0;
const g={w:960,h:540,finish:env.finish,start(){g._finished=false;depth=0;level=0;t=0;score=0;bonus=0;pickups=0;button={};goal=1700+(Math.max(1,Math.min(5,Number(env.chapter)||1))-1)*500;window.BioGuardianArt?.preload([env.hero]);const w=g.w,h=g.h;p={dir:1,x:w*.5,y:90,vx:0,vy:0,r:13,hp:3,ground:false,inv:0,drop:0,fallFrom:90};platforms=[{x:w*.5-65,y:135,w:130,type:'safe',hp:99}];spawny=230;while(spawny<Math.max(2000,goal+450))makePlatform();camera=0;crush=0;},onResize(ow,oh,w,h){const kx=w/(ow||w);if(p){p.x=between(p.x*kx,16,w-16);}for(const f of platforms){f.w=Math.min(w-28,Math.max(40,f.w*kx));f.x=between(f.x*kx,14,Math.max(14,w-f.w-14));}if(p)camera=Math.max(0,p.y-h*.48);},update(dt,input){if(g._finished)return;t+=dt;p.inv=Math.max(0,p.inv-dt);p.drop=Math.max(0,p.drop-dt);if(input.down&&!button.down&&p.ground){p.vy=Math.max(85,p.vy);p.ground=false;p.drop=.22;}button.down=!!input.down;const width=g.w;if(input.left){p.vx-=850*dt;p.dir=-1;}if(input.right){p.vx+=850*dt;p.dir=1;}p.vx*=Math.exp(-5*dt);p.vx=between(p.vx,-260,260);if((input.jump||input.fire)&&p.ground&&!button.jump){p.vy=-275;p.ground=false;env.sfx(690,.07)}button.jump=!!(input.jump||input.fire);
 const prevY=p.y;p.vy=Math.min(460,p.vy+650*mult*dt);p.y+=p.vy*dt;p.x=between(p.x+p.vx*dt,16,width-16);p.ground=false;for(const f of platforms){if(f.broken)continue;const shiftedX=f.x+(f.type==='moving'?Math.sin(t*1.5+f.y*.02)*26:0);if(p.drop<=0&&p.vy>=0&&prevY+p.r<=f.y+8&&p.y+p.r>=f.y-1&&p.x+p.r>shiftedX&&p.x-p.r<shiftedX+f.w){p.y=f.y-p.r;p.vy=0;p.ground=true;if(f.type==='trap'&&p.inv<=0){p.hp--;p.inv=1;env.sfx(130,.16)}if(f.type==='fragile'){f.hp-=dt;if(f.hp<=0)f.broken=true;}if(f.pickup&&!f.collected&&Math.abs(p.x-(shiftedX+f.w*.5))<24){f.collected=true;pickups++;bonus+=100;p.hp=Math.min(3,p.hp+1);env.sfx(980,.09);}}}
 if(p.ground)p.fallFrom=p.y;else{p.fallFrom=Math.min(p.fallFrom,p.y);if(p.y-p.fallFrom>=300){p.hp--;p.inv=Math.max(p.inv,.65);p.fallFrom=p.y;env.sfx(110,.18);}}
 if(p.y-camera>g.h*.48)camera=p.y-g.h*.48;depth=Math.max(depth,Math.floor(p.y));crush=Math.max(crush,(t*17*mult));if(p.y-p.r<crush-16||p.y>camera+g.h+60||p.hp<=0){ends(g,false,score,`${Math.floor(depth)} m`);return;}
 if(depth>=goal){ends(g,true,Math.floor(depth+score),`${Math.floor(depth)} m`);return;}
 while(spawny<camera+g.h+360)makePlatform();platforms=platforms.filter(x=>x.y>=camera-100);score=Math.floor(depth*.6)+bonus;},draw(ctx){const w=g.w,h=g.h;if(!window.BioWorldArt?.draw(ctx,'shaft',w,h,{scroll:camera,shade:.12}))cityBackdrop(ctx,w,h,t,'#123b48');if(Number(env.chapter)>1){rect(ctx,0,0,w,h,['','#24724b12','#597cb41a','#9a5b481d','#8841a020'][Math.min(4,Number(env.chapter)-1)]);}for(let x=35;x<w;x+=90){rect(ctx,x,0,2,h,'#59c9cc10');rect(ctx,x+6,0,1,h,'#59c9cc08');}ctx.fillStyle='#193249';ctx.fillRect(0,0,14,h);ctx.fillRect(w-14,0,14,h);for(const f of platforms){const y=f.y-camera;if(y<-25||y>h+30||f.broken)continue;const xx=f.x+(f.type==='moving'?Math.sin(t*1.5+f.y*.02)*26:0);rect(ctx,xx,y,f.w,16,f.type==='trap'?'#ad506c':f.type==='fragile'?'#c39d5d':f.type==='moving'?'#68a9db':'#3b8192');rect(ctx,xx+2,y+2,f.w-4,3,f.type==='trap'?'#f59aa8':'#acf6ee');for(const bx of [xx+8,xx+f.w-8])orb(ctx,bx,y+9,2,'#e1eddd');if(f.type==='fragile'){ctx.strokeStyle='#2d211d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(xx+f.w*.4,y);ctx.lineTo(xx+f.w*.52,y+7);ctx.lineTo(xx+f.w*.46,y+15);ctx.stroke();}if(f.pickup&&!f.collected){const cx=xx+f.w*.5,cy=y-20;orb(ctx,cx,cy,10,'#a1f4ca');trace(ctx,cx,cy,14,'#85eac17a');words(ctx,'+',cx,cy+5,16,'#124333','center');}if(f.type==='trap')for(let s=0;s<3;s++){ctx.beginPath();ctx.moveTo(xx+s*f.w/3+7,y);ctx.lineTo(xx+s*f.w/3+17,y-13);ctx.lineTo(xx+s*f.w/3+26,y);ctx.fillStyle='#f2768c';ctx.fill();}}
 const posY=p.y-camera;fighter(ctx,p.x,posY+p.r,0,20,pal[env.hero],t,!p.ground?'jump':Math.abs(p.vx)>18?'walk':'idle',p.dir,env.hero,p.inv>.1&&Math.floor(t*15)%2?.45:1);const crushY=crush-camera;rect(ctx,0,0,w,Math.max(0,crushY),'#a62f4d35');if(crushY>0)rect(ctx,0,Math.max(0,crushY-5),w,5,'#f96972');words(ctx,`DEPTH  ${Math.floor(depth)} / ${Math.floor(goal)} m`,16,34,15);words(ctx,`LIVES  ${p.hp}`,16,57,13,p.hp===1?'#ff7b8d':'#a0eddc');if(!p.ground&&p.y-p.fallFrom>210)words(ctx,jaText(env,'踩平台緩衝！','足場で落下を止めよう！'),w/2,90,17,'#ffd3a1','center');words(ctx,`SAFE PLATFORM / TRAP / MOVING`,16,h-15,10,'#92c3d0');},hud(){return `<span>DEPTH <b>${Math.floor(depth)} m</b></span><span>LIFE <b>${p.hp}</b></span><span>GOAL <b>${Math.floor(goal)} m</b></span><span>ENERGY <b>${pickups}</b></span>`;}};
 g.debugGeometry=()=>({player:{...p},platforms:platforms.map(f=>({...f})),goal,depth,camera,pickups,bonus});
 if(env.testMode)g.testFreeFall=()=>{platforms=[];spawny=10000;p.ground=false;p.vy=0;p.y=90;p.fallFrom=90;};
 function makePlatform(){const w=g.w,y=spawny;const last=platforms[platforms.length-1];const pw=Math.max(85,Math.min(160,w*.31));let x=between((last?last.x:w/2)+rnd(-85,85),18,w-pw-18);let type=pick([['safe','safe','safe','moving','fragile'],['safe','moving','safe','fragile','trap'],['moving','safe','moving','fragile','trap'],['safe','fragile','trap','moving','moving'],['trap','moving','safe','fragile','moving']][Math.max(1,Math.min(5,Number(env.chapter)||1))-1]);platforms.push({x,y,w:pw,type,hp:type==='fragile'?1:99,pickup:type!=='trap'&&Math.random()<.25,collected:false});spawny+=rnd(76,104);}return g;};
R.g04=env=>{
 const chapter=Math.max(1,Math.min(5,Number(env.chapter)||1));
 const STAGES=[
  {title:'ENERGY LAB',tone:'#0b1733',targets:[[.28,.25,1],[.50,.22,1],[.72,.25,1],[.50,.47,1]],bumpers:[[.19,.50],[.81,.50]],normal:11},
  {title:'REFLECTION GRID',tone:'#102843',targets:[[.20,.22,1],[.50,.19,2],[.80,.22,1],[.29,.44,1],[.70,.44,1],[.50,.62,1]],bumpers:[[.39,.35],[.61,.35],[.19,.62]],normal:13},
  {title:'CORE BREAKER',tone:'#291c42',targets:[[.17,.27,1],[.35,.17,1],[.50,.16,3],[.65,.17,1],[.83,.27,1],[.25,.53,2],[.75,.53,2],[.50,.68,1]],bumpers:[[.29,.37],[.71,.37],[.42,.57],[.58,.57]],normal:15}
 ];
 const total=STAGES.length;
 let balls=[],targets=[],bumpers=[],shots=0,angle=0,power=65,score=0,hits=0,buttons={},t=0,walls=0,physicsDebt=0,stage=1,stageHits=0,transition=0,stageHistory=[];
 const penalty=env.difficulty==='expert'?3:env.difficulty==='hard'?2:0;
 const g={w:960,h:540,finish:env.finish,
  start(){g._finished=false;stage=1;score=0;hits=0;t=0;walls=0;buttons={};stageHistory=[];window.BioGuardianArt?.preload([env.hero]);setupStage();},
  onResize(ow,oh,w,h){const sx=w/(ow||w),sy=h/(oh||h);for(const q of [...targets,...bumpers,...balls]){q.x*=sx;q.y*=sy;q.r=Math.max(6,q.r*Math.min(sx,sy));} },
  update(dt,input){if(g._finished)return;dt=Math.max(0,Math.min(.05,dt));t+=dt;transition=Math.max(0,transition-dt);
   angle=between(angle+((input.right?-1:input.left?1:0))*dt*1.35,-1.15,1.15);
   power=between(power+((input.up?1:input.down?-1:0))*45*dt,35,100);
   if(input.pointer?.down){const dx=input.pointer.x-g.w*.5,dy=g.h-30-input.pointer.y;angle=between(Math.atan2(-dx,Math.max(24,dy)),-1.15,1.15);}
   if(input.skill&&!buttons.recall&&balls.length){balls=[];env.sfx(320,.07);}buttons.recall=!!input.skill;const fire=!!(input.fire||input.pointer?.down);
   if(fire&&!buttons.fire&&shots>0&&balls.length===0&&transition<=0)shoot();buttons.fire=fire;
   physicsDebt=Math.min(.10,physicsDebt+dt);let iterations=0;
   while(physicsDebt>=1/120-1e-10&&iterations++<12){const step=1/120;physicsDebt=Math.max(0,physicsDebt-step);const w=g.w,h=g.h;
    for(const b of balls){
     b.t-=step;b.x+=b.vx*step;b.y+=b.vy*step;b.vx*=1-.12*step;b.vy*=1-.12*step;
     if(b.x<b.r+8){b.x=b.r+8;b.vx=Math.abs(b.vx)*.91;walls++}
     if(b.x>w-b.r-8){b.x=w-b.r-8;b.vx=-Math.abs(b.vx)*.91;walls++}
     if(b.y<b.r+8){b.y=b.r+8;b.vy=Math.abs(b.vy)*.91}
     if(b.y>h-b.r-4){b.y=h-b.r-4;b.vy=-Math.abs(b.vy)*.7;b.vx*=.96;}
     for(const q of bumpers)collide(b,q,1.05);
     for(let i=0;i<targets.length;i++){
      const q=targets[i],touching=q.hp>0&&Math.hypot(b.x-q.x,b.y-q.y)<b.r+q.r;
      if(!touching){b.locked.delete(i);continue;}
      if(!b.locked.has(i)){
       b.locked.add(i);q.hp--;hits++;stageHits++;score+=q.hp===0?180:65;collide(b,q,.95);env.sfx(650,.08);
      }
     }
    }
   }
   balls=balls.filter(b=>b.t>0&&Math.hypot(b.vx,b.vy)>15);
   if(targets.every(q=>q.hp<=0)){
    score+=stage*200+shots*45;stageHistory.push({stage,won:true,shotsLeft:shots,hits:stageHits});
    if(stage===total){ends(g,true,score,`${total} STAGES · ${hits} HITS`);return;}
    stage++;setupStage();return;
   }
   if(shots===0&&balls.length===0){stageHistory.push({stage,won:false,shotsLeft:0,hits:stageHits});ends(g,false,score,`STAGE ${stage}/${total} · ${hits} HITS`);}
  },
  draw(ctx){const w=g.w,h=g.h,layout=STAGES[stage-1];if(!window.BioWorldArt?.draw(ctx,'laboratory',w,h,{shade:.12}))cityBackdrop(ctx,w,h,t,layout.tone);if(chapter>1)rect(ctx,0,0,w,h,['','#23626b19','#6973311a','#9562331c','#96397122'][chapter-1]);ctx.fillStyle='#071b2a88';ctx.fillRect(0,h*.08,w,h*.72);
   ctx.strokeStyle='#4782a5';ctx.lineWidth=6;ctx.strokeRect(7,7,w-14,h-14);
   for(const q of bumpers){orb(ctx,q.x,q.y,q.r,'#485f8c');trace(ctx,q.x,q.y,q.r,'#a6bfff');orb(ctx,q.x,q.y,q.r*.4,'#79b2fc');}
   for(const q of targets){if(q.hp<=0)continue;orb(ctx,q.x,q.y,q.r,q.maxHp>1?'#523c77':'#11374e');trace(ctx,q.x,q.y,q.r,q.maxHp>1?'#d2a7ff':'#59e8e5');orb(ctx,q.x,q.y,Math.max(4,q.r*.33),'#9ffff3');if(q.hp>1)words(ctx,String(q.hp),q.x,q.y+4,10,'#fff','center');}
   for(const b of balls){orb(ctx,b.x,b.y,b.r,'#fbe9ad');trace(ctx,b.x,b.y,b.r+3,'#d8b88a');}
   const x=w*.5,y=h-30;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-Math.sin(angle)*Math.min(h*.4,power*2.4),y-Math.cos(angle)*Math.min(h*.4,power*2.4));ctx.setLineDash([7,6]);ctx.strokeStyle='#80eafa99';ctx.lineWidth=2;ctx.stroke();ctx.setLineDash([]);
   ctx.save();ctx.translate(x,y);ctx.rotate(-angle);rect(ctx,-12,-21,24,39,'#286987','#7be2f0');ctx.restore();
   words(ctx,`STAGE ${stage}/${total} · ${layout.title}`,14,24,Math.max(11,Math.min(15,w*.035)),'#d9f6ff');
   rect(ctx,15,h-82,Math.min(118,w*.27),60,'#0a293bcc','#3c8b9d');fighter(ctx,Math.min(70,w*.15),h-30,0,22,pal[env.hero],t%(.64),balls.length?'skill':'idle',1,env.hero);words(ctx,`ANGLE ${Math.round(angle*180/pi)}° · POWER ${Math.floor(power)}%`,15,h-13,12);
   if(transition>0){ctx.fillStyle='#081b33d9';ctx.fillRect(0,h*.39,w,h*.17);words(ctx,`STAGE ${stage} · ${layout.title}`,w*.5,h*.49,Math.max(15,Math.min(23,w*.048)),'#e5fdff','center');}
  },
  hud(){return `<span>STAGE <b>${stage}/${total}</b></span><span>SHOTS <b>${shots}</b></span><span>TARGETS <b>${targets.filter(q=>q.hp>0).length}</b></span><span>POWER <b>${Math.floor(power)}%</b></span><span>SCORE <b>${score}</b></span>`;}
 };
 function setupStage(){const design=STAGES[stage-1],w=g.w,h=g.h,unit=Math.min(w,h);
  targets=design.targets.map(([x,y,hp],i)=>{const health=hp+(chapter>=3&&i%3===0?1:0)+(chapter===5&&i%4===0?1:0);const shift=(chapter-1)*.012*(i%2?1:-1);return {x:w*between(x+shift,.12,.88),y:h*between(y+(chapter-1)*.008*(i%3-1),.12,.72),r:Math.max(10,unit*.033),hp:health,maxHp:health};});
  bumpers=design.bumpers.map(([x,y],i)=>({x:w*between(x+(chapter-1)*.014*(i%2?1:-1),.12,.88),y:h*y,r:Math.max(14,unit*.039)}));
  shots=Math.max(7,design.normal-penalty+(chapter-1));balls=[];stageHits=0;angle=0;power=65;buttons={};physicsDebt=0;transition=.75;
 }
 function collide(b,q,restitution){const dx=b.x-q.x,dy=b.y-q.y,d=Math.hypot(dx,dy),R=b.r+q.r;if(d>=R||d<=.001)return;const nx=dx/d,ny=dy/d,proj=b.vx*nx+b.vy*ny;b.x=q.x+nx*(R+1);b.y=q.y+ny*(R+1);if(proj<0){b.vx-=2*proj*nx*restitution;b.vy-=2*proj*ny*restitution;}}
 function shoot(){shots--;const speed=(350+power*3.4)*Math.min(1,Math.max(.75,g.h/500));balls.push({x:g.w*.5,y:g.h-32,r:Math.max(6,Math.min(g.w,g.h)*.014),vx:-Math.sin(angle)*speed,vy:-Math.cos(angle)*speed,t:8,locked:new Set()});env.sfx(450,.13);}
 g.debugPhysics=()=>({stage,totalStages:total,stageName:STAGES[stage-1].title,balls:balls.map(({locked,...q})=>({...q})),targets:targets.map(q=>({...q})),bumpers:bumpers.map(q=>({...q})),shots,hits,score,physicsDebt,stageHistory:stageHistory.map(q=>({...q})),transition});
 // Deterministic phase-transition probe for test harnesses only; production instances do not expose it.
 if(env.testMode)g.testClearStage=()=>{for(const q of targets)q.hp=0;};
 return g;};
R.g05=env=>{
const mode=env.mode==='pong'?'pong':'volley';
const chapter=Math.max(1,Math.min(5,Number(env.chapter)||1));
let player,ai,ball,points=[0,0],t=0,serve=0,rally=0,rallyClock=0,button={},limit=(mode==='pong'?7:5)+(chapter-1)*2;
let score=0,variant=(env.difficulty==='expert'?1.2:env.difficulty==='hard'?1.08:1)+(chapter-1)*.025,tableDebt=0,tableFrame=0,pointReason='',volleyDebt=0,serveSide=0,serveCrossings=[0,0],netContacts=0;
const table=()=>({left:g.w*.10,right:g.w*.90,top:g.h*.23,bottom:g.h*.82,mid:g.w*.50,
 leftPaddle:g.w*.15,rightPaddle:g.w*.85,net:Math.max(17,Math.min(g.w,g.h)*.042),radius:Math.max(5,Math.min(g.w,g.h)*.012)});
const field=()=>({floor:g.h*.86,body:between(Math.min(g.w,g.h)*.04,16,22),netTop:g.h*.86-Math.min(160,g.h*.30),netHalf:3,r:between(Math.min(g.w,g.h)*.022,8,13),gravity:g.h*1.18});
const sideOf=x=>x<g.w*.5?0:1;
function beginRound(){
 rallyClock=0;tableDebt=0;tableFrame=0;serve=.75;button={};rally=0;ball=null;
 const f=table();
 if(mode==='pong'){
  player={x:f.leftPaddle,y:g.h*.52,vy:0,ground:true,swing:0,cool:0};
  ai={x:f.rightPaddle,y:g.h*.52,vy:0,ground:true,swing:0,cool:0};
 }else{
  const f=field(),y=f.floor-f.body;serveSide=(points[0]+points[1])%2;volleyDebt=0;
  player={x:g.w*.22,y,vy:0,ground:true,hitCool:0,swing:0,moving:false};ai={x:g.w*.78,y,vy:0,ground:true,hitCool:0,swing:0,moving:false};
  heldVolley();
 }
}
function award(winner,reason=''){points[winner]++;pointReason=reason;env.sfx(winner===0?680:180,.14);beginRound();}
function startServe(){
 const f=table(),server=Math.floor((points[0]+points[1])/2)%2;
 const x=server===0?f.leftPaddle:f.rightPaddle;
 ball={x,y:g.h*(.44+Math.random()*.12),z:66,vx:server===0?335*g.w/640:-335*g.w/640,vy:(Math.random()-.5)*62,vz:0,
  lastHitter:server,serveOwn:true,bouncedReceiver:false};
}
function sendReturn(who){
 const f=table(),p=who===0?player:ai,dir=who===0?1:-1;
 ball.x=p.x+dir*11;ball.z=Math.max(40,Math.min(72,ball.z));ball.vz=220;
 ball.vx=dir*(400+(who===0&&p.swing>0?35:0))*g.w/640;
 const control=who===0?((button.up?-45:button.down?45:0)+(p.y-ball.y)*-.45):((Math.random()-.5)*55);
 ball.vy=between((ball.y-p.y)*1.65+control,-115,115);
 ball.lastHitter=who;ball.serveOwn=false;ball.bouncedReceiver=false;
 rally++;env.sfx(who===0?520:420,.055);if(who===0){p.swing=0;p.cool=.14;}
}
function tableStep(dt){
 if(!ball)return;const f=table(),oldX=ball.x;
 ball.vz-=720*dt;ball.z+=ball.vz*dt;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
 // A low shot striking the net is immediately a fault, not an invisible rebound.
 if((oldX-f.mid)*(ball.x-f.mid)<=0&&Math.abs(ball.x-oldX)>0.0001&&ball.z<f.net){award(1-ball.lastHitter,'NET');return;}
 // Hitting off the sides or end line is an out. A missed ball after one valid bounce earns the attacker a point.
 if(ball.x<f.left-f.radius||ball.x>f.right+f.radius||ball.y<f.top-f.radius||ball.y>f.bottom+f.radius){
  award(ball.bouncedReceiver?ball.lastHitter:1-ball.lastHitter,'OUT');return;
 }
 if(ball.z<=0){
  const onTable=ball.x>=f.left&&ball.x<=f.right&&ball.y>=f.top&&ball.y<=f.bottom;
  if(!onTable){award(ball.bouncedReceiver?ball.lastHitter:1-ball.lastHitter,'OUT');return;}
  const landing=sideOf(ball.x);
  if(ball.serveOwn){
   if(landing!==ball.lastHitter){award(1-ball.lastHitter,'SERVE');return;}
   ball.serveOwn=false;ball.vz=270;ball.z=0;env.sfx(360,.035);return;
  }
  if(!ball.bouncedReceiver){
   if(landing===ball.lastHitter){award(1-ball.lastHitter,'WRONG SIDE');return;}
   ball.bouncedReceiver=true;ball.vz=270;ball.z=0;env.sfx(360,.035);return;
  }
  award(ball.lastHitter,'DOUBLE BOUNCE');return;
 }
 // Paddle may return only after the ball has bounced legally on its own side.
 const defender=1-ball.lastHitter,p=defender===0?player:ai;
 if(ball.bouncedReceiver&&Math.abs(ball.x-p.x)<Math.max(14,f.radius*2.3)&&Math.abs(ball.y-p.y)<g.h*.092&&ball.z>=6&&ball.z<94){
  if(defender===0){if(p.swing>0)sendReturn(0);}
  else if(Math.random()<(env.difficulty==='expert'?.997:env.difficulty==='hard'?.985:.955)){sendReturn(1);}
 }
}
function updateTable(dt,input){
 const f=table();if(input.up||input.left)player.y-=g.h*.83*dt;
 if(input.down||input.right)player.y+=g.h*.83*dt;
 player.y=between(player.y,f.top+10,f.bottom-10);
 player.swing=Math.max(0,player.swing-dt);player.cool=Math.max(0,player.cool-dt);
 if(input.fire&&!button.fire&&player.cool===0){player.swing=.23;player.cool=.31;env.sfx(200,.03)}
 button.fire=!!input.fire;button.up=!!(input.up||input.left);button.down=!!(input.down||input.right);
 if(ball){
  const aim=(ball.vx>0&&ball.lastHitter===0)?ball.y:g.h*.52;
  ai.y+=between(aim-ai.y,-g.h*.61*variant*dt,g.h*.61*variant*dt);
  ai.y=between(ai.y,f.top+10,f.bottom-10);
 }
 if(serve>0){serve=Math.max(0,serve-dt);if(serve===0)startServe();return;}
 rallyClock+=dt;if(rallyClock>=18){award(ball?.bouncedReceiver?ball.lastHitter:1-(ball?.lastHitter??0),'RALLY LIMIT');return;}
 // Fixed-step ball physics avoids missed net/edge events during low FPS frames.
 tableDebt=Math.min(.1,tableDebt+Math.min(dt,.1));let steps=0;
 while(tableDebt>=1/120&&steps++<12){tableDebt-=1/120;tableStep(1/120);if(!ball||serve>0)break;}
}
function heldVolley(){const f=field(),server=serveSide===0?player:ai,dir=serveSide===0?1:-1;ball={x:server.x+dir*f.body*.8,y:server.y-f.body*1.2,vx:0,vy:0,lastHitter:serveSide,servedBy:serveSide,serveCrossed:false};}
function hitVolley(who,input={},serving=false){
 const f=field(),p=who===0?player:ai;
 const landing=g.w*(who===0?.79:.21)+(who===0?(input.right?g.w*.06:input.left?-g.w*.06:0):0);
 const dx=landing-ball.x,ratio=between((g.w*.5-ball.x)/dx,.07,.93);
 const targetY=f.floor-f.r,linear=ball.y+(targetY-ball.y)*ratio;
 const clearance=f.netTop-f.r-g.h*.065;
 const flight=Math.max(1.12,Math.sqrt(2*Math.max(0,linear-clearance)/(f.gravity*ratio*(1-ratio))));
 ball.vx=dx/flight;ball.vy=(targetY-ball.y-.5*f.gravity*flight*flight)/flight;
 ball.lastHitter=who;p.hitCool=.28;p.swing=.23;if(!serving)rally++;
 env.sfx(who===0?600:350,.07);
}
function volleyStep(dt,input){
 const w=g.w,h=g.h,f=field(),ground=f.floor-f.body;
 const firePressed=input.fire&&!button.fire;button.fire=!!input.fire;
 player.moving=!!(input.left||input.right);if(input.left)player.x-=w*.65*dt;if(input.right)player.x+=w*.65*dt;
 player.x=between(player.x,f.body+3,w*.5-f.body-7);
 const targetX=serve>0?w*.78:between(ball.x,w*.5+f.body+7,w-f.body-3);
 const aiDelta=between(targetX-ai.x,-w*.39*dt*variant,w*.39*dt*variant);ai.x+=aiDelta;ai.moving=Math.abs(aiDelta)>.05;
 if((input.jump||input.up)&&player.ground&&!button.jump){player.vy=-h*.8;player.ground=false;}button.jump=!!(input.jump||input.up);
 const shouldAIJump=serve<=0&&ball.x>w*.53&&ball.y<h*.70&&ball.vy>0&&Math.abs(ball.x-ai.x)<w*.12;
 if(shouldAIJump&&ai.ground){ai.vy=-h*.75;ai.ground=false;}
 for(const p of [player,ai]){p.vy+=h*2.4*dt;p.y+=p.vy*dt;if(p.y>=ground){p.y=ground;p.vy=0;p.ground=true;}p.hitCool=Math.max(0,p.hitCool-dt);p.swing=Math.max(0,p.swing-dt);}
 if(serve>0){heldVolley();serve=Math.max(0,serve-dt);if(firePressed&&serveSide===0||serve===0){serve=0;hitVolley(serveSide,input,true);}return;}
 if(firePressed)player.swing=.23;
 rallyClock+=dt;if(rallyClock>=14){award(ball.x>=w*.5?0:1,'TIME');return;}
 const oldX=ball.x,oldY=ball.y;ball.vy+=f.gravity*dt;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
 if(ball.x<f.r||ball.x>w-f.r){ball.x=between(ball.x,f.r,w-f.r);ball.vx*=-.85;}
 // Resolve one contact against each net face, then leave it moving away; no frame-by-frame flip trap.
 const netLeft=w*.5-f.netHalf,netRight=w*.5+f.netHalf;
 if(ball.y+f.r>=f.netTop&&ball.y-f.r<f.floor&&ball.x+f.r>netLeft&&ball.x-f.r<netRight){
  if(oldY+f.r<=f.netTop&&ball.vy>0){ball.y=f.netTop-f.r;ball.vy=-Math.abs(ball.vy)*.55;}
  else if(oldX<=w*.5&&ball.vx>0){ball.x=netLeft-f.r;ball.vx=-Math.abs(ball.vx)*.75;}
  else if(oldX>w*.5&&ball.vx<0){ball.x=netRight+f.r;ball.vx=Math.abs(ball.vx)*.75;}
  netContacts++;
 }
 if((oldX-w*.5)*(ball.x-w*.5)<0&&ball.y+f.r<f.netTop&&!ball.serveCrossed){serveCrossings[ball.servedBy]++;ball.serveCrossed=true;}
 if(ball.y<f.r){ball.y=f.r;ball.vy=Math.abs(ball.vy);}
 for(const [who,p]of [[0,player],[1,ai]]){
  if(who===0&&ball.x>w*.5||who===1&&ball.x<w*.5)continue;
  const touching=Math.hypot(ball.x-p.x,ball.y-(p.y-f.body*.55))<f.r+f.body*1.35;
  if(touching&&p.hitCool===0&&(ball.vy>0||p.swing>0))hitVolley(who,input);
 }
 if(ball.y+f.r>=f.floor)award(ball.x>w*.5?0:1,'GROUND');
}
function updateVolley(dt,input){volleyDebt=Math.min(.1,volleyDebt+Math.max(0,dt));let steps=0;while(volleyDebt>=1/120-1e-10&&steps++<12){volleyDebt=Math.max(0,volleyDebt-1/120);volleyStep(1/120,input);if(points[0]>=limit||points[1]>=limit)break;}}
const g={w:960,h:540,finish:env.finish,
 start(){g._finished=false;points=[0,0];t=0;score=0;pointReason='';serveCrossings=[0,0];netContacts=0;window.BioGuardianArt?.preload([env.hero,(env.hero+3)%7]);beginRound();},
 onResize(ow,oh,w,h){if(!player)return;const kx=w/(ow||w),ky=h/(oh||h);
  player.y*=ky;ai.y*=ky;if(mode==='pong'){player.x=w*.15;ai.x=w*.85;}
  else{player.x*=kx;ai.x*=kx;player.vy*=ky;ai.vy*=ky;}
  if(ball){ball.x*=kx;ball.y*=ky;if(mode==='pong'){ball.z*=Math.min(kx,ky);ball.vx*=kx;ball.vy*=ky;ball.vz*=Math.min(kx,ky);}
   else{ball.vx*=kx;ball.vy*=ky;}}
 },
 update(dt,input){if(g._finished)return;t+=dt;
  if(mode==='pong')updateTable(dt,input);else updateVolley(dt,input);
  if(points[0]>=limit||points[1]>=limit){const win=points[0]>points[1];ends(g,win,points[0]*120+rally*4,`${points[0]} – ${points[1]}`);}
 },
 draw(ctx){const w=g.w,h=g.h;if(!window.BioWorldArt?.draw(ctx,'arena',w,h,{shade:.18}))cityBackdrop(ctx,w,h,t,mode==='pong'?'#0a3e45':'#164354');if(chapter>1)rect(ctx,0,0,w,h,['','#174a4418','#365a6c1b','#7d4b751d','#8e4b2921'][chapter-1]);words(ctx,'CH '+chapter+' · '+['TRAINING','CITY ARENA','OPEN COURT','NIGHT LEAGUE','FINAL'][chapter-1],w*.5,22,11,'#b6e5f0','center');
  if(mode==='pong'){
   const f=table();fighter(ctx,w*.055,player.y+27,0,19,pal[env.hero],t,player.swing>0?'attack1':'idle',1,env.hero);fighter(ctx,w*.945,ai.y+27,0,19,pal[(env.hero+3)%7],t,'idle',-1,(env.hero+3)%7);ctx.fillStyle='#0c5560';ctx.fillRect(f.left,f.top,f.right-f.left,f.bottom-f.top);
   ctx.strokeStyle='#c4f7ed';ctx.lineWidth=Math.max(2,w*.003);ctx.strokeRect(f.left,f.top,f.right-f.left,f.bottom-f.top);
   ctx.beginPath();ctx.moveTo(f.mid,f.top);ctx.lineTo(f.mid,f.bottom);ctx.strokeStyle='#9bfcf2';ctx.lineWidth=3;ctx.stroke();
   ctx.setLineDash([9,9]);ctx.beginPath();ctx.moveTo(f.left,(f.top+f.bottom)/2);ctx.lineTo(f.right,(f.top+f.bottom)/2);ctx.strokeStyle='#ffffff55';ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);
   // The net casts a bright line and the projectile renders separately from its table shadow.
   ctx.strokeStyle='#9cdeff';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(f.mid,f.top);ctx.lineTo(f.mid,f.bottom);ctx.stroke();
   // Racket silhouettes are separate from the moving ball; the racket head has a forgiving but bounded collision zone.
   ctx.fillStyle='#d7f5fc';ctx.fillRect(player.x-6,player.y+11,12,23);
   ctx.beginPath();ctx.ellipse(player.x,player.y,15,22,0,0,TAU);ctx.fillStyle='#38accb';ctx.fill();
   ctx.lineWidth=3;ctx.strokeStyle='#b8f8ff';ctx.stroke();
   if(player.swing>0){ctx.strokeStyle='#a8fdfb';ctx.lineWidth=4;ctx.beginPath();ctx.arc(player.x+8,player.y,36,-1,1);ctx.stroke();}
   ctx.fillStyle='#ead5ac';ctx.fillRect(ai.x-6,ai.y+11,12,23);
   ctx.beginPath();ctx.ellipse(ai.x,ai.y,15,22,0,0,TAU);ctx.fillStyle='#eaa261';ctx.fill();
   ctx.lineWidth=3;ctx.strokeStyle='#ffe7c4';ctx.stroke();
   if(ball){orb(ctx,ball.x,ball.y,Math.max(4,f.radius*.67),'#122b36');
    orb(ctx,ball.x,ball.y-Math.min(40,ball.z*.22),f.radius,'#fff5db');
    if(ball.bouncedReceiver)trace(ctx,ball.x,ball.y,f.radius+5,'#eaffbb');}
   words(ctx,'2 BOUNCES TO SERVE · 1 TO RETURN',15,h-17,Math.max(10,Math.min(13,w*.024)),'#9ceada');
  }else{
   const f=field(),ground=f.floor;rect(ctx,0,ground,w,h-ground,'#184155');rect(ctx,0,ground,w,3,'#9cf2e3');
   ctx.strokeStyle='#c5eee63d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(w*.08,ground+12);ctx.lineTo(w*.92,ground+12);ctx.moveTo(w*.5,ground);ctx.lineTo(w*.5,h);ctx.stroke();
   rect(ctx,w*.5-f.netHalf,f.netTop,f.netHalf*2,ground-f.netTop,'#d9eff8');
   ctx.strokeStyle='#a8e7ea88';ctx.lineWidth=1;ctx.strokeRect(w*.5-9,f.netTop,18,ground-f.netTop);
   for(let y=f.netTop+12;y<ground;y+=13){ctx.beginPath();ctx.moveTo(w*.5-9,y);ctx.lineTo(w*.5+9,y);ctx.stroke();}
   for(const [who,p]of [[0,player],[1,ai]]){const id=who===0?env.hero:(env.hero+3)%7,clip=p.swing>0?'attack1':!p.ground?'jump':p.moving?'walk':'idle';fighter(ctx,p.x,p.y+f.body,0,between(Math.min(w,h)*.075,26,39),pal[id],p.swing>0?.23-p.swing:t,clip,who===0?1:-1,id);}
   orb(ctx,ball.x,ball.y,f.r,'#f8f3c0');
   ctx.beginPath();ctx.arc(ball.x-4,ball.y-3,3,0,TAU);ctx.strokeStyle='#e9a361';ctx.stroke();if(serve>0)words(ctx,jaText(env,'發球','サーブ')+' '+Math.ceil(serve),w*.5,h*.25,16,'#b9fff0','center');
  }
  words(ctx,`${points[0]}    :    ${points[1]}`,w/2,37,24,'#ebfcff','center');
  words(ctx,mode==='pong'?'TABLE TENNIS':'ENERGY VOLLEYBALL',15,h*.135,12,'#8de4eb');
 },
 hud(){return `<span>${mode==='pong'?'TABLE TENNIS':'VOLLEY'}</span><span>YOU <b>${points[0]}</b></span><span>AI <b>${points[1]}</b></span><span>FIRST TO <b>${limit}</b></span>${mode==='volley'?`<span>RALLY <b>${Math.max(0,Math.ceil((mode==='volley'?14:18)-rallyClock))}s</b></span>`:`<span>${serve>0?'SERVICE':ball?.bouncedReceiver?'RETURN':'BOUNCE'} <b>${Math.max(0,Math.ceil((mode==='volley'?14:18)-rallyClock))}s</b></span>`}`;},
 inspectMatch(){return {mode,points:[...points],serve,ball:ball?{...ball}:null,player:{...player},ai:{...ai},rally,rallyClock,reason:pointReason,field:mode==='volley'?{...field()}:null,serveSide,serveCrossings:[...serveCrossings],netContacts,finished:!!g._finished}},
};if(env.testMode&&mode==='volley'){g.testVolleyServe=side=>{beginRound();serveSide=side===1?1:0;heldVolley();};g.testVolleyBall=value=>{serve=0;Object.assign(ball,value);};}return g;
};

R.g06=env=>{
 const chapter=Math.max(1,Math.min(5,Number(env.chapter)||1)),lapLength=1200,laps=chapter===1?3:2,goal=lapLength*laps,timeLimit=chapter===1?110:95+(chapter-1)*14,roadHalf=5.2,checkpointDistances=Array.from({length:laps*3},(_,i)=>(i+1)*400);
 const chapterNames=['CITY LOOP','GREEN HILLS','SKYWAY S-CURVES','CANYON DESCENT','ENTROPY CORE'],segmentNames=['SKYWAY','GREEN TUNNEL','ENERGY CORE'],mul=env.difficulty==='expert'?1.3:env.difficulty==='hard'?1.15:1;
  const routeSpecs=[
   {sx:190,sz:160,x2:22,z3:18,grade:8,wave:3,phase:0,road:'#29444e'},
   {sx:205,sz:156,x2:26,z3:11,grade:23,wave:9,phase:.17,road:'#244b40'},
   {sx:180,sz:155,x2:57,z3:26,grade:10,wave:8,phase:.42,road:'#2b465d'},
   {sx:178,sz:171,x2:40,z3:35,grade:28,wave:15,phase:.8,road:'#4c4144'},
   {sx:185,sz:157,x2:63,z3:38,grade:31,wave:14,phase:1.14,road:'#403455'}
  ],route=routeSpecs[chapter-1];
 let car,traffic=[],t=0,progress=0,elapsed=0,score=0,collisions=0,nitro=100,checkpointIndex=0,gateFlash=0,passes=0,slipstream=false;
 function trackAt(s){const a=(s%lapLength)/lapLength*TAU,k=TAU/lapLength,phi=route.phase;
  const x=route.sx*Math.sin(a)+route.x2*Math.sin(2*a+phi),z=route.sz*Math.cos(a)+route.z3*Math.cos(3*a+phi),
  dx=(route.sx*Math.cos(a)+2*route.x2*Math.cos(2*a+phi))*k,
  dz=(-route.sz*Math.sin(a)-3*route.z3*Math.sin(3*a+phi))*k,len=Math.max(.01,Math.hypot(dx,dz));
  return {x,z,y:route.grade*Math.sin(a+phi)+route.wave*Math.sin(3*a),fx:dx/len,fz:dz/len,rate:len,bend:.35+(route.x2/50)*Math.sin(a+phi)+.20*Math.sin(3*a+phi)};}
 let projectionBasis=null;
 function project(distance,lane=0){
  if(!projectionBasis||projectionBasis.progress!==progress||projectionBasis.w!==g.w||projectionBasis.h!==g.h){
   const anchor=trackAt(progress),camera=trackAt(progress-8/anchor.rate),dx=anchor.x-camera.x,dz=anchor.z-camera.z,forward=Math.max(1,dx*camera.fx+dz*camera.fz);
   // Keep a constant physical chase distance and a visible car on both slopes and bends.
   camera.eye=anchor.y-camera.y+.50*forward/(.85*.85);projectionBasis={progress,w:g.w,h:g.h,camera};
  }
  const camera=projectionBasis.camera,point=trackAt(progress+distance),dx=point.x+point.fz*roadHalf*lane-camera.x,dz=point.z-point.fx*roadHalf*lane-camera.z;
  const forward=dx*camera.fx+dz*camera.fz;if(forward<1)return null;const side=dx*camera.fz-dz*camera.fx,scale=.85/forward;
  return {x:g.w*.5+side*scale*g.w*.5,y:g.h*.32+(camera.y+camera.eye-point.y)*scale*g.h*.85,scale,half:roadHalf*scale*g.w*.5};
 }

 function polyRoad(ctx,a,b,color){if(!a||!b)return;ctx.beginPath();ctx.moveTo(a[0].x,a[0].y);ctx.lineTo(a[1].x,a[1].y);ctx.lineTo(b[1].x,b[1].y);ctx.lineTo(b[0].x,b[0].y);ctx.closePath();ctx.fillStyle=color;ctx.fill();}
 function edgeAt(distance,laneA=-1,laneB=1){const a=project(distance,laneA),b=project(distance,laneB);return a&&b?[a,b]:null;}
 function vehicle(ctx,x,y,width,color,steer=0,braking=false,boost=false){const h=width*1.65;ctx.save();ctx.translate(x,y);ctx.rotate(steer*.045);ctx.fillStyle='#0007';ctx.beginPath();ctx.ellipse(0,6,width*.64,h*.21,0,0,TAU);ctx.fill();
  for(const xx of [-.48,.48]){rect(ctx,xx*width-width*.09,-h*.57,width*.18,h*.29,'#0b1521');rect(ctx,xx*width-width*.09,h*.12,width*.18,h*.3,'#0b1521');}
  const paint=ctx.createLinearGradient(-width*.5,0,width*.5,0);paint.addColorStop(0,'#19384a');paint.addColorStop(.18,color);paint.addColorStop(.5,'#e5f8ed');paint.addColorStop(.64,color);paint.addColorStop(1,'#183245');ctx.fillStyle=paint;ctx.beginPath();ctx.moveTo(-width*.34,-h*.68);ctx.quadraticCurveTo(0,-h*.82,width*.34,-h*.68);ctx.lineTo(width*.48,h*.43);ctx.quadraticCurveTo(0,h*.58,-width*.48,h*.43);ctx.closePath();ctx.fill();
  ctx.fillStyle='#123446';ctx.beginPath();ctx.moveTo(-width*.27,-h*.4);ctx.lineTo(width*.27,-h*.4);ctx.lineTo(width*.34,-h*.05);ctx.lineTo(-width*.34,-h*.05);ctx.closePath();ctx.fill();rect(ctx,-width*.26,h*.08,width*.52,h*.18,'#143346');rect(ctx,-width*.31,-h*.64,width*.62,3,'#e6fcf0');
  for(const xx of [-.3,.3]){rect(ctx,width*xx-width*.085,h*.4,width*.17,Math.max(3,h*.04),braking?'#ff525f':'#f5a072');rect(ctx,width*xx-width*.085,-h*.66,width*.17,3,'#e3fff5');}
  if(boost){ctx.fillStyle='#89eaffbb';for(const xx of [-.23,.23]){ctx.beginPath();ctx.moveTo(width*xx-4,h*.47);ctx.lineTo(width*xx,h*(.72+Math.sin(t*24)*.09));ctx.lineTo(width*xx+4,h*.47);ctx.fill();}}
  ctx.restore();}
 const g={w:640,h:800,finish:env.finish,
  start(){g._finished=false;window.BioGuardianArt?.preload([env.hero]);window.BioWorldArt?.preload('race');car={lane:0,steer:0,speed:0,health:100,inv:0,braking:false};traffic=[];progress=0;elapsed=0;t=0;score=0;collisions=0;nitro=100;checkpointIndex=0;gateFlash=0;passes=0;slipstream=false;
   for(let n=0;n<23+(chapter-1)*6;n++)traffic.push({z:170+n*145,lane:pick([-.67,0,.67]),type:'barrier',speed:0,hit:false,passed:false});
   for(let n=0;n<5;n++)traffic.push({z:85+n*95,lane:pick([-.65,0,.65]),home:pick([-.65,0,.65]),type:'car',speed:(38+n*3)*(1+(mul-1)*.3),color:['#f2b56e','#e9798f','#8ed8b7','#a9a2f0','#c1e5ed'][n],hit:false,passed:false});
  },onResize(){},
  update(dt,input){if(g._finished)return;dt=Math.min(.05,Math.max(0,dt));const previousProgress=progress;t+=dt;elapsed+=dt;car.inv=Math.max(0,car.inv-dt);car.braking=!!input.down;
   const boost=(input.fire||input.skill)&&nitro>1&&!car.braking,desired=car.braking?0:boost?96:74;car.speed+=between(desired-car.speed,-38*dt,16*dt);nitro=boost?Math.max(0,nitro-27*dt):Math.min(100,nitro+(slipstream?18:8)*dt);
   let turn=(input.right?1:0)-(input.left?1:0);if(input.pointer?.down)turn=between(((input.pointer.x/g.w-.5)*2-car.lane)*3,-1,1);car.steer+=between(turn-car.steer,-8*dt,8*dt);const bend=trackAt(progress).bend;
   car.lane=between(car.lane+car.steer*.9*(.65+car.speed/100)*dt-bend*Math.pow(car.speed/80,2)*.16*dt,-1.25,1.25);
   if(Math.abs(car.lane)>1.04){car.speed=Math.max(car.braking?0:18,car.speed-36*dt);car.health=Math.max(0,car.health-2*dt);}
   const next=progress+car.speed*dt,gate=checkpointDistances[checkpointIndex];
   if(gate!==undefined&&next>=gate){if(Math.abs(car.lane)<=.93){progress=Math.min(goal,next);checkpointIndex++;gateFlash=.65;env.sfx(820,.08);}else{progress=Math.min(next,gate-.01);car.speed=Math.min(car.speed,24);gateFlash=-.65;}}else progress=Math.min(goal,next);
   gateFlash=gateFlash>0?Math.max(0,gateFlash-dt):Math.min(0,gateFlash+dt);slipstream=false;
   for(const ob of traffic){const was=ob.z-previousProgress;if(ob.type==='car'){ob.z+=ob.speed*dt;ob.lane+=between(ob.home+Math.sin(t*.45+ob.speed)*.12-ob.lane,-.17*dt,.17*dt);}
    const distance=ob.z-progress;if(ob.type==='car'&&distance>8&&distance<38&&Math.abs(ob.lane-car.lane)<.2)slipstream=true;
    if(ob.type==='car'&&!ob.passed&&was>0&&distance<0){ob.passed=true;passes++;env.sfx(600,.04);}
    if(!ob.hit&&distance<3.6&&distance>-3.6&&Math.abs(ob.lane-car.lane)<.27&&car.inv<=0){ob.hit=true;collisions++;car.health-=(ob.type==='car'?24:16)*mul;car.speed*=.65;car.inv=1.2;env.sfx(95,.14);}
   }
   score=Math.floor(progress*.28)+checkpointIndex*50+passes*90+Math.max(0,300-Math.floor(elapsed*2))-collisions*45;
   if(car.health<=0){ends(g,false,score,'VEHICLE DAMAGED');return;}if(elapsed>=timeLimit){ends(g,false,score,'TIME OUT');return;}if(progress>=goal&&checkpointIndex===checkpointDistances.length)ends(g,true,score+Math.floor(car.health)*5,`${Math.floor(elapsed)} s · ${1+traffic.filter(o=>o.type==='car'&&o.z>progress).length}/6`);
  },
  draw(ctx){const w=g.w,h=g.h,sector=Math.min(2,Math.floor((progress%lapLength)/400));if(!window.BioWorldArt?.draw(ctx,'race',w,h,{pan:-car.lane*10,shade:.08}))cityBackdrop(ctx,w,h,t,'#12394b');
   rect(ctx,0,h*.36,w,h*.64,['#214148','#244539','#2c3d4c'][sector]);const start=Math.floor((progress-4)/4)*4;
   for(let world=start+220;world>=start;world-=4){const d=world-progress,next=d+4,a=edgeAt(d),b=edgeAt(next);if(!a||!b)continue;
    polyRoad(ctx,edgeAt(d,-1.35,1.35),edgeAt(next,-1.35,1.35),Math.floor(world/8)%2?'#46605a':'#3e5852');
    polyRoad(ctx,a,b,Math.floor(world/8)%2?route.road:'#263f4a');
    for(const side of [-1,1])polyRoad(ctx,edgeAt(d,side*.98,side*1.045),edgeAt(next,side*.98,side*1.045),Math.floor(world/8)%2?'#d9d9b5':'#d18975');
    for(const side of [-1,1])polyRoad(ctx,edgeAt(d,side*1.1,side*1.13),edgeAt(next,side*1.1,side*1.13),'#6d9394');
    if(Math.floor(world/12)%2===0)for(const lane of [-.34,.34])polyRoad(ctx,edgeAt(d,lane-.009,lane+.009),edgeAt(next,lane-.009,lane+.009),'#b6d1c8');
   }
   // World-anchored lights and gates share the same projection as cars and collision distances.
   const objects=[];for(let z=Math.floor(progress/32)*32;z<progress+210;z+=32)objects.push({z,type:'light'});
   for(const ob of traffic)if(ob.z-progress>-5&&ob.z-progress<210)objects.push(ob);
   const nextGate=checkpointDistances[checkpointIndex];if(nextGate!==undefined&&nextGate-progress<210)objects.push({z:nextGate,type:'gate'});
   objects.sort((a,b)=>b.z-a.z);
   for(const ob of objects){const distance=ob.z-progress;if(ob.type==='light'){for(const lane of [-1.22,1.22]){const p=project(distance,lane);if(!p||p.y<h*.2)continue;const tall=Math.min(h*.7,6*p.scale*w*.5);ctx.strokeStyle='#7d9b9e';ctx.lineWidth=Math.max(1,4*p.scale);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x,p.y-tall);ctx.stroke();orb(ctx,p.x,p.y-tall,Math.max(1,8*p.scale),'#d4f3dc');}continue;}
    if(ob.type==='gate'){const a=project(distance,-.96),b=project(distance,.96);if(!a||!b)continue;const tall=Math.max(6,4.8*a.scale*w*.5);ctx.strokeStyle=gateFlash<0?'#ff9a91':'#75e5d3';ctx.lineWidth=Math.max(2,10*a.scale);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(a.x,a.y-tall);ctx.lineTo(b.x,b.y-tall);ctx.lineTo(b.x,b.y);ctx.stroke();continue;}
    const p=project(distance,ob.lane);if(!p)continue;const size=Math.max(3,Math.min(w*.2,1.75*p.scale*w*.5));
    if(ob.type==='car')vehicle(ctx,p.x,p.y,size,ob.color,0,false,false);else{const top=p.y-size*.65;rect(ctx,p.x-size*.55,top,size*1.1,size*.65,'#c57f46','#f5d6a5');ctx.strokeStyle='#402d32';ctx.lineWidth=Math.max(1,size*.1);ctx.beginPath();ctx.moveTo(p.x-size*.4,top+size*.5);ctx.lineTo(p.x-size*.1,top+size*.14);ctx.moveTo(p.x+size*.1,top+size*.5);ctx.lineTo(p.x+size*.4,top+size*.14);ctx.stroke();}
   }
   const player=project(0,car.lane);if(player&&!(car.inv&&Math.floor(t*14)%2))vehicle(ctx,player.x,player.y,Math.min(w*.15,1.75*player.scale*w*.5),pal[env.hero],car.steer,car.braking,(nitro<98&&car.speed>78));
   // Mini-map samples the actual closed track, rather than an unrelated decorative oval.
   const mx=w-84,my=72;rect(ctx,w-150,14,138,123,'#062133db','#438493');ctx.beginPath();for(let n=0;n<=60;n++){const p=trackAt(n/60*lapLength),xx=mx+p.x*.24,yy=my+p.z*.24;n?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.strokeStyle='#70c0bf';ctx.lineWidth=3;ctx.stroke();const dot=trackAt(progress);orb(ctx,mx+dot.x*.24,my+dot.z*.24,4,'#fff0ac');words(ctx,`CP ${checkpointIndex}/${checkpointDistances.length}`,mx,126,12,'#c3f8e8','center');
   words(ctx,`LAP ${Math.min(laps,Math.floor(checkpointIndex/3)+1)}/${laps}`,14,32,17);words(ctx,`${Math.round(car.speed*3.6)} km/h`,14,57,16,'#9bf0dd');words(ctx,`${(timeLimit-elapsed).toFixed(1)} s`,14,81,14,'#f9d7a6');words(ctx,chapterNames[chapter-1]+' · '+segmentNames[sector],14,103,11,'#a3d6de');
   if(slipstream)words(ctx,'SLIPSTREAM',w/2,h*.21,15,'#a4f6df','center');if(gateFlash<0)words(ctx,jaText(env,'回到道路內通過檢查點','コースに戻ってゲートを通過'),w/2,h*.21,Math.max(11,w*.025),'#ffd1b6','center');
   bar(ctx,14,h-28,Math.min(160,w*.4),7,car.health/100,'#81e3c5');bar(ctx,14,h-15,Math.min(160,w*.4),5,nitro/100,'#6bc9ff');fighter(ctx,w-42,h-12,0,20,pal[env.hero],t,car.inv?'hurt':'idle',-1,env.hero);
  },
  hud(){const rank=1+traffic.filter(o=>o.type==='car'&&o.z>progress).length;return `<span>LAP <b>${Math.min(laps,Math.floor(checkpointIndex/3)+1)}/${laps}</b></span><span>GATE <b>${checkpointIndex}/${checkpointDistances.length}</b></span><span>POS <b>${rank}/6</b></span><span>HP <b>${Math.max(0,Math.ceil(car.health))}</b></span><span>BOOST <b>${Math.floor(nitro)}%</b></span>`;},
  inspectRace(){return {progress,checkpointIndex,checkpointTotal:checkpointDistances.length,nextGate:checkpointDistances[checkpointIndex]??null,lap:Math.min(laps,Math.floor(checkpointIndex/3)+1),chapter,trackName:chapterNames[chapter-1],sector:segmentNames[Math.min(2,Math.floor((progress%lapLength)/400))],car:{...car},traffic:traffic.map(x=>({...x})),elapsed,score,collisions,passes,slipstream,roadSample:project(40),playerScreen:project(0,car.lane),finished:!!g._finished};}
 };if(env.testMode)g.testPlace=({distance=progress,lane=0,speed=0,obstacle=null,keepTraffic=false}={})=>{progress=distance;car.lane=lane;car.speed=speed;car.inv=0;if(!keepTraffic)traffic=obstacle?[{z:distance+(obstacle.ahead??0),lane:obstacle.lane??lane,home:obstacle.lane??lane,type:obstacle.type??'barrier',speed:obstacle.speed??0,hit:false,passed:false}]:[];};return g;
};
})();
