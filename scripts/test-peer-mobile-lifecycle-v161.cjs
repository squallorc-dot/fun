// Deterministic mobile transport regression; no real IP, SDP, ICE or credentials.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let now=1000,sequence=0;const jobs=new Map(),root={};
const setTimeoutFake=(fn,ms)=>{const id=++sequence;jobs.set(id,{fn,ms,at:now+ms});return id;};
const clearTimeoutFake=id=>jobs.delete(id);
function fire(ms){const found=[...jobs].find(([,j])=>j.ms===ms);assert(found,'expected '+ms+'ms timer');jobs.delete(found[0]);found[1].fn();}
class FakePC {
 constructor(){this.connectionState='new';this.iceConnectionState='new';this.iceGatheringState='complete';this.localDescription={sdp:'v=0\\r\\n'};}
 createDataChannel(label){return {label,readyState:'connecting',bufferedAmount:0,send(){},close(){this.readyState='closed';}};}
 close(){this.connectionState='closed';}
}
const document={visibilityState:'visible'};
vm.runInNewContext(fs.readFileSync('arcade/assets/peer-link.js','utf8'),{
 window:root,performance:{now:()=>now},RTCPeerConnection:FakePC,document,Math,JSON,
 setTimeout:setTimeoutFake,clearTimeout:clearTimeoutFake,TextEncoder
});
const link=new root.BioPeer.Link();
let pair=link.make('host','a'.repeat(32));
let pc=pair.pc;
pc.connectionState='disconnected';pc.onconnectionstatechange();
assert.equal(link.state,'pairing','initial ICE disconnected must not immediately destroy pairing');
assert(![...jobs.values()].some(j=>j.ms===8000),'pairing has no premature 8s RTC teardown');
pc.connectionState='connected';pc.onconnectionstatechange();
for(const dc of Object.values(link.channels))dc.readyState='open';
link.channels.input.onopen();
assert.equal(link.state,'connected','initial pairing recovers to two open data channels');
pc.connectionState='disconnected';pc.onconnectionstatechange();
assert.equal(link.state,'connected','existing match tolerates short ICE interruption');
pc.connectionState='connected';pc.onconnectionstatechange();fire(8000);
assert.equal(link.state,'connected','recovered session ignores stale disconnect timer');
pc.connectionState='disconnected';pc.onconnectionstatechange();fire(8000);
assert.equal(link.state,'disconnected','established link still closes after sustained 8s ICE loss');
assert.equal(link.timers.size,0,'close cleans timers');
pair=link.make('host','b'.repeat(32));pc=pair.pc;
pc.connectionState='disconnected';pc.onconnectionstatechange();
assert(![...jobs.values()].some(j=>j.ms===8000),'second pairing not cut off at 8s');
fire(30000);
assert.equal(link.state,'timeout','stalled initial pairing remains bounded by existing timeout');
pair=link.make('host','c'.repeat(32));pc=pair.pc;
for(const dc of Object.values(link.channels))dc.readyState='open';
link.channels.input.onopen();
assert.equal(link.state,'connected','two data channels open');
now+=60000;fire(500);assert.equal(link.state,'connected','mobile 60s timer clamp does not kill healthy RTC');
document.visibilityState='hidden';now+=60000;fire(500);
assert.equal(link.state,'connected','hidden mobile tab does not falsely time out');
document.visibilityState='visible';now+=500;fire(500);
assert.equal(link.state,'connected','returning to foreground remains connected');
// Continuous foreground timers with no incoming messages must still fail safely.
for(let i=0;i<30&&link.state==='connected';i++){now+=500;fire(500);}
assert.equal(link.state,'timeout','true foreground traffic silence remains bounded');
assert.equal(link.timers.size,0,'timeout cleans timers');
// The STUN/Relay Beta must request a relay and preserve the same live
// session during its existing recovery budget, not reset the game at 12s.
let relayRequests=0;
const beta=new root.BioPeer.Link({betaStun:true,onDegraded:()=>relayRequests++});
const betaPeer=beta.make('host','d'.repeat(32));
for(const dc of Object.values(beta.channels))dc.readyState='open';
beta.channels.input.onopen();
for(let i=0;i<32;i++){now+=500;fire(500);}
assert.equal(beta.state,'connected','Beta does not destroy an active round at the P2P silence threshold');
assert(relayRequests>0,'data-channel silence proactively requests a relay');
for(let i=0;i<180&&beta.state==='connected';i++){now+=500;fire(500);}
assert.equal(beta.state,'timeout','if the relay never becomes available, Beta still fails closed at its pre-existing recovery deadline');
assert.equal(beta.timers.size,0,'Beta timeout cleans timers');
// Advance deterministic timers by absolute fake time. Unlike a single fire(ms),
// this models multiple outstanding 20 Hz snapshots with one-way 50-100 ms delay.
function runDue(at){
 now=at;
 for(let count=0;count<1000;count++){
  const due=[...jobs].filter(([,task])=>task.at<=now).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];
  if(!due)return;
  jobs.delete(due[0]);due[1].fn();
 }
 throw Error('runDue timer loop did not settle');
}
const channel=label=>({label,readyState:'open',bufferedAmount:0,sent:[],send(text){this.sent.push(text);},close(){this.readyState='closed';}});
function directLink(sid='e'){
 const peer=new root.BioPeer.Link();
 peer.state='connected';peer.transport='p2p';peer.sid=sid.repeat(32);
 peer.channels={control:channel('control'),input:channel('input')};
 return peer;
}
// Simulate exactly 20 Hz outgoing frames, with RTT/2 transport impairment.
// No frame can be starved merely because the next 50 ms snapshot was queued.
for(const rtt of [100,150,200])for(const loss of [0,.03]){
 const peer=directLink('a');
 const total=40,start=now+1000,oneWay=rtt/2;
 peer.simulate({delay:oneWay,loss,jitter:0});
 for(let i=0;i<total;i++){
  runDue(start+i*50);
  assert.equal(peer.send('frame',{state:{tick:i}},true),true,'regular frame send remains accepted');
 }
 runDue(start+total*50+oneWay+1);
 const m=peer.measure();
 assert.equal(peer.channels.input.sent.length,m.sent,'only successful snapshots count as sent');
 assert.equal(m.sent+m.droppedSimulated,total,'normal latency cannot starve or prematurely replace frames');
 assert.equal(m.droppedBackpressure,0,'no backpressure drops when the DataChannel queue is empty');
 assert.equal(m.buffered,0,'no queue congestion from simulated latency alone');
 assert.equal(m.dropped,m.droppedSimulated,'simulated loss is independently classified');
 assert.equal(peer.state,'connected','normal test RTT must not tear down a connected peer');
 peer.close();
}
// Exercise a deterministic 3% impairment loss without depending on the RNG draw.
const artificialLoss=directLink('b');
artificialLoss.simulate({delay:0,loss:.03,jitter:0});
artificialLoss.noise=()=>0;
assert.equal(artificialLoss.send('frame',{state:{tick:1}},true),true);
assert.equal(artificialLoss.measure().droppedSimulated,1);
assert.equal(artificialLoss.measure().droppedBackpressure,0);
assert.equal(artificialLoss.channels.input.sent.length,0);
artificialLoss.close();
// The P2P check uses bufferedAmount at actual transmission, not when the
// delayed frame was scheduled. A later recovery must allow the next frame.
const delayed=directLink('c');
delayed.simulate({delay:50,loss:0,jitter:0});
assert.equal(delayed.send('frame',{state:{tick:1}},true),true);
delayed.channels.input.bufferedAmount=40000;
runDue(now+50);
assert.equal(delayed.channels.input.sent.length,0,'newly congested channel drops the pending frame');
assert.equal(delayed.measure().droppedBackpressure,1);
delayed.channels.input.bufferedAmount=0;
assert.equal(delayed.send('frame',{state:{tick:2}},true),true);
runDue(now+50);
assert.equal(delayed.channels.input.sent.length,1,'frame delivery resumes after P2P queue drains');
assert.equal(delayed.state,'connected','frame drop does not falsely disconnect the game');
delayed.close();
// P2P: 40 KiB input queue drops disposable frames only. The reliable control
// channel must deliver start/ready/pause/resume/result at the same pressure.
const p2p=directLink('d');
p2p.channels.input.bufferedAmount=40000;
assert.equal(p2p.send('frame',{state:{tick:1}},true),true,'dropping a disposable frame reports accepted');
assert.equal(p2p.channels.input.sent.length,0,'congested ordinary snapshot is discarded');
assert.equal(p2p.stats.dropped,1);
assert.equal(p2p.stats.droppedBackpressure,1);
assert.equal(p2p.stats.droppedSimulated,0);
assert.equal(p2p.stats.buffered,1);
assert.equal(p2p.state,'connected','discardable frame must not disconnect caller');
assert.equal(p2p.send('input',{seq:1},true),true,'guest input is exempt from low frame watermark');
assert.equal(p2p.channels.input.sent.length,1);
p2p.channels.control.bufferedAmount=40000;
const reliableTypes=['start','ready','pause','resume','result'];
for(const type of reliableTypes)assert.equal(p2p.send(type,{epoch:1},false),true,'P2P reliable '+type+' bypasses 32KiB');
assert.deepEqual(p2p.channels.control.sent.map(p=>JSON.parse(p).type),reliableTypes);
assert.equal(p2p.measure().transport,'P2P');
p2p.channels.input.bufferedAmount=0;
assert.equal(p2p.send('frame',{state:{tick:2}},true),true);
assert.equal(p2p.channels.input.sent.length,2,'fresh P2P frame is sent after backlog clears');
p2p.channels.control.bufferedAmount=140000;
// Closing a congested reliable link clears p2p.channels. Keep a reference
// to the original fake channel so the assertion still verifies no send.
const reliableControl=p2p.channels.control;
const reliableBefore=reliableControl.sent.length;
assert.equal(p2p.send('result',{epoch:1},false),false,'P2P reliable control over 128KiB fails closed');
assert.equal(reliableControl.sent.length,reliableBefore,'congested control was not silently accepted');
assert.equal(reliableControl.readyState,'closed','fail-closed shuts down the underlying control channel');
assert.equal(p2p.channels.control,undefined,'fail-closed clears the channel map');
assert.equal(p2p.state,'congested');
p2p.close();
// Relay: the test includes the mandatory reliable heartbeat emitted by useRelay.
let pendingRelay=40000;const relayPackets=[];
const relayed=new root.BioPeer.Link({betaStun:true});
relayed.state='connected';relayed.transport='p2p';relayed.sid='f'.repeat(32);
relayed.useRelay('f'.repeat(32),(label,payload)=>{relayPackets.push({label,payload});return true;},()=>pendingRelay,'ice-failed');
assert.equal(relayed.measure().transport,'Relay');
assert.equal(relayed.measure().relayReason,'ice-failed','handoff preserves local reason before RTC cleanup');
const initialRelayPackets=relayPackets.length;
assert(relayPackets.slice(0,initialRelayPackets).every(p=>p.label==='control'),'relay startup uses reliable heartbeat');
assert.equal(relayed.send('frame',{state:{tick:1}},true),true,'Relay frame drop does not disconnect caller');
assert.equal(relayPackets.length,initialRelayPackets);
assert.equal(relayed.stats.droppedBackpressure,1);
assert.equal(relayed.stats.droppedSimulated,0);
assert.equal(relayed.state,'connected');
for(const type of reliableTypes)assert.equal(relayed.send(type,{epoch:1},false),true,'Relay reliable '+type+' bypasses 32KiB');
assert.deepEqual(relayPackets.slice(initialRelayPackets).map(p=>JSON.parse(p.payload).type),reliableTypes);
pendingRelay=0;
assert.equal(relayed.send('frame',{state:{tick:2}},true),true);
assert.equal(relayPackets.length,initialRelayPackets+reliableTypes.length+1,'fresh Relay frame forwarded after congestion clears');
assert(relayed.measure().snapshotBytes50>0&&relayed.measure().snapshotBytes95>0,'Snapshot percentiles use UTF-8 lengths');
relayed.onMessage=()=>true;
const framePayload=JSON.stringify({v:1,sid:'f'.repeat(32),seq:0,type:'frame',data:{state:{tick:2}}});
relayed.receiveRelay('input',framePayload);
const count=relayed.stats.received;
relayed.receiveRelay('input',framePayload);
assert.equal(relayed.stats.received,count,'stale relay seq is rejected');
assert.equal(relayed.stats.rejected,1);
pendingRelay=140000;
const relayBefore=relayPackets.length;
assert.equal(relayed.send('result',{epoch:1},false),false,'Relay reliable control over 128KiB fails closed');
assert.equal(relayPackets.length,relayBefore,'blocked Relay control was not silently accepted');
assert.equal(relayed.state,'congested');
relayed.close();
console.log('PASS mobile RTC: 20Hz at 100/150/200ms RTT and 0/3% loss, 32KiB P2P/Relay frame backpressure with recovery, five reliable control types, 128KiB fail-closed protection and split drop counters');
