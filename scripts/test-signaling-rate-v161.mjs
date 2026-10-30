import assert from 'node:assert/strict';import worker,{RateGate} from '../signaling/worker/worker.mjs';
let now=100000;const original=Date.now;Date.now=()=>now;
const db=new Map();let alarm=0,lock=Promise.resolve();const state={storage:{async get(k){return db.get(k)},async put(k,v){db.set(k,structuredClone(v))},async delete(k){db.delete(k)},async setAlarm(v){alarm=v}},blockConcurrencyWhile(fn){const p=lock.then(fn);lock=p.catch(()=>{});return p;}};
try{
 const gate=new RateGate(state),req=kind=>new Request('https://rate.internal/'+kind,{method:'POST'});
 const simultaneous=await Promise.all(Array.from({length:20},()=>gate.fetch(req('create'))));assert.equal(simultaneous.filter(x=>x.status===204).length,12);assert.equal(simultaneous.filter(x=>x.status===429).length,8);assert.equal(db.get('create').count,12);
 const sockets=await Promise.all(Array.from({length:62},()=>gate.fetch(req('socket'))));assert.equal(sockets.filter(x=>x.status===204).length,60);assert.equal(sockets.filter(x=>x.status===429).length,2);assert.equal(alarm,now+60000);
 now+=60001;await gate.alarm();assert.equal(db.size,0);assert.equal((await gate.fetch(req('create'))).status,204);
 const make=(ip)=>new Request('https://worker.example/rooms',{method:'POST',headers:{Origin:'https://example.test',...(ip?{'CF-Connecting-IP':ip}:{})}});
 const testGate={TEST_ENABLED:'true',TEST_EXPIRES_AT:String(Math.floor(now/1000)+1000000000),TEST_ALLOWED_IPS:'192.0.2.4,192.0.2.5'};
 const missing=await worker.fetch(make('192.0.2.4'),{...testGate,ALLOWED_ORIGINS:'https://example.test'});assert.equal(missing.status,503,'missing secret fails closed');
 let seen='',ops=0;const env={...testGate,ALLOWED_ORIGINS:'https://example.test',RATE_SECRET:'x'.repeat(40),RATE_GATES:{idFromName(name){seen=name;return name},get(){return {async fetch(){ops++;return new Response(null,{status:429})}}}}};
 assert.equal((await worker.fetch(make(null),env)).status,403,'missing trusted address fails closed');assert.equal(ops,0);
 assert.equal((await worker.fetch(make('192.0.2.4'),env)).status,429);assert.match(seen,/^[a-f0-9]{64}$/);assert(!seen.includes('192.0.2.4'));
 const first=seen;await worker.fetch(make('192.0.2.5'),env);assert.notEqual(first,seen,'source keys are isolated');
 console.log('PASS rate gate: concurrent fixed windows, separate operations, reset, fail-closed and HMAC source isolation');
}finally{Date.now=original;}
