/* v1.6.1 experimental signaling. No game data, analytics or persistent storage. */
((root)=>{'use strict';
const VERSION=1, TIMEOUT_MS=45000, WAIT_MS=15*60*1000, MAX_MESSAGE=125000;
function endpointURL(endpoint,path){const base=new URL(endpoint);if(base.username||base.password||!(base.protocol==='https:'||base.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(base.hostname)))throw Error('endpoint');return new URL(path,base.origin);}
async function createRoom(endpoint){
 const url=endpointURL(endpoint,'/rooms');
 const response=await fetch(url,{method:'POST',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
 if(!response.ok)throw Error(response.status===429?'rate-limited':response.status===503?'service-unavailable':'room-create');const room=await response.json();
 if(room.v!==VERSION||!/^[A-Z2-9]{8}$/.test(room.room)||!/^[a-f0-9]{64}$/.test(room.host)||!/^[a-f0-9]{64}$/.test(room.guest))throw Error('room-format');return room;
}
function connect({endpoint,room,role,token,link,timeout=TIMEOUT_MS,onJoinRequest=()=>{},onJoinCancelled=()=>{},onSignalingLost=()=>{}}){
 if(!/^[A-Z2-9]{8}$/.test(room)||!['host','guest'].includes(role)||!(role==='guest'&&token==null||/^[a-f0-9]{64}$/.test(token))||typeof onJoinRequest!=='function'||typeof onJoinCancelled!=='function'||typeof onSignalingLost!=='function'||!link||!Number.isFinite(timeout)||timeout<=0||timeout>TIMEOUT_MS)throw Error('parameters');
 const url=endpointURL(endpoint,'/rooms/'+room+'/socket');url.protocol=url.protocol==='https:'?'wss:':'ws:';
 const socket=new WebSocket(url),send=(type,extra={})=>socket.send(JSON.stringify({v:VERSION,type,...extra}));let stopped=false,started=false,settled=false,signalingLost=false,poll,timer,cancel;
 const lost=()=>{if(!stopped&&!signalingLost){signalingLost=true;onSignalingLost();}};
 const result=new Promise((resolve,reject)=>{
  const finish=(err)=>{if(settled){if(err)lost();return;}settled=true;clearTimeout(timer);clearInterval(poll);if(err){stopped=true;link.close('failed');socket.close();reject(err);}else resolve();};
  const arm=ms=>{clearTimeout(timer);timer=setTimeout(()=>finish(Error('pairing-timeout')),ms);};
  const startLink=(method,...args)=>{const previous=link.pairingTimeout;link.pairingTimeout=timeout;try{return link[method](...args);}finally{link.pairingTimeout=previous;}};
  cancel=()=>finish(Error('cancelled'));arm(WAIT_MS);
  poll=setInterval(()=>{if(link.state==='connected')finish();else if(['failed','disconnected','timeout'].includes(link.state))finish(Error('rtc-'+link.state));},100);
  socket.onopen=()=>role==='guest'&&token==null?send('join-request'):send('auth',{role,token});
  socket.onerror=()=>finish(Error('signaling-error'));
  socket.onclose=()=>{if(!stopped){if(!settled)finish(Error('signaling-closed'));else lost();}};
  socket.onmessage=async event=>{
   if(stopped||typeof event.data!=='string'||event.data.length>MAX_MESSAGE)return finish(Error('message-size'));
   let message;try{message=JSON.parse(event.data);}catch{return finish(Error('message-format'));}
   if(message.v!==VERSION||typeof message.type!=='string')return finish(Error('message-format'));
   try{
    if(message.type==='join-request'&&role==='host'&&/^[a-f0-9]{32}$/.test(message.id||''))onJoinRequest(message.id);
    else if(message.type==='join-cancelled'&&role==='host'&&/^[a-f0-9]{32}$/.test(message.id||''))onJoinCancelled(message.id);
    else if(message.type==='join-approved'&&role==='guest'&&token==null&&/^[a-f0-9]{64}$/.test(message.token||'')){token=message.token;send('auth',{role,token});}
    else if(message.type==='join-denied')finish(Error('join-denied'));
    else if(message.type==='peer-joined'&&!started){arm(timeout);if(role==='host'){started=true;send('offer',{description:await startLink('offer')});}}
    else if(message.type==='offer'&&role==='guest'&&!started){started=true;arm(timeout);send('answer',{description:await startLink('answer',message.description)});}
    else if(message.type==='answer'&&role==='host'&&started)await link.accept(message.description);
    else if(message.type==='peer-left'||message.type==='peer-missing')finish(Error(message.type));
   }catch{finish(Error('pairing-failed'));}
  };
 });
 return {result,approveJoin(id,accept){if(role!=='host'||socket.readyState!==WebSocket.OPEN||!/^[a-f0-9]{32}$/.test(id)||typeof accept!=='boolean')return false;send('join-decision',{id,accept});return true;},close(){if(!settled)cancel();stopped=true;clearTimeout(timer);clearInterval(poll);socket.close();link.close('closed');}};
}
root.BioFriendSignaling=Object.freeze({VERSION,TIMEOUT_MS,WAIT_MS,createRoom,connect});
})(typeof window==='undefined'?globalThis:window);
