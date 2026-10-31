// Deterministic P0 regression: no secret/SDP/ICE; verified against real session state machine.
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let now=1000;const w={};const cx={window:w,Math,structuredClone,performance:{now:()=>now},setTimeout,clearTimeout};
for(const name of ['session-runtime.js','games-core.js','peer-link.js','g05-network.js','friend-session.js'])
 vm.runInNewContext(fs.readFileSync('arcade/assets/'+name,'utf8'),cx);
const s=new w.BioFriends.Session();const sent=[];
s.role='host';s.hero=0;s.epoch=1;s.config={game:'g05',mode:'pong',heroes:[0,3]};s.createRound();s.phase='playing';s.countdown=0;s.link.send=(type)=>{sent.push(type);return true};
assert.equal(s.pause('user'),true);assert.equal(s.phase,'paused');assert.equal(s.pauseReason,'user');
assert.equal(s.resume(),true);assert.deepEqual(Array.from(s.resumeFlags),[true,false]);
assert.equal(s.pause('peer'),true,'duplicate pause remains idempotent');
assert.deepEqual(Array.from(s.resumeFlags),[true,false],'duplicate pause must keep first vote');
assert.equal(s.resume(),true);assert.equal(sent.filter(x=>x==='resume').length,1,'repeated vote sends once');
assert.equal(s.receive('resume',{epoch:1},'control'),true,'guest resume accepted');
assert.equal(s.phase,'playing','two votes resume same game');
assert.equal(s.pauseReason,null);
assert.deepEqual(Array.from(s.resumeFlags),[false,false],'votes reset after successful resume');
assert.equal(s.pause('user'),true,'second pause is a new generation');
assert.deepEqual(Array.from(s.resumeFlags),[false,false]);
assert.equal(s.receive('resume',{epoch:1},'control'),true);
assert.equal(s.resume(),true);assert.equal(s.phase,'playing','reverse vote order resumes');
s.tick=121;s.remoteAt=now-2000;s.update(1/60);assert.equal(s.phase,'playing','background 1Hz input not falsely disconnected');
now+=600;s.update(1/60);assert.equal(s.phase,'paused','true input silence still pauses safely');
assert.equal(s.pauseReason,'input-timeout');
const diag=s.link.diagnose();assert.equal(diag.ice,'none');assert.equal(diag.control,'none');
assert(!('sdp' in diag)&&!('ip' in diag)&&!('token' in diag),'diagnostics have no secrets');
s.link.pc={connectionState:'failed',iceConnectionState:'failed',iceGatheringState:'complete',localDescription:{sdp:'v=0\r\na=candidate:1 1 udp 100 192.0.2.1 55000 typ host\r\na=candidate:2 1 udp 100 198.51.100.1 55001 typ srflx\r\n'},remoteDescription:{sdp:'v=0\r\na=candidate:9 1 udp 100 203.0.113.9 55002 typ host\r\n'},close(){}};
s.link.close('disconnected');
const failure=s.link.diagnose();
assert.equal(failure.connection,'failed');assert.equal(failure.ice,'failed');
assert.equal(failure.candidates.host,1);assert.equal(failure.candidates.srflx,1);assert.equal(failure.candidates.relay,0);
assert.equal(failure.remoteCandidates.host,1,'remote candidate types retained after failure');
assert.equal(failure.remoteCandidates.srflx,0);
assert(!JSON.stringify(failure).includes('192.0.2.1')&&!JSON.stringify(failure).includes('198.51.100.1')&&!JSON.stringify(failure).includes('203.0.113.9'),'never expose local or remote ICE addresses after failure');

console.log('PASS pause/resume idempotence, both vote orders, 2.5s safe input timeout and private diagnostics');
