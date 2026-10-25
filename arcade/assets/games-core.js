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
function arena(ctx,w,h,t){back(ctx,w,h,'#071423',44);let horizon=h*.42;ctx.fillStyle='#0b2c41';for(let x=-10;x<w;x+=52){let size=30+((x*11)%80);ctx.fillRect(x,horizon-size,35,size);rect(ctx,x+11,horizon-size+9,3,3,'#62d2e955')}rect(ctx,0,horizon,w,h-horizon,'#122537');ctx.strokeStyle='#5ae4ec24';for(let j=0;j<9;j++){let y=horizon+j*j*(h-horizon)/64;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}for(let i=0;i<10;i++){ctx.beginPath();ctx.moveTo(w/2,horizon);ctx.lineTo(i*w/9,h);ctx.stroke()}}
// Procedural articulated fighter animation — independent limb motion / real damage and hurt-box logic.
function fighter(ctx,x,y,z,size,color,time,state='idle',dir=1,id=0,hp=1){const stride=state==='walk'?Math.sin(time*13)*.9:0,attack=state==='attack',hurt=state==='hurt',jump=state==='jump',phase=attack?.9:stride,scale=size/30;ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.scale(dir,1);ctx.globalAlpha=.18;orb(ctx,0,0,17,'#000');ctx.globalAlpha=1;ctx.translate(0,-z);
 ctx.strokeStyle='#111f30';ctx.lineWidth=8;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-7,-17);ctx.lineTo(-8+stride*8,-4);ctx.lineTo(-11+stride*11,-1);ctx.moveTo(7,-17);ctx.lineTo(7-stride*8,-7);ctx.lineTo(10-stride*9,-1);ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=4;ctx.stroke();
 ctx.save();ctx.rotate(hurt?-.23:attack?.15:Math.sin(time*3)*.03);ctx.fillStyle='#173446';ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-12,-44);ctx.lineTo(10,-44);ctx.lineTo(13,-18);ctx.lineTo(-12,-18);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle=color;ctx.fillRect(-4,-36,9,9);ctx.restore();
 ctx.strokeStyle='#0e2132';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(-13,-39);ctx.lineTo(-15+(attack?-12:stride*4),-24);ctx.moveTo(12,-37);ctx.lineTo(21+(attack?19:stride*4),-31+(attack?-10:0));ctx.stroke();ctx.lineWidth=5;ctx.strokeStyle=color;ctx.stroke();
 orb(ctx,0,-53,12,'#132c42');trace(ctx,0,-53,12,color);rect(ctx,-5,-56,12,4,id%2?'#dffaff':'#f1b8ca');if(id===0){ctx.beginPath();ctx.moveTo(-7,-65);ctx.lineTo(0,-72);ctx.lineTo(9,-64);ctx.fillStyle=color;ctx.fill()}else if(id===2){ctx.strokeStyle=color;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-9,-63);ctx.lineTo(-18,-67);ctx.moveTo(10,-63);ctx.lineTo(18,-67);ctx.stroke()}else if(id===3){ctx.beginPath();ctx.moveTo(8,-61);ctx.lineTo(24,-72);ctx.lineTo(19,-46);ctx.strokeStyle='#fff1bd';ctx.lineWidth=3;ctx.stroke()}
 if(attack){ctx.beginPath();ctx.arc(18,-29,28,-.8,.65);ctx.strokeStyle=color;ctx.lineWidth=4;ctx.stroke()}ctx.restore();}
