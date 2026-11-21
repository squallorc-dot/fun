import assert from 'node:assert/strict';
import worker,{Room} from '../signaling/worker/worker.mjs';
// Real Room Durable Object message handler, fake socket only; no SDP or room
// capability is recorded. The regular Chromium suite covers actual RTC.
const hostToken='a'.repeat(64),guestToken='b'.repeat(64);
const digest=async s=>Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))).toString('hex');
const db=new Map(),sockets=[];let roomReads=0;
// Validate APAC placement at BOTH Worker ingress sites with existing gates.
const apacGets=[],betaOrigin='https://beta-test.example';
const betaHeaders={'Origin':betaOrigin,'CF-Connecting-IP':'203.0.113.1'};
const apiStub={fetch:async()=>new Response(null,{status:200})};
const rateStub={fetch:async()=>new Response(null,{status:204})};
const betaEnv={
 TEST_ENABLED:'true',TEST_EXPIRES_AT:String(Math.floor(Date.now()/1000)+3600),
 TEST_ALLOWED_IPS:'203.0.113.1',ALLOWED_ORIGINS:betaOrigin,RATE_SECRET:'a'.repeat(32),
 RATE_GATES:{idFromName:id=>id,get:()=>rateStub},
 ROOMS:{idFromName:id=>id,get:(id,options)=>{apacGets.push({id,options});return apiStub;}}
};
const createdByWorker=await worker.fetch(new Request(betaOrigin+'/rooms',{method:'POST',headers:betaHeaders}),betaEnv);
assert.equal(createdByWorker.status,201,'room creation keeps existing gate and response');
const roomInfo=await createdByWorker.json();
const connectedByWorker=await worker.fetch(new Request(betaOrigin+'/rooms/'+roomInfo.room+'/socket',{headers:{...betaHeaders,Upgrade:'websocket'}}),betaEnv);
assert.equal(connectedByWorker.status,200);
assert.equal(apacGets.length,2,'creation and WebSocket access both get the Room DO');
assert(apacGets.every(x=>x.id===roomInfo.room&&x.options?.locationHint==='apac'),'both paths specify APAC placement');
const storage={async get(k){if(k==='room')roomReads++;return db.get(k)},async put(k,v){db.set(k,structuredClone(v))},async setAlarm(){},async deleteAll(){db.clear()}};
const state={storage,getWebSockets(){return sockets.filter(s=>s.readyState===1)},async blockConcurrencyWhile(fn){return fn()}};
function socket(){
 const s={readyState:1,info:{role:null,at:Date.now(),count:0,window:Date.now()},messages:[],
 serializeAttachment(v){this.info=structuredClone(v)},deserializeAttachment(){return structuredClone(this.info)},
 send(v){this.messages.push(JSON.parse(v))},close(){this.readyState=3}};
 sockets.push(s);return s;
}
const message=(room,s,type,data={})=>room.webSocketMessage(s,JSON.stringify({v:1,type,...data}));
let room=new Room(state);
const created=await room.fetch(new Request('https://room.internal/create',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({host:await digest(hostToken),guest:await digest(guestToken)})}));
assert.equal(created.status,200);
const host=socket(),guest=socket(),unauthorized=socket();
await message(room,host,'auth',{role:'host',token:hostToken});
await message(room,guest,'auth',{role:'guest',token:guestToken});
assert.equal(db.get('room').relayActive,undefined,'relay starts closed');
await message(room,host,'relay-ready');
assert.equal(host.messages.some(m=>m.type==='relay-start'),false,'one ready client is insufficient');
assert(guest.messages.some(m=>m.type==='relay-propose'),'other peer is prompted to consent');
await message(room,guest,'relay-ready');
const hostStart=host.messages.find(m=>m.type==='relay-start'),guestStart=guest.messages.find(m=>m.type==='relay-start');
assert(hostStart&&guestStart&&hostStart.sid===guestStart.sid,'both clients receive same relay session');
assert.match(hostStart.sid,/^[a-f0-9]{32}$/);
const payload=JSON.stringify({v:1,sid:hostStart.sid,seq:0,type:'hello',data:{protocol:1}});
await message(room,host,'relay-data',{channel:'control',payload});
assert.deepEqual(guest.messages.findLast(m=>m.type==='relay-data'),{v:1,type:'relay-data',channel:'control',payload});
assert.equal(db.get('room').relaySid,hostStart.sid,'room stores only relay routing ID');
// Exercise a real traffic burst before room control. Relay packets must not
// exhaust the separate 8/s signaling budget during a user-approved retry.
const warmReads=roomReads;
for(let seq=1;seq<=24;seq++){
 const busyPayload=JSON.stringify({v:1,sid:hostStart.sid,seq,type:'hello',data:{protocol:1}});
 await message(room,host,'relay-data',{channel:'input',payload:busyPayload});
}
assert.equal(host.readyState,1,'ordinary Relay traffic must not close the authenticated host');
assert.equal(roomReads,warmReads,'authenticated Relay traffic never rereads storage per frame');
// Simulate Durable Object hibernation (memory loss) while sockets persist.
room=new Room(state);
const coldReads=roomReads;
for(let seq=25;seq<=26;seq++){
 const packet=JSON.stringify({v:1,sid:hostStart.sid,seq,type:'hello',data:{protocol:1}});
 await message(room,host,'relay-data',{channel:'input',payload:packet});
}
assert.equal(roomReads,coldReads+1,'rehydrated Room loads storage once after hibernation');
assert.equal(host.readyState,1,'rehydrated Relay authorization remains valid');
// A renewed match keeps the authenticated room but never reuses old Relay
// readiness or session IDs. Both players explicitly consent to retry.
await message(room,host,'retry-ready',{attempt:1});
assert.equal(host.messages.some(m=>m.type==='retry-start'),false,'single retry request cannot reset the room');
await message(room,guest,'retry-ready',{attempt:1});
assert.equal(db.get('room').relaySid,undefined,'paired retry clears stale relay routing ID');
assert.equal(db.get('room').relayActive,undefined,'paired retry closes old relay authorization');
assert.equal(host.info.relayReady,undefined,'host relay readiness reset');
assert.equal(guest.info.relayReady,undefined,'guest relay readiness reset');
assert(host.messages.some(m=>m.type==='retry-start')&&guest.messages.some(m=>m.type==='retry-start'),'both authorized players receive retry-start');
await message(room,host,'relay-ready');
const priorHostStarts=host.messages.filter(m=>m.type==='relay-start').length;
assert.equal(priorHostStarts,1,'one retry peer alone cannot enable relay');
await message(room,guest,'relay-ready');
const renewedHost=host.messages.filter(m=>m.type==='relay-start').at(-1);
const renewedGuest=guest.messages.filter(m=>m.type==='relay-start').at(-1);
assert(renewedHost.sid===renewedGuest.sid&&renewedHost.sid!==hostStart.sid,'second bilateral consent rotates relay SID');
await message(room,unauthorized,'relay-ready');
assert.equal(unauthorized.readyState,3,'unauthenticated peer cannot enable relay');
const oldCount=host.messages.length;
const forged=JSON.stringify({v:1,sid:'0'.repeat(32),seq:1,type:'hello',data:{}});
await message(room,guest,'relay-data',{channel:'control',payload:forged});
assert.equal(guest.readyState,3,'mismatched relay sid is rejected');
assert.equal(host.messages.length,oldCount,'invalid packet was not forwarded');
// Relay still has a bounded independent data budget; never make it unlimited.
for(let seq=100;seq<310&&host.readyState===1;seq++){
 const flood=JSON.stringify({v:1,sid:renewedHost.sid,seq,type:'hello',data:{}});
 await message(room,host,'relay-data',{channel:'input',payload:flood});
}
assert.equal(host.readyState,3,'over-budget Relay traffic is rejected even after successful room retry');
// Cached rooms must still be checked against wall-clock expiry on every frame.
const oldNow=Date.now,expires=db.get('room').expires;
const expired=socket();expired.info.role='host';expired.info.relayReady=true;
try{
 Date.now=()=>expires+1;
 const stale=JSON.stringify({v:1,sid:renewedHost.sid,seq:999,type:'hello',data:{}});
 await message(room,expired,'relay-data',{channel:'input',payload:stale});
}finally{Date.now=oldNow;}
assert.equal(expired.readyState,3,'expired cached room cannot forward an authenticated frame');
console.log('PASS relay: APAC room placement, hot-path cache, hibernation reload, expiry, independent data/signaling rates, retry, SID rotation and forged packet rejection');
