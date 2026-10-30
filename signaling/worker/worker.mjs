// Signaling only. Game data stays on the existing WebRTC DataChannels.
const VERSION=1, ROOM_MS=15*60*1000, ACTIVE_MS=4*60*60*1000, AUTH_MS=10000, REQUEST_MS=60000, MAX_TEXT=125000, MAX_SOCKETS=4;
const roomPattern=/^[A-Z2-9]{8}$/, tokenPattern=/^[a-f0-9]{64}$/;
const json=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json','cache-control':'no-store',...headers}});
const randomHex=n=>Array.from(crypto.getRandomValues(new Uint8Array(n)),x=>x.toString(16).padStart(2,'0')).join('');
const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
function allowed(request,env){const origin=request.headers.get('Origin');return !!origin && String(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).includes(origin);}
function cors(request){return {'access-control-allow-origin':request.headers.get('Origin'),'vary':'Origin'};}
// The address is supplied by Cloudflare ingress. Only an HMAC-derived identifier
// is sent to the rate DO; no address is put in storage, paths, or logs.
async function limit(request,env,kind){
 const secret=env.RATE_SECRET,ip=request.headers.get('CF-Connecting-IP');
 if(typeof secret!=='string'||secret.length<32||!ip||ip.length>45||!/^[a-fA-F0-9:.]+$/.test(ip)||!env.RATE_GATES)return 'unavailable';
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('v1:'+ip.toLowerCase())));
 const id=Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
 try{const gate=env.RATE_GATES.get(env.RATE_GATES.idFromName(id));const response=await gate.fetch('https://rate.internal/'+kind,{method:'POST'});return response.status===204?'ok':response.status===429?'limited':'unavailable';}catch{return 'unavailable';}
}
async function guarded(request,env,kind,headers){const result=await limit(request,env,kind);return result==='ok'?null:json({error:result==='limited'?'rate-limited':'rate-unavailable'},result==='limited'?429:503,headers);}

