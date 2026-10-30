// Signaling only. Game data stays on the existing WebRTC DataChannels.
const VERSION=1, ROOM_MS=15*60*1000, MAX_TEXT=125000, MAX_SOCKETS=4;
const roomPattern=/^[A-Z2-9]{8}$/, tokenPattern=/^[a-f0-9]{64}$/;
const json=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json','cache-control':'no-store',...headers}});
const randomHex=n=>Array.from(crypto.getRandomValues(new Uint8Array(n)),x=>x.toString(16).padStart(2,'0')).join('');
const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
function allowed(request,env){const origin=request.headers.get('Origin');return !!origin && String(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).includes(origin);}
function cors(request){return {'access-control-allow-origin':request.headers.get('Origin'),'vary':'Origin'};}
export default {
 async fetch(request,env){
  if(!allowed(request,env))return json({error:'origin'},403);
  const url=new URL(request.url),headers=cors(request);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'access-control-allow-methods':'POST, GET, OPTIONS','access-control-allow-headers':'content-type','access-control-max-age':'600'}});
  if(request.method==='POST'&&url.pathname==='/rooms'){
   // The room code identifies a DO; two independent 256-bit capabilities authorize access.
   const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',bytes=crypto.getRandomValues(new Uint8Array(8));
   const room=Array.from(bytes,b=>alphabet[b%32]).join(''),host=randomHex(32),guest=randomHex(32);
   const stub=env.ROOMS.get(env.ROOMS.idFromName(room));
   const response=await stub.fetch('https://room.internal/create',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({host:await digest(host),guest:await digest(guest)})});
   if(!response.ok)return json({error:'create-failed'},503,headers);
   return json({v:VERSION,room,host,guest,expiresIn:ROOM_MS/1000},201,headers);
  }
  const match=/^\/rooms\/([A-Z2-9]{8})\/socket$/.exec(url.pathname);
  if(request.method==='GET'&&match&&request.headers.get('Upgrade')?.toLowerCase()==='websocket')return env.ROOMS.get(env.ROOMS.idFromName(match[1])).fetch(request);
  return json({error:'not-found'},404,headers);
 }
};
export class Room {
 constructor(state){this.state=state;}
 async fetch(request){
  const url=new URL(request.url);
  if(url.pathname==='/create'&&request.method==='POST'){
   if(await this.state.storage.get('room'))return json({error:'exists'},409);
   let data;try{data=await request.json();}catch{return json({error:'format'},400);}
   if(!tokenPattern.test(data.host||'')||!tokenPattern.test(data.guest||'')||data.host===data.guest)return json({error:'format'},400);
   const expires=Date.now()+ROOM_MS;await this.state.storage.put('room',{host:data.host,guest:data.guest,expires});await this.state.storage.setAlarm(expires);return json({ok:true});
  }
  const room=await this.state.storage.get('room');
  if(!room||room.expires<=Date.now())return json({error:'expired'},410);
  if(this.state.getWebSockets().length>=MAX_SOCKETS)return json({error:'full'},429);
  const pair=new WebSocketPair();this.state.acceptWebSocket(pair[1]);pair[1].serializeAttachment({role:null,at:Date.now(),count:0,window:Date.now()});
  return new Response(null,{status:101,webSocket:pair[0]});
 }
 async webSocketMessage(ws,text){
  const info=ws.deserializeAttachment(),room=await this.state.storage.get('room');
  if(!info||!room||room.expires<=Date.now()||typeof text!=='string'||text.length>MAX_TEXT){ws.close(1008,'invalid');return;}
  const now=Date.now();if(now-info.window>=1000){info.window=now;info.count=0;}if(++info.count>8){ws.close(1008,'rate');return;}
  let msg;try{msg=JSON.parse(text);}catch{ws.close(1008,'invalid');return;}
  if(!info.role){
   if(now-info.at>10000||!msg||msg.v!==VERSION||msg.type!=='auth'||!['host','guest'].includes(msg.role)||!tokenPattern.test(msg.token||'')||await digest(msg.token)!==room[msg.role]){ws.close(1008,'auth');return;}
   if(this.state.getWebSockets().some(other=>other!==ws&&other.deserializeAttachment()?.role===msg.role)){ws.close(1008,'occupied');return;}
   info.role=msg.role;ws.serializeAttachment(info);ws.send(JSON.stringify({v:VERSION,type:'authenticated',role:info.role}));
   for(const other of this.state.getWebSockets()){const role=other.deserializeAttachment()?.role;if(other!==ws&&role){other.send(JSON.stringify({v:VERSION,type:'peer-joined'}));ws.send(JSON.stringify({v:VERSION,type:'peer-joined'}));}}
   return;
  }
  ws.serializeAttachment(info);
  // SDP is already ICE-complete in BioPeer. No separate trickle ICE is currently sent.
  if(!msg||msg.v!==VERSION||!['offer','answer'].includes(msg.type)||msg.type!==(info.role==='host'?'offer':'answer')||typeof msg.description!=='string'||msg.description.length>120000||Object.keys(msg).some(k=>!['v','type','description'].includes(k))){ws.close(1008,'invalid');return;}
  const peer=this.state.getWebSockets().find(other=>other!==ws&&other.deserializeAttachment()?.role===(info.role==='host'?'guest':'host'));
  if(!peer){ws.send(JSON.stringify({v:VERSION,type:'peer-missing'}));return;}peer.send(text);
 }
 async webSocketClose(ws){const role=ws.deserializeAttachment()?.role;if(!role)return;for(const other of this.state.getWebSockets()){if(other!==ws&&other.deserializeAttachment()?.role)other.send(JSON.stringify({v:VERSION,type:'peer-left'}));}if(role==='host'){await this.state.storage.deleteAll();for(const other of this.state.getWebSockets())if(other!==ws)other.close(1000,'host-left');}}
 async webSocketError(ws){ws.close(1011,'socket-error');}
 async alarm(){for(const ws of this.state.getWebSockets())ws.close(1000,'expired');await this.state.storage.deleteAll();}
}
