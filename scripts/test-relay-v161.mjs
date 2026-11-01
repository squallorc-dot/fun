import assert from 'node:assert/strict';
import {Room} from '../signaling/worker/worker.mjs';
// Real Room Durable Object message handler, fake socket only; no SDP or room
// capability is recorded. The regular Chromium suite covers actual RTC.
const hostToken='a'.repeat(64),guestToken='b'.repeat(64);
const digest=async s=>Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))).toString('hex');
const db=new Map(),sockets=[];
const storage={async get(k){return db.get(k)},async put(k,v){db.set(k,structuredClone(v))},async setAlarm(){},async deleteAll(){db.clear()}};
const state={storage,getWebSockets(){return sockets.filter(s=>s.readyState===1)},async blockConcurrencyWhile(fn){return fn()}};
function socket(){
 const s={readyState:1,info:{role:null,at:Date.now(),count:0,window:Date.now()},messages:[],
 serializeAttachment(v){this.info=structuredClone(v)},deserializeAttachment(){return structuredClone(this.info)},
 send(v){this.messages.push(JSON.parse(v))},close(){this.readyState=3}};
 sockets.push(s);return s;
}
const message=(room,s,type,data={})=>room.webSocketMessage(s,JSON.stringify({v:1,type,...data}));
const room=new Room(state);
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
await message(room,unauthorized,'relay-ready');
assert.equal(unauthorized.readyState,3,'unauthenticated peer cannot enable relay');
const oldCount=host.messages.length;
const forged=JSON.stringify({v:1,sid:'0'.repeat(32),seq:1,type:'hello',data:{}});
await message(room,guest,'relay-data',{channel:'control',payload:forged});
assert.equal(guest.readyState,3,'mismatched relay sid is rejected');
assert.equal(host.messages.length,oldCount,'invalid packet was not forwarded');
console.log('PASS relay: bilateral readiness, same sid, authenticated forward, no data persistence, unauthorized and forged packet rejection');
