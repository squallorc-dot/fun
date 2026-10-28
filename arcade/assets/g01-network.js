/* Opt-in G01 cooperative adapter. A single host owns combat and score. */
((root)=>{'use strict';
const TAG='g01-coop-6b-v1',MODES=['coop'],EDGES=['fire','jump','dodge','skill'];
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v),finite=v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1e7;
const fields=(v,allowed)=>obj(v)&&Object.keys(v).every(k=>allowed.includes(k));
function input(v){return fields(v,['moveX','moveY','up','down','left','right','fire','jump','dodge','skill','actionAssist'])&&Object.entries(v).every(([k,x])=>k==='moveX'||k==='moveY'?finite(x)&&Math.abs(x)<=1:typeof x==='boolean');}
function data(v,depth=0){if(depth>5)return false;if(v===null||typeof v==='boolean')return true;if(typeof v==='number')return finite(v);if(typeof v==='string')return v.length<=100;if(Array.isArray(v))return v.length<=512&&v.every(x=>data(x,depth+1));if(!obj(v)||Object.keys(v).length>80)return false;return Object.entries(v).every(([k,x])=>/^[A-Za-z][A-Za-z0-9]*$/.test(k)&&data(x,depth+1));}
function snapshot(v){
 const keys=['players','enemies','fallen','bolts','effects','wave','spawn','spawnClock','elapsed','score','kills','t','bossSpawned','impactStop','ending','revives','rescueCooldown','finished'];
 if(!fields(v,keys)||Object.keys(v).length!==keys.length||!data(v)||!Array.isArray(v.players)||v.players.length!==2||!v.players.every(p=>obj(p)&&Number.isInteger(p.hero)&&p.hero>=0&&p.hero<=6&&finite(p.x)&&finite(p.y)&&finite(p.hp)&&finite(p.max)&&p.max>0&&p.hp>=0&&p.hp<=p.max&&typeof p.down==='boolean'&&typeof p.clip==='string'&&finite(p.clipTime)&&obj(p.buttons)))return false;
 if(!['enemies','fallen','bolts','effects'].every(k=>Array.isArray(v[k]))||v.enemies.length>80||v.fallen.length>80||v.bolts.length>200||v.effects.length>512)return false;
 if(!v.enemies.every(e=>obj(e)&&['boss','grunt','brute','ranged'].includes(e.type)&&finite(e.x)&&finite(e.y)&&finite(e.hp)&&finite(e.max)&&e.max>0&&Number.isSafeInteger(e.netId)&&e.netId>0&&typeof e.clip==='string'&&finite(e.clipTime)))return false;
 if(!Number.isInteger(v.wave)||v.wave<1||v.wave>3||!Number.isInteger(v.spawn)||v.spawn<0||!Number.isInteger(v.kills)||v.kills<0||!Number.isInteger(v.revives)||v.revives<0||v.revives>2||typeof v.finished!=='boolean'||typeof v.bossSpawned!=='boolean'||!['score','elapsed','t','spawnClock','impactStop','rescueCooldown'].every(k=>finite(v[k])))return false;
 return v.ending===null||obj(v.ending)&&typeof v.ending.win==='boolean'&&finite(v.ending.result)&&typeof v.ending.note==='string'&&finite(v.ending.time);
}
class Adapter{
 constructor({mode,hero=0,remoteHero=3,host,locale='zh',chapter=1,difficulty='normal',finish=()=>{},sfx=()=>{}}){if(mode!=='coop')throw Error('mode');this.mode=mode;this.host=host;this.lastTick=-1;this.queue=[];this.corrections=0;this.game=root.BioSuiteGames.g01({hero,remoteHero,multiplayer:true,authority:host,chapter,difficulty,I:{hero:locale==='ja'?['バーナー','MJ','モーモー','葉宝','ゼリー','野菜','オラクル']:['Burner','MJ','Moo','Ye Bao','Jelly','Veggie','Oracle']},finish,sfx});this.game.w=960;this.game.h=540;this.game.start();}
 step(dt,local,remote){if(!this.host)throw Error('guest-authority');this.game.setRemoteInput(remote);this.game.update(dt,local);}
 capture(){if(!this.host)throw Error('guest-authority');return this.game.networkSnapshot();}
 result(v=this.capture()){return {win:!!v.ending?.win,score:Math.floor(v.ending?.result??v.score),kills:v.kills,revives:v.revives};}
 reliableKey(v){return `${v.wave}:${v.kills}:${v.players.map(p=>p.down).join(':')}:${v.finished}`;}
 receive(tick,v,immediate=false){if(!Number.isSafeInteger(tick)||tick<0||tick<this.lastTick||tick===this.lastTick&&!immediate||!snapshot(v))return false;this.lastTick=tick;const state=structuredClone(v),row={tick,state,at:performance.now()};if(immediate){this.queue=[row];this.game.applyNetworkState(state);return true;}this.queue.push(row);if(this.queue.length>8)this.queue.shift();return true;}
 render(now=performance.now()){
  if(this.host||!this.queue.length)return;const last=this.queue.at(-1),target=Math.min(last.tick,last.tick+(now-last.at)*.12-7.2);let a=this.queue[0],b=a;for(const row of this.queue){if(row.tick<=target)a=row;if(row.tick>=target){b=row;break;}b=row;}
  const state=structuredClone(a.state),alpha=b.tick===a.tick?0:Math.max(0,Math.min(1,(target-a.tick)/(b.tick-a.tick)));
  for(let i=0;i<2;i++)if(a.state.players[i].down===b.state.players[i].down)for(const k of ['x','y','z'])state.players[i][k]+=(b.state.players[i][k]-state.players[i][k])*alpha;
  const next=new Map(b.state.enemies.map(e=>[e.netId,e]));for(const e of state.enemies){const n=next.get(e.netId);if(n)for(const k of ['x','y'])e[k]+=(n[k]-e[k])*alpha;}
  state.t+=(b.state.t-state.t)*alpha;this.game.applyNetworkState(state);
 } // Guest interpolates rendering only and never advances combat.

 dispose(){this.queue=[];this.game.setRemoteInput({});}
}
root.BioG01Network=Object.freeze({TAG,MODES,EDGES,input,snapshot,Adapter,prepare:heroes=>[root.BioGuardianArt?.preload([...heroes,'enemy-grunt','enemy-brute','enemy-ranged','enemy-boss'])||Promise.resolve(true),root.BioWorldArt?.preload('street')||Promise.resolve(true)]});
})(typeof window==='undefined'?globalThis:window);
