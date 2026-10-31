/* Shared manual WebRTC transport. No signaling service, analytics or persistence. */
((root)=>{'use strict';
const V=1,MAX_SDP=120000,MAX_PACKET=32768;
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v),keys=(v,names)=>object(v)&&Object.keys(v).every(k=>names.includes(k));
function description(text,kind){
 if(typeof text!=='string'||text.length<30||text.length>MAX_SDP)throw Error('description-size');
 let v;try{v=JSON.parse(text);}catch{throw Error('description-format');}
 if(!keys(v,['v','kind','sdp','sid'])||v.v!==V||v.kind!==kind||typeof v.sdp!=='string'||!v.sdp.startsWith('v=0')||v.sdp.length>MAX_SDP||typeof v.sid!=='string'||!/^[a-f0-9]{32}$/.test(v.sid))throw Error('description-format');
 return v;
}
const percentile=(a,q)=>a.length?a.slice().sort((x,y)=>x-y)[Math.ceil(a.length*q)-1]:null;
class Link{
 constructor({onState=()=>{},onMessage=()=>{}}={}){this.onState=onState;this.onMessage=onMessage;this.generation=0;this.timers=new Set();this.channels={};this.state='idle';this.pairingTimeout=30000;this.gatherCancel=new Set();this.randomState=12939;this.impairment={delay:0,loss:0,jitter:0};this.lastDiagnostic=null;this.resetStats();}
 resetStats(){this.earlyMessages=[];this.stats={sent:0,received:0,rejected:0,dropped:0,buffered:0,rtts:[]};this.seq={control:0,input:0};this.received={control:-1,input:-1};this.buckets={};this.pingId=0;this.lastReceived=performance.now();this.pendingPings=new Map();this.deadlines={control:0,input:0};}
 status(value){if(this.state===value)return;this.state=value;this.onState(value);}
 later(fn,ms){const generation=this.generation,id=setTimeout(()=>{this.timers.delete(id);if(generation===this.generation)fn();},ms);this.timers.add(id);return id;}
 close(reason='closed'){
  // Capture safe, address-free RTC states before closing an unsuccessful pairing.
  if(this.pc)this.lastDiagnostic=this.diagnose();
  this.generation++;for(const cancel of this.gatherCancel)cancel();this.gatherCancel.clear();for(const id of this.timers)clearTimeout(id);this.timers.clear();this.pendingPings?.clear();
  this.earlyMessages=[];
  const pc=this.pc;this.pc=null;for(const dc of Object.values(this.channels)){dc.onopen=dc.onclose=dc.onmessage=dc.onerror=null;try{dc.close();}catch{}}this.channels={};try{pc?.close();}catch{}
  this.local='';this.sid='';this.status(reason);
 }
 make(role,sid){
  this.close('idle');this.resetStats();this.lastDiagnostic=null;this.role=role;this.sid=sid;this.status('pairing');
  const generation=this.generation,pc=new RTCPeerConnection({iceServers:[]});this.pc=pc;
  pc.ondatachannel=e=>{if(generation===this.generation)this.attach(e.channel);else e.channel.close();};
  pc.onconnectionstatechange=()=>{if(generation!==this.generation)return;if(['failed','disconnected','closed'].includes(pc.connectionState))this.close('disconnected');};
  if(role==='host'){this.attach(pc.createDataChannel('control',{ordered:true}));this.attach(pc.createDataChannel('input',{ordered:false,maxRetransmits:0}));}
  this.later(()=>{if(this.state==='pairing')this.close('timeout');},this.pairingTimeout);
  return {pc,generation};
 }
 async gather(pc,generation){
  if(pc.iceGatheringState!=='complete')await new Promise((resolve,reject)=>{
   const cancel=()=>{end();reject(Error('cancelled'));};
   const end=()=>{pc.removeEventListener('icegatheringstatechange',check);clearTimeout(timer);this.gatherCancel.delete(cancel);};
   const check=()=>{if(generation!==this.generation){end();reject(Error('cancelled'));}else if(pc.iceGatheringState==='complete'){end();resolve();}};
   const timer=setTimeout(()=>{end();reject(Error('gather-timeout'));},15000);this.gatherCancel.add(cancel);pc.addEventListener('icegatheringstatechange',check);check();
  });
  if(generation!==this.generation||this.pc!==pc)throw Error('cancelled');
  if(!/^a=candidate:/m.test(pc.localDescription.sdp))throw Error('no-host-candidates');
  return pc.localDescription.sdp;
 }
 async offer(){
  const bytes=crypto.getRandomValues(new Uint8Array(16)),sid=[...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');const {pc,generation}=this.make('host',sid);
  try{await pc.setLocalDescription(await pc.createOffer());const sdp=await this.gather(pc,generation);return this.local=JSON.stringify({v:V,kind:'offer',sid,sdp});}catch{if(generation===this.generation)this.close('failed');throw Error('offer-failed');}
 }
 async answer(text){
  const d=description(text,'offer'),{pc,generation}=this.make('guest',d.sid);
  try{await pc.setRemoteDescription({type:'offer',sdp:d.sdp});await pc.setLocalDescription(await pc.createAnswer());const sdp=await this.gather(pc,generation);return this.local=JSON.stringify({v:V,kind:'answer',sid:d.sid,sdp});}catch{if(generation===this.generation)this.close('failed');throw Error('answer-failed');}
 }
 async accept(text){
  const d=description(text,'answer');if(this.role!=='host'||!this.pc||d.sid!==this.sid||this.pc.signalingState!=='have-local-offer')throw Error('answer-state');
  const pc=this.pc,generation=this.generation;try{await pc.setRemoteDescription({type:'answer',sdp:d.sdp});if(generation!==this.generation)throw Error('cancelled');}catch{throw Error('answer-failed');}
 }
 attach(dc){
  const channel=dc.label;if(!['control','input'].includes(channel)||this.channels[channel]){dc.close();return;}this.channels[channel]=dc;dc.binaryType='arraybuffer';
  const generation=this.generation;
  dc.onopen=()=>{if(generation!==this.generation)return;if(this.state==='pairing'&&Object.values(this.channels).filter(c=>c.readyState==='open').length===2){this.local='';this.status('connected');const pending=this.earlyMessages;this.earlyMessages=[];for(const [label,data]of pending){if(generation!==this.generation)break;this.receive(label,data);}if(generation===this.generation)this.heartbeat();}};
  dc.onclose=dc.onerror=()=>{if(generation===this.generation)this.close('disconnected');};dc.onmessage=e=>{if(generation!==this.generation)return;if(this.state==='pairing'){if(typeof e.data!=='string'||e.data.length>MAX_PACKET||this.earlyMessages.length>=16){this.close('invalid');return;}this.earlyMessages.push([channel,e.data]);}else this.receive(channel,e.data);};
 }
 rate(channel){const now=performance.now(),b=this.buckets[channel]||(this.buckets[channel]={at:now,n:0});if(now-b.at>=1000){b.at=now;b.n=0;}return ++b.n<=(channel==='input'?150:100);}
 receive(channel,text){
  if(typeof text!=='string'||text.length>MAX_PACKET||!this.rate(channel)){this.stats.rejected++;return;}
  let v;try{v=JSON.parse(text);}catch{this.stats.rejected++;return;}
  if(!keys(v,['v','sid','seq','type','data'])||v.v!==V||v.sid!==this.sid||!Number.isSafeInteger(v.seq)||v.seq<0||v.seq<=this.received[channel]||v.seq>1e9||v.seq-this.received[channel]>1000||typeof v.type!=='string'||v.type.length>32||!object(v.data)){this.stats.rejected++;return;}
  if(v.type==='ping'||v.type==='pong'){
   if(channel!=='control'||!keys(v.data,['id'])||!Number.isSafeInteger(v.data.id)){this.stats.rejected++;return;}
   if(v.type==='ping')this.send('pong',{id:v.data.id});else{const sent=this.pendingPings.get(v.data.id);if(sent!==undefined){this.pendingPings.delete(v.data.id);const rtt=performance.now()-sent;if(rtt>=0&&rtt<10000){this.stats.rtts.push(rtt);if(this.stats.rtts.length>2048)this.stats.rtts.shift();}}}
  }else if(this.onMessage(v.type,v.data,channel)===false)return;
  this.received[channel]=v.seq;this.lastReceived=performance.now();this.stats.received++;
 }
 send(type,data,fast=false){
  const channel=fast?'input':'control',dc=this.channels[channel];if(this.state!=='connected'||dc?.readyState!=='open')return false;
  const text=JSON.stringify({v:V,sid:this.sid,seq:this.seq[channel]++,type,data});if(text.length>MAX_PACKET)return false;
  if(dc.bufferedAmount>131072){this.stats.buffered++;if(!fast)this.close('congested');return false;}
  const p=this.impairment;if(fast&&p.loss>0&&this.noise()<p.loss){this.stats.dropped++;return true;}
  const transmit=()=>{if(dc.readyState==='open'&&dc.bufferedAmount<=131072){try{dc.send(text);this.stats.sent++;}catch{this.close('disconnected');}}};
  const delay=Math.max(0,p.delay+(p.jitter?(this.noise()-.5)*p.jitter:0));if(delay){const due=fast?performance.now()+delay:Math.max(this.deadlines.control,performance.now()+delay);this.deadlines[channel]=due;this.later(transmit,Math.max(0,due-performance.now()));}else transmit();return true;
 }
 heartbeat(){
  const id=++this.pingId||1;this.pingId=id;this.pendingPings.set(id,performance.now());this.send('ping',{id});
  for(const [key,at]of this.pendingPings)if(performance.now()-at>10000)this.pendingPings.delete(key);
  if(performance.now()-this.lastReceived>5000){this.close('timeout');return;}
  this.later(()=>this.heartbeat(),500);
 }
 diagnose(){
  const pc=this.pc;
  if(!pc)return this.lastDiagnostic?{...this.lastDiagnostic,state:this.state}:{state:this.state,connection:'none',ice:'none',gathering:'none',control:'none',input:'none',candidates:{host:0,srflx:0,relay:0},remoteCandidates:{host:0,srflx:0,relay:0}};
  // Only ICE candidate type COUNTS are retained. Never expose SDP, addresses or credentials.
  const count=sdp=>{
   const summary={host:0,srflx:0,relay:0};
   for(const line of (sdp||'').split(/\r?\n/)){
    const match=/^a=candidate:[^\r\n]*\btyp (host|srflx|relay)\b/.exec(line);
    if(match)summary[match[1]]++;
   }
   return summary;
  };
  return {state:this.state,connection:pc.connectionState||'none',ice:pc.iceConnectionState||'none',gathering:pc.iceGatheringState||'none',control:this.channels.control?.readyState||'none',input:this.channels.input?.readyState||'none',candidates:count(pc.localDescription?.sdp),remoteCandidates:count(pc.remoteDescription?.sdp)};
 }
 measure(){const a=this.stats.rtts;return {state:this.state,sent:this.stats.sent,received:this.stats.received,rejected:this.stats.rejected,dropped:this.stats.dropped,buffered:this.stats.buffered,rtt50:percentile(a,.5),rtt95:percentile(a,.95),jitter:a.length>1?a.slice(1).reduce((n,v,i)=>n+Math.abs(v-a[i]),0)/(a.length-1):0,samples:a.length};}
 noise(){this.randomState=(Math.imul(this.randomState,1664525)+1013904223)>>>0;return this.randomState/4294967296;}
 // Controlled application-layer impairment for diagnostics, not a fake RTC link.
 simulate({delay=0,loss=0,jitter=0}={}){if(!Number.isFinite(delay)||delay<0||delay>250||!Number.isFinite(loss)||loss<0||loss>.05||!Number.isFinite(jitter)||jitter<0||jitter>50)throw Error('impairment-range');this.impairment={delay,loss,jitter};}
}
root.BioPeer=Object.freeze({Link,description,VERSION:V,MAX_PACKET});
})(typeof window==='undefined'?globalThis:window);
