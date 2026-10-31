// Verify opt-in STUN config, manual host-only isolation and host-only fallback.
// Offline deterministic fake peers, no actual IP, credential, SDP or external network.
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root={BioG05Network:{MODES:['pong'],TAG:'test-v1'},BioArcadeSession:{simulation:()=>({})}};
const peers=[];let serial=0;const pending=new Map();
class FakePeer {
 constructor(config){this.configuration=structuredClone(config);this.connectionState='new';this.iceConnectionState='new';this.iceGatheringState='gathering';this.localDescription={sdp:'v=0\r\na=candidate:1 1 udp 1 host.local 1234 typ host\r\n'};peers.push(this);}
 createDataChannel(label){return {label,readyState:'connecting',close(){this.readyState='closed';}};}
 addEventListener(){} removeEventListener(){}
 close(){this.connectionState='closed';}
}
const cx={window:root,RTCPeerConnection:FakePeer,performance:{now:()=>1},JSON,Math,structuredClone,
 setTimeout:(fn,ms)=>{const id=++serial;pending.set(id,{fn,ms});return id;},
 clearTimeout:id=>pending.delete(id)};
for(const file of ['peer-link.js','friend-session.js'])vm.runInNewContext(fs.readFileSync('arcade/assets/'+file,'utf8'),cx);
const manual=new root.BioFriends.Session();
assert.equal(manual.link.betaStun,false);
manual.link.make('host','a'.repeat(32));
assert.equal(peers[0].configuration.iceServers.length,0,'manual RTC keeps no third-party ICE service');
const automatic=new root.BioFriends.Session({betaStun:true});
assert.equal(automatic.link.betaStun,true);
automatic.link.make('host','b'.repeat(32));
assert.equal(peers[1].configuration.iceServers.length,1,'Beta has exactly one STUN endpoint');
assert.equal(peers[1].configuration.iceServers[0].urls,'stun:stun.l.google.com:19302');
assert(!JSON.stringify(peers[1].configuration).includes('turn:'),'no relay or paid TURN');
const {pc,generation}=automatic.link.make('guest','c'.repeat(32));
assert.equal(peers[2].configuration.iceServers[0].urls,'stun:stun.l.google.com:19302','guest gets STUN');
(async()=>{
 const result=automatic.link.gather(pc,generation);
 const deadline=[...pending].find(([,v])=>v.ms===15000);
 assert(deadline,'STUN gather deadline bounded');
 pending.delete(deadline[0]);deadline[1].fn();
 assert((await result).includes('typ host'),'blocked STUN falls back to direct host ICE');
 const none=automatic.link.make('guest','d'.repeat(32));
 none.pc.localDescription={sdp:'v=0\r\n'};
 const fail=automatic.link.gather(none.pc,none.generation);
 const timer=[...pending].find(([,v])=>v.ms===15000);
 assert(timer,'fallback deadline is bounded with no host candidate');
 pending.delete(timer[0]);timer[1].fn();
 await assert.rejects(fail,/gather-timeout/,'no-candidate must fail closed');
 manual.link.close();automatic.link.close();
 console.log('PASS Beta STUN: single approved Google endpoint, both RTC roles, manual isolation, host fallback, no TURN');
})().catch(err=>{console.error(err);process.exitCode=1;});
