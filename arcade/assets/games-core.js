/* Bio-City original standalone mini-game engines. No copied game assets. */
(()=>{'use strict';
const R={};window.BioSuiteGames=R;
const pi=Math.PI,TAU=2*pi,between=(x,a,b)=>Math.max(a,Math.min(b,x)),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),rnd=(a,b)=>Math.random()*(b-a)+a,pick=a=>a[(Math.random()*a.length)|0];
// Analog values are optional; legacy keyboard-only engine callers retain their behavior.
const axis=(input,name,positive,negative)=>Number.isFinite(input[name])?between(input[name],-1,1):(positive?1:0)-(negative?1:0);
const pal=['#ff6b88','#68ddfc','#ffc576','#f5e28b','#bfa2ff','#8bf1b8','#a8f1ff'];
function back(ctx,w,h,color='#081b2f',grid=54){ctx.fillStyle=color;ctx.fillRect(0,0,w,h);ctx.strokeStyle='#3c89a51c';ctx.lineWidth=1;for(let x=0;x<w;x+=grid){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}for(let y=0;y<h;y+=grid){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}}
function words(ctx,text,x,y,font=14,color='#e9f7ff',align='left'){ctx.fillStyle=color;ctx.font=`700 ${font}px system-ui,sans-serif`;ctx.textAlign=align;ctx.fillText(text,x,y);ctx.textAlign='left'}
function bar(ctx,x,y,w,h,rate,color='#65e6d3'){ctx.fillStyle='#334353';ctx.fillRect(x,y,w,h);ctx.fillStyle=color;ctx.fillRect(x,y,w*between(rate,0,1),h)}
function orb(ctx,x,y,r,c){ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle=c;ctx.fill()}
function trace(ctx,x,y,r,c){ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.strokeStyle=c;ctx.lineWidth=2;ctx.stroke()}
function rect(ctx,x,y,w,h,fill,stroke){ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);if(stroke){ctx.strokeStyle=stroke;ctx.strokeRect(x,y,w,h)}}
function arena(ctx,w,h,t){if(window.BioWorldArt?.draw(ctx,'street',w,h,{shade:.16}))return;back(ctx,w,h,'#071423',44);let horizon=h*.42;ctx.fillStyle='#0b2c41';for(let x=-10;x<w;x+=52){let size=30+((x*11)%80);ctx.fillRect(x,horizon-size,35,size);rect(ctx,x+11,horizon-size+9,3,3,'#62d2e955')}rect(ctx,0,horizon,w,h-horizon,'#122537');ctx.strokeStyle='#5ae4ec24';for(let j=0;j<9;j++){let y=horizon+j*j*(h-horizon)/64;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}for(let i=0;i<10;i++){ctx.beginPath();ctx.moveTo(w/2,horizon);ctx.lineTo(i*w/9,h);ctx.stroke()}}
// Ground anchor never follows the jumping body; actual poses come from authored PNG frames.
function fighter(ctx,x,y,z,size,color,time,state='idle',dir=1,id=0,alpha=1,shadow=true){
 if(shadow){const lift=between(z/180,0,.75),s=size/46;ctx.save();ctx.globalAlpha=.32*(1-lift);ctx.fillStyle='#020a14';ctx.beginPath();ctx.ellipse(x,y,(12-4*lift)*s,(3-1*lift)*s,0,0,TAU);ctx.fill();ctx.globalAlpha=.17*(1-lift);ctx.fillStyle='#020b15';ctx.beginPath();ctx.ellipse(x+5*s,y+2*s,(23-7*lift)*s,(6-2*lift)*s,.08,0,TAU);ctx.fill();ctx.restore();}
 if(!window.BioGuardianArt?.draw(ctx,id,state,time,x,y-z,size/46,dir,alpha)){
  // Small loading/error marker keeps the battlefield usable when an image cannot load.
  orb(ctx,x,y-z-32,15,color);trace(ctx,x,y-z-32,19,'#e1f8ff');
 }
}
function particleField(){
 let particles=[],clock=0;
 return {
  clear(){particles=[];clock=0;},
  burst(x,y,color,count=8,speed=80){
   particles.push({x,y,color,ring:true,life:.28,max:.28,r:7});
   for(let i=0;i<count;i++){const angle=i*2.39996+clock*.7,v=speed*(.45+(Math.sin(i*8.17)+1)*.25),life=.24+(i%4)*.055;particles.push({x,y,vx:Math.cos(angle)*v,vy:Math.sin(angle)*v-12,color,life,max:life,r:1.4+i%3*.6});}
   if(particles.length>100)particles=particles.slice(-100);
  },
  step(dt){clock+=dt;let alive=0;for(const p of particles){p.life-=dt;if(!p.ring){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=65*dt;}if(p.life>0)particles[alive++]=p;}particles.length=alive;},
  draw(ctx,offset=0){ctx.save();for(const p of particles){const alpha=between(p.life/p.max,0,1);ctx.globalAlpha=alpha;if(p.ring){ctx.strokeStyle=p.color;ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(p.x,p.y-offset,p.r+(1-alpha)*19,3+(1-alpha)*9,0,0,TAU);ctx.stroke();}else{ctx.fillStyle=p.color;ctx.fillRect(p.x-p.r,p.y-offset-p.r,p.r*2,p.r*2);}}ctx.restore();},
  inspect(){return {count:particles.length};}
 };
}
function motionTrail(ctx,points,radius,color){
 ctx.save();ctx.strokeStyle=color;ctx.lineCap='round';for(let i=1;i<points.length;i++){const k=i/points.length;ctx.globalAlpha=k*.36;ctx.lineWidth=Math.max(1,radius*k*.85);ctx.beginPath();ctx.moveTo(points[i-1].x,points[i-1].y);ctx.lineTo(points[i].x,points[i].y);ctx.stroke();}ctx.restore();
}
// Contact squash is visual only; the collider radius and ball velocity stay unchanged.
function kineticBall(ctx,x,y,r,color,highlight,contact=0,angle=0,seam=false){
 const k=between(contact/.16,0,1);ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(1-.16*k,1+.12*k);orb(ctx,0,0,r,color);if(highlight)orb(ctx,-r*.3,-r*.32,r*.30,highlight);if(seam){ctx.beginPath();ctx.arc(-4,-3,3,0,TAU);ctx.strokeStyle='#e9a361';ctx.stroke();}ctx.restore();
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
const episodeNames=['CENTRAL STREET','ENERGY FACTORY','SKY PLATFORM','FRACTURE DISTRICT','ENTROPY CORE'];
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
 const e=cObj((chapter===4&&Math.random()<.38)?-35:w+35,between(h*.58+Math.random()*h*.3,h*.52,h*.87),{type,hp:(type==='boss'?520:type==='brute'?105:type==='ranged'?65:55)*mode,max:1,speed:type==='boss'?75:type==='brute'?47:type==='ranged'?64:80,hit:0,attack:0,tele:0,dir:-1,phase:0,stage:1,attackCount:0,clip:'idle',clipTime:0,attackKind:'',targetX:0,targetY:0});
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
    if(Math.hypot(p.x-e.targetX,(p.y-e.targetY)*1.5)<(chapter===4?78:63))wound(27*mode,e);
   }else if(e.type==='boss'&&e.attackKind==='volley'){
    for(let i=-(chapter>=2&&e.stage===2?3:e.stage===2?2:1);i<=(chapter>=2&&e.stage===2?3:e.stage===2?2:1);i++){
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
   // Chapter-specific boss patterns: each finale changes the required response.
    const patterns=[
      ['slam','volley','charge'],      // Central Street: fundamentals
      ['volley','volley','slam'],      // Energy Factory: projectile pressure
      ['charge','volley','charge'],    // Sky Platform: evade telegraphed dashes
      ['slam','charge','slam'],        // Fracture District: ground danger
      ['charge','slam','volley']       // Entropy Core: combined exam
    ];
    let move=patterns[chapter-1][cycle];
    if(chapter===1&&e.stage===1&&move==='charge')move='volley';
    e.attackKind=move;
   e.tele=e.attackKind==='charge'?.68:e.attackKind==='slam'?(e.stage===2?.62:.76):1.0;e.attack=(e.stage===2?1.65:2.05)*(chapter===5?.88:1);
   e.tele*=pace;e.attack*=pace;
   e.targetX=p.x;e.targetY=p.y;
  }
 }else if(e.type==='ranged'){
  // Enter the visible arena at walking speed; retreat must never strand a
  // ranged enemy beyond the player's reachable edge. Keep the existing pace.
  const edge=between(e.x,24,g.w-24);
  if(edge!==e.x){e.x+=between(edge-e.x,-e.speed*dt,e.speed*dt);return;}
  if(dist>160)e.x=between(e.x+e.dir*e.speed*dt,24,g.w-24);else if(dist<112)e.x=between(e.x-e.dir*e.speed*.5*dt,24,g.w-24);
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
  const fire=input.fire||input.actionAssist&&enemies.some(e=>e.hp>0&&(e.x-p.x)*p.dir>-18&&(e.x-p.x)*p.dir<62&&Math.abs(e.y-p.y)<38&&p.z<40);
  if(fire&&!button.fire)p.attackBuffer=.16;button.fire=!!fire;
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
  const vx=axis(input,'moveX',input.right,input.left),vy=axis(input,'moveY',input.down,input.up);
  if(vx){p.lastDir=vx>0?1:-1;if(!p.action&&p.skillFlash<=0)p.dir=p.lastDir;}
  const rising=(key,pressed)=>{if(pressed&&!button[key]){button[key]=true;return true}if(!pressed)button[key]=false;return false};
  if(rising('jump',input.jump))jump();if(rising('dodge',input.dodge))dodge();if(rising('skill',input.skill))skill();
  if(p.action){const action=p.action;action.time+=dt;if(!action.connected&&action.time>=action.hit){action.connected=true;resolveAttack(action);}if(action.time>=action.duration)p.action=null;}
  if(fire||p.attackBuffer>0)attack();
  const speed=(env.hero===3?190:env.hero===2?125:163)*(p.haste>0?1.38:1);
  const control=p.stun>0 ? 0 : p.action ? (p.action.time<p.action.hit ? .35 : .65) : 1;
  const moveX=p.stun>0?0:p.dash>0?p.dashDir*speed*2.0:vx*speed*control;
  p.x=between(p.x+moveX*dt,24,g.w-24);p.y=between(p.y+vy*speed*.65*control*dt,g.h*.55,g.h*.88);p.moving=!!(moveX||vy*control);
  const oldZ=p.z;p.z=Math.max(0,p.z+p.vz*dt);p.vz-=920*dt;if(p.z===0){p.vz=0;if(oldZ>0){p.land=.15;effects.push({type:'ring',x:p.x,y:p.y,r:27,life:.25,color:'#b6d9dd88'});}}
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
 draw(ctx){const w=g.w,h=g.h;arena(ctx,w,h,t);window.BioWorldArt?.chapterAtmosphere?.(ctx,'street',w,h,chapter,t);window.BioWorldArt?.chapterLandmarks?.(ctx,'street',w,h,chapter,t);window.BioWorldArt?.playfield?.(ctx,'street',w,h,{});if(chapter>1){ctx.fillStyle=['','#26492b22','#2741602d','#49312e2b','#5c236033'][chapter-1];ctx.fillRect(0,0,w,h);for(let i=0;i<chapter+2;i++){const x=(i*233+chapter*67)%w;rect(ctx,x,h*.41,6+(chapter%3)*5,h*.46,chapter===5?'#d35da528':'#9ce9dc21');}}
  words(ctx,`CH ${chapter} · ${episodeNames[chapter-1]} / WAVE 0${wave}`,18,31,13,'#89eff7');
  for(const b of bolts){ctx.strokeStyle=b.color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(b.x-b.vx*.04,b.y-b.vy*.04);ctx.lineTo(b.x,b.y);ctx.stroke();orb(ctx,b.x,b.y,b.r,b.color);}
  for(const e of enemies){if(e.tele>0){if((e.type==='boss'&&e.attackKind==='slam')||e.attackKind==='charge'){
     ctx.strokeStyle='#ff7795';ctx.lineWidth=3;ctx.setLineDash([10,8]);ctx.beginPath();ctx.ellipse(e.targetX,e.targetY-8,58,37,0,0,TAU);ctx.stroke();ctx.setLineDash([]);
     if(e.attackKind==='charge'){ctx.beginPath();ctx.moveTo(e.x,e.y-8);ctx.lineTo(e.targetX,e.targetY-8);ctx.stroke();for(let k=0;k<3;k++){const a=(k+1)/4;orb(ctx,e.x+(e.targetX-e.x)*a,e.y-8+(e.targetY-e.y)*a,3+k,'#ffc98c');}}
      if(e.type==='boss'){words(ctx,e.attackKind==='charge'?'DASH!':'SLAM!',e.targetX,e.targetY-51,14,'#ffe5ab','center');}
   }else{ctx.strokeStyle='#ff8399';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(e.x,e.y-30);ctx.lineTo(e.type==='boss'?p.x:e.x+e.dir*85,e.type==='boss'?p.y-30:e.y-30);ctx.stroke();if(e.type==='boss'){for(let n=-2;n<=2;n++){ctx.beginPath();ctx.moveTo(e.x,e.y-30);ctx.lineTo(p.x+n*30,p.y-30+n*14);ctx.stroke();}words(ctx,'VOLLEY!',e.x,e.y-75,14,'#ffd0ee','center');}}}}
  const sorted=[...fallen,...enemies,{...p,type:'hero'}].sort((a,b)=>a.y-b.y);
  for(const e of sorted){if(e.type==='hero'){fighter(ctx,p.x,p.y,p.z,between(Math.min(w,h)*.095,34,55),pal[p.hero],p.clipTime,p.clip,p.action?.dir||p.dir,p.hero,p.inv>.05&&Math.floor(t*16)%2===0?.5:1);if(p.dash>0)trace(ctx,p.x,p.y-20,35,pal[p.hero]);
   if(p.shield>0){ctx.strokeStyle='#9aefdc';ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(p.x,p.y-34,35,57,0,0,TAU);ctx.stroke();}
   if(p.echoTime>0)for(let i=0;i<3;i++){const x=p.x+(i-1)*58+Math.sin(t*4+i)*11,y=p.y-5+Math.cos(t*3+i)*9;window.BioGuardianArt?.draw(ctx,4,'attack1',t*.3+i,x,y,.42,p.dir,.6);}
   if(p.gardenTime>0){ctx.strokeStyle='#72e5a1';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,105,33,0,0,TAU);ctx.stroke();for(let i=0;i<8;i++){const a=i*TAU/8,x=p.x+Math.cos(a)*83,y=p.y+Math.sin(a)*25;orb(ctx,x,y-5,4,'#d8f7ad');rect(ctx,x-1,y-4,2,10,'#6cdc9a');}}
   }
   else{const col=e.type==='boss'?'#ff3b80':e.type==='brute'?'#fc995a':e.type==='ranged'?'#e09cff':'#ff6b8a',size=e.type==='boss'?between(Math.min(w,h)*.15,67,87):e.type==='brute'?between(Math.min(w,h)*.115,45,66):between(Math.min(w,h)*.082,31,48);fighter(ctx,e.x,e.y,0,size,col,e.clipTime,e.clip,e.dir,'enemy-'+e.type,e.hp<=0?Math.min(1,(.55-e.clipTime)*4):1);if(e.hp>0){bar(ctx,e.x-26,e.y-size*2.65,e.type==='boss'?66:52,4,e.hp/e.max,'#fa748d');if(e.type==='boss'){if(e.stage===2)words(ctx,'PHASE II',e.x,e.y-size*2.65-6,14,'#ffc0db','center');ctx.save();ctx.globalAlpha=.35+Math.sin(t*4)*.11;trace(ctx,e.x,e.y-size*1.1,Math.max(22,size*.67)+(e.stage===2?8:0),chapter===5?'#cf7afd':chapter===4?'#ffc19b':'#ff9fca');ctx.restore();}}}}
  window.BioWorldArt?.foreground?.(ctx,'street',w,h);
  for(const f of effects){ctx.globalAlpha=Math.min(1,f.life/.2);if(f.type==='beam'){ctx.strokeStyle=f.color;ctx.lineWidth=f.style==='flame'?22:6;ctx.beginPath();ctx.moveTo(f.x,f.y);for(let i=1;i<=8;i++)ctx.lineTo(f.x+(f.x2-f.x)*i/8,f.y+(f.y2-f.y)*i/8+(f.style==='lightning'&&i<8?(i%2?9:-9):0));ctx.stroke();ctx.lineWidth=2;ctx.strokeStyle='#f0ffda';ctx.stroke();}
   else if(f.type==='slash'){ctx.save();ctx.translate(f.x,f.y);ctx.scale(f.dir,1);ctx.strokeStyle=f.color;ctx.lineWidth=3+f.combo;ctx.beginPath();ctx.arc(14,0,30+f.combo*7,-1.1,.8);ctx.stroke();ctx.restore();}
   else if(f.type==='ring'){ctx.strokeStyle=f.color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(f.x,f.y,f.r*(1-f.life/.6),0,TAU);ctx.stroke();}else orb(ctx,f.x,f.y,f.r,f.color);}ctx.globalAlpha=1;
  words(ctx,`HERO  ${env.I.hero[env.hero]}`,16,h-18,12);bar(ctx,16,h-44,Math.min(200,w*.48),10,p.hp/p.max,'#72e9ca');bar(ctx,16,h-55,Math.min(200,w*.48),5,p.energy/100,'#b4a2ff');
 },
 hud(){return `<span>WAVE <b>${wave}/3</b></span><span>HP <b>${Math.ceil(p?.hp||0)}</b></span><span>COMBO <b>${p?.combo||0}</b></span><span>ENERGY <b>${Math.round(p?.energy||0)}%</b></span><span>SKILL <b>${env.I?.skillLabels?.[env.hero]||skillIds[env.hero]}</b></span><span>SCORE <b>${score}</b></span>`;}
};
 g.inspectCombat=()=>({chapter,episode:episodeNames[chapter-1],bossPattern:chapter===1?'basics':chapter===2?'projectiles':chapter===3?'dash':chapter===4?'slam':'mixed',wave,spawn,score,kills,player:{...p,action:p.action?{...p.action}:null},enemies:enemies.map(e=>({...e})),projectiles:bolts.map(b=>({...b})),effects:effects.map(f=>({...f})),skill:skillIds[p.hero],elapsed,finished:!!g._finished});
 if(env.testMode)g.testCharge=()=>{p.energy=100;};
 if(env.testMode)g.testHealth=(v)=>{p.hp=between(v,1,p.max);};
 if(env.testMode)g.testWound=(amount)=>wound(amount,{type:'test'});
 if(env.testMode)g.testSetup=({kind='grunt',dx=65,hp=null,waveNumber=null,remaining=null}={})=>{if(waveNumber!==null)wave=waveNumber;if(remaining!==null)spawn=remaining;addEnemy(kind);const e=enemies[enemies.length-1];e.x=p.x+dx;e.y=p.y;if(hp!==null){e.hp=hp;e.max=Math.max(hp,1);}if(kind==='boss')bossSpawned=true;return e;};
 return g;
};
R.g03=env=>{
 const chapter=Math.max(1,Math.min(5,Number(env.chapter)||1));
 const fx=particleField();
 const zones=['MAINTENANCE SHAFT','MOVING ELEVATOR','WIND TUNNEL','COLLAPSE ZONE','ENTROPY RIFT'];
let p=null,platforms=[],camera=0,depth=0,level=0,t=0,score=0,bonus=0,pickups=0,button={},goal=1700,mult=env.difficulty==='expert'?1.35:env.difficulty==='hard'?1.18:1,spawny=0,crush=0;
const g={w:960,h:540,finish:env.finish,start(){g._finished=false;fx.clear();depth=0;level=0;t=0;score=0;bonus=0;pickups=0;button={};goal=1700+(Math.max(1,Math.min(5,Number(env.chapter)||1))-1)*500;window.BioGuardianArt?.preload([env.hero]);const w=g.w,h=g.h;p={dir:1,x:w*.5,y:90,vx:0,vy:0,r:13,hp:3,ground:false,inv:0,drop:0,fallFrom:90};platforms=[{x:w*.5-65,y:135,w:130,type:'safe',hp:99}];spawny=230;while(spawny<Math.max(2000,goal+450))makePlatform();camera=0;crush=0;},onResize(ow,oh,w,h){const kx=w/(ow||w);if(p){p.x=between(p.x*kx,16,w-16);}for(const f of platforms){f.w=Math.min(w-28,Math.max(40,f.w*kx));f.x=between(f.x*kx,14,Math.max(14,w-f.w-14));}if(p)camera=Math.max(0,p.y-h*.48);},update(dt,input){if(g._finished)return;fx.step(dt);const wasGround=p.ground,support=wasGround?platforms.find(f=>!f.broken&&Math.abs(f.y-(p.y+p.r))<.01&&p.x+p.r>platformX(f)&&p.x-p.r<platformX(f)+f.w):null,oldSupportX=support?platformX(support):0;t+=dt;const carried=support?platformX(support)-oldSupportX:0;p.inv=Math.max(0,p.inv-dt);p.drop=Math.max(0,p.drop-dt);if(input.down&&!button.down&&p.ground){p.vy=Math.max(85,p.vy);p.ground=false;p.drop=.22;}button.down=!!input.down;const width=g.w;const move=axis(input,'moveX',input.right,input.left);p.vx+=move*850*dt;if(move)p.dir=move>0?1:-1;p.vx*=Math.exp(-5*dt);p.vx=between(p.vx,-260,260);if((input.jump||input.fire)&&p.ground&&!button.jump){p.vy=-275;p.ground=false;env.sfx(690,.07)}button.jump=!!(input.jump||input.fire);
 const prevY=p.y;p.vy=Math.min(460,p.vy+650*mult*dt);p.y+=p.vy*dt;// Airflow in chapter 3 and energy turbulence in chapter 5 alter actual landings.
 const wind=chapter===3?Math.sin(t*.85)*18:chapter===5?Math.sin(t*1.7)*25:0;
 p.x=between(p.x+carried+(p.vx+(!p.ground?wind:0))*dt,16,width-16);p.ground=false;for(const f of platforms){if(f.broken)continue;const shiftedX=platformX(f);if(p.drop<=0&&p.vy>=0&&prevY+p.r<=f.y+8&&p.y+p.r>=f.y-1&&p.x+p.r>shiftedX&&p.x-p.r<shiftedX+f.w){p.y=f.y-p.r;p.vy=0;p.ground=true;if(f.type==='trap'&&p.inv<=0){p.hp--;p.inv=1;env.sfx(130,.16)}if(f.type==='fragile'){f.hp-=dt*(chapter===4?2.2:chapter===5?1.65:1);if(f.hp<=0){f.broken=true;fx.burst(shiftedX+f.w*.5,f.y,'#deb980',12,95);}}if(f.pickup&&!f.collected&&Math.abs(p.x-(shiftedX+f.w*.5))<24){f.collected=true;fx.burst(p.x,f.y-20,'#aeefc7',9,72);pickups++;bonus+=100;p.hp=Math.min(3,p.hp+1);env.sfx(980,.09);}}}
 if(p.ground&&!wasGround)fx.burst(p.x,p.y+p.r,'#b1dbdc',5,47);
 if(p.ground)p.fallFrom=p.y;else{p.fallFrom=Math.min(p.fallFrom,p.y);if(p.y-p.fallFrom>=300){p.hp--;p.inv=Math.max(p.inv,.65);p.fallFrom=p.y;env.sfx(110,.18);}}
 if(p.y-camera>g.h*.48)camera=p.y-g.h*.48;depth=Math.max(depth,Math.floor(p.y));crush=Math.max(crush,(t*17*mult));if(p.y-p.r<crush-16||p.y>camera+g.h+60||p.hp<=0){ends(g,false,score,`${Math.floor(depth)} m`);return;}
 if(depth>=goal){ends(g,true,Math.floor(depth+score),`${Math.floor(depth)} m`);return;}
 while(spawny<camera+g.h+360)makePlatform();platforms=platforms.filter(x=>x.y>=camera-100);score=Math.floor(depth*.6)+bonus;},draw(ctx){const w=g.w,h=g.h;if(!window.BioWorldArt?.draw(ctx,'shaft',w,h,{scroll:camera,shade:.12}))cityBackdrop(ctx,w,h,t,'#123b48');window.BioWorldArt?.chapterAtmosphere?.(ctx,'shaft',w,h,Number(env.chapter)||1,t);window.BioWorldArt?.chapterLandmarks?.(ctx,'shaft',w,h,chapter,t);window.BioWorldArt?.playfield?.(ctx,'shaft',w,h,{scroll:camera});if(Number(env.chapter)>1){rect(ctx,0,0,w,h,['','#24724b12','#597cb41a','#9a5b481d','#8841a020'][Math.min(4,Number(env.chapter)-1)]);}words(ctx,'CH '+chapter+' · '+zones[chapter-1],w-18,31,12,'#bdeaf5','right');for(let x=35;x<w;x+=90){rect(ctx,x,0,2,h,'#59c9cc10');rect(ctx,x+6,0,1,h,'#59c9cc08');}ctx.fillStyle='#193249';ctx.fillRect(0,0,14,h);ctx.fillRect(w-14,0,14,h);for(const f of platforms){const y=f.y-camera;if(y<-25||y>h+30||f.broken)continue;const xx=platformX(f);if(f.type==='moving'){ctx.strokeStyle='#80b1d84a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(f.x-37,y+23);ctx.lineTo(f.x+f.w+37,y+23);ctx.stroke();}rect(ctx,xx+3,y+10,f.w-6,11,'#172e40');rect(ctx,xx,y,f.w,16,f.type==='trap'?'#ad506c':f.type==='fragile'?'#c39d5d':f.type==='moving'?'#68a9db':'#3b8192');rect(ctx,xx+2,y+2,f.w-4,3,f.type==='trap'?'#f59aa8':'#acf6ee');for(const bx of [xx+8,xx+f.w-8])orb(ctx,bx,y+9,2,'#e1eddd');if(f.type==='fragile'){ctx.strokeStyle='#2d211d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(xx+f.w*.4,y);ctx.lineTo(xx+f.w*.52,y+7);ctx.lineTo(xx+f.w*.46,y+15);ctx.stroke();}if(f.pickup&&!f.collected){const cx=xx+f.w*.5,cy=y-20;orb(ctx,cx,cy,10,'#a1f4ca');trace(ctx,cx,cy,14,'#85eac17a');words(ctx,'+',cx,cy+5,16,'#124333','center');}if(f.type==='trap')for(let s=0;s<3;s++){ctx.beginPath();ctx.moveTo(xx+s*f.w/3+7,y);ctx.lineTo(xx+s*f.w/3+17,y-13);ctx.lineTo(xx+s*f.w/3+26,y);ctx.fillStyle='#f2768c';ctx.fill();}}
 const posY=p.y-camera,feet=posY+p.r;
 let support=null;for(const f of platforms){if(f.broken||f.y<p.y+p.r-1||f.y>=p.y+p.r+g.h*.44)continue;const x=platformX(f);if(p.x>=x&&p.x<=x+f.w&&(!support||f.y<support.y))support=f;}
 const anchor=support?support.y-camera:feet;
 fighter(ctx,p.x,anchor,anchor-feet,20,pal[env.hero],t,!p.ground?'jump':Math.abs(p.vx)>18?'walk':'idle',p.dir,env.hero,p.inv>.1&&Math.floor(t*15)%2?.45:1,!!support);fx.draw(ctx,camera);const crushY=crush-camera;rect(ctx,0,0,w,Math.max(0,crushY),'#a62f4d35');if(crushY>0)rect(ctx,0,Math.max(0,crushY-5),w,5,'#f96972');words(ctx,`DEPTH  ${Math.floor(depth)} / ${Math.floor(goal)} m`,16,34,15);words(ctx,`LIVES  ${p.hp}`,16,57,13,p.hp===1?'#ff7b8d':'#a0eddc');if(!p.ground&&p.y-p.fallFrom>210)words(ctx,jaText(env,'踩平台緩衝！','足場で落下を止めよう！'),w/2,90,17,'#ffd3a1','center');words(ctx,`SAFE PLATFORM / TRAP / MOVING`,16,h-15,10,'#92c3d0');},hud(){return `<span>DEPTH <b>${Math.floor(depth)} m</b></span><span>LIFE <b>${p.hp}</b></span><span>GOAL <b>${Math.floor(goal)} m</b></span><span>ENERGY <b>${pickups}</b></span>`;}};
 g.debugGeometry=()=>({chapter,zone:zones[chapter-1],time:t,wind:chapter===3?Math.sin(t*.85)*18:chapter===5?Math.sin(t*1.7)*25:0,player:{...p},platforms:platforms.map(f=>({...f,actualX:platformX(f)})),goal,depth,camera,pickups,bonus});
 if(env.testMode)g.testFreeFall=()=>{platforms=[];spawny=10000;p.ground=false;p.vy=0;p.y=90;p.fallFrom=90;};
 if(env.testMode)g.testPlatformRide=()=>{const f=platforms.find(f=>f.type==='moving'&&f.x>60&&f.x+f.w<g.w-60);if(!f)throw Error('No central moving platform in fixture');p.x=platformX(f)+14;p.y=f.y-p.r;p.vx=p.vy=0;p.ground=true;p.fallFrom=p.y;camera=Math.max(0,p.y-g.h*.48);return f.y;};
 function platformX(f){return f.x+(f.type==='moving'?Math.sin(t*(chapter===2?2.1:chapter===5?2.5:1.5)+f.y*.02)*(chapter===2?35:chapter===5?31:26):0);}
 function makePlatform(){const w=g.w,y=spawny;const last=platforms[platforms.length-1];const pw=Math.max(85,Math.min(160,w*.31));let x=between((last?last.x:w/2)+rnd(-85,85),18,w-pw-18);let type=pick([['safe','safe','safe','moving','fragile'],['safe','moving','safe','fragile','trap'],['moving','safe','moving','fragile','trap'],['safe','fragile','trap','moving','moving'],['trap','moving','safe','fragile','moving']][Math.max(1,Math.min(5,Number(env.chapter)||1))-1]);platforms.push({x,y,w:pw,type,hp:type==='fragile'?1:99,pickup:type!=='trap'&&Math.random()<.25,collected:false});spawny+=rnd(76,104);}return g;};
R.g04=env=>{
 const chapter=Math.max(1,Math.min(5,Number(env.chapter)||1));
 const STAGES=[
  {title:'ENERGY LAB',tone:'#0b1733',targets:[[.28,.25,1],[.50,.22,1],[.72,.25,1],[.50,.47,1]],bumpers:[[.19,.50],[.81,.50]],normal:11},
  {title:'REFLECTION GRID',tone:'#102843',targets:[[.20,.22,1],[.50,.19,2],[.80,.22,1],[.29,.44,1],[.70,.44,1],[.50,.62,1]],bumpers:[[.39,.35],[.61,.35],[.19,.62]],normal:13},
  {title:'CORE BREAKER',tone:'#291c42',targets:[[.17,.27,1],[.35,.17,1],[.50,.16,3],[.65,.17,1],[.83,.27,1],[.25,.53,2],[.75,.53,2],[.50,.68,1]],bumpers:[[.29,.37],[.71,.37],[.42,.57],[.58,.57]],normal:15}
 ];
 const total=STAGES.length,fx=particleField();
 const chapterMechanics=['PRECISION','REFLECTORS','MOVING BUMPERS','ARMORED TARGETS','CORE OVERLOAD'];
 let balls=[],targets=[],bumpers=[],shots=0,angle=0,power=65,score=0,hits=0,buttons={},t=0,walls=0,physicsDebt=0,stage=1,stageHits=0,transition=0,stageHistory=[];
 const penalty=env.difficulty==='expert'?3:env.difficulty==='hard'?2:0;
 const g={w:960,h:540,finish:env.finish,
  start(){g._finished=false;fx.clear();stage=1;score=0;hits=0;t=0;walls=0;buttons={};stageHistory=[];window.BioGuardianArt?.preload([env.hero]);setupStage();},
  onResize(ow,oh,w,h){const sx=w/(ow||w),sy=h/(oh||h);for(const q of [...targets,...bumpers,...balls]){q.x*=sx;q.y*=sy;if(q.baseX!==undefined)q.baseX*=sx;q.r=Math.max(6,q.r*Math.min(sx,sy));} },
  update(dt,input){if(g._finished)return;dt=Math.max(0,Math.min(.05,dt));t+=dt;fx.step(dt);for(const q of [...targets,...bumpers])q.flash=Math.max(0,(q.flash||0)-dt);transition=Math.max(0,transition-dt);
   angle=between(angle-axis(input,'moveX',input.right,input.left)*dt*1.35,-1.15,1.15);
   power=between(power-axis(input,'moveY',input.down,input.up)*45*dt,35,100);
   if(input.pointer?.down||input.pointer?.released){const dx=input.pointer.x-g.w*.5,dy=g.h-30-input.pointer.y;angle=between(Math.atan2(-dx,Math.max(24,dy)),-1.15,1.15);if(input.pointer.aiming&&input.pointer.moved)power=35+65*between(input.pointer.dragRatio||0,0,1);}
   if(input.skill&&!buttons.recall&&balls.length){balls=[];env.sfx(320,.07);}buttons.recall=!!input.skill;const fire=!!(input.fire||input.pointer?.released||input.pointer?.down&&!input.pointer?.aiming);
   if(fire&&!buttons.fire&&shots>0&&balls.length===0&&transition<=0)shoot();buttons.fire=fire;
   // Chapter 3+ features real moving reflectors, not purely visual variation.
   if(chapter>=3&&stage>=2)for(const q of bumpers)q.x=between(q.baseX+Math.sin(t*(chapter===5?1.85:1.1)+q.id*1.8)*Math.min(g.w*.032,20),q.r+12,g.w-q.r-12);
   physicsDebt=Math.min(.10,physicsDebt+dt);let iterations=0;
   while(physicsDebt>=1/120-1e-10&&iterations++<12){const step=1/120;physicsDebt=Math.max(0,physicsDebt-step);const w=g.w,h=g.h;
    for(const b of balls){
     b.t-=step;b.contact=Math.max(0,(b.contact||0)-step);b.x+=b.vx*step;b.y+=b.vy*step;b.vx*=1-.12*step;b.vy*=1-.12*step;
     if(b.x<b.r+8){b.x=b.r+8;b.vx=Math.abs(b.vx)*.91;walls++}
     if(b.x>w-b.r-8){b.x=w-b.r-8;b.vx=-Math.abs(b.vx)*.91;walls++}
     if(b.y<b.r+8){b.y=b.r+8;b.vy=Math.abs(b.vy)*.91}
     if(b.y>h-b.r-4){b.y=h-b.r-4;b.vy=-Math.abs(b.vy)*.7;b.vx*=.96;}
     for(const q of bumpers)if(collide(b,q,chapter===5?1.14:1.05)){q.flash=.18;fx.burst(b.x,b.y,'#8dcefa',4,60);}
     for(let i=0;i<targets.length;i++){
      const q=targets[i],touching=q.hp>0&&Math.hypot(b.x-q.x,b.y-q.y)<b.r+q.r;
      if(!touching){b.locked.delete(i);continue;}
      if(!b.locked.has(i)){
       b.locked.add(i);q.hp--;q.flash=.23;fx.burst(q.x,q.y,q.hp<=0?'#b1fff0':'#e0b7ff',q.hp<=0?13:6,q.hp<=0?110:65);hits++;stageHits++;score+=q.hp===0?180:65;collide(b,q,.95);env.sfx(650,.08);
      }
     }
     b.trailClock=(b.trailClock||0)+step;if(b.trailClock+1e-10>=1/60){b.trailClock=Math.max(0,b.trailClock-1/60);b.trail.push({x:b.x,y:b.y});if(b.trail.length>13)b.trail.shift();}
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
  draw(ctx){const w=g.w,h=g.h,layout=STAGES[stage-1];if(!window.BioWorldArt?.draw(ctx,'laboratory',w,h,{shade:.12}))cityBackdrop(ctx,w,h,t,layout.tone);window.BioWorldArt?.chapterAtmosphere?.(ctx,'laboratory',w,h,chapter,t);window.BioWorldArt?.chapterLandmarks?.(ctx,'laboratory',w,h,chapter,t);window.BioWorldArt?.playfield?.(ctx,'laboratory',w,h,{});if(chapter>1)rect(ctx,0,0,w,h,['','#23626b19','#6973311a','#9562331c','#96397122'][chapter-1]);ctx.fillStyle='#071b2a88';ctx.fillRect(0,h*.08,w,h*.72);
   ctx.strokeStyle='#4782a5';ctx.lineWidth=6;ctx.strokeRect(7,7,w-14,h-14);
   for(const q of bumpers){orb(ctx,q.x+3,q.y+5,q.r+2,'#03101c88');orb(ctx,q.x,q.y,q.r,q.flash>0?'#8abbe2':'#485f8c');trace(ctx,q.x,q.y,q.r,'#a6bfff');orb(ctx,q.x-q.r*.22,q.y-q.r*.25,q.r*.43,'#e4faff30');orb(ctx,q.x,q.y,q.r*.4,'#79b2fc');}
   for(const q of targets){if(q.hp<=0)continue;orb(ctx,q.x+3,q.y+5,q.r,'#06121e88');orb(ctx,q.x,q.y,q.r,q.flash>0?'#bcf7ed':q.maxHp>1?'#523c77':'#11374e');trace(ctx,q.x,q.y,q.r,q.maxHp>1?'#d2a7ff':'#59e8e5');orb(ctx,q.x,q.y,Math.max(4,q.r*.33),'#9ffff3');if(q.hp>1)words(ctx,String(q.hp),q.x,q.y+4,10,'#fff','center');}
   fx.draw(ctx);for(const b of balls){motionTrail(ctx,b.trail,b.r,'#e8e1bb');orb(ctx,b.x+3,b.y+4,b.r*.92,'#040f1b88');kineticBall(ctx,b.x,b.y,b.r,'#fbe9ad','#fffdeb',b.contact,b.impactAngle||0);}
   const x=w*.5,y=h-30;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-Math.sin(angle)*Math.min(h*.4,power*2.4),y-Math.cos(angle)*Math.min(h*.4,power*2.4));ctx.setLineDash([7,6]);ctx.strokeStyle='#80eafa99';ctx.lineWidth=2;ctx.stroke();ctx.setLineDash([]);
   ctx.save();ctx.translate(x,y);ctx.rotate(-angle);rect(ctx,-12,-21,24,39,'#286987','#7be2f0');ctx.restore();
   words(ctx,`CH ${chapter} · STAGE ${stage}/${total} · ${layout.title}`,14,24,Math.max(11,Math.min(15,w*.035)),'#d9f6ff');
   rect(ctx,15,h-82,Math.min(118,w*.27),60,'#0a293bcc','#3c8b9d');fighter(ctx,Math.min(70,w*.15),h-30,0,22,pal[env.hero],t%(.64),balls.length?'skill':'idle',1,env.hero);words(ctx,`ANGLE ${Math.round(angle*180/pi)}° · POWER ${Math.floor(power)}%`,15,h-13,12);
   if(transition>0){ctx.fillStyle='#081b33d9';ctx.fillRect(0,h*.39,w,h*.17);words(ctx,`STAGE ${stage} · ${layout.title}`,w*.5,h*.49,Math.max(15,Math.min(23,w*.048)),'#e5fdff','center');}
  },
  hud(){return `<span>STAGE <b>${stage}/${total}</b></span><span>SHOTS <b>${shots}</b></span><span>TARGETS <b>${targets.filter(q=>q.hp>0).length}</b></span><span>POWER <b>${Math.floor(power)}%</b></span><span>SCORE <b>${score}</b></span>`;}
 };
 function setupStage(){const design=STAGES[stage-1],w=g.w,h=g.h,unit=Math.min(w,h);
  targets=design.targets.map(([x,y,hp],i)=>{const health=hp+(chapter>=3&&i%3===0?1:0)+(chapter===5&&i%4===0?1:0);const shift=(chapter-1)*.012*(i%2?1:-1);return {x:w*between(x+shift,.12,.88),y:h*between(y+(chapter-1)*.008*(i%3-1),.12,.72),r:Math.max(10,unit*.033),hp:health,maxHp:health};});
  if(chapter===5&&stage===3)targets.push({x:w*.50,y:h*.48,r:Math.max(10,unit*.036),hp:3,maxHp:3});
  bumpers=design.bumpers.map(([x,y],i)=>{const baseX=w*between(x+(chapter-1)*.014*(i%2?1:-1),.12,.88);return {x:baseX,baseX,id:i,y:h*y,r:Math.max(14,unit*.039)};});
  shots=Math.max(7,design.normal-penalty+(chapter-1)+(chapter===5&&stage===3?3:0));balls=[];stageHits=0;angle=0;power=65;buttons={};physicsDebt=0;transition=.75;
 }
 function collide(b,q,restitution){const dx=b.x-q.x,dy=b.y-q.y,d=Math.hypot(dx,dy),R=b.r+q.r;if(d>=R||d<=.001)return;const nx=dx/d,ny=dy/d,proj=b.vx*nx+b.vy*ny;b.x=q.x+nx*(R+1);b.y=q.y+ny*(R+1);if(proj<0){b.contact=.16;b.impactAngle=Math.atan2(ny,nx);b.vx-=2*proj*nx*restitution;b.vy-=2*proj*ny*restitution;return true;}}
 function shoot(){shots--;const speed=(350+power*3.4)*Math.min(1,Math.max(.75,g.h/500));balls.push({x:g.w*.5,y:g.h-32,r:Math.max(6,Math.min(g.w,g.h)*.014),vx:-Math.sin(angle)*speed,vy:-Math.cos(angle)*speed,t:8,trail:[],locked:new Set()});env.sfx(450,.13);}
 g.debugPhysics=()=>({chapter,mechanic:chapterMechanics[chapter-1],stage,totalStages:total,stageName:STAGES[stage-1].title,balls:balls.map(({locked,...q})=>({...q})),targets:targets.map(q=>({...q})),bumpers:bumpers.map(q=>({...q})),shots,hits,score,physicsDebt,stageHistory:stageHistory.map(q=>({...q})),angle,power,transition});
 // Deterministic phase-transition probe for test harnesses only; production instances do not expose it.
 if(env.testMode){g.testClearStage=()=>{for(const q of targets)q.hp=0;};g.testBall=value=>{balls=[];shoot();Object.assign(balls[0],value);};}
 return g;};
R.g05=env=>{
 const aiProfiles=['ROOKIE','DEFENDER','ANTICIPATOR','AGGRESSOR','CHAMPION'];
const fx=particleField();let trail=[],pointFlash=-1,pointFlashTime=0,trailClock=0;
const mode=env.mode==='pong'?'pong':'volley';
const chapter=Math.max(1,Math.min(5,Number(env.chapter)||1));
let player,ai,ball,points=[0,0],t=0,serve=0,rally=0,rallyClock=0,button={},limit=(mode==='pong'?7:5)+(chapter-1)*2;
let score=0,variant=(env.difficulty==='expert'?1.2:env.difficulty==='hard'?1.08:1)+(chapter-1)*.025,tableDebt=0,tableFrame=0,pointReason='',volleyDebt=0,serveSide=0,serveCrossings=[0,0],netContacts=0;
const table=()=>({left:g.w*.10,right:g.w*.90,top:g.h*.23,bottom:g.h*.82,mid:g.w*.50,
 leftPaddle:g.w*.15,rightPaddle:g.w*.85,net:Math.max(17,Math.min(g.w,g.h)*.042),radius:Math.max(5,Math.min(g.w,g.h)*.012)});
const field=()=>({floor:g.h*.86,body:between(Math.min(g.w,g.h)*.04,16,22),netTop:g.h*.86-Math.min(160,g.h*.30),netHalf:3,r:between(Math.min(g.w,g.h)*.022,8,13),gravity:g.h*1.18});
const sideOf=x=>x<g.w*.5?0:1;
function beginRound(){
 trail=[];trailClock=0;rallyClock=0;tableDebt=0;tableFrame=0;serve=.75;button={};rally=0;ball=null;
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
function award(winner,reason=''){pointFlash=winner;pointFlashTime=.85;if(ball)fx.burst(ball.x,mode==='pong'?ball.y:field().floor,winner===0?'#adead7':'#e5b69e',12,90);points[winner]++;pointReason=reason;env.sfx(winner===0?680:180,.14);beginRound();}
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
 const control=who===0?((button.up?-45:button.down?45:0)+(p.y-ball.y)*-.45):chapter>=4?between((player.y-p.y)*1.15+(Math.random()-.5)*22,-70,70):((Math.random()-.5)*55);
 ball.vy=between((ball.y-p.y)*1.65+control,-115,115);
 ball.lastHitter=who;ball.serveOwn=false;ball.bouncedReceiver=false;ball.returnAttempted=null;
 ball.contact=.16;ball.impactAngle=Math.atan2(ball.vy,ball.vx);rally++;fx.burst(ball.x,ball.y-Math.min(40,ball.z*.22),'#d5f7f2',5,55);p.swing=.18;env.sfx(who===0?520:420,.055);if(who===0)p.cool=.14;
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
   ball.serveOwn=false;ball.vz=270;ball.z=0;ball.contact=.16;ball.impactAngle=0;fx.burst(ball.x,ball.y,'#cce9da',3,30);env.sfx(360,.035);return;
  }
  if(!ball.bouncedReceiver){
   if(landing===ball.lastHitter){award(1-ball.lastHitter,'WRONG SIDE');return;}
   ball.bouncedReceiver=true;ball.vz=270;ball.z=0;ball.contact=.16;ball.impactAngle=0;fx.burst(ball.x,ball.y,'#cce9da',3,30);env.sfx(360,.035);return;
  }
  award(ball.lastHitter,'DOUBLE BOUNCE');return;
 }
 // Paddle may return only after the ball has bounced legally on its own side.
 const defender=1-ball.lastHitter,p=defender===0?player:ai;
 if(ball.bouncedReceiver&&Math.abs(ball.x-p.x)<Math.max(14,f.radius*2.3)&&Math.abs(ball.y-p.y)<g.h*.092&&ball.z>=6&&ball.z<94){
  if(defender===0){if(p.swing>0)sendReturn(0);}
  else if(ball.returnAttempted!==1){ball.returnAttempted=1;p.swing=.18;if(Math.random()<Math.min(.997,(env.difficulty==='expert'?.997:env.difficulty==='hard'?.985:.955)+(chapter-1)*.008))sendReturn(1);}
 }
}
function updateTable(dt,input){
 const f=table(),oldPlayerY=player.y,oldAiY=ai.y;ai.swing=Math.max(0,ai.swing-dt);player.y+=axis(input,'moveY',input.down||input.right,input.up||input.left)*g.h*.83*dt;
 player.y=between(player.y,f.top+10,f.bottom-10);
 player.swing=Math.max(0,player.swing-dt);player.cool=Math.max(0,player.cool-dt);
 const fire=input.fire||input.actionAssist&&ball&&ball.lastHitter===1&&ball.bouncedReceiver&&ball.vx<0&&Math.abs(ball.x-player.x)<Math.max(14,f.radius*2.3)+Math.abs(ball.vx)*.08&&Math.abs(ball.y-player.y)<g.h*.092&&ball.z>=6&&ball.z<94;
 if(fire&&!button.fire&&player.cool===0){player.swing=.23;player.cool=.31;env.sfx(200,.03)}
 button.fire=!!fire;button.up=!!(input.up||input.left);button.down=!!(input.down||input.right);
 if(ball){
  const aim=(ball.vx>0&&ball.lastHitter===0)?between(ball.y+(chapter>=3?ball.vy*.12:0),f.top+10,f.bottom-10):g.h*.52;
  ai.y+=between(aim-ai.y,-g.h*.61*variant*dt,g.h*.61*variant*dt);
  ai.y=between(ai.y,f.top+10,f.bottom-10);
 }
 player.vy=(player.y-oldPlayerY)/Math.max(.001,dt);ai.vy=(ai.y-oldAiY)/Math.max(.001,dt);
 if(serve>0){serve=Math.max(0,serve-dt);if(serve===0)startServe();return;}
 rallyClock+=dt;if(rallyClock>=18){award(ball?.bouncedReceiver?ball.lastHitter:1-(ball?.lastHitter??0),'RALLY LIMIT');return;}
 // Fixed-step ball physics avoids missed net/edge events during low FPS frames.
 tableDebt=Math.min(.1,tableDebt+Math.min(dt,.1));let steps=0;
 while(tableDebt>=1/120-1e-10&&steps++<12){tableDebt=Math.max(0,tableDebt-1/120);tableStep(1/120);sampleTrail(1/120);if(!ball||serve>0)break;}
}
function heldVolley(){const f=field(),server=serveSide===0?player:ai,dir=serveSide===0?1:-1;ball={x:server.x+dir*f.body*.8,y:server.y-f.body*1.2,vx:0,vy:0,lastHitter:serveSide,servedBy:serveSide,serveCrossed:false};}
function hitVolley(who,input={},serving=false){
 const f=field(),p=who===0?player:ai;
 const landing=g.w*(who===0?.79:chapter>=4?(player.x<g.w*.24?.31:.14):.21)+(who===0?(input.right?g.w*.06:input.left?-g.w*.06:0):0);
 const dx=landing-ball.x,ratio=between((g.w*.5-ball.x)/dx,.07,.93);
 const targetY=f.floor-f.r,linear=ball.y+(targetY-ball.y)*ratio;
 const clearance=f.netTop-f.r-g.h*.065;
 const flight=Math.max(1.12,Math.sqrt(2*Math.max(0,linear-clearance)/(f.gravity*ratio*(1-ratio))));
 ball.vx=dx/flight;ball.vy=(targetY-ball.y-.5*f.gravity*flight*flight)/flight;
 ball.contact=.16;ball.impactAngle=Math.atan2(ball.vy,ball.vx);ball.lastHitter=who;p.hitCool=.28;p.swing=.23;fx.burst(ball.x,ball.y,'#e7edc5',6,65);if(!serving)rally++;
 env.sfx(who===0?600:350,.07);
}
function volleyStep(dt,input){
 const w=g.w,h=g.h,f=field(),ground=f.floor-f.body;
 const fire=input.fire||input.actionAssist&&(serve>0&&serveSide===0||serve<=0&&ball.x<w*.5&&ball.vy<0&&player.hitCool===0&&Math.hypot(ball.x-player.x,ball.y-(player.y-f.body*.55))<f.r+f.body*1.35),firePressed=fire&&!button.fire;button.fire=!!fire;
 const move=axis(input,'moveX',input.right,input.left);player.moving=!!move;player.x+=move*w*.65*dt;
 player.x=between(player.x,f.body+3,w*.5-f.body-7);
 const targetX=serve>0?w*.78:between(ball.x+(chapter>=3?ball.vx*.075:0),w*.5+f.body+7,w-f.body-3);
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
  ball.contact=.16;ball.impactAngle=0;netContacts++;
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
function updateVolley(dt,input){volleyDebt=Math.min(.1,volleyDebt+Math.max(0,dt));let steps=0;while(volleyDebt>=1/120-1e-10&&steps++<12){volleyDebt=Math.max(0,volleyDebt-1/120);volleyStep(1/120,input);sampleTrail(1/120);if(points[0]>=limit||points[1]>=limit)break;}}
function sampleTrail(dt){
 if(!ball)return;ball.contact=Math.max(0,(ball.contact||0)-dt);if(serve>0)return;trailClock+=dt;
 if(trailClock+1e-10>=1/60){trailClock=Math.max(0,trailClock-1/60);trail.push({x:ball.x,y:ball.y-(mode==='pong'?Math.min(40,ball.z*.22):0)});if(trail.length>10)trail.shift();}
}
const g={w:960,h:540,finish:env.finish,
 start(){g._finished=false;fx.clear();trail=[];pointFlashTime=0;points=[0,0];t=0;score=0;pointReason='';serveCrossings=[0,0];netContacts=0;window.BioGuardianArt?.preload([env.hero,(env.hero+3)%7]);beginRound();},
 onResize(ow,oh,w,h){if(!player)return;const kx=w/(ow||w),ky=h/(oh||h);
  player.y*=ky;ai.y*=ky;if(mode==='pong'){player.x=w*.15;ai.x=w*.85;}
  else{player.x*=kx;ai.x*=kx;player.vy*=ky;ai.vy*=ky;}
  if(ball){ball.x*=kx;ball.y*=ky;if(mode==='pong'){ball.z*=Math.min(kx,ky);ball.vx*=kx;ball.vy*=ky;ball.vz*=Math.min(kx,ky);}
   else{ball.vx*=kx;ball.vy*=ky;}}
 },
 update(dt,input){if(g._finished)return;t+=dt;fx.step(dt);pointFlashTime=Math.max(0,pointFlashTime-dt);
  if(mode==='pong')updateTable(dt,input);else updateVolley(dt,input);

  if(points[0]>=limit||points[1]>=limit){const win=points[0]>points[1];ends(g,win,points[0]*120+rally*4,`${points[0]} – ${points[1]}`);}
 },
 draw(ctx){const w=g.w,h=g.h;if(!window.BioWorldArt?.draw(ctx,'arena',w,h,{shade:.18}))cityBackdrop(ctx,w,h,t,mode==='pong'?'#0a3e45':'#164354');window.BioWorldArt?.chapterAtmosphere?.(ctx,'arena',w,h,chapter,t);window.BioWorldArt?.chapterLandmarks?.(ctx,'arena',w,h,chapter,t);window.BioWorldArt?.playfield?.(ctx,'arena',w,h,{});if(chapter>1)rect(ctx,0,0,w,h,['','#174a4418','#365a6c1b','#7d4b751d','#8e4b2921'][chapter-1]);words(ctx,'CH '+chapter+' · '+['TRAINING','CITY ARENA','OPEN COURT','NIGHT LEAGUE','FINAL'][chapter-1],w*.5,22,11,'#b6e5f0','center');
  if(mode==='pong'){
   const f=table();fighter(ctx,w*.055,player.y+27,0,19,pal[env.hero],player.swing>0?.23-player.swing:t,player.swing>0?'attack1':Math.abs(player.vy)>4?'walk':'idle',1,env.hero);fighter(ctx,w*.945,ai.y+27,0,19,pal[(env.hero+3)%7],ai.swing>0?.23-ai.swing:t,ai.swing>0?'attack1':Math.abs(ai.vy)>4?'walk':'idle',-1,(env.hero+3)%7);rect(ctx,f.left+5,f.top+8,f.right-f.left,f.bottom-f.top,'#04131b99');const paint=ctx.createLinearGradient(0,f.top,0,f.bottom);paint.addColorStop(0,'#176b73');paint.addColorStop(1,'#0c505d');ctx.fillStyle=paint;ctx.fillRect(f.left,f.top,f.right-f.left,f.bottom-f.top);rect(ctx,f.left,f.top,f.right-f.left,3,'#b9ede93d');rect(ctx,f.left,f.bottom-3,f.right-f.left,3,'#021a2f66');
   ctx.strokeStyle='#c4f7ed';ctx.lineWidth=Math.max(2,w*.003);ctx.strokeRect(f.left,f.top,f.right-f.left,f.bottom-f.top);
   ctx.beginPath();ctx.moveTo(f.mid,f.top);ctx.lineTo(f.mid,f.bottom);ctx.strokeStyle='#9bfcf2';ctx.lineWidth=3;ctx.stroke();
   ctx.setLineDash([9,9]);ctx.beginPath();ctx.moveTo(f.left,(f.top+f.bottom)/2);ctx.lineTo(f.right,(f.top+f.bottom)/2);ctx.strokeStyle='#ffffff55';ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);
   // The net casts a bright line and the projectile renders separately from its table shadow.
   ctx.strokeStyle='#9cdeff';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(f.mid,f.top);ctx.lineTo(f.mid,f.bottom);ctx.stroke();
   // Racket silhouettes are separate from the moving ball; the racket head has a forgiving but bounded collision zone.
   ctx.fillStyle='#d7f5fc';ctx.fillRect(player.x-6,player.y+11,12,23);
   ctx.beginPath();ctx.ellipse(player.x,player.y,15,22,0,0,TAU);ctx.fillStyle='#38accb';ctx.fill();ctx.save();ctx.clip();ctx.strokeStyle='#c4faf546';ctx.lineWidth=1;for(let d=-18;d<=18;d+=6){ctx.beginPath();ctx.moveTo(player.x-14,player.y+d);ctx.lineTo(player.x+14,player.y+d);ctx.stroke();}ctx.restore();
   ctx.beginPath();ctx.ellipse(player.x,player.y,15,22,0,0,TAU);ctx.lineWidth=3;ctx.strokeStyle='#b8f8ff';ctx.stroke();
   if(player.swing>0){ctx.strokeStyle='#a8fdfb';ctx.lineWidth=4;ctx.beginPath();ctx.arc(player.x+8,player.y,36,-1,1);ctx.stroke();}
   ctx.fillStyle='#ead5ac';ctx.fillRect(ai.x-6,ai.y+11,12,23);
   ctx.beginPath();ctx.ellipse(ai.x,ai.y,15,22,0,0,TAU);ctx.fillStyle='#eaa261';ctx.fill();ctx.save();ctx.clip();ctx.strokeStyle='#ffedc446';ctx.lineWidth=1;for(let d=-18;d<=18;d+=6){ctx.beginPath();ctx.moveTo(ai.x-14,ai.y+d);ctx.lineTo(ai.x+14,ai.y+d);ctx.stroke();}ctx.restore();
   ctx.beginPath();ctx.ellipse(ai.x,ai.y,15,22,0,0,TAU);ctx.lineWidth=3;ctx.strokeStyle='#ffe7c4';ctx.stroke();
   fx.draw(ctx);motionTrail(ctx,trail,f.radius,'#f6efca');if(ball){orb(ctx,ball.x,ball.y,Math.max(4,f.radius*.67),'#122b36');
    kineticBall(ctx,ball.x,ball.y-Math.min(40,ball.z*.22),f.radius,'#fff5db',null,ball.contact,ball.impactAngle||0);
    if(ball.bouncedReceiver)trace(ctx,ball.x,ball.y,f.radius+5,'#eaffbb');}
   words(ctx,'2 BOUNCES TO SERVE · 1 TO RETURN',15,h-17,Math.max(10,Math.min(13,w*.024)),'#9ceada');
  }else{
   const f=field(),ground=f.floor;rect(ctx,0,ground,w,h-ground,'#184155');rect(ctx,0,ground,w,3,'#9cf2e3');
   ctx.strokeStyle='#c5eee63d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(w*.08,ground+12);ctx.lineTo(w*.92,ground+12);ctx.moveTo(w*.5,ground);ctx.lineTo(w*.5,h);ctx.stroke();
   rect(ctx,w*.5-f.netHalf,f.netTop,f.netHalf*2,ground-f.netTop,'#d9eff8');
   ctx.strokeStyle='#a8e7ea88';ctx.lineWidth=1;ctx.strokeRect(w*.5-9,f.netTop,18,ground-f.netTop);
   for(let y=f.netTop+12;y<ground;y+=13){ctx.beginPath();ctx.moveTo(w*.5-9,y);ctx.lineTo(w*.5+9,y);ctx.stroke();}
   for(const [who,p]of [[0,player],[1,ai]]){const id=who===0?env.hero:(env.hero+3)%7,clip=p.swing>0?'attack1':!p.ground?'jump':p.moving?'walk':'idle';fighter(ctx,p.x,ground,Math.max(0,ground-p.y-f.body),between(Math.min(w,h)*.075,26,39),pal[id],p.swing>0?.23-p.swing:t,clip,who===0?1:-1,id);}
   ctx.save();ctx.globalAlpha=.18;ctx.fillStyle='#071f2a';ctx.beginPath();ctx.ellipse(ball.x,ground,Math.max(5,f.r*(1-between((ground-ball.y)/h,0,.7))),3,0,0,TAU);ctx.fill();ctx.restore();fx.draw(ctx);motionTrail(ctx,trail,f.r,'#fff4ce');kineticBall(ctx,ball.x,ball.y,f.r,'#f8f3c0','#fffdee',ball.contact,ball.impactAngle||0,true);if(serve>0)words(ctx,jaText(env,'發球','サーブ')+' '+Math.ceil(serve),w*.5,h*.25,16,'#b9fff0','center');
  }
  if(pointFlashTime>0)words(ctx,pointFlash===0?jaText(env,'我方得分！','ポイント！'):jaText(env,'對手得分','相手のポイント'),w*.5,h*.23,17,pointFlash===0?'#b7f5db':'#f0c0a6','center');
  words(ctx,`${points[0]}    :    ${points[1]}`,w/2,37,24,'#ebfcff','center');
  words(ctx,mode==='pong'?'TABLE TENNIS':'ENERGY VOLLEYBALL',15,h*.135,12,'#8de4eb');
 },
 hud(){return `<span>${mode==='pong'?'TABLE TENNIS':'VOLLEY'}</span><span>YOU <b>${points[0]}</b></span><span>AI <b>${points[1]}</b></span><span>FIRST TO <b>${limit}</b></span>${mode==='volley'?`<span>RALLY <b>${Math.max(0,Math.ceil((mode==='volley'?14:18)-rallyClock))}s</b></span>`:`<span>${serve>0?'SERVICE':ball?.bouncedReceiver?'RETURN':'BOUNCE'} <b>${Math.max(0,Math.ceil((mode==='volley'?14:18)-rallyClock))}s</b></span>`}`;},
 inspectMatch(){return {mode,chapter,aiProfile:aiProfiles[chapter-1],points:[...points],serve,ball:ball?{...ball}:null,player:{...player},ai:{...ai},rally,rallyClock,reason:pointReason,field:mode==='volley'?{...field()}:null,serveSide,serveCrossings:[...serveCrossings],netContacts,finished:!!g._finished}},
};if(env.testMode&&mode==='volley'){g.testVolleyServe=side=>{beginRound();serveSide=side===1?1:0;heldVolley();};g.testVolleyBall=value=>{serve=0;Object.assign(ball,value);};}
if(env.testMode&&mode==='pong')g.testTableBall=value=>{serve=0;rallyClock=0;ball={x:ai.x-10,y:ai.y,z:50,vx:400,vy:0,vz:0,lastHitter:0,serveOwn:false,bouncedReceiver:true,...value};};return g;
};

R.g06=env=>{
 const chapter=Math.max(1,Math.min(5,Number(env.chapter)||1)),lapLength=1200,laps=chapter===1?3:2,goal=lapLength*laps,timeLimit=chapter===1?110:95+(chapter-1)*14,roadHalf=5.2,vehicleWidth=1.75,carContact=vehicleWidth/roadHalf,barrierContact=vehicleWidth*1.05/roadHalf,checkpointDistances=Array.from({length:laps*3},(_,i)=>(i+1)*400);
 const chapterNames=['CITY LOOP','GREEN HILLS','SKYWAY S-CURVES','CANYON DESCENT','ENTROPY CORE'],segmentNames=['SKYWAY','GREEN TUNNEL','ENERGY CORE'],mul=env.difficulty==='expert'?1.3:env.difficulty==='hard'?1.15:1;
  const routeSpecs=[
   {sx:190,sz:160,x2:22,z3:18,grade:8,wave:3,phase:0,road:'#303e47'},
   {sx:205,sz:156,x2:26,z3:11,grade:23,wave:9,phase:.17,road:'#303f45'},
   {sx:180,sz:155,x2:57,z3:26,grade:10,wave:8,phase:.42,road:'#323c4c'},
   {sx:178,sz:171,x2:40,z3:35,grade:28,wave:15,phase:.8,road:'#403b43'},
   {sx:185,sz:157,x2:63,z3:38,grade:31,wave:14,phase:1.14,road:'#353545'}
  ],route=routeSpecs[chapter-1];
 let car,traffic=[],t=0,progress=0,elapsed=0,score=0,collisions=0,nitro=100,checkpointIndex=0,gateFlash=0,passes=0,slipstream=false;
 let racePhase='countdown',lights=3,debt=0,events=[],pairOrder=new Map();
 const drivers=[
  {name:'EMBER',style:'balanced',pace:73,accel:16,line:-.12,look:1},
  {name:'PULSE',style:'late-braker',pace:76,accel:15.4,line:.18,look:.85},
  {name:'IRON',style:'steady',pace:72,accel:14.8,line:0,look:1.15},
  {name:'PHOTON',style:'attacker',pace:78,accel:16.4,line:.10,look:.95},
  {name:'ORACLE',style:'technical',pace:74,accel:15.8,line:-.18,look:1.25}
 ];
 const gridIds=['player','ai-0','ai-1','ai-2','ai-3','ai-4'],defaultGrid=['ai-4','ai-2','ai-3','ai-0','ai-1','player'];
 const gridOrder=Array.isArray(env.grid)&&env.grid.length===6&&new Set(env.grid).size===6&&env.grid.every(id=>gridIds.includes(id))?env.grid.slice():defaultGrid;
 const models=[
  {zh:'烈焰 GT',ja:'フレアGT',roof:.72,cabin:.24,kind:'flame',accent:'#ffc08c'},
  {zh:'共振機甲',ja:'レゾナンス',roof:.78,cabin:.30,kind:'mech',accent:'#89eaff'},
  {zh:'鋼鐵越野',ja:'アイアンSUV',roof:.86,cabin:.32,kind:'utility',accent:'#d6e4a8'},
  {zh:'光子疾影',ja:'フォトン',roof:.59,cabin:.22,kind:'blade',accent:'#fff3a0'},
  {zh:'三重泡影',ja:'トリプルバブル',roof:.70,cabin:.28,kind:'bubble',accent:'#c8bcff'},
  {zh:'翠葉巡遊',ja:'リーフバギー',roof:.75,cabin:.28,kind:'leaf',accent:'#bdffd1'},
  {zh:'先知星環',ja:'オラクルリング',roof:.66,cabin:.27,kind:'ring',accent:'#eec0ff'}
 ];
 function trackAt(s){const a=(s%lapLength)/lapLength*TAU,k=TAU/lapLength,phi=route.phase;
  const x=route.sx*Math.sin(a)+route.x2*Math.sin(2*a+phi),z=route.sz*Math.cos(a)+route.z3*Math.cos(3*a+phi),
  dx=(route.sx*Math.cos(a)+2*route.x2*Math.cos(2*a+phi))*k,
  dz=(-route.sz*Math.sin(a)-3*route.z3*Math.sin(3*a+phi))*k,len=Math.max(.01,Math.hypot(dx,dz));
  const ddx=(-route.sx*Math.sin(a)-4*route.x2*Math.sin(2*a+phi))*k*k,ddz=(-route.sz*Math.cos(a)-9*route.z3*Math.cos(3*a+phi))*k*k;
  return {x,z,y:route.grade*Math.sin(a+phi)+route.wave*Math.sin(3*a),fx:dx/len,fz:dz/len,rate:len,bend:between(-(dx*ddz-dz*ddx)/Math.pow(len,3)*90,-1.2,1.2)};}
 const miniMapPoints=Array.from({length:61},(_,n)=>trackAt(n/60*lapLength)),projectionSamples=new Map();
 let projectionBasis=null,sampleProgress=NaN,feel={pitch:0,impact:0,side:1};
 function sampleAt(distance){if(sampleProgress!==progress){projectionSamples.clear();sampleProgress=progress;}if(!projectionSamples.has(distance))projectionSamples.set(distance,trackAt(progress+distance));return projectionSamples.get(distance);}
 const sceneryLane=1.76,sceneryUnit=2.2,nearPlane=1.2,stripLength=3,viewDistance=210;
 const landscape=[
  {sky:'#122c48',haze:'#eab47e',land:'#42625a',shade:'#38564e',shoulder:'#89968a',sun:'#ffe2aa'},
  {sky:'#154a68',haze:'#aecdc0',land:'#386d53',shade:'#326249',shoulder:'#71875b',sun:'#f5edc4'},
  {sky:'#141e43',haze:'#718eb4',land:'#293f58',shade:'#25394e',shoulder:'#596a7c',sun:'#c5d8ec'},
  {sky:'#432f48',haze:'#e0aa88',land:'#956e53',shade:'#896149',shoulder:'#bc9473',sun:'#ffe2ac'},
  {sky:'#13152d',haze:'#685b91',land:'#39374e',shade:'#302e46',shoulder:'#706783',sun:'#d9b8ed'}
 ][chapter-1];
 function basis(){
  const offset=car.lane*.20+car.steer*.18*Math.min(1,car.speed/20);
  if(!projectionBasis||projectionBasis.progress!==progress||projectionBasis.w!==g.w||projectionBasis.h!==g.h||projectionBasis.offset!==offset){
   const anchor=trackAt(progress),camera=trackAt(progress-8/anchor.rate),dx=anchor.x-camera.x,dz=anchor.z-camera.z;
   camera.x+=camera.fz*offset;camera.z-=camera.fx*offset;
   const forward=Math.max(1,dx*camera.fx+dz*camera.fz);
   camera.eye=anchor.y-camera.y+.50*forward/(.85*.85);
   camera.anchorForward=forward;
   camera.pitchSlope=(trackAt(progress+6).y-trackAt(progress-6).y)/(12*anchor.rate);
   projectionBasis={progress,w:g.w,h:g.h,offset,camera};
  }
  return projectionBasis.camera;
 }
 function cameraPoint(distance,lane=0,height=0){
  const camera=basis(),p=sampleAt(distance),dx=p.x+p.fz*roadHalf*lane-camera.x,dz=p.z-p.fx*roadHalf*lane-camera.z;
  const forward=dx*camera.fx+dz*camera.fz;
  return {side:dx*camera.fz-dz*camera.fx,forward,up:camera.y+camera.eye-p.y-height+(forward-camera.anchorForward)*camera.pitchSlope};
 }
 function screenPoint(p){const scale=.85/p.forward;return {x:g.w*.5+p.side*scale*g.w*.5,y:g.h*.32+p.up*scale*g.h*.85,scale,half:roadHalf*scale*g.w*.5};}
 function project(distance,lane=0,height=0){const p=cameraPoint(distance,lane,height);return p.forward>=nearPlane?screenPoint(p):null;}
 // Clip in camera space before dividing by depth. A curved edge crossing the camera
 // must produce a clipped polygon, rather than silently dropping a whole road strip.
 function clippedPolygon(points){
  const clipped=[];
  for(let i=0;i<points.length;i++){
   const a=points[i],b=points[(i+1)%points.length],ai=a.forward>=nearPlane,bi=b.forward>=nearPlane;
   if(ai)clipped.push(a);
   if(ai!==bi){const k=(nearPlane-a.forward)/(b.forward-a.forward);clipped.push({forward:nearPlane,side:a.side+(b.side-a.side)*k,up:a.up+(b.up-a.up)*k});}
  }
  return clipped.map(screenPoint);
 }
 function surface(ctx,points,color){
  const poly=clippedPolygon(points);if(poly.length<3)return;
  ctx.beginPath();ctx.moveTo(poly[0].x,poly[0].y);for(let i=1;i<poly.length;i++)ctx.lineTo(poly[i].x,poly[i].y);ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=.65;ctx.stroke();
 }
 function roadSurface(ctx,d,next,left,right,color,height=0){surface(ctx,[cameraPoint(d,left,height),cameraPoint(d,right,height),cameraPoint(next,right,height),cameraPoint(next,left,height)],color);}
 function terrainSides(ctx,d,next,color){
  for(const side of [-1,1]){
   const a=cameraPoint(d,side*1.25),b=cameraPoint(next,side*1.25);
   // Extend ground at its real depth, then clip the entire polygon. Clamping
   // depth alone used to project a different height at the near plane.
   const outer=p=>({...p,side:side*(1000+Math.abs(p.forward)*50)});
   surface(ctx,[a,b,outer(b),outer(a)],color);
  }
 }
 function visibleStrips(){
  const strips=[],start=Math.floor((progress-5)/stripLength)*stripLength;let ridge=g.h;
  for(let world=start;world<progress+viewDistance;world+=stripLength){
   const d=world-progress,next=d+stripLength,ac=cameraPoint(d),bc=cameraPoint(next);
   const poly=clippedPolygon([cameraPoint(d,-1.25),cameraPoint(d,1.25),cameraPoint(next,1.25),cameraPoint(next,-1.25)]);
   if(poly.length<3)continue;
   const endpoint=(p,q)=>p.forward>=nearPlane?screenPoint(p):q.forward>=nearPlane?screenPoint({forward:nearPlane,side:p.side+(q.side-p.side)*(nearPlane-p.forward)/(q.forward-p.forward),up:p.up+(q.up-p.up)*(nearPlane-p.forward)/(q.forward-p.forward)}):poly[0];
   const a=endpoint(ac,bc),b=endpoint(bc,ac),clip=between(ridge,0,g.h);
   const area=poly.reduce((sum,p,i)=>{const q=poly[(i+1)%poly.length];return sum+p.x*q.y-q.x*p.y;},0);
   const visible=area<-.01&&Math.min(...poly.map(p=>p.y))<clip&&Math.max(...poly.map(p=>p.y))>0;
   strips.push({world,d,next,a,b,clip,visible});
   const al=project(d,-1.25),ar=project(d,1.25),bl=project(next,-1.25),br=project(next,1.25);
   ridge=Math.min(ridge,Math.max(al?.y??a.y,ar?.y??a.y),Math.max(bl?.y??b.y,br?.y??b.y));
  }
  return strips;
 }
 function vehicle(ctx,x,y,width,color,steer=0,braking=false,boost=false,feedback=null){
  // Rear perspective. Both tyre bottoms and the contact shadow share road y.
  const model=models[between(Number.isInteger(feedback?.model)?feedback.model:0,0,6)],impact=feedback?.impact||0,lean=steer*width*.055+Math.sin(t*70)*impact*(feedback?.side||1)*width*.015;ctx.save();ctx.translate(x,y);
  ctx.fillStyle='#07101b40';ctx.beginPath();ctx.ellipse(width*.13,width*.025,width*.68,width*.13,.05,0,TAU);ctx.fill();ctx.fillStyle='#030d1b80';ctx.beginPath();ctx.ellipse(0,-width*.025,width*.48,width*.07,0,0,TAU);ctx.fill();
  for(const side of [-1,1]){const xx=side*width*.43;rect(ctx,xx-width*.09,-width*.29,width*.18,width*.29,'#0a1421');rect(ctx,xx-width*.06,-width*.25,width*.12,width*.2,'#202b35');ctx.strokeStyle='#9bb1b4';ctx.lineWidth=Math.max(.5,width*.012);ctx.beginPath();ctx.ellipse(xx,-width*.14,width*.044,width*.075,0,0,TAU);ctx.stroke();for(let n=0;n<3;n++){const yy=-width*.27+((t*(feedback?.speed||0)*.02+n/3)%1)*width*.24;rect(ctx,xx-width*.065,yy,width*.13,width*.012,'#71808088');}}
  ctx.save();ctx.translate(0,-(feedback?.pitch||0)*width*.016+Math.sin(t*80)*impact*width*.012);
  const paint=ctx.createLinearGradient(0,-width*.82,0,0);paint.addColorStop(0,'#d8f5f5');paint.addColorStop(.19,color);paint.addColorStop(.65,color);paint.addColorStop(1,'#263d50');
  ctx.beginPath();ctx.moveTo(-width*.48,-width*.09);ctx.lineTo(-width*.43,-width*.41);ctx.lineTo(-width*model.cabin+lean,-width*model.roof);ctx.quadraticCurveTo(lean,-width*(model.roof+.08),width*model.cabin+lean,-width*model.roof);ctx.lineTo(width*.43,-width*.41);ctx.lineTo(width*.48,-width*.09);ctx.closePath();ctx.fillStyle=paint;ctx.fill();
  ctx.beginPath();ctx.moveTo(-width*(model.cabin-.025)+lean,-width*(model.roof-.04));ctx.lineTo(width*(model.cabin-.025)+lean,-width*(model.roof-.04));ctx.lineTo(width*.33,-width*.43);ctx.lineTo(-width*.33,-width*.43);ctx.closePath();ctx.fillStyle='#122b40';ctx.fill();
  ctx.strokeStyle='#b5e9ed';ctx.lineWidth=Math.max(1,width*.018);ctx.stroke();
  ctx.strokeStyle='#e2ffef66';ctx.lineWidth=Math.max(.6,width*.012);ctx.beginPath();ctx.moveTo(-width*.38,-width*.39);ctx.lineTo(-width*.25+lean,-width*.65);ctx.stroke();
  rect(ctx,-width*.37,-width*.38,width*.74,width*.065,'#e4f5ee');rect(ctx,-width*.42,-width*.12,width*.84,width*.08,'#142531');
  for(const side of [-1,1]){rect(ctx,side*width*.30-width*.105,-width*.27,width*.21,width*.065,braking?'#fff1be':'#ff6e64');rect(ctx,side*width*.16-width*.035,-width*.13,width*.07,width*.06,'#090f1a');}
  rect(ctx,-width*.11,-width*.205,width*.22,width*.055,'#e0e7d9');
  ctx.strokeStyle=model.accent;ctx.fillStyle=model.accent;ctx.lineWidth=Math.max(1,width*.025);
  if(model.kind==='flame'){for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*width*.35,-width*.31);ctx.lineTo(side*width*.20,-width*.53);ctx.lineTo(side*width*.26,-width*.40);ctx.stroke();}rect(ctx,-width*.47,-width*.36,width*.94,width*.035,model.accent);}
  if(model.kind==='mech'){for(const side of [-1,1]){rect(ctx,side*width*.32-width*.07,-width*.50,width*.14,width*.11,'#334d62',model.accent);for(let n=0;n<3;n++)rect(ctx,side*width*.26-width*.035,-width*(.32+n*.035),width*.07,width*.015,'#a8dfed');}rect(ctx,-width*.10,-width*.55,width*.20,width*.09,model.accent);}
  if(model.kind==='utility'){ctx.strokeRect(-width*.35,-width*.78,width*.70,width*.12);orb(ctx,0,-width*.36,width*.135,'#111f28');ctx.beginPath();ctx.arc(0,-width*.36,width*.09,0,TAU);ctx.stroke();for(const side of [-1,1])rect(ctx,side*width*.27-width*.045,-width*.85,width*.09,width*.06,model.accent);}
  if(model.kind==='blade'){for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*width*.42,-width*.27);ctx.lineTo(side*width*.50,-width*.65);ctx.lineTo(side*width*.28,-width*.43);ctx.closePath();ctx.fill();}rect(ctx,-width*.035,-width*.54,width*.07,width*.31,'#f1f8dd');}
  if(model.kind==='bubble'){for(let n=-1;n<=1;n++){orb(ctx,lean+n*width*.16,-width*(n===0?.64:.58),width*.11,'#c6b8ff88');ctx.beginPath();ctx.arc(lean+n*width*.16,-width*(n===0?.64:.58),width*.11,Math.PI,TAU);ctx.stroke();}}
  if(model.kind==='leaf'){for(const side of [-1,1]){ctx.beginPath();ctx.ellipse(side*width*.17,-width*.77,width*.16,width*.055,side*.6,0,TAU);ctx.fill();}ctx.beginPath();ctx.moveTo(-width*.34,-width*.42);ctx.lineTo(-width*.29,-width*.72);ctx.lineTo(width*.29,-width*.72);ctx.lineTo(width*.34,-width*.42);ctx.stroke();}
  if(model.kind==='ring'){ctx.beginPath();ctx.ellipse(lean,-width*.66,width*.34,width*.12,0,0,TAU);ctx.stroke();orb(ctx,lean,-width*.66,width*.07,'#f8d9ff');for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*width*.36,-width*.39);ctx.lineTo(side*width*.29,-width*.74);ctx.stroke();}}
  if(braking)for(const side of [-1,1])orb(ctx,side*width*.30,-width*.24,width*.09,'#ff6b4b55');
  if(boost)for(const side of [-1,1]){const xx=side*width*.16;ctx.beginPath();ctx.moveTo(xx-width*.04,-width*.11);ctx.lineTo(xx,width*(.12+Math.sin(t*36)*.05));ctx.lineTo(xx+width*.04,-width*.11);ctx.fillStyle='#a5efffcc';ctx.fill();}
  ctx.restore();ctx.restore();
 }
 function drawSky(ctx,w,h){
  const sky=ctx.createLinearGradient(0,0,0,h*.44);sky.addColorStop(0,landscape.sky);sky.addColorStop(1,landscape.haze);ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
  const turn=Math.atan2(basis().fz,basis().fx),pan=Math.sin(turn)*w*.19;
  const sx=w*.30+pan*.3,sy=h*.18;
  for(let i=4;i>0;i--)orb(ctx,sx,sy,w*(.025+i*.012),landscape.sun+(i===1?'aa':'12'));
  if(chapter===3||chapter===5)for(let i=0;i<35;i++)orb(ctx,((i*137.3+pan*.4)%w+w)%w,12+(i*47.7)%(h*.22),i%3===0?1.3:.7,'#e1ebf6aa');
  // Layered distant silhouettes pan with the track heading.
  for(let layer=0;layer<3;layer++){
   const horizon=h*(.32+layer*.018),span=w/8,color=chapter===4?['#a47868','#8b645c','#6a5355'][layer]:chapter===2?['#688f85','#49766e','#315b58'][layer]:['#667b8b','#435b72','#293e59'][layer];
   ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,h*.48);
   for(let i=-2;i<12;i++){const x=i*span+pan*(.2+layer*.23),peak=horizon-(.018+(.5+.5*Math.sin(i*3.5+chapter+layer))*h*.065);ctx.lineTo(x,peak);ctx.lineTo(x+span*.48,horizon-h*.012);}
   ctx.lineTo(w,h*.48);ctx.closePath();ctx.fill();
  }
  if(chapter===1||chapter===3||chapter===5){
   for(let i=-2;i<19;i++){const bw=w*.055,x=i*w*.072+pan*.65,bh=h*(.023+(Math.sin(i*7.3)+1)*.035),y=h*.35-bh;rect(ctx,x,y,bw,bh,'#233d51');rect(ctx,x,y,bw*.22,bh,'#1a2e43');for(let wy=y+6;wy<h*.35-4;wy+=9)for(let wx=x+bw*.4;wx<x+bw-3;wx+=8)rect(ctx,wx,wy,2,3,(i+Math.floor(wy))%3?'#c4d8bd66':'#f9bd6e99');}
  }
  if(chapter===1||chapter===3){ctx.save();ctx.beginPath();ctx.rect(0,0,w,h*.35);ctx.clip();ctx.globalAlpha=chapter===1?.9:.52;window.BioWorldArt?.draw(ctx,'race',w,h,{pan:pan*.07,shade:chapter===1?.08:.30,horizon:h*.35});ctx.restore();}
  const aerial=ctx.createLinearGradient(0,h*.23,0,h*.35);aerial.addColorStop(0,landscape.haze+'00');aerial.addColorStop(1,landscape.haze);ctx.fillStyle=aerial;ctx.fillRect(0,h*.23,w,h*.12);
  for(let i=0;i<4;i++){const x=((i*w*.31+t*(2+i*.3)+pan*.25)%(w*1.4))-w*.2;ctx.strokeStyle='#e7e5d90d';ctx.lineWidth=h*.009;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,h*(.075+i*.038));ctx.lineTo(x+w*.17,h*(.07+i*.038));ctx.stroke();}
  const terrain=ctx.createLinearGradient(0,h*.35,0,h);terrain.addColorStop(0,landscape.haze);terrain.addColorStop(.16,landscape.land);terrain.addColorStop(1,landscape.shade);ctx.fillStyle=terrain;ctx.fillRect(0,h*.35,w,h*.65);
 }
 function roadside(ctx,p,side,world){
  const u=sceneryUnit*p.scale*g.w*.5,x=p.x,y=p.y;if(u<.4)return;
  ctx.save();ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=Math.max(.6,u*.09);
  ctx.fillStyle='#071d2940';ctx.beginPath();ctx.ellipse(x+u*.2,y+u*.025,u*.7,u*.1,0,0,TAU);ctx.fill();
  if(chapter===1){
   rect(ctx,x-u*.16,y-u*.10,u*.32,u*.1,'#afbeb4');rect(ctx,x-u*.055,y-u*2.8,u*.11,u*2.8,'#789ca0');
   ctx.strokeStyle='#b8d5d0';ctx.beginPath();ctx.moveTo(x,y-u*2.7);ctx.quadraticCurveTo(x-side*u*.3,y-u*3.04,x-side*u*.55,y-u*2.8);ctx.stroke();
   ctx.fillStyle='#f5efbc22';ctx.beginPath();ctx.moveTo(x-side*u*.55,y-u*2.8);ctx.lineTo(x-side*u*.98,y);ctx.lineTo(x+side*u*.18,y);ctx.fill();orb(ctx,x-side*u*.55,y-u*2.8,u*.13,'#fff0b6');
  }else if(chapter===2){
   rect(ctx,x-u*.1,y-u*2,u*.2,u*2,'#5a4a3e');
   for(const [high,wide,color]of [[3.5,.52,'#60977b'],[2.9,.76,'#39785c'],[2.2,1.02,'#245c48']]){
    const sway=Math.sin(t*.8+world)*u*.035;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x+sway,y-u*high);
    for(let n=1;n<=5;n++){const ratio=n/5;ctx.lineTo(x+sway-u*wide*ratio*(n%2?.84:1),y-u*(high-ratio*1.6));}
    for(let n=5;n>=1;n--){const ratio=n/5;ctx.lineTo(x+sway+u*wide*ratio*(n%2?.88:1),y-u*(high-ratio*1.6));}
    ctx.closePath();ctx.fill();ctx.strokeStyle='#8eb79544';ctx.lineWidth=Math.max(.5,u*.035);ctx.beginPath();ctx.moveTo(x+sway,y-u*(high-.3));ctx.lineTo(x+sway-u*wide*.66,y-u*(high-1.25));ctx.stroke();
   }
  }else if(chapter===3){
   rect(ctx,x-u*.09,y-u*3.0,u*.18,u*3,'#7a99ae');rect(ctx,x-u*.44,y-u*3.2,u*.88,u*.6,'#153b57','#a9c8d3');
   ctx.strokeStyle='#e2e4ad';ctx.lineWidth=Math.max(1,u*.1);ctx.beginPath();ctx.moveTo(x-side*u*.21,y-u*2.91);ctx.lineTo(x+side*u*.18,y-u*2.91);ctx.moveTo(x+side*u*.02,y-u*3.07);ctx.lineTo(x+side*u*.18,y-u*2.91);ctx.lineTo(x+side*u*.02,y-u*2.76);ctx.stroke();
  }else if(chapter===4){
   ctx.fillStyle='#b28766';ctx.beginPath();ctx.moveTo(x-u,y);ctx.lineTo(x-u*.78,y-u*1.1);ctx.lineTo(x-u*.26,y-u*2.5);ctx.lineTo(x+u*.45,y-u*2.25);ctx.lineTo(x+u*.94,y);ctx.closePath();ctx.fill();
   ctx.fillStyle='#84604f';ctx.beginPath();ctx.moveTo(x-u*.26,y-u*2.5);ctx.lineTo(x+u*.12,y-u*.65);ctx.lineTo(x+u*.94,y);ctx.lineTo(x+u*.45,y-u*2.25);ctx.fill();
   ctx.strokeStyle='#d0a27c';for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(x-u*.65,y-u*i*.42);ctx.lineTo(x+u*.4,y-u*i*.42-u*.1);ctx.stroke();}
  }else{
   rect(ctx,x-u*.26,y-u*2.6,u*.52,u*2.6,'#292c45','#8b85aa');
   for(let i=0;i<3;i++){ctx.strokeStyle=i===1?'#e3a2d3':'#92c7da';ctx.lineWidth=Math.max(1,u*.055);ctx.beginPath();ctx.ellipse(x,y-u*(2.1-i*.63),u*.49,u*.16,0,0,TAU);ctx.stroke();}
   orb(ctx,x,y-u*2.9,u*.2,'#e5b8e0');
  }
  ctx.restore();
 }
 function drawRaceWorld(ctx,w,h){
  // Distances of moving rivals change even with a parked player. Cache only
  // within this draw so waiting for finishers cannot grow the projection map.
  projectionSamples.clear();sampleProgress=progress;
  drawSky(ctx,w,h);const strips=visibleStrips(),objects=[];
  for(let z=Math.floor(progress/24)*24;z<progress+viewDistance;z+=24)objects.push({z,type:'scenery'});
  for(const ob of traffic){if(ob.status==='dnf'||ob.type==='barrier'&&ob.hit)continue;const gap=roadGap(ob.z+(ob.coastDistance||0),progress);if(gap>-5&&gap<viewDistance)objects.push({...ob,z:progress+gap,lane:ob.coastLane??ob.lane});}
  const gate=checkpointDistances[checkpointIndex];if(gate!==undefined&&gate-progress<viewDistance)objects.push({z:gate,type:'gate'});
  objects.sort((a,b)=>b.z-a.z);
  for(let i=strips.length-1;i>=0;i--){
   const seg=strips[i],{d,next,a,b,world,clip}=seg;
   if(clip<=0)continue;
   ctx.save();
   // The same crest depth mask applies to road, terrain, rails and vehicles.
   ctx.beginPath();ctx.rect(0,0,w,clip);ctx.clip();
   if(seg.visible){
    // Full terrain strips close hills and hide scenery behind each crest.
    terrainSides(ctx,d,next,landscape.land);
    roadSurface(ctx,d,next,-1.25,1.25,landscape.shoulder);
    roadSurface(ctx,d,next,-1,1,Math.floor(world/9)%2?route.road:'#293942');
    for(const side of [-1,1]){
     roadSurface(ctx,d,next,side*.985,side*1.05,Math.floor(world/9)%2?'#e5ddd0':'#b46e63');
     roadSurface(ctx,d,next,side*1.10,side*1.115,'#d1d6bf');
     surface(ctx,[cameraPoint(d,side*1.15,.62),cameraPoint(next,side*1.15,.62),cameraPoint(next,side*1.15,.47),cameraPoint(d,side*1.15,.47)],chapter===5?'#aaa2c5':'#a6b7b3');
     if(Math.round(world/stripLength)%4===0){const lo=project(d,side*1.15),hi=project(d,side*1.15,.62);if(lo&&hi){ctx.strokeStyle='#687e7d';ctx.lineWidth=Math.max(.6,lo.scale*w*.025);ctx.beginPath();ctx.moveTo(lo.x,lo.y);ctx.lineTo(hi.x,hi.y);ctx.stroke();}}
    }
    if(Math.floor(world/9)%3!==0)for(const lane of [-.34,.34])roadSurface(ctx,d,next,lane-.008,lane+.008,'#d3d8c3');
    const fog=between((d-85)/140,0,.42);if(fog>0){ctx.globalAlpha=fog;roadSurface(ctx,d,next,-1.25,1.25,landscape.haze);ctx.globalAlpha=1;}
   }
   for(const ob of objects){
    if(ob.z<world||ob.z>=world+stripLength)continue;
    const distance=ob.z-progress;
    if(ob.type==='scenery'){for(const side of [-1,1]){const p=project(distance,side*sceneryLane);if(p)roadside(ctx,p,side,world);}continue;}
    if(ob.type==='gate'){
     const a=project(distance,-1.06),b=project(distance,1.06),at=project(distance,-1.06,5.2),bt=project(distance,1.06,5.2);if(!a||!b||!at||!bt)continue;
     ctx.strokeStyle=gateFlash<0?'#f29d91':'#9fd8c6';ctx.lineWidth=Math.max(1.5,a.scale*w*.055);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(at.x,at.y);ctx.lineTo(bt.x,bt.y);ctx.lineTo(b.x,b.y);ctx.stroke();
     const center=project(distance,0,5.2);if(center){const sw=at.x-bt.x;rect(ctx,center.x-Math.abs(sw)*.25,center.y-8*a.scale,Math.abs(sw)*.5,15*a.scale,'#163b42');words(ctx,gate===goal?'FINISH':gate%lapLength===0?'LAP':'CHECKPOINT',center.x,center.y+3*a.scale,Math.max(3,9*a.scale),'#ecf5d6','center');}continue;
    }
    const p=project(distance,ob.lane);if(!p)continue;const size=Math.max(.8,Math.min(w*.22,vehicleWidth*p.scale*w*.5));
    if(ob.type==='car')vehicle(ctx,p.x,p.y,size,ob.color,ob.steer||0,!!ob.braking,!!ob.boost,{model:[0,1,2,3,6][Number(ob.id?.split('-')[1])||0],speed:ob.speed,impact:Math.max(0,ob.inv-.35),side:1});
    else{
     const bh=size*.55;ctx.fillStyle='#10212a66';ctx.beginPath();ctx.ellipse(p.x,p.y,size*.65,size*.09,0,0,TAU);ctx.fill();rect(ctx,p.x-size*.55,p.y-bh,size*1.1,bh,'#b37a4c','#e4bd88');rect(ctx,p.x-size*.52,p.y-bh,size*1.04,bh*.16,'#e2b57d');
     ctx.strokeStyle='#3e3230';ctx.lineWidth=Math.max(.7,size*.07);for(const xx of [-.3,.15]){ctx.beginPath();ctx.moveTo(p.x+size*xx,p.y-bh*.15);ctx.lineTo(p.x+size*(xx+.18),p.y-bh*.78);ctx.stroke();}
    }
   }
   ctx.restore();
  }
  const player=project(0,car.lane);
  if(player){
   if(car.speed>20&&(car.braking||car.slip>.3||Math.abs(car.lane)>1.04))for(let i=0;i<7;i++){const age=(t*car.speed*.09+i*.19)%1,side=i%2?1:-1;orb(ctx,player.x+side*(12+age*24),player.y-age*23,2+age*5,(Math.abs(car.lane)>1.04?'#c8b595':'#c1d4d6')+['22','33','44'][i%3]);}
   ctx.save();if(car.inv&&Math.floor(t*14)%2)ctx.globalAlpha=.58;vehicle(ctx,player.x,player.y,Math.min(w*.15,vehicleWidth*player.scale*w*.5),pal[env.hero],car.steer,car.braking,car.boost,{...feel,model:env.hero,speed:car.speed});ctx.restore();
  }
  if(car.speed>78){ctx.strokeStyle='#bce7ed2e';ctx.lineWidth=1;for(let i=0;i<12;i++){const side=i%2?1:-1,phase=(t*2.5+i*.17)%1,x=w*.5+side*w*(.35+phase*.2),y=h*(.43+phase*.5);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+side*phase*w*.04,y+phase*h*.09);ctx.stroke();}}
  if(car.inv>1.0){ctx.strokeStyle='#f1af9855';ctx.lineWidth=8;ctx.strokeRect(4,4,w-8,h-8);}
 }
 // Racing decisions use a simultaneous snapshot, never the player's rank or a
 // catch-up multiplier. Steering, acceleration and road limits remain physical.
 function racers(){return [car,...traffic.filter(o=>o.type==='car')];}
 function roadGap(a,b){return ((a-b+lapLength*.5)%lapLength+lapLength)%lapLength-lapLength*.5;}
 function raceOrder(){return racers().slice().sort((a,b)=>{
  if(a.finishTime!==null&&b.finishTime!==null)return a.finishTime-b.finishTime||a.id.localeCompare(b.id);
  if(a.finishTime!==null)return -1;if(b.finishTime!==null)return 1;
  if(a.status==='dnf'&&b.status!=='dnf')return 1;if(b.status==='dnf'&&a.status!=='dnf')return -1;
  return b.z-a.z||a.id.localeCompare(b.id);
 });}
 function position(){return raceOrder().findIndex(r=>r===car)+1;}
 function clockText(value){if(value===null||!Number.isFinite(value))return '—';const ms=Math.round(value*1000);return Math.floor(ms/60000)+':'+String(Math.floor(ms/1000)%60).padStart(2,'0')+'.'+String(ms%1000).padStart(3,'0');}
 function classification(){return raceOrder().map((r,i)=>({id:r.id,name:r.player?(env.I?.hero?.[env.hero]||jaText(env,'玩家','プレイヤー')):r.name,position:i+1,player:!!r.player,status:r.status,laps:Math.min(laps,Math.floor(r.z/lapLength)),progress:r.z,time:r.finishTime,bestLap:r.lapTimes.length?Math.min(...r.lapTimes):null,overtakes:r.overtakes||0}));}
 function nextLap(r,before,after,dt){
  for(let line=(Math.floor(before/lapLength)+1)*lapLength;line<=Math.min(goal,after);line+=lapLength){
   const at=elapsed-dt+between((line-before)/Math.max(1e-9,after-before),0,1)*dt;
   r.lapTimes.push(at-r.lastLapAt);r.lastLapAt=at;
   if(line>=goal){r.z=goal;r.finishTime=at;r.status='finished';r.coastDistance=0;r.coastLane=r.lane;break;}
  }
 }
 function cornerAt(z,speed,look=1){return Math.max(...[0,14+speed*.35,28+speed*.7*look].map(d=>Math.abs(trackAt(z+d).bend)));}
 const lateralForce=chapter===1?.20:.48;
 const cornerSpeed=corner=>104/(1+.25*corner);
 function boostFor(r,wants,dt){
  r.boostCooldown=Math.max(0,(r.boostCooldown||0)-dt);
  if(!wants)r.boostArmed=true;
  if(r.boost&&(!wants||r.nitro<=0||r.braking)){if(r.nitro<=0)r.boostArmed=false;r.boost=false;r.boostCooldown=1.2;}
  if(!r.boost&&wants&&r.boostArmed!==false&&!r.braking&&r.boostCooldown===0&&r.nitro>=25)r.boost=true;
  return !!r.boost;
 }
 function aiPlan(r,field,dt){
  const d=r.driver,bend=trackAt(r.z+25).bend;
  const ideal=between(bend*.28+d.line,-.62,.62),live=field.filter(o=>o.id!==r.id&&o.status==='racing');
  r.decision-=dt;
  if(elapsed<4){r.targetLane=r.gridLane??r.lane;}
  else if(r.decision<=0){
   const candidates=[-.66,0,.66,ideal],cost=lane=>{
    let value=Math.abs(lane-ideal)*3+Math.abs(lane-r.lane)*1.5;
    for(const o of live){const gap=roadGap(o.z,r.z);if(gap>-10&&gap<65&&Math.abs(o.lane-lane)<carContact+.045)value+=gap<8?100:Math.max(0,65-gap)*.45;}
    for(const o of traffic)if(o.type==='barrier'&&!o.hit){const gap=roadGap(o.z,r.z);if(gap>-4&&gap<65&&Math.abs(o.lane-lane)<barrierContact+.04)value+=100-gap;}
    return value;
   };
   const best=candidates.sort((a,b)=>cost(a)-cost(b))[0];
   if(!Number.isFinite(r.targetLane)||cost(best)+.5<cost(r.targetLane))r.targetLane=best;
   r.decision=.22+d.look*.05;
  }
  const ahead=live.filter(o=>{const gap=roadGap(o.z,r.z);return gap>0&&gap<35&&Math.abs(o.lane-r.lane)<carContact+.03;}).sort((a,b)=>roadGap(a.z,r.z)-roadGap(b.z,r.z))[0];
  const nextGate=checkpointDistances[r.checkpointIndex??Math.max(0,Math.floor(r.z/400))];
  if(nextGate!==undefined&&nextGate-r.z<65)r.targetLane=between(r.targetLane,-.45,.45);
  const draft=live.some(o=>{const gap=roadGap(o.z,r.z);return gap>8&&gap<38&&Math.abs(o.lane-r.lane)<.22;});
  // Approach each visible bend using its distance and a braking budget below
  // the shared 38-unit physical limit. A distant corner must not cap speed now.
  const margin=(env.difficulty==='normal'?-4:env.difficulty==='hard'?-2:-.5)+(d.style==='late-braker'?1:d.style==='technical'?-1:0),brakeBudget=d.style==='late-braker'?28:d.style==='technical'?22:25;
  const targetCorner=Math.min(104,...[0,14+r.speed*.35,28+r.speed*.7*d.look].map(distance=>Math.sqrt(Math.pow(cornerSpeed(Math.abs(trackAt(r.z+distance).bend))+margin,2)+2*brakeBudget*distance)));
  r.boostTime=Math.max(0,(r.boostTime||0)-dt);r.boostRest=Math.max(0,(r.boostRest||0)-dt);
  if(r.boostTime===0&&r.boostRest===0&&r.nitro>40&&targetCorner>94&&!ahead){r.boostTime=1.6;r.boostRest=2+d.look*1.5;}
  r.braking=targetCorner<r.speed-1;boostFor(r,r.boostTime>0&&targetCorner>92&&!ahead,dt);
  let target=Math.min(96,targetCorner,r.maxSpeed+(r.boost?12:0)+(draft?3:0));
  if(ahead){const gap=roadGap(ahead.z,r.z);if(gap<13)target=Math.min(target,Math.max(0,ahead.speed+(gap-8)*2));}
  r.braking=target<r.speed-1;r.targetSpeed=target;r.slipstream=draft;
  const excess=Math.max(0,r.speed-cornerSpeed(Math.abs(trackAt(r.z).bend)));
  const compensation=trackAt(r.z).bend*Math.pow(r.speed/80,2)*lateralForce*(1+excess*.06)/(.9*(.65+r.speed/100)*Math.max(.4,1-excess*.022));
  return {target,turn:between((r.targetLane-r.lane)*3+compensation,-1,1),accel:d.accel};
 }
 function drive(r,plan,dt){
  const road=trackAt(r.z),grade=trackAt(r.z+18).y-road.y;
  const holdBrake=r.braking&&plan.target===0&&r.speed<=38*dt;
  // One tyre envelope for all six cars: excessive corner entry speed causes
  // understeer and tyre scrub. It never applies an automatic perfect brake.
  const safe=cornerSpeed(Math.abs(road.bend)),excess=Math.max(0,r.speed-safe);
  const target=Math.abs(r.lane)>1.04?Math.min(plan.target,r.braking?0:35):plan.target;
  r.speed+=between((target-r.speed)/dt-Math.min(12,excess*.35),r.braking?-38:-8,plan.accel)*dt;
  if(chapter>1)r.speed=Math.max(0,r.speed-Math.max(0,grade)*.018*dt+Math.max(0,-grade)*.012*dt);
  if(holdBrake)r.speed=0; // Static braking holds a stopped car on descending grades too.
  r.steer+=between(plan.turn-r.steer,-8*dt,8*dt);
  const grip=Math.max(.4,1-excess*.022),side=r.steer*.9*(.65+r.speed/100)*grip-road.bend*Math.pow(r.speed/80,2)*lateralForce*(1+excess*.06);
  r.lateralVelocity=r.speed===0?0:(r.lateralVelocity||0)+(side-(r.lateralVelocity||0))*(1-Math.exp(-10*dt));
  r.slip=Math.min(1,Math.max(0,r.speed-safe)/18+Math.abs(r.steer)*Math.max(0,r.speed-70)/80);
  r.lane=between(r.lane+r.lateralVelocity*dt,-1.25,1.25);
  if(Math.abs(r.lane)>1.04)r.health=Math.max(0,r.health-2*dt);
 }
 function contact(a,b){
  if(a.status!=='racing'||b.status!=='racing')return;
  const gap=roadGap(a.z,b.z);if(Math.abs(gap)>=3.6||Math.abs(a.lane-b.lane)>=carContact)return;
  // A closing car loses speed; the lead car is nudged, never teleported. Both
  // receive the same protection interval and damage rules, including AI/AI.
  const rear=gap<0?a:b,front=rear===a?b:a,closing=Math.max(0,rear.speed-front.speed);
  rear.speed=Math.max(0,Math.min(rear.speed,front.speed*.85));front.speed=Math.max(0,front.speed-Math.min(5,closing*.10));
  if(a.inv>0||b.inv>0){a.inv=b.inv=Math.max(a.inv,b.inv);return;} // Preserve the shared impact window, but still resolve contact.
  const damage=4+Math.min(6,closing*.15);a.health=Math.max(0,a.health-damage);b.health=Math.max(0,b.health-damage);a.inv=b.inv=.65;
  if(a.player||b.player){collisions++;feel.impact=1;feel.side=Math.sign(car.lane-(a.player?b:a).lane)||1;env.sfx(95,.10);}
 }
 function recordPasses(field){
  for(let i=0;i<field.length;i++)for(let j=i+1;j<field.length;j++){
   const a=field[i],b=field[j];if(a.status!=='racing'||b.status!=='racing')continue;
   const key=a.id+'/'+b.id,gap=a.z-b.z,was=pairOrder.get(key);
   if(Math.abs(gap)<=1)continue;const order=gap>0;
   if(was!==undefined&&was!==order){
    const winner=order?a:b,loser=order?b:a;winner.overtakes++;
    if(winner.player){passes++;env.sfx(600,.04);}
    events.push({time:elapsed,lap:Math.min(laps,Math.floor(winner.z/lapLength)+1),by:winner.id,against:loser.id});
   }
   pairOrder.set(key,order);
  }
 }
 function settle(){
  racePhase='finished';const rank=position(),win=car.status==='finished'&&rank<=3;
  ends(g,win,Math.max(0,score+(win?(7-rank)*200:0)),`${jaText(env,'名次','順位')} ${rank}/6 · ${clockText(car.finishTime)} · BEST ${clockText(car.lapTimes.length?Math.min(...car.lapTimes):null)}`);
 }
 function advanceRacer(r,dt){
  const index=r.player?checkpointIndex:(r.checkpointIndex??Math.max(0,Math.floor(r.z/400))),before=r.z,next=r.z+r.speed*dt,gate=checkpointDistances[index];let cleared=index;
  if(gate!==undefined&&next>=gate){
   if(Math.abs(r.lane)<=.93){r.z=Math.min(goal,next);cleared++;if(!r.sectorTimes)r.sectorTimes=[];r.sectorTimes[index]=elapsed-dt+between((gate-before)/Math.max(1e-9,next-before),0,1)*dt;if(r.player){gateFlash=.65;env.sfx(820,.08);}}
   else{r.z=Math.min(next,gate-.01);r.speed=Math.min(r.speed,24);if(r.player)gateFlash=-.65;}
  }else r.z=Math.min(goal,next);
  r.checkpointIndex=cleared;if(r.player)checkpointIndex=cleared;
  nextLap(r,before,cleared===checkpointDistances.length?next:r.z,dt);
 }
 function awareness(){
  const field=racers().filter(r=>!r.player&&r.status!=='dnf'),ahead=field.filter(r=>r.z>car.z).sort((a,b)=>a.z-b.z)[0],behind=field.filter(r=>r.z<car.z).sort((a,b)=>b.z-a.z)[0];
  const gap=r=>{if(!r)return null;let checkpoint=null;for(let i=checkpointDistances.length-1;i>=0;i--)if(Number.isFinite(car.sectorTimes?.[i])&&Number.isFinite(r.sectorTimes?.[i])){checkpoint=Math.abs(car.sectorTimes[i]-r.sectorTimes[i]);break;}return {id:r.id,metres:Math.abs(r.z-car.z),checkpointSeconds:checkpoint};};
  const threats=field.filter(r=>{const d=roadGap(r.z,car.z);return d<0&&d>-25&&r.speed>car.speed+2;}).map(r=>({id:r.id,side:r.lane<car.lane?'left':'right',metres:-roadGap(r.z,car.z)}));
  return {ahead:gap(ahead),behind:gap(behind),threats,curve:trackAt(progress+35).bend};
 }
 function raceStep(dt,input){
  if(racePhase!=='countdown')dt=Math.min(dt,Math.max(0,timeLimit-elapsed));
  const previousSpeed=car.speed;t+=dt;feel.impact=Math.max(0,feel.impact-dt*4);
  car.braking=!!input.down;
  if(racePhase==='countdown'){
   const before=Math.ceil(lights);lights=Math.max(0,lights-dt);
   if(Math.ceil(lights)!==before)env.sfx(lights>1e-8?460:920,.08);
   if(lights<1e-8){lights=0;racePhase='racing';}return;
  }
  elapsed+=dt;const field=racers(),snapshot=field.map(r=>({...r}));
  const plans=new Map();for(const r of field){r.inv=Math.max(0,r.inv-dt);if(!r.player&&r.status==='racing')plans.set(r.id,aiPlan(r,snapshot,dt));}
  slipstream=car.status==='racing'&&snapshot.some(r=>!r.player&&r.status==='racing'&&roadGap(r.z,car.z)>8&&roadGap(r.z,car.z)<38&&Math.abs(r.lane-car.lane)<.22);
  if(car.status==='racing'){
   const boost=boostFor(car,!!(input.fire||input.skill),dt);
   let turn=axis(input,'moveX',input.right,input.left);if(input.pointer?.down)turn=between(((input.pointer.x/g.w-.5)*2-car.lane)*3,-1,1);
   drive(car,{target:car.braking?0:boost?96:82+(slipstream?4:0),turn,accel:16},dt);
   car.nitro=boost?Math.max(0,car.nitro-27*(1+Math.min(1,car.slip||0))*dt):Math.min(100,car.nitro+(slipstream?18:8)*dt);nitro=car.nitro;
   advanceRacer(car,dt);progress=car.z;
   if(car.status==='finished')racePhase='finishing';
  }else{car.braking=true;car.speed=Math.max(0,car.speed-38*dt);}
  for(const r of field)if(!r.player&&r.status==='racing'){
   drive(r,plans.get(r.id),dt);advanceRacer(r,dt);
   r.nitro=r.boost?Math.max(0,r.nitro-27*(1+Math.min(1,r.slip||0))*dt):Math.min(100,r.nitro+(r.slipstream?18:8)*dt);
  }
  for(const r of field)if(!r.player&&r.status==='finished'){r.braking=true;r.boost=false;r.speed=Math.max(0,r.speed-12*dt);r.coastDistance=(r.coastDistance||0)+r.speed*dt;if(r.speed>.5)r.coastLane=(r.coastLane??r.lane)+between(.82-(r.coastLane??r.lane),-.4*dt,.4*dt);}
  for(let i=0;i<field.length;i++)for(let j=i+1;j<field.length;j++)contact(field[i],field[j]);
  for(const ob of traffic)if(ob.type==='barrier'&&!ob.hit)for(const r of field){
   if(r.status!=='racing'||r.inv>0||Math.abs(roadGap(ob.z,r.z))>=3.6||Math.abs(ob.lane-r.lane)>=barrierContact)continue;
   r.health=Math.max(0,r.health-16*mul);r.speed*=.65;r.inv=1.2;ob.hit=true;
   if(r.player){collisions++;feel.impact=1;feel.side=Math.sign(r.lane-ob.lane)||1;env.sfx(95,.14);}
  }
  recordPasses(field);for(const r of field)if(r.health<=0&&r.status==='racing')r.status='dnf';
  gateFlash=gateFlash>0?Math.max(0,gateFlash-dt):Math.min(0,gateFlash+dt);
  const pitch=between((previousSpeed-car.speed)/Math.max(.001,dt)/38,-1,1);feel.pitch+=(pitch-feel.pitch)*(1-Math.exp(-10*dt));
  score=Math.floor(progress*.28)+checkpointIndex*50+passes*90+Math.max(0,300-Math.floor((car.finishTime??elapsed)*2))-collisions*15;
  if(car.status==='dnf')racePhase='finishing';
  if(elapsed>=timeLimit){for(const r of field)if(r.status==='racing')r.status='dnf';settle();return;}
  if(field.every(r=>r.status!=='racing'))settle();
 }
 const g={w:640,h:800,finish:env.finish,
  start(){g._finished=false;window.BioGuardianArt?.preload([env.hero]);window.BioWorldArt?.preload('race');
   car={id:'player',player:true,type:'car',z:0,lane:0,steer:0,speed:0,health:100,inv:0,braking:false,status:'racing',finishTime:null,lapTimes:[],lastLapAt:0,overtakes:0,nitro:100,boost:false,boostCooldown:0,lateralVelocity:0,slip:0};
   traffic=[];progress=0;elapsed=0;t=0;score=0;collisions=0;nitro=100;checkpointIndex=0;gateFlash=0;passes=0;slipstream=false;racePhase='countdown';lights=3;debt=0;events=[];pairOrder=new Map();projectionBasis=null;sampleProgress=NaN;projectionSamples.clear();feel={pitch:0,impact:0,side:1};
   for(let n=0;n<2;n++)traffic.push({z:410+n*430,lane:(chapter+n)%2?.86:-.86,type:'barrier',speed:0,hit:false});
   for(let n=0;n<5;n++){const driver=drivers[n];traffic.push({id:'ai-'+n,name:driver.name,driver:{...driver},z:8+Math.floor(n/2)*8,lane:n%2?.60:-.60,gridLane:n%2?.60:-.60,steer:0,type:'car',speed:0,maxSpeed:driver.pace+6+(mul-1)*4+(chapter-1)*.3+rnd(-.4,.4),health:100,inv:0,color:['#f2b56e','#e9798f','#8ed8b7','#a9a2f0','#c1e5ed'][n],status:'racing',finishTime:null,lapTimes:[],lastLapAt:0,overtakes:0,targetLane:null,decision:0,nitro:100,boostTime:0,boostCooldown:2+n});}
   const field=racers();for(const r of field){const slot=gridOrder.indexOf(r.id);r.z=[24,20,16,12,8,0][slot];r.lane=slot%2?.6:-.6;r.gridLane=r.lane;}progress=car.z;
   for(let i=0;i<field.length;i++)for(let j=i+1;j<field.length;j++)pairOrder.set(field[i].id+'/'+field[j].id,field[i].z>field[j].z||field[i].z===field[j].z&&field[i].id.localeCompare(field[j].id)<0);
  },onResize(){},
  update(dt,input){if(g._finished||!Number.isFinite(dt)||dt<=0)return;debt+=Math.min(.25,dt);while(debt+1e-10>=1/120&&!g._finished){debt=Math.max(0,debt-1/120);raceStep(1/120,input);}},
  draw(ctx){const w=g.w,h=g.h,sector=Math.min(2,Math.floor((progress%lapLength)/400));drawRaceWorld(ctx,w,h);
   const displayScale=Math.max(.2,Number(env.renderScale)||1),small=Math.max(12,10.5/displayScale),speedFont=Math.max(26,15/displayScale),top=Math.max(37,speedFont+8),line=Math.max(20,small*1.18);
   // Mini-map samples the actual closed track, rather than an unrelated decorative oval.
   const mx=w-84,my=72;rect(ctx,w-150,14,138,123,'#062133db','#438493');ctx.beginPath();for(let n=0;n<=60;n++){const p=miniMapPoints[n],xx=mx+p.x*.24,yy=my+p.z*.24;n?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.strokeStyle='#70c0bf';ctx.lineWidth=3;ctx.stroke();
   for(const r of racers()){const dot=trackAt(r.z);orb(ctx,mx+dot.x*.24,my+dot.z*.24,r.player?4:3,r.player?'#fff0ac':r.color);}
   const finishPoint=miniMapPoints[0];rect(ctx,mx+finishPoint.x*.24-4,my+finishPoint.z*.24-2,8,4,'#fff');words(ctx,'FINISH',mx,126,Math.max(11,8/displayScale),'#c3f8e8','center');
   const watch=awareness(),gapText=(v,front)=>v?(front?jaText(env,'前車 ','前車 '):jaText(env,'後車 ','後車 '))+v.metres.toFixed(1)+'m'+(v.checkpointSeconds===null?'':' · '+jaText(env,'上個檢查點 ','前ゲート ')+v.checkpointSeconds.toFixed(2)+'s'):(front?jaText(env,'領先','先頭'):jaText(env,'最後一車','最後尾'));
   words(ctx,`${Math.round(car.speed*3.6)} km/h`,14,top,speedFont,'#9bf0dd');words(ctx,gapText(watch.ahead,true),14,top+line+4,small,'#f9d7a6');words(ctx,gapText(watch.behind,false),14,top+line*2+4,small,'#c3e5e3');words(ctx,jaText(env,models[env.hero].zh,models[env.hero].ja),14,top+line*3+4,small,'#e6d8ff');words(ctx,chapterNames[chapter-1],14,top+line*4+4,Math.max(10,9/displayScale),'#a3d6de');
   if(racePhase==='countdown'){
    for(let n=0;n<3;n++)orb(ctx,w/2+(n-1)*34,h*.28,12,n<Math.ceil(lights)?'#fa6677':'#374956');
    words(ctx,String(Math.ceil(lights)),w/2,h*.40,48,'#fff','center');words(ctx,jaText(env,'準備起跑 · 第','スタート準備 · グリッド')+' '+(gridOrder.indexOf('player')+1)+'/6',w/2,h*.46,16,'#d9f2ed','center');
   }else if(elapsed<.7)words(ctx,'GO!',w/2,h*.35,44,'#a7ffca','center');
   if(racePhase==='finishing')words(ctx,car.status==='dnf'?jaText(env,'車輛退賽 · 等待賽事結束','DNF · レース終了を待機'):jaText(env,'已完賽 · 等待對手完賽','FINISH · ライバルのゴールを待機'),w/2,h*.27,Math.max(12,w*.022),'#fff0ac','center');
   if(slipstream)words(ctx,'SLIPSTREAM',w/2,h*.21,15,'#a4f6df','center');if(gateFlash<0)words(ctx,jaText(env,'回到道路內通過檢查點','コースに戻ってゲートを通過'),w/2,h*.21,Math.max(11,w*.025),'#ffd1b6','center');
   if(racePhase==='racing'&&Math.abs(watch.curve)>.65)words(ctx,(watch.curve>0?'→ ':'← ')+(car.slip>.6?jaText(env,'抓地不足 · 煞車','グリップ低下 · 減速'):jaText(env,'彎道預告','カーブ予告')),w/2,h*(slipstream?.25:.21),Math.max(14,10/displayScale),'#ffd7a7','center');
   if(watch.threats.length)words(ctx,[...new Set(watch.threats.map(r=>r.side))].map(side=>side==='left'?'←':'→').join(' ')+jaText(env,' 後車接近',' 後方接近'),w-100,154,Math.max(11,9/displayScale),'#ffbaac','center');
   if(car.boostArmed===false)words(ctx,jaText(env,'放開氮氣再按','ブーストを離して再入力'),14,h-39,Math.max(10,9.5/displayScale),'#f9d7a6');
   bar(ctx,14,h-28,Math.min(160,w*.4),7,car.health/100,'#81e3c5');bar(ctx,14,h-15,Math.min(160,w*.4),5,nitro/100,'#6bc9ff');fighter(ctx,w-42,h-12,0,20,pal[env.hero],t,car.inv?'hurt':'idle',-1,env.hero);
  },
  hud(){return `<span>${jaText(env,'名次','順位')} <b>${position()}/6</b></span><span>LAP <b>${Math.min(laps,Math.floor(checkpointIndex/3)+1)}/${laps}</b> · GATE ${checkpointIndex}/${checkpointDistances.length}</span><span>TIME <b>${clockText(car.finishTime??elapsed)}</b></span><span>BOOST <b>${Math.floor(nitro)}%</b></span><span>${jaText(env,'超車','追い越し')} <b>${passes}</b></span>${env.cupPoints===null||env.cupPoints===undefined?'':`<span>CUP <b>${env.cupPoints}</b></span>`}`;},
  raceResult(){return {phase:racePhase,rank:position(),grid:gridOrder.slice(),status:car.status,totalTime:car.finishTime,bestLap:car.lapTimes.length?Math.min(...car.lapTimes):null,lapTimes:[...car.lapTimes],passes,events:events.filter(e=>e.by==='player'||e.against==='player').map(e=>({...e})),standings:classification()};},
  inspectRenderStats(){return {projectionSamples:projectionSamples.size,minimapSamples:miniMapPoints.length};},
  inspectAwareness:awareness,
  inspectVehicle:()=>({...models[env.hero],collisionWidth:vehicleWidth}),
  inspectRace(){return {grid:gridOrder.slice(),gridPosition:gridOrder.indexOf('player')+1,phase:racePhase,lights,rank:position(),lapTimes:[...car.lapTimes],standings:classification(),events:events.map(e=>({...e})),mapPositions:racers().map(r=>({id:r.id,...trackAt(r.z)})),feedback:{...feel},nitro,progress,checkpointIndex,checkpointTotal:checkpointDistances.length,nextGate:checkpointDistances[checkpointIndex]??null,lap:Math.min(laps,Math.floor(checkpointIndex/3)+1),chapter,trackName:chapterNames[chapter-1],sector:segmentNames[Math.min(2,Math.floor((progress%lapLength)/400))],car:{...car},traffic:traffic.map(x=>({...x})),elapsed,score,collisions,passes,slipstream,roadSample:project(40),roadGrade:trackAt(progress+18).y-trackAt(progress).y,playerScreen:project(0,car.lane),roadBend:trackAt(progress).bend,cornerAhead:cornerAt(progress,car.speed),roadPreview:Array.from({length:9},(_,i)=>({distance:i*12,bend:trackAt(progress+i*12).bend})),lateralForce,cruiseSpeed:82,safeSpeed:cornerSpeed(cornerAt(progress,car.speed)),finished:!!g._finished};}
 };if(env.testMode)g.testRaceState=({time=elapsed,energy=nitro,player={},rivals=[]}={})=>{elapsed=time;nitro=between(energy,0,100);car.nitro=nitro;racePhase='racing';lights=0;debt=0;Object.assign(car,player);progress=car.z;checkpointIndex=Math.min(checkpointDistances.length,Math.floor(progress/400));for(const patch of rivals){const r=traffic.find(o=>o.id===patch.id);if(r){Object.assign(r,patch);r.checkpointIndex=Math.max(0,Math.floor(r.z/400));}}pairOrder=new Map();const field=racers();for(let i=0;i<field.length;i++)for(let j=i+1;j<field.length;j++)pairOrder.set(field[i].id+'/'+field[j].id,field[i].z>field[j].z||field[i].z===field[j].z&&field[i].id.localeCompare(field[j].id)<0);};if(env.testMode)g.testRenderGeometry=()=>({strips:visibleStrips(),polygons:visibleStrips().map(s=>clippedPolygon([cameraPoint(s.d,-1),cameraPoint(s.d,1),cameraPoint(s.next,1),cameraPoint(s.next,-1)])),sceneryClearance:sceneryLane*roadHalf-sceneryUnit*1.02-roadHalf*1.15,tyre:project(0,car.lane)});if(env.testMode)g.testPlace=({distance=progress,lane=0,speed=0,obstacle=null,keepTraffic=false}={})=>{
  progress=distance;car.z=distance;car.lane=lane;car.speed=speed;car.inv=0;debt=0;racePhase='racing';lights=0;
  if(!keepTraffic){traffic=[];if(obstacle){const r={z:distance+(obstacle.ahead??0),lane:obstacle.lane??lane,type:obstacle.type??'barrier',speed:obstacle.speed??0,hit:false};if(r.type==='car')Object.assign(r,{id:'fixture',name:'FIXTURE',driver:{...drivers[0]},maxSpeed:r.speed,steer:0,health:100,inv:0,status:'racing',finishTime:null,lapTimes:[],lastLapAt:0,overtakes:0,decision:0,targetLane:r.lane,nitro:0,boostTime:0,boostCooldown:100,color:'#f2b56e'});traffic.push(r);}}
  pairOrder=new Map();const field=racers();for(let i=0;i<field.length;i++)for(let j=i+1;j<field.length;j++)pairOrder.set(field[i].id+'/'+field[j].id,field[i].z>field[j].z||field[i].z===field[j].z&&field[i].id.localeCompare(field[j].id)<0);
 };return g;
};
})();
