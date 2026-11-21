/* Bio-City Arcade v2.0 Phase 1A: presentation-only 2.5D rendering.
 * Never reads or mutates game engines, input, clocks, transport or Snapshots.
 * The particle pool, event ledger, hit holds and quality selector are local
 * to this browser document and are deliberately not serializable.
 */
(()=>{'use strict';
 const levels=Object.freeze(['low','standard','high']);
 const bounded=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
 const now=()=>typeof performance!=='undefined'&&typeof performance.now==='function'?performance.now():Date.now();
 const channels=new Map(),MAX_CHANNELS=8,MAX_SEEN=128,MAX_PARTICLES=64;
 let quality='standard';
 function channel(name){
  const id=String(name).slice(0,64);
  if(channels.has(id))return channels.get(id);
  if(channels.size>=MAX_CHANNELS)channels.delete(channels.keys().next().value);
  const value={seen:new Map(),gates:new Map(),particles:Array.from({length:MAX_PARTICLES},()=>({alive:false})),cursor:0,holdUntil:0,holdAt:null,shudderUntil:0,shudder:0};
  channels.set(id,value);return value;
 }
 function setQuality(value){if(!levels.includes(value))return false;quality=value;return true;}
 function getQuality(){return quality;}
 function ambient(ctx,key,w,h){
  if(quality==='low'||!(w>0&&h>0))return;
  // Decoration only: preserves every obstacle, coordinate and clickable area.
  const opacity=quality==='high'?.11:.055;
  ctx.save();const glow=ctx.createLinearGradient(0,0,w,h);
  glow.addColorStop(0,'rgba(181,235,223,'+opacity+')');
  glow.addColorStop(.50,'rgba(181,235,223,0)');
  glow.addColorStop(1,'rgba(255,182,120,'+(opacity*.47)+')');
  ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);ctx.restore();
 }
 function contactShadow(ctx,x,y,z,size){
  if(![x,y,z,size].every(Number.isFinite))return false;
  const lift=bounded(z/180,0,.75),scale=bounded(size/46,.3,3);
  ctx.save();ctx.globalAlpha=(quality==='low'?.23:.30)*(1-lift);
  ctx.fillStyle='#06101b';ctx.beginPath();ctx.ellipse(x,y,(12-4*lift)*scale,(3-1*lift)*scale,0,0,Math.PI*2);ctx.fill();
  if(quality!=='low'){
   ctx.globalAlpha=.13*(1-lift);ctx.beginPath();ctx.ellipse(x+4*scale,y+2*scale,(22-7*lift)*scale,(6-2*lift)*scale,.06,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();return true;
 }
 function spriteLight(ctx){if(quality==='low')return;ctx.shadowColor=quality==='high'?'rgba(171,242,242,.42)':'rgba(171,242,242,.20)';ctx.shadowBlur=quality==='high'?4:2;ctx.shadowOffsetY=-1;}
 function vehicleGlint(ctx,width){
  if(quality==='low'||!(width>0))return;
  ctx.save();ctx.globalAlpha=quality==='high'?.34:.20;
  const light=ctx.createLinearGradient(-width*.32,-width*.76,width*.30,-width*.28);
  light.addColorStop(0,'rgba(235,255,255,.65)');light.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=light;ctx.beginPath();ctx.moveTo(-width*.24,-width*.74);ctx.lineTo(-width*.19,-width*.43);ctx.lineTo(width*.06,-width*.36);ctx.lineTo(-width*.03,-width*.71);ctx.closePath();ctx.fill();ctx.restore();
 }
 function emit(scope,id,kind,x,y,color='#e3f8ff',sourceTime=0){
  if(!Number.isFinite(x)||!Number.isFinite(y))return false;
  const v=channel(scope),key=String(id).slice(0,90);if(v.seen.has(key))return false;
  const clock=now();v.seen.set(key,clock);
  while(v.seen.size>MAX_SEEN)v.seen.delete(v.seen.keys().next().value);
  const count=quality==='low'?4:quality==='high'?14:8,seed=Array.from(key).reduce((n,c)=>(Math.imul(n,33)+c.charCodeAt(0))>>>0,5381);
  for(let i=0;i<count;i++){
   const p=v.particles[v.cursor++%MAX_PARTICLES],angle=((seed%360)+i*137.508)*Math.PI/180,speed=17+(i%5)*9;
   Object.assign(p,{alive:true,x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-12,at:clock,life:190+(i%4)*35,r:1.1+(i%3)*.7,color});
  }
  v.holdAt=Number.isFinite(sourceTime)?sourceTime:0;v.holdUntil=clock+(kind==='impact'?40:24);
  v.shudder=kind==='impact'?2.4:kind==='pass'?0:1.1;v.shudderUntil=clock+115;return true;
 }
 function trackImpact(scope,actor,value,x,y,sourceTime,color){
  const v=channel(scope),key=String(actor),previous=v.gates.get(key)||0;
  v.gates.set(key,Number.isFinite(value)?value:0);
  if(!(value>.28&&value>previous+.14))return false;
  const count='hit-'+key+'-'+Math.round(sourceTime*1000)+'-'+v.seen.size;
  return emit(scope,count,'impact',x,y,color,sourceTime);
 }
 function holdFrame(scope,time){
  const v=channels.get(String(scope));return v&&v.holdUntil>now()&&Number.isFinite(v.holdAt)?Math.min(time,v.holdAt):time;
 }
 function shake(scope){
  const v=channels.get(String(scope));if(!v||v.shudderUntil<=now()||quality==='low')return {x:0,y:0};
  const remaining=bounded((v.shudderUntil-now())/115,0,1),size=v.shudder*remaining*(quality==='high'?1:.55);
  return {x:Math.sin(now()*.101)*size,y:Math.cos(now()*.137)*size*.6};
 }
 function paint(ctx,scope){
  const v=channels.get(String(scope));if(!v)return 0;const clock=now();let count=0;
  ctx.save();
  for(const p of v.particles){
   if(!p.alive)continue;const age=clock-p.at;
   if(age>=p.life){p.alive=false;continue;}
   const u=age/p.life;ctx.globalAlpha=(1-u)*(quality==='low'?.45:.75);ctx.fillStyle=p.color;
   ctx.fillRect(p.x+p.vx*age/1000,p.y+p.vy*age/1000+u*u*6,p.r*(1-u)+.25,p.r*(1-u)+.25);count++;
  }
  ctx.restore();return count;
 }

 // Phase 1A first material pass. All arguments are render-time copies of
 // existing geometry: no collider, timer, engine object or network state writes.
 function gradient(ctx,x,y,w,h,stops){
  const g=ctx.createLinearGradient(x,y,x+w,y+h);
  for(const [at,color]of stops)g.addColorStop(at,color);
  return g;
 }
 function rim(ctx,x,y,w,h,color){
  ctx.strokeStyle=color;ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w-1,h-1);
 }
 function platform(ctx,x,y,w,type){
  if(![x,y,w].every(Number.isFinite)||w<=0)return;
  const tone=type==='trap'?'#ff668c':type==='fragile'?'#ffc875':type==='moving'?'#6ebcff':'#79f0df';
  const low=quality==='low';
  ctx.save();
  // The entire slab is decorative; gameplay still lands at the original y.
  ctx.fillStyle='#061526b3';ctx.fillRect(x+5,y+16,w-8,9);
  ctx.fillStyle=gradient(ctx,x,y+13,0,12,[[0,'#365366'],[.35,'#152c42'],[1,'#071a2d']]);
  ctx.beginPath();ctx.moveTo(x+3,y+15);ctx.lineTo(x+w-3,y+15);ctx.lineTo(x+w-8,y+24);ctx.lineTo(x+8,y+24);ctx.closePath();ctx.fill();
  ctx.fillStyle=gradient(ctx,x,y,0,16,[[0,'#789aab'],[.16,'#36576a'],[.48,'#18384e'],[1,'#0b253c']]);
  ctx.fillRect(x,y,w,16);rim(ctx,x,y,w,16,'#b6d5dc74');
  ctx.fillStyle=gradient(ctx,x,y,0,5,[[0,'#e5f8f4b0'],[1,tone+'99']]);
  ctx.fillRect(x+4,y+2,Math.max(0,w-8),3);
  if(!low){ctx.shadowColor=tone;ctx.shadowBlur=quality==='high'?12:5;}
  ctx.fillStyle=tone;ctx.fillRect(x+6,y+12,Math.max(0,w-12),2);
  ctx.shadowBlur=0;
  ctx.fillStyle='#a4c4d4';for(const bx of [x+8,x+w-8]){ctx.beginPath();ctx.arc(bx,y+8,2.2,0,Math.PI*2);ctx.fill();}
  if(type==='moving'){
   ctx.strokeStyle='#83c8ff8c';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x-22,y+22);ctx.lineTo(x+w+22,y+22);ctx.stroke();
   for(const a of [-1,1]){const xx=a<0?x-14:x+w+14;ctx.fillStyle=tone;ctx.beginPath();ctx.moveTo(xx,y+16);ctx.lineTo(xx+a*7,y+21);ctx.lineTo(xx,y+26);ctx.closePath();ctx.fill();}
   ctx.fillStyle='#75bfff88';for(let i=14;i<w-9;i+=24)ctx.fillRect(x+i,y+6,9,2);
  }else if(type==='fragile'){
   ctx.strokeStyle='#ffe4ad';ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(x+w*.34,y+1);ctx.lineTo(x+w*.42,y+6);ctx.lineTo(x+w*.39,y+12);ctx.lineTo(x+w*.55,y+17);ctx.moveTo(x+w*.64,y+2);ctx.lineTo(x+w*.59,y+8);ctx.lineTo(x+w*.7,y+14);ctx.stroke();
   ctx.fillStyle='#ffd6a766';for(let i=8;i<w-7;i+=20)ctx.fillRect(x+i,y+19,8,2);
  }else if(type==='trap'){
   for(let i=5;i<w-16;i+=w/4){ctx.fillStyle='#52283c';ctx.beginPath();ctx.moveTo(x+i,y);ctx.lineTo(x+i+7,y-13);ctx.lineTo(x+i+14,y);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#ff9fb4';ctx.lineWidth=1.4;ctx.stroke();}
   ctx.fillStyle='#ff517e';for(let i=13;i<w-10;i+=25)ctx.fillRect(x+i,y+7,11,3);
  }else{
   ctx.fillStyle='#80eddd8c';for(let i=12;i<w-8;i+=26)ctx.fillRect(x+i,y+7,12,2);
  }
  ctx.restore();
 }
 function impactFlash(ctx,x,y,r,flash,color){
  if(!(flash>0)||quality==='low')return;
  const strength=Math.min(1,flash/.23);
  ctx.save();ctx.globalAlpha=strength*(quality==='high'?.6:.34);
  const glow=ctx.createRadialGradient(x,y,r*.18,x,y,r*2.2);
  glow.addColorStop(0,color);glow.addColorStop(.35,color+'66');glow.addColorStop(1,'#ffffff00');
  ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x,y,r*2.2,0,Math.PI*2);ctx.fill();
  ctx.restore();
 }
 function energyDisc(ctx,x,y,r,accent,core,flash,armored=false){
  if(![x,y,r].every(Number.isFinite)||r<=0)return;
  ctx.save();impactFlash(ctx,x,y,r,flash,accent);
  ctx.fillStyle='#020d1bd0';ctx.beginPath();ctx.ellipse(x+3,y+5,r*1.09,r*.94,0,0,Math.PI*2);ctx.fill();
  const metal=ctx.createRadialGradient(x-r*.29,y-r*.35,r*.14,x,y,r*1.06);
  metal.addColorStop(0,'#f2ffff');metal.addColorStop(.26,'#688a9d');metal.addColorStop(.62,'#1b4058');metal.addColorStop(.82,'#0b2037');metal.addColorStop(1,'#8faebc');
  ctx.fillStyle=metal;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  ctx.lineWidth=armored?Math.max(3,r*.22):Math.max(2,r*.14);
  ctx.strokeStyle=armored?'#ba91f7':accent;ctx.beginPath();ctx.arc(x,y,r*.77,0,Math.PI*2);ctx.stroke();
  const coreGlow=ctx.createRadialGradient(x-r*.20,y-r*.24,1,x,y,r*.7);
  coreGlow.addColorStop(0,'#fbffff');coreGlow.addColorStop(.27,flash>0?'#ffffff':accent);coreGlow.addColorStop(.68,core);coreGlow.addColorStop(1,'#05192f');
  ctx.fillStyle=coreGlow;ctx.beginPath();ctx.arc(x,y,r*.62,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#e1fbffb0';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y,r*.9,-2.4,-.55);ctx.stroke();
  if(quality!=='low'){
   ctx.strokeStyle=accent;ctx.lineWidth=1;for(let i=0;i<4;i++){const a=i*Math.PI/2+.3;ctx.beginPath();ctx.arc(x,y,r*1.08,a,a+.35);ctx.stroke();}
   ctx.fillStyle='#ffffff80';ctx.beginPath();ctx.ellipse(x-r*.27,y-r*.31,r*.20,r*.10,-.65,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
 }
 function bumper(ctx,x,y,r,flash){energyDisc(ctx,x,y,r,'#77baff','#17385f',flash,false);}
 function target(ctx,x,y,r,maxHp,hp,flash){
  energyDisc(ctx,x,y,r,maxHp>1?'#c795fa':'#5af0dd',maxHp>1?'#5e3f86':'#0f5561',flash,maxHp>1);
  // Life digits are drawn by the caller above the glass core.
 }
 function launcher(ctx,x,y,angle,power,h){
  if(![x,y,angle,power,h].every(Number.isFinite))return;
  const length=Math.min(h*.4,power*2.4),dx=-Math.sin(angle)*length,dy=-Math.cos(angle)*length;
  ctx.save();
  ctx.strokeStyle='#9ceafa91';ctx.lineWidth=2;ctx.setLineDash([7,6]);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+dx,y+dy);ctx.stroke();ctx.setLineDash([]);
  if(quality!=='low'){ctx.strokeStyle='#75f4ef6b';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+dx*.45-5,y+dy*.45);ctx.lineTo(x+dx*.45+5,y+dy*.45);ctx.moveTo(x+dx*.75-5,y+dy*.75);ctx.lineTo(x+dx*.75+5,y+dy*.75);ctx.stroke();}
  ctx.fillStyle='#041b30';ctx.beginPath();ctx.ellipse(x,y+13,22,8,0,0,Math.PI*2);ctx.fill();
  ctx.translate(x,y);ctx.rotate(-angle);
  ctx.fillStyle=gradient(ctx,-13,-24,24,38,[[0,'#d2eff3'],[.31,'#3f748c'],[.72,'#15364f'],[1,'#081d37']]);ctx.fillRect(-13,-24,26,40);
  rim(ctx,-13,-24,26,40,'#c0f4f0a3');
  ctx.fillStyle='#0c283a';ctx.fillRect(-8,-30,16,13);
  ctx.fillStyle='#71fcf2';ctx.fillRect(-6,-27,12,4);
  ctx.fillStyle='#8bedff';ctx.fillRect(-10,3,20,3);
  ctx.fillStyle='#ddf5f7b0';ctx.fillRect(-10,-21,3,28);
  ctx.restore();
 }
 function pongSurface(ctx,f){
  const x=f.left,y=f.top,w=f.right-f.left,h=f.bottom-f.top;
  ctx.save();ctx.fillStyle='#03121cb3';ctx.fillRect(x+8,y+10,w,h);
  ctx.fillStyle=gradient(ctx,x,y,0,h,[[0,'#367985'],[.22,'#175869'],[.72,'#0c4555'],[1,'#082b40']]);ctx.fillRect(x,y,w,h);
  if(quality!=='low'){
   ctx.strokeStyle='#c0ffef18';ctx.lineWidth=1;
   for(let i=10;i<w;i+=18){ctx.beginPath();ctx.moveTo(x+i,y+4);ctx.lineTo(x+i,y+h-4);ctx.stroke();}
   for(let j=9;j<h;j+=20){ctx.beginPath();ctx.moveTo(x+4,y+j);ctx.lineTo(x+w-4,y+j);ctx.stroke();}
  }
  ctx.fillStyle=gradient(ctx,x,y,0,9,[[0,'#d6fbff65'],[1,'#ffffff00']]);ctx.fillRect(x,y,w,9);
  ctx.strokeStyle='#bdfdf2';ctx.lineWidth=2.5;ctx.strokeRect(x+1,y+1,w-2,h-2);
  ctx.setLineDash([9,9]);ctx.lineWidth=1;ctx.strokeStyle='#c3f7ed55';ctx.beginPath();ctx.moveTo(x,y+h*.5);ctx.lineTo(x+w,y+h*.5);ctx.stroke();ctx.setLineDash([]);
  ctx.strokeStyle='#76f6ec';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(f.mid,y);ctx.lineTo(f.mid,y+h);ctx.stroke();
  ctx.strokeStyle='#071d32';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(f.mid,y);ctx.lineTo(f.mid,y+h);ctx.stroke();
  ctx.strokeStyle='#89ebf8';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(f.mid,y);ctx.lineTo(f.mid,y+h);ctx.stroke();
  if(quality!=='low'){ctx.strokeStyle='#c4ffff58';ctx.lineWidth=1;for(let yy=y+5;yy<y+h;yy+=13){ctx.beginPath();ctx.moveTo(f.mid-4,yy);ctx.lineTo(f.mid+4,yy);ctx.stroke();}}
  for(const yy of [y,y+h]){ctx.fillStyle='#bedadd';ctx.fillRect(f.mid-5,yy-4,10,8);ctx.fillStyle='#70eef3';ctx.fillRect(f.mid-3,yy-3,6,2);}
  ctx.restore();
 }
 function paddle(ctx,x,y,team,swing=0){
  const cool=team===0,accent=cool?'#67e8f5':'#ffba75',dark=cool?'#13617b':'#8b4f38';
  ctx.save();
  ctx.fillStyle=gradient(ctx,x-6,y+10,12,27,[[0,'#b8cdd2'],[1,'#28465a']]);ctx.fillRect(x-6,y+11,12,23);
  ctx.fillStyle='#0a1c2b';ctx.fillRect(x-4,y+30,8,5);
  ctx.beginPath();ctx.ellipse(x+2,y+3,16,22,0,0,Math.PI*2);ctx.fillStyle='#061c2c';ctx.fill();
  ctx.beginPath();ctx.ellipse(x,y,15,22,0,0,Math.PI*2);
  ctx.fillStyle=gradient(ctx,x-15,y-22,28,44,[[0,'#f7ffff'],[.23,accent],[.70,dark],[1,'#10293e']]);ctx.fill();
  ctx.save();ctx.clip();ctx.fillStyle='#051a2e45';ctx.fillRect(x-12,y-12,24,25);
  if(quality!=='low'){ctx.strokeStyle='#e6ffff6b';ctx.lineWidth=1;for(let i=-14;i<=14;i+=6){ctx.beginPath();ctx.moveTo(x-12,y+i);ctx.lineTo(x+12,y+i+5);ctx.stroke();}}
  ctx.restore();
  ctx.beginPath();ctx.ellipse(x,y,15,22,0,0,Math.PI*2);ctx.strokeStyle=accent;ctx.lineWidth=3;ctx.stroke();
  ctx.strokeStyle='#ffffffb8';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(x-2,y-2,10,16,0,-2.4,-.5);ctx.stroke();
  if(swing>0){ctx.strokeStyle=accent;ctx.lineWidth=4;ctx.beginPath();ctx.arc(x+8,y,36,-1,1);ctx.stroke();}
  ctx.restore();
 }
 function volleyCourt(ctx,w,h,f){
  const ground=f.floor;
  ctx.save();ctx.fillStyle=gradient(ctx,0,ground,0,h-ground,[[0,'#285369'],[1,'#0b293e']]);ctx.fillRect(0,ground,w,h-ground);
  if(quality!=='low'){ctx.strokeStyle='#a2eee51b';ctx.lineWidth=1;for(let y=ground+10;y<h;y+=12){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}}
  ctx.fillStyle='#8dfbec';ctx.fillRect(0,ground,w,3);
  ctx.strokeStyle='#a5e9f2a1';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(w*.08,ground+12);ctx.lineTo(w*.92,ground+12);ctx.moveTo(w*.5,ground);ctx.lineTo(w*.5,h);ctx.stroke();
  const x=w*.5,top=f.netTop;
  ctx.fillStyle='#091f34';ctx.fillRect(x-5,top,10,ground-top);
  ctx.fillStyle=gradient(ctx,x-4,top,8,0,[[0,'#9eefff'],[.5,'#345b77'],[1,'#d3faff']]);ctx.fillRect(x-3,top,6,ground-top);
  ctx.strokeStyle='#b5f7ff8c';ctx.lineWidth=1;
  for(let y=top+10;y<ground;y+=12){ctx.beginPath();ctx.moveTo(x-9,y);ctx.lineTo(x+9,y);ctx.stroke();}
  for(const xx of [x-9,x+9]){ctx.beginPath();ctx.moveTo(xx,top);ctx.lineTo(xx,ground);ctx.stroke();}
  ctx.strokeStyle='#e0ffff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-10,top);ctx.lineTo(x+10,top);ctx.stroke();
  ctx.restore();
 }


 // G06 race V2 foreground-only treatment. The track geometry remains owned by
 // the existing game renderer; these functions receive projected draw values.
 function raceSkyline(ctx,w,h,chapter,pan){
  if(![w,h,pan].every(Number.isFinite)||w<=0||h<=0)return;
  const palette=['#77e7dc','#7cfdba','#79c6ff','#ffc18e','#d1a4ff'][bounded(chapter,1,5)-1];
  const skylineY=h*.34;
  ctx.save();
  ctx.beginPath();ctx.rect(0,0,w,h*.35);ctx.clip();
  ctx.globalAlpha=quality==='low'?.30:quality==='high'?.76:.52;
  for(let layer=0;layer<2;layer++){
   const step=w*(layer?.065:.095),offset=((pan*(layer?.43:.19))%step+step)%step;
   for(let i=-1;i<Math.ceil(w/step)+1;i++){
    const x=i*step+offset,bw=step*(layer?.64:.73);
    const ht=h*(layer?.035:.049)+h*.048*(.5+.5*Math.sin(i*2.73+chapter+layer*5));
    const top=skylineY-ht+(layer?2:0);
    ctx.fillStyle=layer?'#102438':'#18354a';
    ctx.beginPath();ctx.moveTo(x,skylineY);ctx.lineTo(x,top+4);ctx.lineTo(x+bw*.18,top);ctx.lineTo(x+bw,top);ctx.lineTo(x+bw,skylineY);ctx.closePath();ctx.fill();
    if(quality==='low')continue;
    ctx.strokeStyle=palette;ctx.lineWidth=layer?1.4:.7;
    ctx.beginPath();ctx.moveTo(x+bw*.08,top+2);ctx.lineTo(x+bw*.87,top+2);ctx.stroke();
    if(layer){ctx.fillStyle=palette;for(let row=0;row<3;row++)for(let c=0;c<3;c++){
     if((i+row+c+chapter)%3===0)ctx.fillRect(x+bw*(.22+c*.18),top+9+row*h*.011,Math.max(1,bw*.065),Math.max(1,h*.003));
    }}
   }
  }
  ctx.restore();
 }
 function raceWheel(ctx,w,speed,time){
  if(!(w>0))return;
  ctx.save();
  for(const side of [-1,1]){
   const x=side*w*.43;
   ctx.fillStyle=gradient(ctx,x-w*.078,-w*.29,w*.15,w*.31,[[0,'#4a6270'],[.26,'#07121d'],[.75,'#111923'],[1,'#6c7b83']]);
   ctx.fillRect(x-w*.067,-w*.27,w*.134,w*.265);
   ctx.strokeStyle='#b5deeb';ctx.lineWidth=Math.max(.7,w*.012);ctx.beginPath();ctx.ellipse(x,-w*.13,w*.049,w*.072,0,0,Math.PI*2);ctx.stroke();
   if(quality!=='low'){
    ctx.strokeStyle='#d3f4f18c';ctx.lineWidth=Math.max(.6,w*.009);
    for(let i=0;i<3;i++){const y=-w*.27+(((time*speed*.026+i/3)%1+1)%1)*w*.23;
     ctx.beginPath();ctx.moveTo(x-w*.057,y);ctx.lineTo(x+w*.057,y);ctx.stroke();}
    ctx.fillStyle='#d9fcff';ctx.beginPath();ctx.arc(x,-w*.135,Math.max(.65,w*.013),0,Math.PI*2);ctx.fill();
   }
  }
  ctx.restore();
 }
 function raceBody(ctx,w,model,accent,steer,braking){
  if(!(w>0))return;
  ctx.save();
  // Retain all seven distinct body silhouettes drawn by the engine.
  ctx.fillStyle=gradient(ctx,-w*.38,-w*.38,w*.75,w*.07,[[0,'#eeffffc4'],[.5,'#c5f6fa52'],[1,'#17273a00']]);
  ctx.fillRect(-w*.36,-w*.385,w*.72,w*.06);
  const glass=ctx.createLinearGradient(-w*.24,-w*.73,w*.24,-w*.43);
  glass.addColorStop(0,'#d4ffffdd');glass.addColorStop(.37,'#517e9d88');glass.addColorStop(.75,'#183c5966');glass.addColorStop(1,'#0b203044');
  ctx.fillStyle=glass;ctx.beginPath();ctx.moveTo(-w*.21,-w*.67);ctx.lineTo(w*.015,-w*.69);ctx.lineTo(w*.25,-w*.43);ctx.lineTo(-w*.25,-w*.43);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#dcffffa9';ctx.lineWidth=Math.max(.65,w*.012);
  ctx.beginPath();ctx.moveTo(-w*.23,-w*.65);ctx.lineTo(-w*.12,-w*.67);ctx.stroke();
  // Rear deck, separate alloy lip, brake LEDs and wheel arch only.
  ctx.fillStyle=gradient(ctx,-w*.46,-w*.11,0,w*.12,[[0,'#66818e'],[.5,'#21354a'],[1,'#0c1b2c']]);
  ctx.fillRect(-w*.42,-w*.12,w*.84,w*.065);
  ctx.strokeStyle=accent;ctx.lineWidth=Math.max(1,w*.016);
  ctx.beginPath();ctx.moveTo(-w*.42,-w*.34);ctx.lineTo(-w*.36,-w*.37);
  ctx.moveTo(w*.42,-w*.34);ctx.lineTo(w*.36,-w*.37);ctx.stroke();
  for(const side of [-1,1]){
   const x=side*w*.305;
   if(quality!=='low'){
    ctx.shadowColor=braking?'#ff5145':'#ff845d';ctx.shadowBlur=quality==='high'?w*.20:w*.11;
   }
   ctx.fillStyle=braking?'#ffedc0':'#f96558';ctx.fillRect(x-w*.082,-w*.258,w*.164,w*.046);
   ctx.shadowBlur=0;ctx.fillStyle='#ffd1b8b5';ctx.fillRect(x-w*.074,-w*.254,w*.148,w*.009);
  }
  if(quality==='high'){
   ctx.strokeStyle='#ffffff48';ctx.lineWidth=.8;
   ctx.beginPath();ctx.moveTo(-w*.33,-w*.49);ctx.quadraticCurveTo(-w*.27,-w*.73,steer*w*.035,-w*.74);ctx.stroke();
  }
  ctx.restore();
 }
 function raceExhaust(ctx,w,boost,time,speed=0){
  if(!(w>0))return;
  ctx.save();
  for(const side of [-1,1]){
   const x=side*w*.16;
   ctx.fillStyle='#081425';ctx.fillRect(x-w*.065,-w*.12,w*.13,w*.06);
   if(!boost)continue;
   const pulse=.85+.15*Math.sin(time*39+side),len=w*(quality==='low'?.20:quality==='high'?.42:.32)*pulse;
   if(quality!=='low'){
    ctx.shadowColor='#61e8ff';ctx.shadowBlur=quality==='high'?w*.15:w*.08;
   }
   ctx.fillStyle='#3e91ffbb';ctx.beginPath();ctx.moveTo(x-w*.07,-w*.07);ctx.lineTo(x,len);ctx.lineTo(x+w*.07,-w*.07);ctx.closePath();ctx.fill();
   ctx.shadowBlur=0;ctx.fillStyle='#c8fdff';ctx.beginPath();ctx.moveTo(x-w*.027,-w*.07);ctx.lineTo(x,len*.62);ctx.lineTo(x+w*.027,-w*.07);ctx.closePath();ctx.fill();
  }
  // Relative rear wake remains a local optical layer, never a slipstream rule.
  if(speed>38){
   const strength=bounded((speed-38)/65,0,1),count=quality==='low'?1:quality==='high'?6:3;
   ctx.strokeStyle=boost?'#9aefff99':'#a5dff05e';
   ctx.lineWidth=quality==='high'?1.5:1;
   for(let i=0;i<count;i++){
    const side=i%2?1:-1,x=side*w*(.12+i*.045),phase=((time*(1.5+strength*2)+i*.29)%1+1)%1;
    ctx.globalAlpha=(quality==='low'?.22:.48)*(1-phase);
    ctx.beginPath();ctx.moveTo(x,w*(.06+phase*.16));ctx.lineTo(x+side*w*.055*strength,w*(.16+phase*.47)*strength);ctx.stroke();
   }
  }
  ctx.restore();
 }
 function raceFixture(ctx,x,y,u,side,chapter,world){
  if(![x,y,u].every(Number.isFinite)||u<.8)return;
  const palette=['#8ff4eb','#8dfbc3','#91caff','#ffc58a','#daa6ff'][bounded(chapter,1,5)-1];
  ctx.save();
  ctx.fillStyle='#051b31';ctx.beginPath();ctx.ellipse(x,y,u*.42,u*.13,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=gradient(ctx,x-u*.16,y-u*.12,u*.36,0,[[0,'#9fbec2'],[.45,'#18364d'],[1,'#6e91a1']]);
  ctx.fillRect(x-u*.16,y-u*.16,u*.32,u*.20);
  if(chapter===1||chapter===3){
   // Full 3D lamp housing stays in the existing non-drivable scenery lane.
   ctx.fillStyle=gradient(ctx,x-u*.09,y-u*2.9,u*.18,0,[[0,'#9ebfc8'],[.55,'#2c526c'],[1,'#071a30']]);
   ctx.fillRect(x-u*.09,y-u*2.85,u*.18,u*2.73);
   ctx.fillStyle='#a1bfca';ctx.beginPath();ctx.moveTo(x-u*.17,y-u*2.85);ctx.lineTo(x-side*u*.6,y-u*3.03);ctx.lineTo(x-side*u*.69,y-u*2.94);ctx.lineTo(x-u*.08,y-u*2.7);ctx.closePath();ctx.fill();
   ctx.fillStyle=palette;ctx.fillRect(x-side*u*.70,y-u*3.0,u*.27,u*.08);
   if(quality!=='low'){ctx.shadowColor=palette;ctx.shadowBlur=quality==='high'?u*.55:u*.25;ctx.fillRect(x-side*u*.69,y-u*2.9,u*.25,u*.055);}
  }else{
   // Chapter-themed field module in the place of additional road obstacles.
   const height=chapter===2?u*.8:chapter===4?u*.7:u*1.3;
   ctx.fillStyle=gradient(ctx,x-u*.11,y-height,u*.22,0,[[0,'#a0b2be'],[.45,'#27465d'],[1,'#0a1d35']]);
   ctx.fillRect(x-u*.11,y-height,u*.22,height);
   ctx.strokeStyle=palette;ctx.lineWidth=Math.max(.8,u*.075);
   ctx.beginPath();ctx.ellipse(x,y-height,u*(chapter===5?.40:.23),u*.17,0,0,Math.PI*2);ctx.stroke();
  }
  ctx.shadowBlur=0;ctx.restore();
 }
 function raceRail(ctx,a,b,chapter){
  if(!a||!b||quality==='low')return;
  const palette=['#65e2dc','#72c998','#84baff','#f0aa83','#c6a0ff'][bounded(chapter,1,5)-1];
  ctx.save();ctx.strokeStyle=palette;ctx.lineWidth=quality==='high'?2:1.2;
  if(quality==='high'){ctx.shadowColor=palette;ctx.shadowBlur=7;}
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  ctx.restore();
 }
 function raceRoadGrain(ctx,near,far,world){
  if(quality==='low'||!near||!far)return;
  const x=near.x,y=near.y,xx=far.x,yy=far.y;
  if(![x,y,xx,yy].every(Number.isFinite))return;
  ctx.save();ctx.strokeStyle=quality==='high'?'#b8e4ee36':'#b8e4ee20';ctx.lineWidth=1;
  const spread=quality==='high'?7:4;
  for(let i=0;i<spread;i++){
   const f=(i+.5)/spread,shift=(Math.sin(world*.41+i*11.7)*.5+.5)*12;
   ctx.beginPath();ctx.moveTo(x+(xx-x)*f-shift,y+(yy-y)*f);ctx.lineTo(x+(xx-x)*f+shift*.4,y+(yy-y)*f-2);ctx.stroke();
  }
  ctx.restore();
 }
 function raceSpeedLines(ctx,w,h,speed,slip,time){
  if(![w,h,speed,time].every(Number.isFinite)||speed<26)return;
  const ramp=bounded((speed-26)/78,0,1);
  const count=quality==='low'?2:quality==='high'?16:8;
  ctx.save();
  ctx.lineWidth=quality==='low'?.7:quality==='high'?1.6:1;
  ctx.strokeStyle=slip?'#b2ffdc78':'#bdeaff60';
  ctx.globalAlpha=quality==='low'?.16:quality==='high'?.65:.38;
  for(let i=0;i<count;i++){
   const side=i%2?1:-1,phase=((time*(1.6+ramp*3)+i*.61803398)%1+1)%1;
   const x=w*.5+side*w*(.24+phase*.29),y=h*(.36+phase*.60);
   ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+side*(.017+phase*.065)*w*ramp,y+(.025+phase*.13)*h*ramp);ctx.stroke();
  }
  ctx.restore();
 }

 function reset(scope){if(scope===undefined){channels.clear();return;}channels.delete(String(scope));}
 function inspect(){return {quality,channels:channels.size,particleCap:MAX_PARTICLES,eventCap:MAX_SEEN,activeParticles:[...channels.values()].reduce((n,c)=>n+c.particles.filter(p=>p.alive&&now()-p.at<p.life).length,0)};}
 window.BioVisualV2=Object.freeze({version:'2.0-phase1a',levels,setQuality,getQuality,ambient,contactShadow,spriteLight,vehicleGlint,raceSkyline,raceWheel,raceBody,raceExhaust,raceFixture,raceRail,raceRoadGrain,raceSpeedLines,platform,bumper,target,launcher,pongSurface,paddle,volleyCourt,emit,trackImpact,holdFrame,shake,paint,reset,inspect});
})();