function ends(g,win,score,note){if(g._finished)return;g._finished=true;g.finish(win,score,note)}
function cObj(x,y,rest={}){return {x,y,...rest}}
R.g01=env=>{
let p,enemies=[],bolts=[],effects=[],wave=1,spawn=0,spawnClock=0,elapsed=0,score=0,kills=0,t=0,button={},bossSpawned=false,impactStop=0;
const mode=env.difficulty==='expert'?1.65:env.difficulty==='hard'?1.3:1;
const health=[140,130,180,115,125,150,120];
function addEnemy(type='grunt'){
 const w=g.w,h=g.h;
 const e=cObj(w+35,between(h*.58+Math.random()*h*.3,h*.52,h*.87),{type,hp:(type==='boss'?520:type==='brute'?105:type==='ranged'?65:55)*mode,max:1,speed:type==='boss'?75:type==='brute'?47:type==='ranged'?64:80,hit:0,attack:0,tele:0,dir:-1,phase:0,attackKind:'',targetX:0,targetY:0});
 e.max=e.hp;if(type==='boss')e.x=w-80;enemies.push(e);
}
function getWave(n){wave=n;spawn=n===1?6:n===2?9:3;spawnClock=.65;bossSpawned=false;bolts=[];}
function sparks(x,y,col,n=8){for(let i=0;i<n;i++){const a=rnd(0,TAU),v=rnd(45,170);effects.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,r:rnd(1,3.6),life:rnd(.12,.35),color:col});}}
function wound(amt,source){if(p.inv>0||p.z>32||p.dash>0)return false;p.hp=Math.max(0,p.hp-amt);p.inv=.6;p.stun=.13;impactStop=.065;sparks(p.x,p.y-32,'#ff8298',12);env.sfx(125,.12);return true;}
function aimAt(target,source,speed,damage,col='#ed94f8'){
 let dx=target.x-source.x,dy=target.y-source.y,mag=Math.hypot(dx,dy)||1;
 bolts.push({x:source.x,y:source.y-28,vx:dx/mag*speed,vy:dy/mag*speed,r:7,life:3.0,damage,color:col});
}
function attack(){if(p.attackCool>0||p.stun>0)return;const combo=p.comboTimer>0?(p.combo%3)+1:1;p.combo=combo;p.comboTimer=.82;p.attack=.21;p.attackCool=[0,.26,.28,.34][combo];p.dir=p.lastDir||p.dir;
 const range=48+combo*14;let hits=0;
 for(const e of enemies){if(e.hp<=0)continue;const dx=e.x-p.x,dy=e.y-p.y;
  if(dx*p.dir>-18&&dx*p.dir<range&&Math.abs(dy)<38&&p.z<40){
   e.hp-=([0,17,24,37][combo])*(p.hero===3?1.35:p.hero===2?1.2:1);
   e.hit=.23;e.tele=0;e.attackKind='';e.x=between(e.x+p.dir*(10+combo*7),20,g.w+40);hits++;
   sparks(e.x,e.y-35,combo===3?'#fff0ab':'#8eefff',combo===3?13:7);
  }
 }
 if(hits){p.energy=Math.min(100,p.energy+hits*10);score+=hits*(5+combo*3);impactStop=combo===3?.09:.045;env.sfx(355+combo*95,.07)}else env.sfx(160,.025);
}
function skill(){if(p.energy<100||p.stun>0)return;p.energy=0;p.attack=.5;p.attackCool=.48;let hits=0;
 for(const e of enemies){if(e.hp<=0)continue;if(Math.hypot(e.x-p.x,(e.y-p.y)*2)<145){e.hp-=85*(p.hero===6?1.4:1);e.hit=.43;e.tele=0;e.x+=p.dir*34;hits++;}}
 bolts=bolts.filter(b=>Math.hypot(b.x-p.x,b.y+28-p.y)>165);
 if(p.hero===5)p.hp=Math.min(p.max,p.hp+30);
 if(p.hero===2)p.inv=Math.max(p.inv,1.1);
 p.energy=Math.min(100,p.energy+Math.max(0,hits-1)*3);
 effects.push({type:'ring',x:p.x,y:p.y-42,r:150,life:.45,color:pal[p.hero]});sparks(p.x,p.y-42,pal[p.hero],24);env.sfx(790,.21);
}
function jump(){if(p.z>0||p.vz>0||p.stun>0)return;p.vz=400;env.sfx(530,.05)}
function dodge(){if(p.dodge>0||p.stun>0)return;p.inv=.38;p.dodge=.9;p.dash=.19;p.dashDir=p.lastDir||1;env.sfx(660,.05)}
function moveEnemy(e,dt){
 e.hit=Math.max(0,e.hit-dt);e.attack=Math.max(0,e.attack-dt);
 const dist=Math.abs(e.x-p.x),lane=Math.abs(e.y-p.y);e.dir=p.x<e.x?-1:1;
 if(e.hit>0)return;
 if(e.tele>0){const old=e.tele;e.tele=Math.max(0,e.tele-dt);if(old>0&&e.tele===0){
   if(e.type==='boss'&&e.attackKind==='slam'){
    effects.push({type:'ring',x:e.targetX,y:e.targetY-8,r:60,life:.38,color:'#fd7895'});
    if(Math.hypot(p.x-e.targetX,(p.y-e.targetY)*1.5)<63)wound(27*mode,e);
   }else if(e.type==='boss'&&e.attackKind==='volley'){
    for(let i=-1;i<=1;i++){
     const target={x:p.x+i*28,y:p.y+i*20};aimAt(target,e,195,16*mode,'#ff6c9d');
    }
   }else if(e.type==='ranged')aimAt(p,e,215,12*mode);
   else if(dist<47&&lane<39)wound((e.type==='brute'?19:10)*mode,e);
   e.attackKind='';
  }
  return;
 }
 if(e.type==='boss'){
  e.phase+=dt;
  if(dist>67)e.x+=e.dir*e.speed*dt;
  if(lane>18)e.y+=(p.y>e.y?1:-1)*27*dt;
  if(e.attack<=0&&dist<235&&lane<100){
   e.attackKind=(dist<115&&e.phase%3<2)?'slam':'volley';
   e.tele=e.attackKind==='slam'?.76:1.0;e.attack=2.05;
   e.targetX=p.x;e.targetY=p.y;
  }
 }else if(e.type==='ranged'){
  if(dist>160)e.x+=e.dir*e.speed*dt;else if(dist<112)e.x-=e.dir*e.speed*.5*dt;
  if(lane>17)e.y+=(p.y>e.y?1:-1)*24*dt;
  if(e.attack<=0&&dist<270&&lane<75){e.tele=.57;e.attack=2.1;e.attackKind='bolt';}
 }else{
  if(dist>37)e.x+=e.dir*e.speed*dt;
  if(lane>7)e.y+=(p.y>e.y?1:-1)*e.speed*.45*dt;
  if(dist<47&&lane<38&&e.attack<=0){e.tele=e.type==='brute'?.53:.36;e.attack=e.type==='brute'?1.7:1.3;e.attackKind='melee';}
 }
}
const g={w:960,h:540,finish:env.finish,
 start(){g._finished=false;let w=g.w,h=g.h;p={hero:env.hero,x:w*.25,y:h*.75,z:0,vz:0,dir:1,lastDir:1,hp:health[env.hero],max:health[env.hero],energy:38,combo:0,comboTimer:0,attack:0,attackCool:0,dodge:0,dash:0,dashDir:1,inv:0,stun:0};enemies=[];bolts=[];effects=[];t=0;elapsed=0;score=0;kills=0;button={};impactStop=0;getWave(1);},
 onResize(ow,oh,w,h){if(!p)return;const sx=w/(ow||w),sy=h/(oh||h);p.x*=sx;p.y*=sy;for(const group of [enemies,bolts,effects])for(const e of group){e.x*=sx;e.y*=sy;if(e.targetX)e.targetX*=sx;if(e.targetY)e.targetY*=sy;}},
 update(dt,input){if(g._finished)return;
  dt=Math.max(0,Math.min(dt,.045));t+=dt;elapsed+=dt;
  const keys=['attack','attackCool','comboTimer','dodge','dash','inv','stun'];for(const key of keys)p[key]=Math.max(0,p[key]-dt);
  if(impactStop>0){impactStop=Math.max(0,impactStop-dt);return;}
  const vx=(input.right?1:0)-(input.left?1:0),vy=(input.down?1:0)-(input.up?1:0);
  if(vx){p.dir=vx>0?1:-1;p.lastDir=p.dir;}
  const rising=(key,pressed)=>{if(pressed&&!button[key]){button[key]=true;return true}if(!pressed)button[key]=false;return false};
  if(rising('jump',input.jump))jump();if(rising('dodge',input.dodge))dodge();if(rising('skill',input.skill))skill();if(input.fire&&p.attackCool<=0)attack();
  const speed=env.hero===3?190:env.hero===2?125:163;
  p.x=between(p.x+(p.dash>0?p.dashDir*speed*2.5:vx*speed)*dt,24,g.w-24);
  p.y=between(p.y+vy*speed*.65*dt,g.h*.55,g.h*.88);
  p.z=Math.max(0,p.z+p.vz*dt);p.vz-=920*dt;if(p.z===0)p.vz=0;
  spawnClock-=dt;if(spawn>0&&spawnClock<=0){addEnemy(wave===1?'grunt':wave===2?pick(['grunt','ranged','brute']):pick(['brute','ranged']));spawn--;spawnClock=wave===1?.85:.75;}
  if(wave===3&&spawn===0&&!bossSpawned){addEnemy('boss');bossSpawned=true;}
  for(const e of enemies){if(e.hp>0)moveEnemy(e,dt);}
  for(let i=bolts.length-1;i>=0;i--){const b=bolts[i];b.life-=dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
   if(b.life<=0||b.x<-25||b.x>g.w+25||b.y<0||b.y>g.h){bolts.splice(i,1);continue;}
   if(Math.hypot(b.x-p.x,(b.y+28-p.y)*1.3)<b.r+14){wound(b.damage,b);bolts.splice(i,1);}
  }
  for(const f of effects){f.life-=dt;if(f.vx){f.x+=f.vx*dt;f.y+=f.vy*dt;}}effects=effects.filter(f=>f.life>0);
  enemies=enemies.filter(e=>{if(e.hp>0)return true;score+=e.type==='boss'?1200:e.type==='brute'?80:40;kills++;p.energy=Math.min(100,p.energy+6);return false});
  if(p.hp<=0){ends(g,false,score,`WAVE ${wave} · ${kills} KO`);return;}
  if(spawn===0&&enemies.length===0){if(wave===3){ends(g,true,score+Math.floor(p.hp)*8,`${kills} KO`);return;}getWave(++wave);p.hp=Math.min(p.max,p.hp+20);}
 },
 draw(ctx){const w=g.w,h=g.h;arena(ctx,w,h,t);
  words(ctx,`SECTOR 0${wave} / CORE DEFENSE`,18,31,13,'#89eff7');
  for(const b of bolts){ctx.strokeStyle=b.color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(b.x-b.vx*.04,b.y-b.vy*.04);ctx.lineTo(b.x,b.y);ctx.stroke();orb(ctx,b.x,b.y,b.r,b.color);}
  for(const e of enemies){if(e.tele>0){if(e.type==='boss'&&e.attackKind==='slam'){
     ctx.strokeStyle='#ff7795';ctx.lineWidth=3;ctx.setLineDash([10,8]);ctx.beginPath();ctx.ellipse(e.targetX,e.targetY-8,58,37,0,0,TAU);ctx.stroke();ctx.setLineDash([]);
   }else{ctx.strokeStyle='#ff8399';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(e.x,e.y-30);ctx.lineTo(e.type==='boss'?p.x:e.x+e.dir*85,e.type==='boss'?p.y-30:e.y-30);ctx.stroke();}}}
  const sorted=[...enemies,{...p,type:'hero'}].sort((a,b)=>a.y-b.y);
  for(const e of sorted){if(e.type==='hero'){if(p.inv>.05&&Math.floor(t*16)%2===0)continue;fighter(ctx,p.x,p.y,p.z,between(Math.min(w,h)*.095,34,55),pal[p.hero],t,p.stun?'hurt':p.attack?'attack':p.z?'jump':'walk',p.dir,p.hero);if(p.dash>0)trace(ctx,p.x,p.y-20,35,pal[p.hero]);}
   else{const col=e.type==='boss'?'#ff3b80':e.type==='brute'?'#fc995a':e.type==='ranged'?'#e09cff':'#ff6b8a';fighter(ctx,e.x,e.y,0,e.type==='boss'?between(Math.min(w,h)*.15,67,87):e.type==='brute'?between(Math.min(w,h)*.115,45,66):between(Math.min(w,h)*.082,31,48),e.hit?'#fff':col,t,e.hit?'hurt':e.tele?'attack':'walk',e.dir,1);bar(ctx,e.x-26,e.y-68,e.type==='boss'?66:52,4,e.hp/e.max,'#fa748d');}}
  for(const f of effects){ctx.globalAlpha=Math.min(1,f.life/.2);if(f.type==='ring'){ctx.strokeStyle=f.color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(f.x,f.y,f.r*(1-f.life/.6),0,TAU);ctx.stroke();}else orb(ctx,f.x,f.y,f.r,f.color);}ctx.globalAlpha=1;
  words(ctx,`HERO  ${env.I.hero[env.hero]}`,16,h-18,12);bar(ctx,16,h-44,Math.min(200,w*.48),10,p.hp/p.max,'#72e9ca');bar(ctx,16,h-55,Math.min(200,w*.48),5,p.energy/100,'#b4a2ff');
 },
 hud(){return `<span>WAVE <b>${wave}/3</b></span><span>HP <b>${Math.ceil(p?.hp||0)}</b></span><span>COMBO <b>${p?.combo||0}</b></span><span>ENERGY <b>${Math.round(p?.energy||0)}%</b></span><span>SCORE <b>${score}</b></span>`;}
};
 g.inspectCombat=()=>({wave,spawn,score,kills,player:{...p},enemies:enemies.map(e=>({...e})),projectiles:bolts.map(b=>({...b})),elapsed,finished:!!g._finished});
 if(env.testMode)g.testSetup=({kind='grunt',dx=65,hp=null,waveNumber=null,remaining=null}={})=>{if(waveNumber!==null)wave=waveNumber;if(remaining!==null)spawn=remaining;addEnemy(kind);const e=enemies[enemies.length-1];e.x=p.x+dx;e.y=p.y;if(hp!==null){e.hp=hp;e.max=Math.max(hp,1);}if(kind==='boss')bossSpawned=true;return e;};
 return g;
};
R.g03=env=>{
let p=null,platforms=[],camera=0,depth=0,level=0,t=0,score=0,button={},goal=1700,mult=env.difficulty==='expert'?1.35:env.difficulty==='hard'?1.18:1,spawny=0,crush=0;
const g={w:960,h:540,finish:env.finish,start(){g._finished=false;depth=0;level=0;t=0;score=0;button={};goal=1700;const w=g.w,h=g.h;p={x:w*.5,y:90,vx:0,vy:0,r:13,hp:3,ground:false,inv:0,drop:0};platforms=[{x:w*.5-65,y:135,w:130,type:'safe',hp:99}];spawny=230;while(spawny<2000)makePlatform();camera=0;crush=0;},onResize(ow,oh,w,h){const kx=w/(ow||w);if(p){p.x=between(p.x*kx,16,w-16);}for(const f of platforms){f.w=Math.min(w-28,Math.max(40,f.w*kx));f.x=between(f.x*kx,14,Math.max(14,w-f.w-14));}if(p)camera=Math.max(0,p.y-h*.48);},update(dt,input){if(g._finished)return;t+=dt;p.inv=Math.max(0,p.inv-dt);p.drop=Math.max(0,p.drop-dt);if(input.down&&p.ground){p.drop=.23;p.vy=Math.max(85,p.vy);p.ground=false;}const width=g.w;if(input.left)p.vx-=850*dt;if(input.right)p.vx+=850*dt;p.vx*=Math.exp(-5*dt);p.vx=between(p.vx,-260,260);if((input.jump||input.fire)&&p.ground&&!button.jump){p.vy=-275;p.ground=false;env.sfx(690,.07)}button.jump=!!(input.jump||input.fire);
 const prevY=p.y;p.vy+=650*mult*dt;p.y+=p.vy*dt;p.x=between(p.x+p.vx*dt,16,width-16);p.ground=false;for(const f of platforms){if(f.broken)continue;const shiftedX=f.x+(f.type==='moving'?Math.sin(t*1.5+f.y*.02)*26:0);if(p.drop<=0&&p.vy>=0&&prevY+p.r<=f.y+8&&p.y+p.r>=f.y-1&&p.x+p.r>shiftedX&&p.x-p.r<shiftedX+f.w){p.y=f.y-p.r;p.vy=0;p.ground=true;if(f.type==='trap'&&p.inv<=0){p.hp--;p.inv=1;env.sfx(130,.16)}if(f.type==='fragile'){f.hp-=dt*5;if(f.hp<=0)f.broken=true;}}}
 if(p.y-camera>g.h*.48)camera=p.y-g.h*.48;depth=Math.max(depth,Math.floor(p.y));crush=Math.max(crush,(t*17*mult));if(p.y<camera+crush-40||p.y>camera+g.h+60||p.hp<=0){ends(g,false,score,`${Math.floor(depth)} m`);return;}
 if(depth>=goal){ends(g,true,Math.floor(depth+score),`${Math.floor(depth)} m`);return;}
 while(spawny<camera+g.h+360)makePlatform();platforms=platforms.filter(x=>x.y>=camera-100);score=Math.floor(depth*.6);},draw(ctx){const w=g.w,h=g.h;back(ctx,w,h,'#081a2a',45);ctx.fillStyle='#193249';ctx.fillRect(0,0,14,h);ctx.fillRect(w-14,0,14,h);for(const f of platforms){const y=f.y-camera;if(y<-25||y>h+30||f.broken)continue;const xx=f.x+(f.type==='moving'?Math.sin(t*1.5+f.y*.02)*26:0);rect(ctx,xx,y,f.w,12,f.type==='trap'?'#ad506c':f.type==='fragile'?'#c39d5d':f.type==='moving'?'#68a9db':'#3b8192');rect(ctx,xx+2,y+2,f.w-4,3,f.type==='trap'?'#f59aa8':'#acf6ee');if(f.type==='trap')for(let s=0;s<3;s++){ctx.beginPath();ctx.moveTo(xx+s*f.w/3+7,y);ctx.lineTo(xx+s*f.w/3+17,y-13);ctx.lineTo(xx+s*f.w/3+26,y);ctx.fillStyle='#f2768c';ctx.fill();}}
 const posY=p.y-camera;ctx.save();if(p.inv>.1&&Math.floor(t*15)%2)ctx.globalAlpha=.45;orb(ctx,p.x,posY,13,pal[env.hero]);trace(ctx,p.x,posY,16,'#e7faff');ctx.beginPath();ctx.moveTo(p.x-5,posY-3);ctx.lineTo(p.x+5,posY-3);ctx.strokeStyle='#091a29';ctx.lineWidth=3;ctx.stroke();ctx.restore();const crushY=crush-camera;rect(ctx,0,0,w,Math.max(0,crushY),'#a62f4d35');if(crushY>0)rect(ctx,0,Math.max(0,crushY-5),w,5,'#f96972');words(ctx,`DEPTH  ${Math.floor(depth)} / ${Math.floor(goal)} m`,16,34,15);words(ctx,`LIVES  ${p.hp}`,16,57,13,p.hp===1?'#ff7b8d':'#a0eddc');words(ctx,`SAFE PLATFORM / TRAP / MOVING`,16,h-15,10,'#92c3d0');},hud(){return `<span>DEPTH <b>${Math.floor(depth)} m</b></span><span>LIFE <b>${p.hp}</b></span><span>GOAL <b>${Math.floor(goal)} m</b></span>`;}};
 g.debugGeometry=()=>({player:{...p},platforms:platforms.map(f=>({...f})),goal,depth,camera});
 function makePlatform(){const w=g.w,y=spawny;const last=platforms[platforms.length-1];const pw=Math.max(85,Math.min(160,w*.31));let x=between((last?last.x:w/2)+rnd(-85,85),18,w-pw-18);let type=pick(['safe','safe','fragile','moving','trap']);platforms.push({x,y,w:pw,type,hp:type==='fragile'?.45:99});spawny+=rnd(76,104);}return g;};
