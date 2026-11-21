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
  v.shudder=kind==='impact'?2.4:1.1;v.shudderUntil=clock+115;return true;
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
 function reset(scope){if(scope===undefined){channels.clear();return;}channels.delete(String(scope));}
 function inspect(){return {quality,channels:channels.size,particleCap:MAX_PARTICLES,eventCap:MAX_SEEN,activeParticles:[...channels.values()].reduce((n,c)=>n+c.particles.filter(p=>p.alive&&now()-p.at<p.life).length,0)};}
 window.BioVisualV2=Object.freeze({version:'2.0-phase1a',levels,setQuality,getQuality,ambient,contactShadow,spriteLight,vehicleGlint,emit,trackImpact,holdFrame,shake,paint,reset,inspect});
})();