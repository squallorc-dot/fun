/* v1.6.1 experimental signaling. No game data, analytics or persistent storage. */
((root)=>{'use strict';
const VERSION=1, TIMEOUT_MS=45000, MAX_MESSAGE=125000;
async function createRoom(endpoint){
 const url=new URL('/rooms',endpoint);if(!['https:','http:'].includes(url.protocol))throw Error('endpoint');
 const response=await fetch(url,{method:'POST',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
 if(!response.ok)throw Error('room-create');const room=await response.json();
 if(room.v!==VERSION||!/^[A-Z2-9]{8}$/.test(room.room)||!/^[a-f0-9]{64}$/.test(room.host)||!/^[a-f0-9]{64}$/.test(room.guest))throw Error('room-format');return room;
}
function connect({endpoint,room,role,token,link,timeout=TIMEOUT_MS}){
 if(!/^[A-Z2-9]{8}$/.test(room)||!['host','guest'].includes(role)||!/^[a-f0-9]{64}$/.test(token)||!link||!Number.isFinite(timeout)||timeout<=0||timeout>TIMEOUT_MS)throw Error('parameters');
 const url=new URL('/rooms/'+room+'/socket',endpoint);if(!['http:','https:'].includes(url.protocol))throw Error('endpoint');url.protocol=url.protocol==='https:'?'wss:':'ws:';
 const socket=new WebSocket(url),send=(type,extra={})=>socket.send(JSON.stringify({v:VERSION,type,...extra}));let stopped=false,started=false,settled=false,poll,timer,cancel;
 const result=new Promise((resolve,reject)=>{
  const finish=(err)=>{if(settled)return;settled=true;clearTimeout(timer);clearInterval(poll);if(err){stopped=true;link.close('failed');socket.close();reject(err);}else resolve();};
  cancel=()=>finish(Error('cancelled'));timer=setTimeout(()=>finish(Error('pairing-timeout')),timeout);
  poll=setInterval(()=>{if(link.state==='connected')finish();else if(['failed','disconnected','timeout'].includes(link.state))finish(Error('rtc-'+link.state));},100);
  socket.onopen=()=>send('auth',{role,token});
  socket.onerror=()=>finish(Error('signaling-error'));
  socket.onclose=()=>{if(!stopped){if(!settled)finish(Error('signaling-closed'));else link.close('disconnected');}};
  socket.onmessage=async event=>{
   if(stopped||typeof event.data!=='string'||event.data.length>MAX_MESSAGE)return finish(Error('message-size'));
   let message;try{message=JSON.parse(event.data);}catch{return finish(Error('message-format'));}
   if(message.v!==VERSION||typeof message.type!=='string')return finish(Error('message-format'));
   try{
    if(message.type==='peer-joined'&&role==='host'&&!started){started=true;send('offer',{description:await link.offer()});}
    else if(message.type==='offer'&&role==='guest'&&!started){started=true;send('answer',{description:await link.answer(message.description)});}
    else if(message.type==='answer'&&role==='host'&&started)await link.accept(message.description);
    else if(message.type==='peer-left'||message.type==='peer-missing')finish(Error(message.type));
   }catch{finish(Error('pairing-failed'));}
  };
 });
 return {result,close(){if(!settled)cancel();stopped=true;clearTimeout(timer);clearInterval(poll);socket.close();link.close('closed');}};
}
root.BioFriendSignaling=Object.freeze({VERSION,TIMEOUT_MS,createRoom,connect});
})(typeof window==='undefined'?globalThis:window);
