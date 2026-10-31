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
assert.equal(link.state,'pairing','transient ICE disconnect cannot immediately destroy pairing');
pc.connectionState='connected';pc.onconnectionstatechange();fire(8000);
assert.equal(link.state,'pairing','recovered link ignores its stale disconnect timer');
pc.connectionState='disconnected';pc.onconnectionstatechange();fire(8000);
assert.equal(link.state,'disconnected','sustained ICE disconnect remains bounded');
assert.equal(link.timers.size,0,'close cleans timers');
pair=link.make('host','b'.repeat(32));pc=pair.pc;
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
console.log('PASS mobile RTC: transient ICE recovery, bounded 8s disconnect, background timer clamp, 12s foreground silence');
