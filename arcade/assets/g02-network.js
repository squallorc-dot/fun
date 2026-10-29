/* Private G02 adapter. Physics runs only in the host iframe at parent-driven 120 Hz. */
((root)=>{'use strict';
const TAG='g02-coop-6b-v1',MODES=['defense'],EDGES=['fire','dodge','skill'];
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v),finite=v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1;
function input(v){return object(v)&&Object.keys(v).every(k=>['moveX','moveY','up','down','left','right','fire','jump','dodge','skill','actionAssist'].includes(k))&&Object.entries(v).every(([k,x])=>k==='moveX'||k==='moveY'?finite(x):typeof x==='boolean');}
function snapshot(v){return object(v)&&Object.keys(v).length===2&&Object.keys(v).every(k=>['state','finished'].includes(k))&&typeof v.finished==='boolean'&&root.BioG02State.valid(v.state)&&v.finished===['victory','defeat'].includes(v.state.phase);}
const movement=v=>({moveX:Number(v.moveX)||0,moveY:Number(v.moveY)||0,fire:!!v.fire,dodge:!!v.dodge,skill:!!v.skill});
class Adapter{
 constructor({mode,hero=0,remoteHero=3,host,locale='zh',chapter=1,difficulty='normal',epoch,finish=()=>{},onFailure=()=>{},onSnapshot=()=>{}}){
  if(mode!=='defense'||!Number.isSafeInteger(epoch)||epoch<1)throw Error('g02-config');
  this.host=host;this.epoch=epoch;this.finish=finish;this.onFailure=onFailure;this.onSnapshot=onSnapshot;this.lastTick=-1;this.seq=-1;this.ack=-1;this.controlSeq=-1;this.applySeq=-1;this.started=false;this.lastState=null;this.pending=null;this.closed=false;this.corrections=0;
  const frame=document.createElement('iframe');this.frame=frame;frame.title=locale==='ja'?'都市防衛戦':'城市防衛戰';frame.src=new URL('../../'+(locale==='ja'?'ja':'zh')+'/shooter.html',location.href).href;frame.style.cssText='position:absolute;inset:0;width:100%;height:100%;border:0;pointer-events:none;z-index:1';
  const viewport=document.getElementById('viewport');if(!viewport)throw Error('g02-viewport');this.canvas=document.getElementById('game-canvas');this.canvas.style.visibility='hidden';viewport.appendChild(frame);
  this.game={w:600,h:600,_finished:false,draw:()=>{if(this.started)this.post('coop-net-paint');},inspectCombat:()=>({score:this.lastState?.state.game.score||0}),inspectCoop:()=>this.lastState?.state.game||null};
  this.listener=e=>{if(this.closed||e.origin!==location.origin||e.source!==frame.contentWindow||e.data?.source!=='bio-city-shooter')return;const m=e.data;
   if(m.type==='ready'){this.post('coop-net-init',{role:host?'host':'guest',hero,remoteHero,chapter,difficulty});return;}
   if(m.version!==1||m.epoch!==this.epoch)return;
   if(m.type==='coop-net-ack'&&host&&Number.isSafeInteger(m.seq)&&m.seq>this.ack&&m.seq<=this.seq){this.ack=m.seq;return;}
   if(m.type==='coop-net-overflow'){this.fail('snapshot-overflow');return;}
   if(m.type==='coop-net-phase'){
    if(m.phase==='load-error'){this.fail('asset-unavailable');return;}
    if(m.phase==='started'){this.started=true;if(host)this.post('coop-net-capture');else this.applyPending();}
    if(host&&(m.phase==='ended'||m.phase==='paused'))this.post('coop-net-capture');return;
   }
   if(m.type==='coop-net-frame'&&host&&Number.isSafeInteger(m.seq)&&m.seq>=-1&&m.seq<=this.seq&&root.BioG02State.valid(m.state)){
    this.lastState={state:m.state,finished:['victory','defeat'].includes(m.state.phase)};
    if(this.lastState.finished&&!this.game._finished){this.game._finished=true;this.finish();}else this.onSnapshot();return;
   }
  };
  root.addEventListener('message',this.listener);this.timer=setTimeout(()=>{if(!this.started||host&&!this.lastState)this.fail('startup-timeout');},20000);
 }
 post(command,fields={}){if(!this.closed)this.frame.contentWindow?.postMessage({source:'bio-city-hub',command,version:1,epoch:this.epoch,...fields},location.origin);}
 fail(reason){if(this.closed||this.failed)return;this.failed=reason;this.onFailure(reason);}
 isReady(){return !this.failed&&this.started&&!!this.lastState;}
 canStep(){return this.seq-this.ack<30;}
 step(dt,local,remote){if(!this.host||!this.isReady()||!this.canStep()||Math.abs(dt-1/120)>1e-8)throw Error('g02-step');const seq=++this.seq;this.post('coop-net-step',{seq,local:movement(local),remote:movement(remote),snapshot:seq%6===0});}
 capture(){if(!this.host||!this.lastState)throw Error('g02-state-unavailable');return this.lastState;}
 result(v=this.capture()){return {win:v.state.phase==='victory',score:v.state.game.score,kills:v.state.game.kills,revives:v.state.game.revives};}
 reliableKey(v){const g=v.state.game;return `${g.wave}:${g.kills}:${g.p.down}:${g.p2.down}:${v.finished}`;}
 applyPending(){if(!this.started||!this.pending)return;this.post('coop-net-apply',{seq:++this.applySeq,state:this.pending.state.state});this.pending=null;}
 receive(tick,v,immediate=false){if(this.host||!Number.isSafeInteger(tick)||tick<0||tick<this.lastTick||tick===this.lastTick&&!immediate||!snapshot(v))return false;this.lastTick=tick;this.lastState=structuredClone(v);this.pending={tick,state:this.lastState};this.applyPending();return true;}
 render(){}
 pause(value){if(this.host&&this.started)this.post('coop-net-pause',{seq:++this.controlSeq,paused:value});}
 dispose(){if(this.closed)return;this.post('coop-net-close',{seq:++this.controlSeq});this.closed=true;clearTimeout(this.timer);root.removeEventListener('message',this.listener);this.frame.remove();if(this.canvas)this.canvas.style.visibility='';this.pending=null;this.lastState=null;}
}
root.BioG02Network=Object.freeze({TAG,MODES,EDGES,input,snapshot,Adapter,prepare:()=>[Promise.resolve(true)]});
})(typeof window==='undefined'?globalThis:window);
