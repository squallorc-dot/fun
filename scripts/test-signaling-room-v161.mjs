import assert from 'node:assert/strict';
import {Room} from '../signaling/worker/worker.mjs';
const originalNow=Date.now;let now=1_000_000;Date.now=()=>now;
const digest=async s=>Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))).toString('hex');
const host='a'.repeat(64),guest='b'.repeat(64),db=new Map();let alarm=0,lock=Promise.resolve();
const sockets=[];
const state={storage:{async get(k){return db.get(k)},async put(k,v){db.set(k,structuredClone(v))},async setAlarm(t){alarm=t},async deleteAll(){db.clear()}},getWebSockets(){return sockets.filter(s=>s.readyState===1)},blockConcurrencyWhile(fn){const next=lock.then(fn);lock=next.catch(()=>{});return next;}};
const socket=()=>{const ws={readyState:1,attachment:{role:null,at:now,count:0,window:now},messages:[],serializeAttachment(v){this.attachment=structuredClone(v)},deserializeAttachment(){return structuredClone(this.attachment)},send(s){this.messages.push(JSON.parse(s))},close(){this.readyState=3}};sockets.push(ws);return ws;};
try{
 const room=new Room(state);await db.set('room',{host:await digest(host),guest:await digest(guest),expires:now+900000});
 const h=socket(),g=socket(),other=socket();
 await Promise.all([room.webSocketMessage(h,JSON.stringify({v:1,type:'auth',role:'host',token:host})),room.webSocketMessage(other,JSON.stringify({v:1,type:'auth',role:'host',token:host}))]);
 assert.equal([h,other].filter(x=>x.readyState===1).length,1,'one host wins concurrent role claim');
 const winner=h.readyState===1?h:other;
 await room.webSocketMessage(g,JSON.stringify({v:1,type:'auth',role:'guest',token:guest}));
 assert.equal(db.get('room').active,true);assert.equal(db.get('room').expires,now+4*60*60*1000,'active game does not expire at waiting deadline');
 const idle=socket();await room.schedule(db.get('room'));assert.equal(alarm,now+10000);now+=10001;await room.alarm();assert.equal(idle.readyState,3);assert.equal(winner.readyState,1);assert.equal(g.readyState,1);assert.equal(alarm,db.get('room').expires);
 await room.webSocketClose(g);assert(db.has('room'),'guest leave preserves room');
 await room.webSocketClose(winner);assert.equal(db.has('room'),false);assert.equal(g.readyState,3);
 console.log('PASS room: concurrent role claims, active deadline, unauthenticated timeout, guest and host cleanup');
}finally{Date.now=originalNow;}
