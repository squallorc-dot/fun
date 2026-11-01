/* v1.6.1 experimental signaling. No game data, analytics or persistent storage. */
((root)=>{'use strict';
const VERSION=1, TIMEOUT_MS=45000, WAIT_MS=15*60*1000, MAX_MESSAGE=125000, RELAY_AFTER_MS=12000;
function endpointURL(endpoint,path){const base=new URL(endpoint);if(base.username||base.password||!(base.protocol==='https:'||base.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(base.hostname)))throw Error('endpoint');return new URL(path,base.origin);}
async function createRoom(endpoint){
 const url=endpointURL(endpoint,'/rooms');
 const response=await fetch(url,{method:'POST',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
 if(!response.ok)throw Error(response.status===429?'rate-limited':response.status===503?'service-unavailable':'room-create');const room=await response.json();
 if(room.v!==VERSION||!/^[A-Z2-9]{8}$/.test(room.room)||!/^[a-f0-9]{64}$/.test(room.host)||!/^[a-f0-9]{64}$/.test(room.guest))throw Error('room-format');return room;
}
function connect({endpoint,room,role,token,link,timeout=TIMEOUT_MS,onJoinRequest=()=>{},onJoinCancelled=()=>{},onSignalingLost=()=>{},onSignalingRestored=()=>{},onSignalingUnavailable=()=>{},onProgress=()=>{}}){
 if(!/^[A-Z2-9]{8}$/.test(room)||!['host','guest'].includes(role)||!(role==='guest'&&token==null||/^[a-f0-9]{64}$/.test(token))||typeof onJoinRequest!=='function'||typeof onJoinCancelled!=='function'||typeof onSignalingLost!=='function'||typeof onSignalingRestored!=='function'||typeof onSignalingUnavailable!=='function'||typeof onProgress!=='function'||!link||!Number.isFinite(timeout)||timeout<=0||timeout>TIMEOUT_MS)throw Error('parameters');
 const url=endpointURL(endpoint,'/rooms/'+room+'/socket');url.protocol=url.protocol==='https:'?'wss:':'ws:';
 let socket,socketReady=false,lastRelayAttempt=0,resumeToken=null,resumeAttempts=0,reconnectTimer=null,retryAttempts=0,retryRequests=0,retryPending=null,requestRetry;const send=(type,extra={})=>socket.send(JSON.stringify({v:VERSION,type,...extra}));let stopped=false,started=false,settled=false,signalingLost=false,relayActive=false,earlyRelayPackets=[],poll,timer,cancel,fallbackTimer,restartTimer,healthTimer,degradedAt=0;
  const clearRecovery=()=>{clearTimeout(fallbackTimer);clearTimeout(restartTimer);};
  const clearHealth=()=>{clearInterval(healthTimer);healthTimer=null;};
  const requestRelay=()=>{const now=Date.now();if(stopped||relayActive||!socketReady||socket?.readyState!==WebSocket.OPEN||now-lastRelayAttempt<2000)return;lastRelayAttempt=now;try{send('relay-ready');onProgress('relay-request');}catch{}};
  // Data-channel silence is actionable even if ICE still claims connected.
  // Use the same consent-based relay protocol as the signaling health loop.
  const previousDegraded=link.onDegraded;
  if(link.betaStun)link.onDegraded=()=>{previousDegraded?.();requestRelay();};
  const scheduleFallback=()=>{if(!link.useRelay||fallbackTimer)return;restartTimer=setTimeout(async()=>{if(role==='host'&&link.state!=='connected'&&socket?.readyState===WebSocket.OPEN){const description=await link.restartOffer?.();if(description)send('ice-offer',{description});}},6500);fallbackTimer=setTimeout(()=>{fallbackTimer=null;if(link.state!=='connected')requestRelay();},RELAY_AFTER_MS);};
 const lost=()=>{if(!stopped&&!signalingLost){signalingLost=true;onSignalingLost();}};
 const result=new Promise((resolve,reject)=>{
  const finish=(err)=>{if(!err)clearRecovery();if(settled){if(retryPending){const pending=retryPending;retryPending=null;clearTimeout(timer);clearInterval(poll);if(err){if(socket?.readyState===WebSocket.OPEN)try{send('retry-cancel',{attempt:pending.attempt});}catch{}link.close('failed');pending.reject(err);}else pending.resolve();return;}if(err)lost();return;}settled=true;clearTimeout(timer);clearInterval(poll);if(err){clearRecovery();clearHealth();onProgress('failed');stopped=true;link.close('failed');socket.close();reject(err);}else{onProgress('connected');resolve();}};
  const arm=ms=>{clearTimeout(timer);timer=setTimeout(()=>finish(Error('pairing-timeout')),ms);};
  const startLink=(method,...args)=>{const previous=link.pairingTimeout;link.pairingTimeout=timeout;try{return link[method](...args);}finally{link.pairingTimeout=previous;}};
  cancel=()=>finish(Error('cancelled'));
  requestRetry=()=>{if(stopped||!settled||retryPending||retryRequests>=2||retryAttempts>=2||socket?.readyState!==WebSocket.OPEN||link.state==='connected')return Promise.reject(Error('retry-unavailable'));
   retryRequests++;started=false;
    // A retry is a fresh RTC/Relay negotiation on the same authenticated room.
    // The previous round's relay state must not suppress a new offer/answer.
    relayActive=false;earlyRelayPackets=[];lastRelayAttempt=0;clearRecovery();
    const attempt=retryAttempts+1;return new Promise((resolve,reject)=>{retryPending={resolve,reject,attempt};arm(timeout);poll=setInterval(()=>{if(link.state==='connected')finish();else if(started&&['failed','timeout'].includes(link.state))finish(Error('rtc-'+link.state));},100);send('retry-ready',{attempt});});};arm(WAIT_MS);
  poll=setInterval(()=>{if(link.state==='connected')finish();else if(!link.useRelay&&['failed','disconnected','timeout'].includes(link.state))finish(Error('rtc-'+link.state));},100);
  healthTimer=setInterval(()=>{
    if(stopped||!settled||relayActive||!link.useRelay||link.state!=='connected')return;
    const pc=link.pc,state=pc?.connectionState;
    const deadChannel=Object.values(link.channels||{}).some(dc=>dc.readyState!=='open');
    const noPackets=typeof link.lastReceived==='number'&&performance.now()-link.lastReceived>3500;
    const impaired=state==='disconnected'||state==='failed'||deadChannel||noPackets;
    if(impaired){degradedAt||=Date.now();if(Date.now()-degradedAt>=1500)requestRelay();}
    else degradedAt=0;
   },500);
   const reconnect=()=>{if(stopped||reconnectTimer)return;if(!resumeToken||resumeAttempts>=2){onSignalingUnavailable();return;}reconnectTimer=setTimeout(()=>{reconnectTimer=null;if(!stopped){resumeAttempts++;open(true);}},resumeAttempts?2000:1000);};
  const open=(resuming=false)=>{socketReady=false;socket=new WebSocket(url);const active=socket;
   active.onopen=()=>{onProgress('signaling');if(resuming)send('auth',{role,token:resumeToken,resume:true});else if(role==='guest'&&token==null)send('join-request');else send('auth',{role,token});};
   active.onerror=()=>{lost();};
   active.onclose=()=>{if(active!==socket||stopped)return;socketReady=false;if(resumeToken){lost();reconnect();}else if(!settled)finish(Error('signaling-closed'));else lost();};
   active.onmessage=async event=>{if(active!==socket)return;
   if(stopped||typeof event.data!=='string'||event.data.length>MAX_MESSAGE)return finish(Error('message-size'));
   let message;try{message=JSON.parse(event.data);}catch{return finish(Error('message-format'));}
   if(message.v!==VERSION||typeof message.type!=='string')return finish(Error('message-format'));
   try{
    if(message.type==='retry-denied'&&retryPending)finish(Error('retry-denied'));
    else if(message.type==='retry-start'&&retryPending&&message.attempt===retryPending.attempt&&!started){retryAttempts=message.attempt;if(role==='host'){started=true;send('offer',{description:await startLink('offer')});}}
    else if(message.type==='authenticated'&&message.role===role&&/^[a-f0-9]{64}$/.test(message.resumeToken||'')){resumeToken=message.resumeToken;socketReady=true;onProgress('authenticated');if(resuming){signalingLost=false;onSignalingRestored();}}
    else if(message.type==='join-request'&&role==='host'&&/^[a-f0-9]{32}$/.test(message.id||''))onJoinRequest(message.id);
    else if(message.type==='join-cancelled'&&role==='host'&&/^[a-f0-9]{32}$/.test(message.id||''))onJoinCancelled(message.id);
    else if(message.type==='join-approved'&&role==='guest'&&token==null&&/^[a-f0-9]{64}$/.test(message.token||'')){token=message.token;send('auth',{role,token});}
    else if(message.type==='join-denied')finish(Error('join-denied'));
    else if(message.type==='peer-joined'&&settled&&link.state==='connected'){if(signalingLost){signalingLost=false;onSignalingRestored();}}
    else if(message.type==='peer-joined'&&!started){onProgress('peer-joined');arm(timeout);scheduleFallback();if(role==='host'){started=true;send('offer',{description:await startLink('offer')});}}
    else if(message.type==='offer'&&role==='guest'&&!started){onProgress('offer');started=true;arm(timeout);scheduleFallback();const response=await startLink('answer',message.description);if(!relayActive)send('answer',{description:response});}
    else if(message.type==='answer'&&role==='host'&&started&&!relayActive){onProgress('answer');await link.accept(message.description);}
     else if(message.type==='ice-offer'&&role==='guest'&&!relayActive){const description=await link.restartAnswer?.(message.description);if(description)send('ice-answer',{description});}
     else if(message.type==='ice-answer'&&role==='host'&&!relayActive){await link.restartAccept?.(message.description);}
     else if(message.type==='relay-propose'&&!relayActive){
      // The peer has declared its transport unusable. A locally healthy
      // ICE status cannot prove the other side is still receiving packets;
      // both peers must explicitly agree before changing transports.
      requestRelay();
     }
     else if(message.type==='relay-start'&&/^[a-f0-9]{32}$/.test(message.sid||'')){clearRecovery();relayActive=true;link.useRelay(message.sid,(channel,payload)=>{if(socket?.readyState!==WebSocket.OPEN)return false;send('relay-data',{channel,payload});return true;});for(const packet of earlyRelayPackets)link.receiveRelay(packet.channel,packet.payload);earlyRelayPackets=[];finish();onProgress('relay-connected');}
     else if(message.type==='relay-data'&&['input','control'].includes(message.channel)&&typeof message.payload==='string'&&message.payload.length<=32768){if(relayActive)link.receiveRelay(message.channel,message.payload);else if(earlyRelayPackets.length<32)earlyRelayPackets.push({channel:message.channel,payload:message.payload});}
    else if(message.type==='peer-left'||message.type==='peer-missing'){if(!settled){onProgress('recovering');arm(90000);}else lost();}
   }catch{finish(Error('pairing-failed'));}
  };};open();
 });
 return {result,retry(){return requestRetry();},approveJoin(id,accept){if(role!=='host'||socket.readyState!==WebSocket.OPEN||!/^[a-f0-9]{32}$/.test(id)||typeof accept!=='boolean')return false;send('join-decision',{id,accept});return true;},close(){if(!settled||retryPending)cancel();stopped=true;clearRecovery();clearHealth();clearTimeout(reconnectTimer);clearTimeout(timer);clearInterval(poll);resumeToken=null;if(socket?.readyState===WebSocket.OPEN)try{send('leave');}catch{}socket?.close();if(link.betaStun)link.onDegraded=previousDegraded;link.close('closed');}};
}
root.BioFriendSignaling=Object.freeze({VERSION,TIMEOUT_MS,WAIT_MS,RELAY_AFTER_MS,createRoom,connect});
})(typeof window==='undefined'?globalThis:window);
