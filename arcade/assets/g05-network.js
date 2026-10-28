/* G05 host authority and render-only guest adapter; shared engine, unchanged view. */
((root)=>{'use strict';
const TAG='g05-v16-1-640x480',MODES=['pong','volley'];
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v),finite=v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1000000;
const exact=(v,keys)=>object(v)&&Object.keys(v).every(k=>keys.includes(k));
function input(v){return exact(v,['moveX','moveY','up','down','left','right','fire','jump','actionAssist'])&&Object.entries(v).every(([k,x])=>k==='moveX'||k==='moveY'?finite(x)&&Math.abs(x)<=1:typeof x==='boolean');}
function entity(v,ball=false){
 const bool=['ground','moving','serveOwn','bouncedReceiver','serveCrossed'],numeric=['x','y','z','vx','vy','vz','swing','cool','hitCool','lastHitter','servedBy','contact','impactAngle','returnAttempted'];
 return exact(v,[...bool,...numeric])&&finite(v.x)&&finite(v.y)&&Object.entries(v).every(([k,x])=>bool.includes(k)?typeof x==='boolean':finite(x)||k==='returnAttempted'&&x===null)&&(!ball||[0,1].includes(v.lastHitter));
}
function snapshot(s,mode){
 if(!exact(s,['mode','t','player','ai','ball','points','serve','serveSide','rally','rallyClock','pointReason','pointFlash','pointFlashTime','trail','fx','finished','serveCrossings','netContacts'])||s.mode!==mode||!finite(s.t)||s.t<0||!entity(s.player)||!entity(s.ai)||s.ball!==null&&!entity(s.ball,true))return false;
 if(!Array.isArray(s.points)||s.points.length!==2||!s.points.every(x=>Number.isInteger(x)&&x>=0&&x<=(mode==='pong'?7:5))||typeof s.finished!=='boolean'||s.finished!==s.points.some(x=>x===(mode==='pong'?7:5))||s.points.filter(x=>x===(mode==='pong'?7:5)).length>1)return false;
 if(!['serve','rally','rallyClock','pointFlashTime','netContacts'].every(k=>finite(s[k])&&s[k]>=0)||![-1,0,1].includes(s.pointFlash)||![0,1].includes(s.serveSide)||typeof s.pointReason!=='string'||s.pointReason.length>32)return false;
 if(!Array.isArray(s.serveCrossings)||s.serveCrossings.length!==2||!s.serveCrossings.every(x=>Number.isInteger(x)&&x>=0))return false;
 if(!Array.isArray(s.trail)||s.trail.length>10||!s.trail.every(p=>exact(p,['x','y'])&&finite(p.x)&&finite(p.y)))return false;
 if(!exact(s.fx,['clock','particles'])||!finite(s.fx.clock)||!Array.isArray(s.fx.particles)||s.fx.particles.length>100)return false;
 return s.fx.particles.every(p=>exact(p,['x','y','color','ring','life','max','r','vx','vy'])&&finite(p.x)&&finite(p.y)&&typeof p.color==='string'&&/^#[a-f0-9]{3,8}$/i.test(p.color)&&Object.entries(p).every(([k,v])=>k==='color'?true:k==='ring'?typeof v==='boolean':finite(v)));
}
class Adapter{
 constructor({mode,hero=0,remoteHero=3,host,locale='zh',finish=()=>{},sfx=()=>{}}){
  if(!MODES.includes(mode))throw Error('mode');this.mode=mode;this.host=host;this.queue=[];this.lastTick=-1;this.corrections=0;
  this.game=root.BioSuiteGames.g05({hero,remoteHero,mode,multiplayer:true,authority:host,chapter:1,difficulty:'normal',I:{hero:[locale==='ja'?'バーナー':'Burner']},finish,sfx});this.game.w=640;this.game.h=480;this.game.start();
 }
 result(state=this.capture()){return {points:[...state.points],winner:state.points[0]>state.points[1]?0:1};}
 reliableKey(state){return state.points.join(':')+':'+state.serveSide;}
 step(dt,local,remote){if(!this.host)throw Error('guest-authority');this.game.setRemoteInput(remote);this.game.update(dt,local);}
 capture(){if(!this.host)throw Error('guest-authority');return this.game.networkSnapshot();}
 receive(tick,value,immediate=false){
  if(!Number.isSafeInteger(tick)||tick<0||tick<this.lastTick||!snapshot(value,this.mode))return false;
  if(tick===this.lastTick&&!immediate)return false;
  const previous=this.queue.at(-1)?.state;if(previous&&value.points.some((n,i)=>n<previous.points[i]))return false;
  this.lastTick=tick;const row={tick,state:structuredClone(value),at:performance.now()};
  if(immediate){this.queue=[row];this.game.applyNetworkState(value);return true;}
  const last=this.queue.at(-1);if(last&&last.state.points.join()===value.points.join()&&last.state.ball&&value.ball&&Math.hypot(last.state.ball.x-value.ball.x,last.state.ball.y-value.ball.y)>60)this.corrections++;
  this.queue.push(row);if(this.queue.length>8)this.queue.shift();return true;
 }
 render(now=performance.now()){
  if(this.host||!this.queue.length)return;const last=this.queue.at(-1),target=Math.min(last.tick,last.tick+(now-last.at)*.12-7.2);
  let a=this.queue[0],b=a;for(const row of this.queue){if(row.tick<=target)a=row;if(row.tick>=target){b=row;break;}b=row;}
  const state=structuredClone(a.state),alpha=b.tick===a.tick?0:Math.max(0,Math.min(1,(target-a.tick)/(b.tick-a.tick)));
  if(a.state.points.join()===b.state.points.join()&&!!a.state.serve===!!b.state.serve){
   for(const id of ['player','ai'])for(const k of ['x','y'])state[id][k]+=((b.state[id][k]??state[id][k])-state[id][k])*alpha;
   if(state.ball&&b.state.ball&&state.ball.lastHitter===b.state.ball.lastHitter)for(const k of ['x','y','z'])if(finite(state.ball[k])&&finite(b.state.ball[k]))state.ball[k]+=(b.state.ball[k]-state.ball[k])*alpha;
   state.t+=(b.state.t-state.t)*alpha;
  }
  this.game.applyNetworkState(state);this.game.networkVisual(Math.max(0,Math.min(.15,(target-a.tick)/120)));
 }
 dispose(){this.queue=[];this.game.setRemoteInput({});}
}
root.BioG05Network=Object.freeze({TAG,MODES,input,snapshot,Adapter,prepare:heroes=>[root.BioGuardianArt?.preload(heroes)||Promise.resolve(true),root.BioWorldArt?.preload('arena')||Promise.resolve(true)]});
})(typeof window==='undefined'?globalThis:window);
