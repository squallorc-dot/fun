/* Versioned lobby and host-authoritative rounds, independent of any test page. */
((root)=>{'use strict';
const PROTOCOL=1,APP_TAG='friends-v1',HERO_CAP='feature:hero-v1',ACTIVE=['countdown','playing','paused'];
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v),keys=(v,list)=>object(v)&&Object.keys(v).every(k=>list.includes(k));
const integer=(v,max=1e8)=>Number.isSafeInteger(v)&&v>=0&&v<=max,hero=v=>integer(v,6),name=v=>typeof v==='string'&&v.length<=48&&!/[\u0000-\u001f\u007f]/.test(v);
const q=(a,p)=>a.length?a.slice().sort((x,y)=>x-y)[Math.ceil(a.length*p)-1]:null;
class Session{
 constructor({readInput=()=>({}),onChange=()=>{},sfx=()=>{},locale='zh',adapters={g05:root.BioG05Network,...(root.BioG01Network?{g01:root.BioG01Network}:{}),...(root.BioG02Network?{g02:root.BioG02Network}:{}),...(root.BioG06Network?{g06:root.BioG06Network}:{})}}={}){
  this.adapters=Object.freeze({...adapters});this.capabilities=Object.entries(this.adapters).flatMap(([id,m])=>m.MODES.map(mode=>id+':'+mode+'@'+m.TAG)).concat(HERO_CAP).sort();
  this.readInput=readInput;this.onChange=onChange;this.sfx=sfx;this.locale=locale;this.link=new root.BioPeer.Link({onState:s=>this.transport(s),onMessage:(...m)=>this.receive(...m)});this.clock=root.BioArcadeSession.simulation();this.phase='idle';this.epoch=0;this.tick=0;this.readyFlags=[false,false];this.resumeFlags=[false,false];this.resultCount=0;this.totalResults=0;this.rejected=0;this.fps=[];this.inputLatency=[];this.sentInputs=new Map();this.edges={fire:0,jump:0};this.held={};this.remote={};this.remoteEdges={fire:0,jump:0};this.pulses={};this.remoteAt=0;this.lastInputSeq=-1;this.inputSeq=0;this.closed=false;
 }
 meta(game=this.config?.game||'g05'){return this.adapters[game];}
 edgeNames(){return this.meta()?.EDGES||['fire','jump'];}
 emptyEdges(){return Object.fromEntries(this.edgeNames().map(k=>[k,0]));}
 changed(){this.onChange(this.inspect());}
 transport(state){
  if(state==='connected'){this.phase='lobby';this.link.send('hello',{protocol:PROTOCOL,engine:APP_TAG,role:this.role,hero:this.hero,room:this.room||'',games:this.capabilities});if(this.role==='host'&&this.peerHello)this.configure('pong');}
  else if(state==='pairing')this.phase='pairing';
  else {clearTimeout(this.heroRequestTimer);this.heroRequestTimer=null;this.pendingHero=null;this.clearRound();this.phase=state==='idle'?'idle':'disconnected';}
  this.changed();
 }
 clearRound(){this.adapter?.dispose();this.adapter=null;this.clock.clear();this.readyFlags=[false,false];this.resumeFlags=[false,false];this.remote={};this.remoteEdges=this.emptyEdges();this.pulses={};this.held={};this.edges=this.emptyEdges();this.lastInputSeq=-1;this.inputSeq=0;this.sentInputs.clear();this.resultCount=0;this.result=null;this.lastScore=null;this.tick=0;this.remoteAt=performance.now();this.configAck=false;this.preparing=false;this.readyTask=(this.readyTask||0)+1;}
 setHero(value){if(!hero(value)||this.phase!=='lobby'||!this.configAck||this.preparing||this.readyFlags.some(Boolean)||!this.peerHello?.games.includes(HERO_CAP)||this.pendingHero!=null)return false;if(value===this.hero)return true;if(this.role==='guest'){this.pendingHero=value;if(!this.link.send('hero-request',{epoch:this.epoch,hero:value})){this.pendingHero=null;return false;}if(this.pendingHero!==null)this.heroRequestTimer=setTimeout(()=>{this.pendingHero=null;this.heroRequestTimer=null;this.changed();},5000);this.changed();return true;}if(this.role==='host'){if(!this.link.send('hero-update',{epoch:this.epoch,hero:value}))return false;this.hero=value;return this.configure(this.config.mode,this.config.game);}return false;}
 prepareAuto(role,room='',selectedHero=0){if(!['host','guest'].includes(role)||!name(room)||!hero(selectedHero)||['pairing','connected'].includes(this.link.state))throw Error('room-settings');this.peerHello=null;this.config=null;this.pendingHero=null;this.role=role;this.room=role==='host'?room:'';this.hero=selectedHero;this.epoch=0;}
 async host(room='',selectedHero=0){if(!name(room)||!hero(selectedHero))throw Error('room-settings');this.peerHello=null;this.config=null;this.pendingHero=null;this.role='host';this.room=room;this.hero=selectedHero;this.epoch=0;return this.link.offer();}
 async join(text,selectedHero=3){if(!hero(selectedHero))throw Error('hero');this.peerHello=null;this.config=null;this.pendingHero=null;this.role='guest';this.hero=selectedHero;this.epoch=0;return this.link.answer(text);}
 accept(text){return this.link.accept(text);}
 configure(mode=this.config?.mode||'pong',game=this.config?.game||'g05',options={}){
  if(this.role!=='host'||this.link.state!=='connected'||!this.peerHello||!this.meta(game)?.MODES.includes(mode)||!this.peerHello.games.includes(game+':'+mode+'@'+this.meta(game).TAG)||ACTIVE.includes(this.phase))return false;
  if(['g01','g02','g06'].includes(game)&&(!Number.isInteger(options.chapter??1)||(options.chapter??1)<1||(options.chapter??1)>5||!['normal','hard','expert'].includes(options.difficulty??'normal')))return false;const previous=this.config;this.clearRound();this.epoch++;this.config={game,mode,engine:this.meta(game).TAG,heroes:[this.hero,this.peerHello.hero],room:this.room,epoch:this.epoch,...(['g01','g02','g06'].includes(game)?{chapter:options.chapter??(previous?.game===game?previous.chapter:1),difficulty:options.difficulty??(previous?.game===game?previous.difficulty:'normal')}:{})};this.phase='lobby';this.link.send('config',this.config);this.changed();return true;
 }
 async ready(value=true){
  if(this.phase!=='lobby'||!this.config||!this.configAck)return false;const epoch=this.epoch,task=++this.readyTask;
  if(value){this.preparing=true;this.changed();try{await root.BioArcadeSession.prepare(this.meta().prepare(this.config.heroes));}catch{if(task!==this.readyTask)return false;this.preparing=false;this.changed();throw Error('asset-unavailable');}if(task!==this.readyTask||epoch!==this.epoch||this.phase!=='lobby')return false;}
  this.preparing=false;this.readyFlags[this.role==='host'?0:1]=!!value;this.link.send('ready',{epoch:this.epoch,value:!!value});this.tryStart();this.changed();return true;
 }
 createRound(){
  this.adapter?.dispose();this.clock.clear();this.tick=0;this.resultCount=0;this.result=null;this.inputSeq=0;this.lastInputSeq=-1;this.edges=this.emptyEdges();this.held={};this.remote={};this.pulses={};this.remoteEdges=this.emptyEdges();this.remoteAt=performance.now();this.sentInputs.clear();this.countdown=3;this.phase='countdown';
  this.adapter=new (this.meta().Adapter)({mode:this.config.mode,hero:this.config.heroes[0],remoteHero:this.config.heroes[1],host:this.role==='host',locale:this.locale,chapter:this.config.chapter,difficulty:this.config.difficulty,epoch:this.epoch,onFailure:()=>this.link.close('engine-error'),onSnapshot:()=>{if(this.phase==='paused')this.publish(true);},sfx:(freq,len)=>{this.sfx(freq,len);if(this.role==='host')this.link.send('sound',{epoch:this.epoch,freq,len});},finish:()=>this.finish()});
 }
 tryStart(){if(this.role==='host'&&this.phase==='lobby'&&this.configAck&&this.readyFlags.every(Boolean)){this.createRound();this.link.send('start',{epoch:this.epoch,engine:this.config.engine,mode:this.config.mode});this.publish(true);}}
 finish(){
  if(this.role!=='host'||this.resultCount||!this.adapter)return;this.resultCount=1;this.totalResults++;this.phase='finished';this.remote={};const state=this.adapter.capture();this.result=this.adapter.result(state);this.publish(true,'result');this.changed();
 }
 publish(reliable=false,type='frame'){
  if(!this.adapter||this.role!=='host'||this.adapter.isReady&&!this.adapter.isReady())return;this.link.send(type,{epoch:this.epoch,tick:this.tick,phase:this.phase,countdown:this.countdown,ack:this.lastInputSeq,state:this.adapter.capture()},!reliable);
 }
 pause(reason='user'){
  if(!ACTIVE.includes(this.phase))return false;
  // A duplicate pause must never erase an already collected two-party resume vote.
  if(this.phase==='paused')return true;
  if(this.role==='guest'){this.link.send('pause',{epoch:this.epoch});this.remote={};return true;}
  this.phase='paused';this.pauseReason=reason;this.remote={};this.pulses={};this.clock.clear();this.resumeFlags=[false,false];this.adapter?.pause?.(true);this.publish(true);this.changed();return true;
 }
 resume(){if(this.phase!=='paused')return false;const side=this.role==='host'?0:1;if(this.resumeFlags[side])return true;this.resumeFlags[side]=true;this.link.send('resume',{epoch:this.epoch});this.tryResume();this.changed();return true;}
 tryResume(){if(this.role==='host'&&this.phase==='paused'&&this.resumeFlags.every(Boolean)){this.phase=this.countdown>0?'countdown':'playing';this.pauseReason=null;this.resumeFlags=[false,false];this.remote={};this.pulses={};this.held={};this.remoteAt=performance.now();this.clock.clear();this.adapter?.pause?.(false);this.publish(true);this.changed();}}
 lobby(){
  if(this.link.state!=='connected')return false;
  if(this.role==='guest'){this.link.send('lobby',{epoch:this.epoch});return true;}
  this.clearRound();this.phase='lobby';return this.configure(this.config?.mode||'pong');
 }
 leave(){this.link.send('leave',{});this.link.close('closed');this.clearRound();this.phase='disconnected';this.changed();}
 receive(type,d,channel){try{const valid=this.handle(type,d,channel);if(!valid)this.rejected++;return !!valid;}catch{this.rejected++;return false;}}
 handle(type,d,channel){
  if(type==='hello'){
   if(channel!=='control'||!keys(d,['protocol','engine','role','hero','room','games'])||d.protocol!==PROTOCOL||d.engine!==APP_TAG||d.role===(this.role)||!['host','guest'].includes(d.role)||!hero(d.hero)||!name(d.room)||!Array.isArray(d.games)||d.games.length>16||!d.games.every(x=>typeof x==='string'&&x.length<100)||!d.games.some(x=>this.capabilities.includes(x))){this.link.close('incompatible');return false;}
   if(this.peerHello)return JSON.stringify(this.peerHello)===JSON.stringify(d);this.peerHello=d;if(this.role==='guest')this.room=d.room;else if(this.link.state==='connected')this.configure('pong');this.changed();return true;
  }
  if(type==='leave'){if(channel!=='control'||!keys(d,[]))return false;this.link.close('closed');return true;}
  if(type==='config'){
   if(this.role!=='guest'||channel!=='control'||!this.peerHello||!keys(d,['g01','g02','g06'].includes(d.game)?['game','mode','engine','heroes','room','epoch','chapter','difficulty']:['game','mode','engine','heroes','room','epoch'])||['g01','g02','g06'].includes(d.game)&&(!Number.isInteger(d.chapter)||d.chapter<1||d.chapter>5||!['normal','hard','expert'].includes(d.difficulty))||!this.meta(d.game)?.MODES.includes(d.mode)||d.engine!==this.meta(d.game).TAG||!this.capabilities.includes(d.game+':'+d.mode+'@'+d.engine)||!integer(d.epoch)||d.epoch<=this.epoch||!Array.isArray(d.heroes)||d.heroes.length!==2||!d.heroes.every(hero)||d.heroes[0]!==this.peerHello.hero||d.heroes[1]!==this.hero&&d.heroes[1]!==this.pendingHero||!name(d.room))return false;
   if(d.heroes[1]===this.pendingHero){this.hero=this.pendingHero;this.pendingHero=null;clearTimeout(this.heroRequestTimer);this.heroRequestTimer=null;}this.clearRound();this.epoch=d.epoch;this.config=structuredClone(d);this.room=d.room;this.phase='lobby';this.configAck=true;this.link.send('ack',{epoch:this.epoch});this.changed();return true;
  }
  if(type==='hero-request'||type==='hero-update'){
   if(channel!=='control'||!keys(d,['epoch','hero'])||!integer(d.epoch)||d.epoch>this.epoch||d.epoch<this.epoch-4||!hero(d.hero)||this.phase!=='lobby'||this.readyFlags.some(Boolean)||!this.peerHello?.games.includes(HERO_CAP))return false;
   if(type==='hero-request'&&this.role==='host'){this.peerHello.hero=d.hero;return this.configure(this.config.mode,this.config.game);}
   if(type==='hero-update'&&this.role==='guest'){this.peerHello.hero=d.hero;this.changed();return true;}return false;
  }
  if(!integer(d.epoch)||d.epoch!==this.epoch||!this.config)return false;
  if(type==='ack'){if(this.role!=='host'||channel!=='control'||!keys(d,['epoch']))return false;this.configAck=true;this.changed();return true;}
  if(type==='ready'){
   if(channel!=='control'||this.phase!=='lobby'||!keys(d,['epoch','value'])||typeof d.value!=='boolean')return false;this.readyFlags[this.role==='host'?1:0]=d.value;this.tryStart();this.changed();return true;
  }
  if(type==='start'){
   if(this.role!=='guest'||channel!=='control'||this.phase!=='lobby'||!this.readyFlags.every(Boolean)||!keys(d,['epoch','engine','mode'])||d.mode!==this.config.mode||d.engine!==this.config.engine)return false;this.createRound();this.changed();return true;
  }
  if(type==='input'){
   if(this.role!=='host'||channel!=='input'||!ACTIVE.includes(this.phase)||!keys(d,['epoch','seq','tick','input','edges'])||!integer(d.seq)||d.seq<=this.lastInputSeq||!integer(d.tick)||Math.abs(d.tick-this.tick)>240||!this.meta().input(d.input)||!keys(d.edges,this.edgeNames())||Object.keys(d.edges).length!==this.edgeNames().length||!this.edgeNames().every(key=>integer(d.edges[key])))return false;
   for(const key of this.edgeNames()){if(d.edges[key]<this.remoteEdges[key]||d.edges[key]-this.remoteEdges[key]>8)return false;}
   for(const key of this.edgeNames()){if(d.edges[key]>this.remoteEdges[key])this.pulses[key]=true;this.remoteEdges[key]=d.edges[key];}
   this.lastInputSeq=d.seq;this.remote={...d.input};this.remoteAt=performance.now();return true;
  }
  if(type==='sound'){if(this.role!=='guest'||channel!=='control'||!keys(d,['epoch','freq','len'])||!Number.isFinite(d.freq)||d.freq<80||d.freq>1600||!Number.isFinite(d.len)||d.len<=0||d.len>.3)return false;this.sfx(d.freq,d.len);return true;}
  if(type==='pause'){if(this.role!=='host'||channel!=='control'||!keys(d,['epoch']))return false;return this.pause('peer');}
  if(type==='resume'){if(channel!=='control'||this.phase!=='paused'||!keys(d,['epoch']))return false;this.resumeFlags[this.role==='host'?1:0]=true;this.tryResume();this.changed();return true;}
  if(type==='lobby'){if(this.role!=='host'||channel!=='control'||!keys(d,['epoch']))return false;return this.lobby();}
  if(type==='frame'||type==='result'){
   if(this.role!=='guest'||!this.adapter||!keys(d,['epoch','tick','phase','countdown','ack','state'])||!integer(d.tick)||!integer(d.ack+1)||!['countdown','playing','paused','finished'].includes(d.phase)||!Number.isFinite(d.countdown)||d.countdown<0||d.countdown>3||type==='result'&&channel!=='control'||d.phase==='finished'&&!d.state.finished||d.state.finished&&d.phase!=='finished')return false;
   if(d.tick<this.adapter.lastTick)return false;
   const immediate=channel==='control';if(!this.adapter.receive(d.tick,d.state,immediate))return false;
   if(d.ack>=0&&this.sentInputs.has(d.ack)){this.inputLatency.push(performance.now()-this.sentInputs.get(d.ack));if(this.inputLatency.length>512)this.inputLatency.shift();for(const key of this.sentInputs.keys())if(key<=d.ack)this.sentInputs.delete(key);}
   this.tick=Math.max(this.tick,d.tick);this.countdown=d.countdown;
   const old=this.phase;this.phase=d.phase;
   if(type==='result'&&!this.resultCount){this.resultCount=1;this.totalResults++;this.result=this.adapter.result(d.state);}
   if(old!==this.phase){this.clock.clear();this.changed();}return true;
  }
  return false;
 }
 update(dt){
  if(Number.isFinite(dt)&&dt>0&&dt<1){this.fps.push(dt);if(this.fps.length>120)this.fps.shift();}
  if(!this.adapter||!ACTIVE.includes(this.phase)||this.adapter.isReady&&!this.adapter.isReady())return;
  if(this.role==='host'){
   if(this.phase==='paused')return;
   // Browser background tabs can deliver neutral inputs at roughly 1 Hz. Keep 350 ms neutral-input fallback,
   // then fail safely closed after 2.5 s of true silence; never keep replaying stale controls.
   if(performance.now()-this.remoteAt>2500&&this.tick>120){this.pause('input-timeout');return;}
   this.clock.advance(dt,step=>{
    if(this.countdown<=0&&this.adapter.canStep&&!this.adapter.canStep()){this.pause('engine-backpressure');return false;}this.tick++;if(this.countdown>0){this.countdown=Math.max(0,this.countdown-step);if(this.countdown<1e-8){this.countdown=0;this.phase='playing';this.remote={};this.pulses={};this.publish(true);this.changed();}}
    else{const remote=performance.now()-this.remoteAt>350?{}:{...this.remote,...this.pulses};this.pulses={};this.adapter.step(step,this.readInput(step),remote);}
    const state=this.adapter.capture(),score=this.adapter.reliableKey(state);if(score!==this.lastScore){this.lastScore=score;this.publish(true);}else if(this.tick%6===0)this.publish();
    return !this.adapter.game._finished&&this.phase!=='paused';
   });
  }else{
   if(this.phase!=='paused')this.clock.advance(dt,()=>{this.tick++;if(this.tick%4===0){const local=this.readInput(1/30);for(const key of this.edgeNames()){if(local[key]&&!this.held[key])this.edges[key]++;this.held[key]=!!local[key];}const seq=this.inputSeq++;this.sentInputs.set(seq,performance.now());if(this.sentInputs.size>256)this.sentInputs.delete(this.sentInputs.keys().next().value);this.link.send('input',{epoch:this.epoch,seq,tick:this.tick,input:local,edges:{...this.edges}},true);}});
   else{if(!this.pausedInputAt||performance.now()-this.pausedInputAt>100){this.pausedInputAt=performance.now();this.link.send('input',{epoch:this.epoch,seq:this.inputSeq++,tick:this.tick,input:{},edges:{...this.edges}},true);}}
   this.adapter.render();
  }
 }
 inspect(){return {phase:this.phase,role:this.role||null,room:this.room||'',epoch:this.epoch,tick:this.tick,pauseReason:this.phase==='paused'?(this.pauseReason||'peer'):null,resume:[...this.resumeFlags],rtc:this.link.diagnose?.()||null,config:this.config?structuredClone(this.config):null,configAck:!!this.configAck,ready:[...this.readyFlags],resume:[...this.resumeFlags],preparing:!!this.preparing,result:this.result?structuredClone(this.result):null,resultCount:this.resultCount,totalResults:this.totalResults,remoteInput:{...this.remote},rejected:this.rejected,metrics:{...this.link.measure(),fps:this.fps.length?this.fps.length/this.fps.reduce((n,v)=>n+v,0):null,inputAck50:q(this.inputLatency,.5),inputAck95:q(this.inputLatency,.95),corrections:this.adapter?.corrections||0}};}
}
root.BioFriends=Object.freeze({Session,PROTOCOL,adapters:Object.freeze({g05:root.BioG05Network,...(root.BioG01Network?{g01:root.BioG01Network}:{}),...(root.BioG02Network?{g02:root.BioG02Network}:{}),...(root.BioG06Network?{g06:root.BioG06Network}:{})})});
})(typeof window==='undefined'?globalThis:window);