export default {
 async fetch(request,env){
  if(!allowed(request,env))return json({error:'origin'},403);
  const url=new URL(request.url),headers=cors(request);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'access-control-allow-methods':'POST, GET, OPTIONS','access-control-allow-headers':'content-type','access-control-max-age':'600'}});
  if(request.method==='POST'&&url.pathname==='/rooms'){
   const denied=await guarded(request,env,'create',headers);if(denied)return denied;
   // The room code identifies a DO; two independent 256-bit capabilities authorize access.
   const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',bytes=crypto.getRandomValues(new Uint8Array(8));
   const room=Array.from(bytes,b=>alphabet[b%32]).join(''),host=randomHex(32),guest=randomHex(32);
   const stub=env.ROOMS.get(env.ROOMS.idFromName(room));
   const response=await stub.fetch('https://room.internal/create',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({host:await digest(host),guest:await digest(guest)})});
   if(!response.ok)return json({error:'create-failed'},503,headers);
   return json({v:VERSION,room,host,guest,expiresIn:ROOM_MS/1000},201,headers);
  }
  const match=/^\/rooms\/([A-Z2-9]{8})\/socket$/.exec(url.pathname);
  if(request.method==='GET'&&match&&request.headers.get('Upgrade')?.toLowerCase()==='websocket'){const denied=await guarded(request,env,'socket',headers);if(denied)return denied;return env.ROOMS.get(env.ROOMS.idFromName(match[1])).fetch(request);}
  return json({error:'not-found'},404,headers);
 }
};
export class Room {
 constructor(state){this.state=state;}
 async schedule(room){
  if(!room)return;
  const deadlines=this.state.getWebSockets().filter(ws=>ws.readyState===1).map(ws=>ws.deserializeAttachment()).filter(x=>x&&!x.role).map(x=>x.deadline??x.at+AUTH_MS);
  await this.state.storage.setAlarm(Math.min(room.expires,...deadlines));
 }
 async fetch(request){
  const url=new URL(request.url);
  if(url.pathname==='/create'&&request.method==='POST'){
   if(await this.state.storage.get('room'))return json({error:'exists'},409);
   let data;try{data=await request.json();}catch{return json({error:'format'},400);}
   if(!tokenPattern.test(data.host||'')||!tokenPattern.test(data.guest||'')||data.host===data.guest)return json({error:'format'},400);
   const expires=Date.now()+ROOM_MS;await this.state.storage.put('room',{host:data.host,guest:data.guest,guestOnce:true,guestExpires:expires,expires});await this.state.storage.setAlarm(expires);return json({ok:true});
  }
  const room=await this.state.storage.get('room');
  if(!room||room.expires<=Date.now())return json({error:'expired'},410);
  if(this.state.getWebSockets().length>=MAX_SOCKETS)return json({error:'full'},429);
  const pair=new WebSocketPair();this.state.acceptWebSocket(pair[1]);pair[1].serializeAttachment({role:null,at:Date.now(),count:0,window:Date.now()});await this.schedule(room);
  return new Response(null,{status:101,webSocket:pair[0]});
 }
 async webSocketMessage(ws,text){
  const info=ws.deserializeAttachment(),room=await this.state.storage.get('room');
  if(!info||!room||room.expires<=Date.now()||typeof text!=='string'||text.length>MAX_TEXT||new TextEncoder().encode(text).byteLength>MAX_TEXT){ws.close(1008,'invalid');return;}
  const now=Date.now();if(now-info.window>=1000){info.window=now;info.count=0;}if(++info.count>8){ws.close(1008,'rate');return;}
  let msg;try{msg=JSON.parse(text);}catch{ws.close(1008,'invalid');return;}
  if(!info.role){
   if(msg?.v===VERSION&&msg.type==='join-request'&&Object.keys(msg).length===2&&now<info.at+AUTH_MS){
    await this.state.blockConcurrencyWhile(async()=>{
     const current=await this.state.storage.get('room');if(!current||current.expires<=Date.now()){ws.close(1008,'expired');return;}
     const host=this.state.getWebSockets().find(other=>other.deserializeAttachment()?.role==='host');
     if(!host||this.state.getWebSockets().some(other=>{const v=other.deserializeAttachment();return other!==ws&&(v?.role==='guest'||v?.requestId);})){ws.close(1008,'unavailable');return;}
     const bucket=current.requests||{at:now,count:0};if(now-bucket.at>=60000){bucket.at=now;bucket.count=0;}if(++bucket.count>10){ws.close(1008,'rate');return;}
     current.requests=bucket;await this.state.storage.put('room',current);info.requestId=randomHex(16);info.deadline=now+REQUEST_MS;ws.serializeAttachment(info);await this.schedule(current);
     host.send(JSON.stringify({v:VERSION,type:'join-request',id:info.requestId}));ws.send(JSON.stringify({v:VERSION,type:'waiting-approval'}));
    });return;
   }
   if(now>=(info.deadline??info.at+AUTH_MS)||!msg||msg.v!==VERSION||msg.type!=='auth'||!['host','guest'].includes(msg.role)||!tokenPattern.test(msg.token||'')||Object.keys(msg).some(k=>!['v','type','role','token'].includes(k))||await digest(msg.token)!==room[msg.role]){ws.close(1008,'auth');return;}
   // Serialize role assignment across competing tabs, including the digest await.
   await this.state.blockConcurrencyWhile(async()=>{
    const current=await this.state.storage.get('room');
    if(!current||current.expires<=Date.now()){ws.close(1008,'expired');return;}
    if(await digest(msg.token)!==current[msg.role]||msg.role==='guest'&&current.guestOnce&&current.guestExpires<=Date.now()){ws.close(1008,'auth');return;}
    if(this.state.getWebSockets().some(other=>other!==ws&&other.deserializeAttachment()?.role===msg.role)){ws.close(1008,'occupied');return;}
    if(msg.role==='guest'&&current.guestOnce){current.guest=null;delete current.guestOnce;delete current.guestExpires;await this.state.storage.put('room',current);}
    info.role=msg.role;ws.serializeAttachment(info);ws.send(JSON.stringify({v:VERSION,type:'authenticated',role:info.role}));
    const peer=this.state.getWebSockets().find(other=>other!==ws&&other.deserializeAttachment()?.role);
    if(peer){
     if(!current.active){current.active=true;current.expires=Date.now()+ACTIVE_MS;await this.state.storage.put('room',current);}
     peer.send(JSON.stringify({v:VERSION,type:'peer-joined'}));ws.send(JSON.stringify({v:VERSION,type:'peer-joined'}));
    }
    await this.schedule(current);
   });return;
  }
  ws.serializeAttachment(info);
  if(info.role==='host'&&msg?.v===VERSION&&msg.type==='join-decision'&&typeof msg.accept==='boolean'&&/^[a-f0-9]{32}$/.test(msg.id||'')&&Object.keys(msg).length===4){
   await this.state.blockConcurrencyWhile(async()=>{
    const pending=this.state.getWebSockets().find(other=>{const v=other.deserializeAttachment();return !v?.role&&v?.requestId===msg.id&&v.deadline>Date.now();});
    if(!pending)return;
    if(!msg.accept){pending.send(JSON.stringify({v:VERSION,type:'join-denied'}));pending.close(1000,'denied');return;}
    const current=await this.state.storage.get('room');if(!current||current.expires<=Date.now()||this.state.getWebSockets().some(other=>other.deserializeAttachment()?.role==='guest'))return;
    const token=randomHex(32);current.guest=await digest(token);current.guestOnce=true;current.guestExpires=Date.now()+AUTH_MS;await this.state.storage.put('room',current);
    const p=pending.deserializeAttachment();delete p.requestId;p.deadline=Date.now()+AUTH_MS;pending.serializeAttachment(p);await this.schedule(current);
    pending.send(JSON.stringify({v:VERSION,type:'join-approved',token}));
   });return;
  }
  // SDP is already ICE-complete in BioPeer. No separate trickle ICE is currently sent.
  if(!msg||msg.v!==VERSION||!['offer','answer'].includes(msg.type)||msg.type!==(info.role==='host'?'offer':'answer')||typeof msg.description!=='string'||msg.description.length>120000||Object.keys(msg).some(k=>!['v','type','description'].includes(k))){ws.close(1008,'invalid');return;}
  const peer=this.state.getWebSockets().find(other=>other!==ws&&other.deserializeAttachment()?.role===(info.role==='host'?'guest':'host'));
  if(!peer){ws.send(JSON.stringify({v:VERSION,type:'peer-missing'}));return;}peer.send(text);
 }
 async webSocketClose(ws){const info=ws.deserializeAttachment(),role=info?.role;if(!role){if(info?.requestId){const host=this.state.getWebSockets().find(other=>other!==ws&&other.deserializeAttachment()?.role==='host');host?.send(JSON.stringify({v:VERSION,type:'join-cancelled',id:info.requestId}));}await this.schedule(await this.state.storage.get('room'));return;}for(const other of this.state.getWebSockets()){if(other!==ws&&other.deserializeAttachment()?.role)other.send(JSON.stringify({v:VERSION,type:'peer-left'}));}if(role==='host'){await this.state.storage.deleteAll();for(const other of this.state.getWebSockets())if(other!==ws)other.close(1000,'host-left');}else await this.schedule(await this.state.storage.get('room'));}
 async webSocketError(ws){ws.close(1011,'socket-error');}
 async alarm(){
  const room=await this.state.storage.get('room'),now=Date.now();
  if(!room||room.expires<=now){for(const ws of this.state.getWebSockets())ws.close(1000,'expired');await this.state.storage.deleteAll();return;}
  for(const ws of this.state.getWebSockets()){const info=ws.deserializeAttachment();if(info&&!info.role&&(info.deadline??info.at+AUTH_MS)<=now)ws.close(1008,'auth-timeout');}
  await this.schedule(room);
 }
}