R.g04=env=>{
let balls=[],targets=[],bumpers=[],shots=12,angle=0,power=65,score=0,hits=0,buttons={},t=0,walls=0,physicsDebt=0,mult=env.difficulty==='expert'?1.25:env.difficulty==='hard'?1.08:1;
const g={w:960,h:540,finish:env.finish,start(){g._finished=false;t=0;walls=0;buttons={};const w=g.w,h=g.h,unit=Math.min(w,h);const m=Math.max(12,unit*.055);const points=[[.22,.22],[.52,.20],[.78,.26],[.32,.43],[.66,.45],[.5,.63],[.82,.66]];targets=points.map((xy,i)=>({x:w*xy[0],y:h*xy[1],r:Math.max(11,unit*.035),hp:i===6?2:1}));bumpers=[[.42,.33],[.18,.52],[.72,.59]].map((xy,i)=>({x:w*xy[0],y:h*xy[1],r:Math.max(15,unit*.041)}));shots=env.difficulty==='expert'?9:env.difficulty==='hard'?11:14;angle=0;power=65;balls=[];score=0;hits=0;physicsDebt=0;},onResize(ow,oh,w,h){let sx=w/(ow||w),sy=h/(oh||h);for(const q of [...targets,...bumpers,...balls]){q.x*=sx;q.y*=sy;q.r=Math.max(7,q.r*Math.min(sx,sy));}},update(dt,input){if(g._finished)return;t+=dt;let left=input.left,right=input.right,up=input.up,down=input.down;angle=between(angle+(right?-1:left?1:0)*dt*1.35,-1.15,1.15);power=between(power+(up?45:down?-45:0)*dt,35,100);if(input.pointer.down){const dx=input.pointer.x-g.w*.5,dy=g.h-30-input.pointer.y;angle=between(Math.atan2(-dx,Math.max(24,dy)),-1.15,1.15);}
 if((input.fire||input.pointer.down)&&!buttons.fire&&shots>0&&balls.length===0){shoot();}buttons.fire=!!(input.fire||input.pointer.down);
 const w=g.w,h=g.h;physicsDebt=Math.min(.10,physicsDebt+Math.max(0,Math.min(dt,.10)));let fixedSteps=0;while(physicsDebt>=1/120&&fixedSteps++<12){const step=1/120;physicsDebt-=step;for(const b of balls){b.t-=step;{let s=step;b.x+=b.vx*s;b.y+=b.vy*s;b.vx*=1-.12*s;b.vy*=1-.12*s;if(b.x<b.r+8){b.x=b.r+8;b.vx=Math.abs(b.vx)*.91;walls++}if(b.x>w-b.r-8){b.x=w-b.r-8;b.vx=-Math.abs(b.vx)*.91;walls++}if(b.y<b.r+8){b.y=b.r+8;b.vy=Math.abs(b.vy)*.91}if(b.y>h-b.r-4){b.y=h-b.r-4;b.vy=-Math.abs(b.vy)*.7;b.vx*=.96;}
 for(const q of bumpers){collide(b,q,1.05)}for(const q of targets){if(q.hp>0&&Math.hypot(b.x-q.x,b.y-q.y)<b.r+q.r){q.hp--;hits++;score+=q.hp===0?180:60;collide(b,q,.95);env.sfx(650,.09);}}}}
 }
 balls=balls.filter(b=>b.t>0&&Math.hypot(b.vx,b.vy)>15);if(targets.every(q=>q.hp<=0)){ends(g,true,score+shots*70,`${hits} TARGETS`);return;}if(shots===0&&balls.length===0)ends(g,false,score,`${hits} TARGETS`);},draw(ctx){const w=g.w,h=g.h;back(ctx,w,h,'#0b1733',49);ctx.strokeStyle='#4782a5';ctx.lineWidth=6;ctx.strokeRect(7,7,w-14,h-14);for(const q of bumpers){orb(ctx,q.x,q.y,q.r,'#485f8c');trace(ctx,q.x,q.y,q.r,'#a6bfff');orb(ctx,q.x,q.y,q.r*.4,'#79b2fc');}for(const q of targets){if(q.hp<=0)continue;orb(ctx,q.x,q.y,q.r,'#11374e');trace(ctx,q.x,q.y,q.r,'#59e8e5');orb(ctx,q.x,q.y,Math.max(4,q.r*.33),'#9ffff3')}for(const b of balls){orb(ctx,b.x,b.y,b.r,'#fbe9ad');trace(ctx,b.x,b.y,b.r+3,'#d8b88a');}const x=w*.5,y=h-30;const a=angle;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-Math.sin(a)*Math.min(h*.4,power*2.4),y-Math.cos(a)*Math.min(h*.4,power*2.4));ctx.setLineDash([7,6]);ctx.strokeStyle='#80eafa99';ctx.lineWidth=2;ctx.stroke();ctx.setLineDash([]);ctx.save();ctx.translate(x,y);ctx.rotate(-a);rect(ctx,-12,-21,24,39,'#286987','#7be2f0');ctx.restore();words(ctx,`ANGLE ${Math.round(angle*180/pi)}° · POWER ${Math.floor(power)}%`,15,h-13,12);},hud(){return `<span>SHOTS <b>${shots}</b></span><span>TARGETS <b>${targets.filter(x=>x.hp>0).length}</b></span><span>POWER <b>${Math.floor(power)}%</b></span><span>SCORE <b>${score}</b></span>`;}};
 function collide(b,q,restitution){const dx=b.x-q.x,dy=b.y-q.y,d=Math.hypot(dx,dy),R=b.r+q.r;if(d>=R||d<=.001)return;const nx=dx/d,ny=dy/d,proj=b.vx*nx+b.vy*ny;b.x=q.x+nx*(R+1);b.y=q.y+ny*(R+1);if(proj<0){b.vx-=2*proj*nx*restitution;b.vy-=2*proj*ny*restitution;}}function shoot(){shots--;const speed=(350+power*3.4)*Math.min(1,Math.max(.75,g.h/500));balls.push({x:g.w*.5,y:g.h-32,r:Math.max(6,Math.min(g.w,g.h)*.014),vx:-Math.sin(angle)*speed,vy:-Math.cos(angle)*speed,t:8});env.sfx(450,.13);}g.debugPhysics=()=>({balls:balls.map(q=>({...q})),targets:targets.map(q=>({...q})),shots,hits,score,physicsDebt});return g;};
