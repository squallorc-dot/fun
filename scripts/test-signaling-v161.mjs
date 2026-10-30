// Run against `wrangler dev --local` with origin http://127.0.0.1:8790.
// No SDP, ICE candidates, room tokens or addresses are printed or persisted.
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import {chromium} from 'playwright';
const origin='http://127.0.0.1:8790',endpoint='http://127.0.0.1:8787';
const server=http.createServer((req,res)=>{const names={'/peer-link.js':'arcade/assets/peer-link.js','/friend-signaling.js':'arcade/assets/friend-signaling.js'};res.setHeader('content-type',req.url in names?'text/javascript':'text/html');res.end(req.url in names?fs.readFileSync(names[req.url]):'<!doctype html><script src="/peer-link.js"></script><script src="/friend-signaling.js"></script>');});
await new Promise(r=>server.listen(8790,'127.0.0.1',r));
const browsers=[];
try{
 const bad=await fetch(endpoint+'/rooms',{method:'POST',headers:{Origin:'https://invalid.example'}});assert.equal(bad.status,403);
 const created=await fetch(endpoint+'/rooms',{method:'POST',headers:{Origin:origin}});assert.equal(created.status,201);const room=await created.json();assert.match(room.room,/^[A-Z2-9]{8}$/);assert.match(room.host,/^[a-f0-9]{64}$/);assert.notEqual(room.host,room.guest);
 for(let i=0;i<2;i++)browsers.push(await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})}));
 const pages=await Promise.all(browsers.map(b=>b.newPage()));await Promise.all(pages.map(p=>p.goto(origin)));
 const open=async(p,role,token)=>p.evaluate(async({endpoint,room,role,token})=>{const ws=new WebSocket(endpoint.replace('http','ws')+'/rooms/'+room+'/socket');window.testSocket=ws;window.messages=[];window.records=[];ws.onmessage=e=>{const m=JSON.parse(e.data);window.messages.push(m.type);window.records.push(m);};await new Promise((resolve,reject)=>{ws.onopen=()=>{ws.send(JSON.stringify({v:1,type:'auth',role,token}));resolve();};ws.onerror=reject;});},{endpoint,room:room.room,role,token});
 await open(pages[0],'host',room.host);await pages[0].waitForFunction(()=>messages.includes('authenticated'));
 const idle=await browsers[1].newPage();await idle.goto(origin);await idle.evaluate(({endpoint,room})=>{window.idleSocket=new WebSocket(endpoint.replace('http','ws')+'/rooms/'+room+'/socket');},{endpoint,room:room.room});await idle.waitForFunction(()=>idleSocket.readyState===WebSocket.CLOSED,null,{timeout:15000});await idle.close();assert.equal(await pages[0].evaluate(()=>testSocket.readyState),1,'authenticated host survives unauthenticated timeout');
 await open(pages[1],'guest','0'.repeat(64));await pages[1].waitForFunction(()=>testSocket.readyState===WebSocket.CLOSED);
 await open(pages[1],'guest',room.guest);await Promise.all(pages.map(p=>p.waitForFunction(()=>messages.includes('peer-joined'))));
 const third=await browsers[1].newPage();await third.goto(origin);await open(third,'host',room.host);await third.waitForFunction(()=>testSocket.readyState===WebSocket.CLOSED);await third.close();
 await pages[0].evaluate(()=>testSocket.send(JSON.stringify({v:1,type:'offer',description:'test-only'})));await pages[1].waitForFunction(()=>messages.includes('offer'));
 await pages[1].evaluate(()=>testSocket.send(JSON.stringify({v:1,type:'answer',description:'test-only'})));await pages[0].waitForFunction(()=>messages.includes('answer'));
 await pages[0].evaluate(()=>testSocket.close());await pages[1].waitForFunction(()=>testSocket.readyState===WebSocket.CLOSED);
 const codeRoom=await (await fetch(endpoint+'/rooms',{method:'POST',headers:{Origin:origin}})).json();
 await pages[0].evaluate(async({endpoint,codeRoom})=>{const ws=new WebSocket(endpoint.replace('http','ws')+'/rooms/'+codeRoom.room+'/socket');window.codeHost=ws;window.codeHostMessages=[];ws.onmessage=e=>codeHostMessages.push(JSON.parse(e.data));await new Promise(resolve=>ws.onopen=resolve);ws.send(JSON.stringify({v:1,type:'auth',role:'host',token:codeRoom.host}));},{endpoint,codeRoom});
 await pages[0].waitForFunction(()=>codeHostMessages.some(m=>m.type==='authenticated'));
 await pages[1].evaluate(async({endpoint,codeRoom})=>{const ws=new WebSocket(endpoint.replace('http','ws')+'/rooms/'+codeRoom.room+'/socket');window.codeGuest=ws;window.codeGuestMessages=[];ws.onmessage=e=>{const m=JSON.parse(e.data);codeGuestMessages.push(m);if(m.type==='join-approved')ws.send(JSON.stringify({v:1,type:'auth',role:'guest',token:m.token}));};await new Promise(resolve=>ws.onopen=resolve);ws.send(JSON.stringify({v:1,type:'join-request'}));},{endpoint,codeRoom});
 await pages[0].waitForFunction(()=>codeHostMessages.some(m=>m.type==='join-request'));await pages[1].waitForFunction(()=>codeGuestMessages.some(m=>m.type==='waiting-approval'));assert.equal(await pages[1].evaluate(()=>codeGuestMessages.some(m=>m.type==='authenticated')),false,'code alone does not authenticate');
 await pages[0].evaluate(()=>codeHost.send(JSON.stringify({v:1,type:'join-decision',id:codeHostMessages.find(m=>m.type==='join-request').id,accept:true})));await pages[1].waitForFunction(()=>codeGuestMessages.some(m=>m.type==='authenticated'));await pages[0].evaluate(()=>codeHost.close());
 console.log('PASS local Worker: origin, credentials, host-approved room code, duplicate roles, relay and cleanup');
 if(process.argv.includes('--rtc')){
  const fresh=await (await fetch(endpoint+'/rooms',{method:'POST',headers:{Origin:origin}})).json();
  await Promise.all(pages.map((p,i)=>p.evaluate(({endpoint,fresh,i})=>{window.link=new BioPeer.Link({onMessage:(type,data)=>{if(type==='test')window.received=data.value;}});window.pairing=BioFriendSignaling.connect({endpoint,room:fresh.room,role:i?'guest':'host',token:i?fresh.guest:fresh.host,link});window.outcome='pending';pairing.result.then(()=>window.outcome='connected',e=>window.outcome=e.message);},{endpoint,fresh,i})));
  await Promise.all(pages.map(p=>p.waitForFunction(()=>outcome!=='pending',null,{timeout:50000})));
  const outcomes=await Promise.all(pages.map(p=>p.evaluate(()=>({state:outcome,candidates:(link.pc?.localDescription?.sdp.match(/^a=candidate:/gm)||[]).length}))));
  if(outcomes.some(x=>x.state!=='connected')){console.error('RTC NOT ESTABLISHED: '+JSON.stringify(outcomes));process.exitCode=1;}
  else {await pages[0].evaluate(()=>link.send('test',{value:'host'}));await pages[1].evaluate(()=>link.send('test',{value:'guest'}));await pages[0].waitForFunction(()=>received==='guest');await pages[1].waitForFunction(()=>received==='host');console.log('PASS true independent Chromium WebRTC DataChannels: bidirectional application data');}
 }
}finally{for(const b of browsers)await b.close();await new Promise(r=>server.close(r));}
