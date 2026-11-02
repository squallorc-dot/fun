// Deterministic mobile transport regression; no real IP, SDP, ICE or credentials.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let now=1000,sequence=0;const jobs=new Map(),root={};
const setTimeoutFake=(fn,ms)=>{const id=++sequence;jobs.set(id,{fn,ms});return id;};
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
 setTimeout:setTimeoutFake,clearTimeout:clearTimeoutFake
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
console.log('PASS mobile RTC: transient ICE recovery, 12s manual silence, proactive Beta relay and bounded recovery');
