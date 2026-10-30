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
function connect({endpoint,room,role,token,link,timeout=TIMEOUT_MS,onJoinRequest=()=>{},onJoinCancelled=()=>{},onSignalingLost=()=>{},onSignalingRestored=()=>{},onSignalingUnavailable=()=>{}}){
 if(!/^[A-Z2-9]{8}$/.test(room)||!['host','guest'].includes(role)||!(role==='guest'&&token==null||/^[a-f0-9]{64}$/.test(token))||typeof onJoinRequest!=='function'||typeof onJoinCancelled!=='function'||typeof onSignalingLost!=='function'||typeof onSignalingRestored!=='function'||typeof onSignalingUnavailable!=='function'||!link||!Number.isFinite(timeout)||timeout<=0||timeout>TIMEOUT_MS)throw Error('parameters');
 const url=endpointURL(endpoint,'/rooms/'+room+'/socket');url.protocol=url.protocol==='https:'?'wss:':'ws:';
 let socket,resumeToken=null,resumeAttempts=0,reconnectTimer=null,retryAttempts=0,retryRequests=0,retryPending=null,requestRetry;const send=(type,extra={})=>socket.send(JSON.stringify({v:VERSION,type,...extra}));let stopped=false,started=false,settled=false,signalingLost=false,poll,timer,cancel;
 const lost=()=>{if(!stopped&&!signalingLost){signalingLost=true;onSignalingLost();}};
 const result=new Promise((resolve,reject)=>{
  const finish=(err)=>{if(settled){if(retryPending){const pending=retryPending;retryPending=null;clearTimeout(timer);clearInterval(poll);if(err){if(socket?.readyState===WebSocket.OPEN)try{send('retry-cancel',{attempt:pending.attempt});}catch{}link.close('failed');pending.reject(err);}else pending.resolve();return;}if(err)lost();return;}settled=true;clearTimeout(timer);clearInterval(poll);if(err){stopped=true;link.close('failed');socket.close();reject(err);}else resolve();};
  const arm=ms=>{clearTimeout(timer);timer=setTimeout(()=>finish(Error('pairing-timeout')),ms);};
  const startLink=(method,...args)=>{const previous=link.pairingTimeout;link.pairingTimeout=timeout;try{return link[method](...args);}finally{link.pairingTimeout=previous;}};
  cancel=()=>finish(Error('cancelled'));
  requestRetry=()=>{if(stopped||!settled||retryPending||retryRequests>=2||retryAttempts>=2||socket?.readyState!==WebSocket.OPEN||link.state==='connected')return Promise.reject(Error('retry-unavailable'));
   retryRequests++;started=false;const attempt=retryAttempts+1;return new Promise((resolve,reject)=>{retryPending={resolve,reject,attempt};arm(timeout);poll=setInterval(()=>{if(link.state==='connected')finish();else if(started&&['failed','timeout'].includes(link.state))finish(Error('rtc-'+link.state));},100);send('retry-ready',{attempt});});};arm(WAIT_MS);
  poll=setInterval(()=>{if(link.state==='connected')finish();else if(['failed','disconnected','timeout'].includes(link.state))finish(Error('rtc-'+link.state));},100);
  const reconnect=()=>{if(stopped||!settled||reconnectTimer)return;if(!resumeToken||resumeAttempts>=2){onSignalingUnavailable();return;}reconnectTimer=setTimeout(()=>{reconnectTimer=null;if(!stopped){resumeAttempts++;open(true);}},resumeAttempts?2000:1000);};
  const open=(resuming=false)=>{socket=new WebSocket(url);const active=socket;
   active.onopen=()=>resuming?send('auth',{role,token:resumeToken,resume:true}):role==='guest'&&token==null?send('join-request'):send('auth',{role,token});
   active.onerror=()=>{if(!settled)finish(Error('signaling-error'));};
   active.onclose=()=>{if(active!==socket||stopped)return;if(!settled)finish(Error('signaling-closed'));else{lost();reconnect();}};
   active.onmessage=async event=>{if(active!==socket)return;
   if(stopped||typeof event.data!=='string'||event.data.length>MAX_MESSAGE)return finish(Error('message-size'));
   let message;try{message=JSON.parse(event.data);}catch{return finish(Error('message-format'));}
   if(message.v!==VERSION||typeof message.type!=='string')return finish(Error('message-format'));
   try{
    if(message.type==='retry-denied'&&retryPending)finish(Error('retry-denied'));
    else if(message.type==='retry-start'&&retryPending&&message.attempt===retryPending.attempt&&!started){retryAttempts=message.attempt;if(role==='host'){started=true;send('offer',{description:await startLink('offer')});}}
    else if(message.type==='authenticated'&&message.role===role&&/^[a-f0-9]{64}$/.test(message.resumeToken||'')){resumeToken=message.resumeToken;if(resuming){signalingLost=false;onSignalingRestored();}}
    else if(message.type==='join-request'&&role==='host'&&/^[a-f0-9]{32}$/.test(message.id||''))onJoinRequest(message.id);
    else if(message.type==='join-cancelled'&&role==='host'&&/^[a-f0-9]{32}$/.test(message.id||''))onJoinCancelled(message.id);
    else if(message.type==='join-approved'&&role==='guest'&&token==null&&/^[a-f0-9]{64}$/.test(message.token||'')){token=message.token;send('auth',{role,token});}
    else if(message.type==='join-denied')finish(Error('join-denied'));
    else if(message.type==='peer-joined'&&settled&&link.state==='connected'){if(signalingLost){signalingLost=false;onSignalingRestored();}}
    else if(message.type==='peer-joined'&&!started){arm(timeout);if(role==='host'){started=true;send('offer',{description:await startLink('offer')});}}
    else if(message.type==='offer'&&role==='guest'&&!started){started=true;arm(timeout);send('answer',{description:await startLink('answer',message.description)});}
    else if(message.type==='answer'&&role==='host'&&started)await link.accept(message.description);
    else if(message.type==='peer-left'||message.type==='peer-missing')finish(Error(message.type));
   }catch{finish(Error('pairing-failed'));}
  };};open();
 });
 return {result,retry(){return requestRetry();},approveJoin(id,accept){if(role!=='host'||socket.readyState!==WebSocket.OPEN||!/^[a-f0-9]{32}$/.test(id)||typeof accept!=='boolean')return false;send('join-decision',{id,accept});return true;},close(){if(!settled||retryPending)cancel();stopped=true;clearTimeout(reconnectTimer);clearTimeout(timer);clearInterval(poll);resumeToken=null;if(socket?.readyState===WebSocket.OPEN)try{send('leave');}catch{}socket?.close();link.close('closed');}};
}
root.BioFriendSignaling=Object.freeze({VERSION,TIMEOUT_MS,WAIT_MS,createRoom,connect});
})(typeof window==='undefined'?globalThis:window);