R.g05=env=>{
let m=env.mode==='pong'?'pong':'volley',player,ai,ball,points=[0,0],t=0,serve=0,locked=false,rally=0,rallyClock=0,volleyRallyLimit=18,button={},limit=m==='pong'?7:5,score=0,variant=env.difficulty==='expert'?1.2:env.difficulty==='hard'?1.08:1;
const g={w:960,h:540,finish:env.finish,start(){g._finished=false;points=[0,0];t=0;score=0;locked=false;reset()},onResize(ow,oh,w,h){const kx=w/(ow||w),ky=h/(oh||h);if(player){player.x*=kx;player.y*=ky;ai.x*=kx;ai.y*=ky;ball.x*=kx;ball.y*=ky;}},update(dt,input){if(g._finished)return;t+=dt;serve=Math.max(0,serve-dt);if(m==='pong')updatePong(dt,input);else updateVolley(dt,input);if(points[0]>=limit||points[1]>=limit){let win=points[0]>points[1];ends(g,win,points[0]*120+rally*4,`${points[0]} – ${points[1]}`);}},draw(ctx){const w=g.w,h=g.h;back(ctx,w,h,m==='pong'?'#071c2a':'#102d40',36);if(m==='pong'){ctx.strokeStyle='#8aeef399';ctx.lineWidth=3;ctx.setLineDash([9,9]);ctx.beginPath();ctx.moveTo(w/2,20);ctx.lineTo(w/2,h-20);ctx.stroke();ctx.setLineDash([]);rect(ctx,20,player.y-39,11,78,'#66d8ef');rect(ctx,w-31,ai.y-39,11,78,'#f1b67a');orb(ctx,ball.x,ball.y,Math.max(6,w*.009),'#eaffff');}else{const ground=h*.86;rect(ctx,0,ground,w,h-ground,'#173849');ctx.fillStyle='#2a4d60';ctx.fillRect(0,ground+9,w,4);rect(ctx,w/2-3,h*.43,6,ground-h*.43,'#c5e5ed');ctx.strokeStyle='#e1f4fe';ctx.lineWidth=2;ctx.strokeRect(w/2-10,h*.43,20,ground-h*.43);orb(ctx,player.x,player.y,Math.max(14,Math.min(w,h)*.04),'#66e0f0');orb(ctx,ai.x,ai.y,Math.max(14,Math.min(w,h)*.04),'#efa96c');orb(ctx,ball.x,ball.y,Math.max(9,Math.min(w,h)*.025),'#f8f3c0');ctx.beginPath();ctx.arc(ball.x-4,ball.y-3,3,0,TAU);ctx.strokeStyle='#e9a361';ctx.stroke();}words(ctx,`${points[0]}    :    ${points[1]}`,w/2,37,24,'#ebfcff','center');words(ctx,m==='pong'?'TABLE TENNIS':'ENERGY VOLLEYBALL',15,h-17,12,'#8de4eb');},hud(){return `<span>${m==='pong'?'PONG':'VOLLEY'}</span><span>YOU <b>${points[0]}</b></span><span>AI <b>${points[1]}</b></span><span>FIRST TO <b>${limit}</b></span>${m==='volley'?`<span>RALLY <b>${Math.max(0,Math.ceil(volleyRallyLimit-rallyClock))}s</b></span>`:''}`;}};
 function reset(){rallyClock=0;const w=g.w,h=g.h;player={x:m==='pong'?26:w*.2,y:m==='pong'?h/2:h*.86-18,vy:0,ground:true};ai={x:m==='pong'?w-26:w*.8,y:m==='pong'?h/2:h*.86-18,vy:0,ground:true};ball={x:w/2,y:h*.38,vx:m==='pong'?210:(Math.random()<.5?-100:100),vy:m==='pong'?rnd(-100,100):-155};serve=1.05;button={};rally=0;}
 function scorePoint(side){points[side]++;rally=0;env.sfx(side===0?680:180,.14);reset();}
 function updatePong(dt,input){const w=g.w,h=g.h;const speed=h*.75;if(input.up||input.left)player.y-=speed*dt;if(input.down||input.right)player.y+=speed*dt;player.y=between(player.y,50,h-50);ai.y+=between(ball.y-ai.y,-h*.42*dt*variant,h*.42*dt*variant);ai.y=between(ai.y,50,h-50);if(serve)return;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;if(ball.y<12||ball.y>h-12){ball.vy*=-1;ball.y=between(ball.y,12,h-12);env.sfx(620,.035)}const r=Math.max(6,w*.009);if(ball.vx<0&&ball.x<37&&ball.x>13&&Math.abs(ball.y-player.y)<42+r){ball.vx=Math.abs(ball.vx)*1.08;ball.vy=(ball.y-player.y)*5.2+(input.fire?rnd(-40,40):0);rally++;env.sfx(420,.06)}if(ball.vx>0&&ball.x>w-37&&ball.x<w-13&&Math.abs(ball.y-ai.y)<42+r){ball.vx=-Math.abs(ball.vx)*1.06;ball.vy=(ball.y-ai.y)*4.5;rally++;env.sfx(410,.06)}if(ball.x<-15)scorePoint(1);if(ball.x>w+15)scorePoint(0);}
 function updateVolley(dt,input){const w=g.w,h=g.h,ground=h*.86-18,r=Math.max(9,Math.min(w,h)*.025);if(input.left)player.x-=w*.65*dt;if(input.right)player.x+=w*.65*dt;player.x=between(player.x,19,w/2-20);const targetX=between(ball.x,w/2+22,w-22);ai.x+=between(targetX-ai.x,-w*.44*dt*variant,w*.44*dt*variant);if((input.jump||input.up)&&player.ground&&!button.jump){player.vy=-h*.8;player.ground=false;}button.jump=!!(input.jump||input.up);player.vy+=h*2.4*dt;player.y+=player.vy*dt;if(player.y>=ground){player.y=ground;player.vy=0;player.ground=true;}let shouldAIJump=ball.x>w*.53&&ball.y<h*.72&&ball.vy>0&&Math.abs(ball.x-ai.x)<w*.17;if(shouldAIJump&&ai.ground){ai.vy=-h*.75;ai.ground=false}ai.vy+=h*2.4*dt;ai.y+=ai.vy*dt;if(ai.y>=ground){ai.y=ground;ai.vy=0;ai.ground=true;}
 if(serve)return;rallyClock+=dt;if(rallyClock>=volleyRallyLimit){scorePoint(ball.x>=w/2?0:1);return;}ball.vy+=h*1.18*dt;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;ball.vx*=1-.04*dt;if(ball.x<r||ball.x>w-r){ball.vx*=-.9;ball.x=between(ball.x,r,w-r)}if(ball.x+r>w/2-3&&ball.x-r<w/2+3&&ball.y>h*.43&&ball.y<h*.86){ball.vx*=-.85;ball.x+=ball.vx*dt;}if(ball.y<r){ball.vy=Math.abs(ball.vy)}if(Math.hypot(ball.x-player.x,ball.y-player.y)<r+21&&((input.fire&&!button.fire)||ball.vy>0)){ball.vx=(w*.52)+(input.left?-w*.14:input.right?w*.15:0);ball.vy=-(input.fire?h*.95:h*.74);rally++;env.sfx(600,.07);}button.fire=!!input.fire;if(Math.hypot(ball.x-ai.x,ball.y-ai.y)<r+20){ball.vx=-w*.45*variant;ball.vy=-h*(.65+Math.random()*.2);rally++;env.sfx(350,.06)}if(ball.y>=ground+r){scorePoint(ball.x>w/2?0:1);}}
 return g;};
