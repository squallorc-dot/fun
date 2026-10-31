// Real local Workerd WebSockets with synthetic source IP. No SDP, room codes or tokens are printed.
const assert=require('node:assert/strict'),WS=require(process.env.WS_TEST_PATH||'ws');
(async()=>{
 const endpoint='http://127.0.0.1:8787',origin='http://127.0.0.1:8790',ip='203.0.113.2';
 const r=await fetch(endpoint+'/rooms',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':ip}});assert.equal(r.status,201);const room=await r.json(),clients=[];
 async function open(){const ws=new WS(endpoint.replace('http','ws')+'/rooms/'+room.room+'/socket',{headers:{Origin:origin,'CF-Connecting-IP':ip}});clients.push(ws);ws.records=[];ws.on('message',data=>ws.records.push(JSON.parse(data.toString())));await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject)});return ws;}
 async function wait(ws,type){const deadline=Date.now()+5000;while(Date.now()<deadline){const item=ws.records.find(m=>m.type===type);if(item)return item;await new Promise(r=>setTimeout(r,10));}throw Error('timeout waiting for '+type);}
 try{
  const host=await open();host.send(JSON.stringify({v:1,type:'auth',role:'host',token:room.host}));const firstAuth=await wait(host,'authenticated');
  const first=await open();first.send(JSON.stringify({v:1,type:'join-request'}));const pending=await wait(host,'join-request');await wait(first,'waiting-approval');first.close();const cancelled=await wait(host,'join-cancelled');assert.equal(cancelled.id,pending.id);
  host.records=[];let guest=await open();guest.send(JSON.stringify({v:1,type:'join-request'}));const request=await wait(host,'join-request');assert(!guest.records.some(m=>m.type==='authenticated'));host.send(JSON.stringify({v:1,type:'join-decision',id:request.id,accept:true}));const approved=await wait(guest,'join-approved');guest.send(JSON.stringify({v:1,type:'auth',role:'guest',token:approved.token}));const guestAuth=await wait(guest,'authenticated');await wait(host,'peer-joined');
  guest.records=[];host.terminate();await wait(guest,'peer-left');assert.equal(guest.readyState,WS.OPEN,'peer signaling stays open during host interruption');
  const restored=await open();restored.send(JSON.stringify({v:1,type:'auth',role:'host',token:firstAuth.resumeToken,resume:true}));const secondAuth=await wait(restored,'authenticated');assert.notEqual(secondAuth.resumeToken,firstAuth.resumeToken,'resume token rotates');
  const intruder=await open();intruder.send(JSON.stringify({v:1,type:'auth',role:'host',token:firstAuth.resumeToken,resume:true}));await new Promise((resolve,reject)=>{intruder.once('close',resolve);setTimeout(()=>reject(Error('replay accepted')),5000).unref();});assert(!intruder.records.some(m=>m.type==='authenticated'),'replay cannot replace active host');
  restored.records=[];guest.terminate();await wait(restored,'peer-left');const returningGuest=await open();returningGuest.send(JSON.stringify({v:1,type:'auth',role:'guest',token:guestAuth.resumeToken,resume:true}));const guestRestored=await wait(returningGuest,'authenticated');assert.notEqual(guestRestored.resumeToken,guestAuth.resumeToken,'guest credential rotates');guest=returningGuest;
  restored.records=[];guest.records=[];restored.send(JSON.stringify({v:1,type:'retry-ready',attempt:1}));await new Promise(r=>setTimeout(r,100));assert(!restored.records.some(m=>m.type==='retry-start'),'cannot retry without guest consent');guest.send(JSON.stringify({v:1,type:'retry-ready',attempt:1}));assert.equal((await wait(restored,'retry-start')).attempt,1);assert.equal((await wait(guest,'retry-start')).attempt,1);
  restored.records=[];restored.send(JSON.stringify({v:1,type:'retry-ready',attempt:1}));await wait(restored,'retry-denied');
  restored.send(JSON.stringify({v:1,type:'leave'}));await new Promise((resolve,reject)=>{guest.once('close',resolve);setTimeout(()=>reject(Error('host leave did not close room')),5000).unref();});
  console.log('PASS local Workerd: real WebSocket code approval, interruption recovery, replay denial and explicit leave');
 }finally{for(const c of clients)c.terminate();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