// SQLite-backed fixed windows, serialized across room IDs for one HMAC'd source.
export class RateGate {
 constructor(state){this.state=state;}
 async fetch(request){
  const kind=new URL(request.url).pathname.slice(1),limit=kind==='create'?12:kind==='socket'?60:0;
  if(request.method!=='POST'||!limit)return new Response(null,{status:400});
  return this.state.blockConcurrencyWhile(async()=>{
   const now=Date.now(),previous=await this.state.storage.get(kind),bucket=!previous||now>=previous.until?{count:0,until:now+60000}:previous;
   if(bucket.count>=limit)return new Response(null,{status:429});bucket.count++;await this.state.storage.put(kind,bucket);const other=await this.state.storage.get(kind==='create'?'socket':'create');await this.state.storage.setAlarm(Math.max(bucket.until,other?.until||0));
   return new Response(null,{status:bucket.count<=limit?204:429});
  });
 }
 async alarm(){const now=Date.now();for(const kind of ['create','socket']){const bucket=await this.state.storage.get(kind);if(bucket&&bucket.until<=now)await this.state.storage.delete(kind);}const buckets=await Promise.all(['create','socket'].map(k=>this.state.storage.get(k)));const until=Math.max(...buckets.map(b=>b?.until||0));if(until>now)await this.state.storage.setAlarm(until);}
}
