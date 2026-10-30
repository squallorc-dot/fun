/* Private 6C racing adapter: the host alone advances the shared race. */
((root)=>{'use strict';
const TAG='g06-race-6c-v1',MODES=['race'],LIMIT=28000;
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v),finite=v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1e7;
const keys=(v,allowed)=>object(v)&&Object.keys(v).every(k=>allowed.includes(k));
function input(v){return keys(v,['moveX','moveY','up','down','left','right','fire','jump','actionAssist'])&&Object.entries(v).every(([k,x])=>k==='moveX'||k==='moveY'?finite(x)&&Math.abs(x)<=1:typeof x==='boolean');}
function data(v,depth=0){if(depth>6)return false;if(v===null||typeof v==='boolean')return true;if(typeof v==='number')return finite(v);if(typeof v==='string')return v.length<=100;if(Array.isArray(v))return v.length<=100&&v.every(x=>data(x,depth+1));if(!object(v)||Object.keys(v).length>60)return false;return Object.entries(v).every(([k,x])=>/^[A-Za-z][A-Za-z0-9]*$/.test(k)&&data(x,depth+1));}
function snapshot(s,chapter){
 const fields=['version','chapter','phase','t','elapsed','lights','car','traffic','progress','nitro','checkpointIndex','passes','collisions','slipstream','gateFlash','feel','score','finished','standings'];
 if(!keys(s,fields)||Object.keys(s).length!==fields.length||s.version!==1||s.chapter!==chapter||!['countdown','racing','finishing','finished'].includes(s.phase)||typeof s.finished!=='boolean'||s.finished!==(s.phase==='finished')||!data(s))return false;
 try{if(JSON.stringify(s).length>LIMIT)return false;}catch{return false;}
 if(!Array.isArray(s.traffic)||s.traffic.length>12||!Array.isArray(s.standings)||s.standings.length!==6||!object(s.car)||s.car.id!=='player'||s.car.player!==true)return false;
 const cars=[s.car,...s.traffic.filter(r=>r.type==='car')],ids=['player','guest','ai-0','ai-1','ai-2','ai-3'];
 if(cars.length!==6||new Set(cars.map(r=>r.id)).size!==6||!cars.every(r=>ids.includes(r.id)))return false;
 const racer=r=>object(r)&&finite(r.z)&&r.z>=0&&r.z<=(chapter===1?3600:2400)&&finite(r.lane)&&Math.abs(r.lane)<=1.25&&finite(r.speed)&&r.speed>=0&&r.speed<=130&&finite(r.health)&&r.health>=0&&r.health<=100&&finite(r.nitro)&&r.nitro>=0&&r.nitro<=100&&['racing','finished','dnf'].includes(r.status)&&(r.finishTime===null||finite(r.finishTime)&&r.finishTime>=0)&&Array.isArray(r.lapTimes)&&r.lapTimes.length<=(chapter===1?3:2)&&r.lapTimes.every(v=>finite(v)&&v>=0)&&Number.isInteger(r.overtakes)&&r.overtakes>=0;
 if(!cars.every(racer)||cars.find(r=>r.id==='guest')?.remote!==true||!s.traffic.every(r=>r.type==='car'||r.type==='barrier'&&finite(r.z)&&finite(r.lane)&&typeof r.hit==='boolean'))return false;
 if(!['t','elapsed','lights','progress','nitro','checkpointIndex','passes','collisions','gateFlash','score'].every(k=>finite(s[k]))||s.elapsed<0||s.lights<0||s.lights>3||s.progress!==s.car.z||s.nitro!==s.car.nitro||!Number.isInteger(s.checkpointIndex)||s.checkpointIndex<0||s.checkpointIndex>9||typeof s.slipstream!=='boolean'||!keys(s.feel,['pitch','impact','side'])||!['pitch','impact','side'].every(k=>finite(s.feel[k])))return false;
 const order=cars.slice().sort((a,b)=>{if(a.finishTime!==null&&b.finishTime!==null)return a.finishTime-b.finishTime||a.id.localeCompare(b.id);if(a.finishTime!==null)return -1;if(b.finishTime!==null)return 1;if(a.status==='dnf'&&b.status!=='dnf')return 1;if(b.status==='dnf'&&a.status!=='dnf')return -1;return b.z-a.z||a.id.localeCompare(b.id);});
 return s.standings.every((r,i)=>{const c=order[i];return object(r)&&r.position===i+1&&r.id===c.id&&r.status===c.status&&r.progress===c.z&&r.time===c.finishTime&&r.overtakes===c.overtakes&&r.collisions===(c.collisions||0)&&r.laps===Math.min(chapter===1?3:2,Math.floor(c.z/1200))&&r.bestLap===(c.lapTimes.length?Math.min(...c.lapTimes):null);});
}
class Adapter{
 constructor({mode,hero=0,remoteHero=3,host,locale='zh',chapter=1,difficulty='normal',finish=()=>{},sfx=()=>{}}){
  if(mode!=='race'||!Number.isInteger(chapter)||chapter<1||chapter>5||!['normal','hard','expert'].includes(difficulty))throw Error('race-config');
  this.host=host;this.chapter=chapter;this.lastTick=-1;this.queue=[];this.corrections=0;
  this.game=root.BioSuiteGames.g06({hero,remoteHero,multiplayer:true,authority:host,sessionCountdown:true,chapter,difficulty,I:{hero:locale==='ja'?['バーナー','MJ','モーモー','葉宝','ゼリー','野菜','オラクル']:['Burner','MJ','Moo','Ye Bao','Jelly','Veggie','Oracle']},finish,sfx});this.game.w=640;this.game.h=800;this.game.start();
 }
 step(dt,local,remote){if(!this.host)throw Error('guest-authority');const r={};for(const k of ['moveX','left','right','up','down','fire'])if(remote[k]!==undefined)r[k]=remote[k];if(!this.game.setRemoteInput(r))throw Error('invalid-input');this.game.update(dt,local);}
 capture(){if(!this.host)throw Error('guest-authority');return this.game.networkSnapshot();}
 result(s=this.capture()){return {standings:s.standings,players:['player','guest'].map(id=>{const r=[s.car,...s.traffic].find(x=>x.id===id),rank=s.standings.find(x=>x.id===id);return {id,rank:rank.position,status:r.status,time:r.finishTime,bestLap:r.lapTimes.length?Math.min(...r.lapTimes):null,checkpoints:r.checkpointIndex||0,overtakes:r.overtakes,collisions:r.collisions||0};})};}
 reliableKey(s){return s.phase+':'+s.standings.map(r=>r.id+':'+r.status).join(',')+':'+s.car.checkpointIndex+':'+s.traffic.find(r=>r.id==='guest').checkpointIndex;}
 receive(tick,s,immediate=false){if(!Number.isSafeInteger(tick)||tick<0||tick<this.lastTick||tick===this.lastTick&&!immediate||!snapshot(s,this.chapter))return false;this.lastTick=tick;this.queue=[{tick,state:structuredClone(s)}];this.game.applyNetworkState(s);return true;}
 render(){} // Only host snapshots change the guest world.
 dispose(){this.queue=[];if(this.host)this.game.setRemoteInput({});}
}
root.BioG06Network=Object.freeze({TAG,MODES,input,snapshot,Adapter,prepare:heroes=>[root.BioGuardianArt?.preload(heroes)||Promise.resolve(true),root.BioWorldArt?.preload('race')||Promise.resolve(true)]});
})(typeof window==='undefined'?globalThis:window);