R.g06=env=>{
let car,traffic=[],t=0,progress=0,timeLimit=110,elapsed=0,goal=3600,laps=3,score=0,collisions=0,nitro=100,wind=0,button={},type=env.hero,checkpointIndex=0,gateFlash=0;
const checkpointDistances=Array.from({length:9},(_,i)=>(i+1)*400),segmentNames=['SKYWAY','GREEN TUNNEL','ENERGY CORE'];
const mul=env.difficulty==='expert'?1.3:env.difficulty==='hard'?1.15:1;
const g={w:960,h:540,finish:env.finish,start(){g._finished=false;car={lane:0,steer:0,speed:0,health:100,inv:0};traffic=[];progress=0;elapsed=0;t=0;score=0;collisions=0;nitro=100;checkpointIndex=0;gateFlash=0;for(let n=0;n<32;n++)traffic.push({z:180+n*113+rnd(-15,15),lane:pick([-.7,-.35,0,.35,.7]),type:n%5?'barrier':'car',hit:false});},onResize(){},update(dt,input){if(g._finished)return;t+=dt;elapsed+=dt;car.inv=Math.max(0,car.inv-dt);let accelerating=input.up||(!input.down&&!input.left&&!input.right),braking=input.down;let nitrous=input.fire||input.skill;let desired=accelerating?(nitrous&&nitro>1?102:78):braking?17:60;let gain=car.speed<desired?55:65;car.speed+=between(desired-car.speed,-gain*dt,gain*dt);if(nitrous&&nitro>0){nitro=Math.max(0,nitro-30*dt)}else nitro=Math.min(100,nitro+8*dt);const sector=Math.min(2,Math.floor((progress%1200)/400));const bend=Math.sin(progress/200)*.12+(sector===0?.16:sector===1?-.22:.10);const turn=(input.right?1:0)-(input.left?1:0);car.lane=between(car.lane+(turn*.83*dt*(.8+car.speed/120))-bend*.13*dt,-1.25,1.25);if(Math.abs(car.lane)>1.06&&car.speed>25){car.speed=Math.max(20,car.speed-44*dt);car.health=Math.max(0,car.health-3*dt)}const nextProgress=progress+car.speed*dt*.68;
 const nextGate=checkpointDistances[checkpointIndex];
 if(nextGate!==undefined&&nextProgress>=nextGate){
  if(Math.abs(car.lane)<=.93){progress=nextProgress;checkpointIndex++;gateFlash=.65;env.sfx(820,.08);}
  else{progress=Math.min(nextProgress,nextGate-.01);car.speed=Math.min(car.speed,26);gateFlash=-.65;}
 }else progress=nextProgress;
 gateFlash=gateFlash>0?Math.max(0,gateFlash-dt):Math.min(0,gateFlash+dt);
 score=Math.floor(progress*.28)+checkpointIndex*50+Math.max(0,300-Math.floor(elapsed*2))-collisions*50;
 for(const ob of traffic){if(!ob.hit&&ob.z-progress<22&&ob.z-progress>-24&&Math.abs(ob.lane-car.lane)<.27&&car.inv<=0){ob.hit=true;collisions++;car.health-=(ob.type==='car'?32:22)*mul;car.speed*=.58;car.inv=1.2;env.sfx(95,.17)}}if(car.health<=0){ends(g,false,score,'VEHICLE DAMAGED');return;}if(elapsed>=timeLimit){ends(g,false,score,'TIME OUT');return;}if(progress>=goal&&checkpointIndex===checkpointDistances.length){ends(g,true,score+Math.floor(car.health)*5,`${Math.floor(elapsed)} s`);}},draw(ctx){const w=g.w,h=g.h;back(ctx,w,h,'#071424',75);const horizon=h*.36;const segment=Math.min(2,Math.floor((progress%1200)/400));ctx.fillStyle=['#0e3448','#1a4150','#1e304d'][segment];ctx.fillRect(0,horizon,w,h-horizon);for(let x=0;x<w;x+=32){const height=20+Math.abs(Math.sin(x*.17))*105;rect(ctx,x,horizon-height,23,height,'#11334b');for(let y=horizon-height+10;y<horizon-5;y+=17)rect(ctx,x+9,y,4,4,'#48bed455');}
 let curve=(Math.sin(progress/200)*.68+(segment===0?.7:segment===1?-.9:.45))*w*.105;const road=(v)=>{const scale=v*v;let y=horizon+scale*(h-horizon),width=24+v*w*.48,center=w*.5+curve*(1-v);return {y,width,center,scale};};ctx.beginPath();const near=road(1),far=road(0);ctx.moveTo(far.center-far.width,far.y);ctx.lineTo(near.center-near.width,near.y);ctx.lineTo(near.center+near.width,near.y);ctx.lineTo(far.center+far.width,far.y);ctx.closePath();ctx.fillStyle='#22333b';ctx.fill();for(let i=0;i<25;i++){const v=i/25,a=road(v),b=road(Math.min(1,v+.018));const stripe=Math.floor((progress/24+i*4)/2)%2;if(stripe===0){const x=a.center;rect(ctx,x-2,a.y,4,Math.max(2,b.y-a.y),'#8ec6c0aa');}const width=a.width;rect(ctx,a.center-width,a.y,Math.max(1,v*4),Math.max(2,(h-horizon)/25),'#fbd5a0');rect(ctx,a.center+width-2,a.y,Math.max(1,v*4),Math.max(2,(h-horizon)/25),'#fbd5a0');}
 for(const o of traffic){const dist=o.z-progress;if(dist<5||dist>680)continue;const v=1-dist/690,a=road(v),size=9+v*39;let x=a.center+o.lane*a.width*.75,y=a.y-size*.95;ctx.fillStyle=o.type==='car'?'#ff8d96':'#ffd38c';ctx.fillRect(x-size*.55,y,size*1.1,size*.9);ctx.fillStyle='#153447';ctx.fillRect(x-size*.27,y+5,size*.54,size*.15);}
 const gateDistance=checkpointDistances[checkpointIndex]-progress;
 if(gateDistance>0&&gateDistance<450){const v=between(1-gateDistance/460,.05,.98),line=road(v);ctx.strokeStyle=gateFlash<0?'#ff7f91':'#71e7ee';ctx.lineWidth=3+v*4;ctx.beginPath();ctx.moveTo(line.center-line.width*.9,line.y);ctx.lineTo(line.center+line.width*.9,line.y);ctx.stroke();}
 const carX=w*.5+car.lane*w*.28,carY=h*.81,cw=Math.min(64,w*.16),ch=Math.min(90,h*.21);ctx.save();ctx.translate(carX,carY);if(car.inv&&Math.floor(t*13)%2)ctx.globalAlpha=.45;ctx.fillStyle=pal[env.hero];ctx.beginPath();ctx.moveTo(0,-ch*.62);ctx.lineTo(cw*.35,-ch*.36);ctx.lineTo(cw*.48,ch*.43);ctx.lineTo(-cw*.48,ch*.43);ctx.lineTo(-cw*.35,-ch*.36);ctx.closePath();ctx.fill();ctx.fillStyle='#102b40';ctx.fillRect(-cw*.23,-ch*.2,cw*.46,ch*.24);ctx.fillStyle='#fff3bd';ctx.fillRect(-cw*.37,ch*.3,cw*.19,5);ctx.fillRect(cw*.18,ch*.3,cw*.19,5);ctx.restore();words(ctx,`LAP ${Math.min(laps,Math.floor(checkpointIndex/3)+1)}/${laps} · CP ${checkpointIndex}/${checkpointDistances.length}`,12,30,14);words(ctx,segmentNames[segment],12,99,12,'#89ddea');if(gateFlash<0)words(ctx,'RETURN TO ROAD TO CROSS GATE',w/2,h*.21,Math.max(11,Math.min(20,w*.026)),'#ffc59f','center');words(ctx,`SPEED ${Math.floor(car.speed*2.8)} km/h`,12,53,13);words(ctx,`TIME ${(timeLimit-elapsed).toFixed(1)} s`,12,76,13,'#f9d7a6');bar(ctx,12,h-30,Math.min(175,w*.46),8,car.health/100,'#81e3c5');bar(ctx,12,h-17,Math.min(175,w*.46),5,nitro/100,'#6bc9ff');},hud(){return `<span>LAP <b>${Math.min(laps,Math.floor(checkpointIndex/3)+1)}/${laps}</b></span><span>GATE <b>${checkpointIndex}/${checkpointDistances.length}</b></span><span>HP <b>${Math.ceil(car.health)}</b></span><span>BOOST <b>${Math.floor(nitro)}%</b></span><span>TIME <b>${Math.ceil(timeLimit-elapsed)}s</b></span>`;}};
 g.inspectRace=()=>({progress,checkpointIndex,checkpointTotal:checkpointDistances.length,nextGate:checkpointDistances[checkpointIndex]??null,lap:Math.min(laps,Math.floor(checkpointIndex/3)+1),sector:segmentNames[Math.min(2,Math.floor((progress%1200)/400))],car:{...car},traffic:traffic.map(x=>({...x})),elapsed,score,collisions,finished:!!g._finished});
 return g;};
})();