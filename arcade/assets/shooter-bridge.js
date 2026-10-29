/* Same-origin G02 bridge; shared by both language wrappers. */
(()=>{'use strict';
 window.BioArcadeHubBridge=true;
 window.dataLayer=window.dataLayer||[];
 const originalPush=window.dataLayer.push.bind(window.dataLayer);
 const send=data=>parent.postMessage({source:'bio-city-shooter',...data},location.origin);
 window.dataLayer.push=function(event){if(event&&event.event)send({event});return originalPush(event);};
 let guideWasPlaying=false,networkEpoch=null,lastNetworkEpoch=0,networkSeq=-1,networkControlSeq=-1;
 function sendNetworkSnapshot(api){const state=window.BioG02State?.encode(api.coopSnapshot()),reply={type:'coop-net-frame',version:1,epoch:networkEpoch,seq:networkSeq,state};if(state&&JSON.stringify(reply).length<=30000)send(reply);else send({type:'coop-net-overflow',version:1,epoch:networkEpoch,seq:networkSeq});}
 window.addEventListener('message',e=>{
  if(e.origin!==location.origin||e.source!==parent||e.data?.source!=='bio-city-hub')return;
  const api=window.BioArcadeShooter,msg=e.data;if(!api)return;
  // This opt-in host bridge is not yet connected to the friends lobby. Epochs are
  // round-scoped and commands are accepted only from the original same-origin parent.
  if(msg.command==='coop-net-init'){
   if(!Object.keys(msg).every(k=>['source','command','version','epoch','hero','remoteHero','chapter','difficulty','role'].includes(k))||msg.version!==1||!Number.isSafeInteger(msg.epoch)||msg.epoch<=lastNetworkEpoch||msg.epoch>1e8||networkEpoch!==null||!['host','guest'].includes(msg.role??'host')||![msg.hero,msg.remoteHero].every(v=>Number.isInteger(v)&&v>=0&&v<=6)||!Number.isInteger(msg.chapter)||msg.chapter<1||msg.chapter>5||!['normal','hard','expert'].includes(msg.difficulty)||!(msg.role==='guest'?api.configureNetworkGuest({hero:msg.remoteHero}):api.configureNetworkHost({hero:msg.remoteHero})))return;
   networkEpoch=lastNetworkEpoch=msg.epoch;networkSeq=networkControlSeq=-1;window.BioArcadeChapter=msg.chapter;
   document.querySelector('[data-ar-hero="'+msg.hero+'"]')?.click();const select=document.querySelector('#arcade-difficulty');if(select){select.value=msg.difficulty;select.dispatchEvent(new Event('change',{bubbles:true}));}document.querySelector('[data-ar-command="start"]')?.click();return;
  }
  if(msg.command==='coop-net-step'){
   if(!Object.keys(msg).every(k=>['source','command','version','epoch','seq','local','remote','snapshot'].includes(k))||msg.version!==1||msg.epoch!==networkEpoch||!Number.isSafeInteger(msg.seq)||msg.seq>1e8||msg.seq!==networkSeq+1||typeof msg.snapshot!=='boolean'||!api.networkStep(msg.local,msg.remote))return;
   networkSeq=msg.seq;send({type:'coop-net-ack',version:1,epoch:networkEpoch,seq:networkSeq});if(msg.snapshot){api.networkPaint();sendNetworkSnapshot(api);}return;
  }
  if(msg.command==='coop-net-capture'){
   if(Object.keys(msg).every(k=>['source','command','version','epoch'].includes(k))&&msg.version===1&&msg.epoch===networkEpoch)sendNetworkSnapshot(api);return;
  }
  if(msg.command==='coop-net-paint'){
   if(Object.keys(msg).every(k=>['source','command','version','epoch'].includes(k))&&msg.version===1&&msg.epoch===networkEpoch)api.networkPaint();return;
  }
  if(msg.command==='coop-net-apply'){
   if(Object.keys(msg).every(k=>['source','command','version','epoch','seq','state'].includes(k))&&msg.version===1&&msg.epoch===networkEpoch&&Number.isSafeInteger(msg.seq)&&msg.seq>networkSeq&&msg.seq<=1e8&&api.networkApply(msg.state))networkSeq=msg.seq;return;
  }
  if(msg.command==='coop-net-pause'){
   if(Object.keys(msg).every(k=>['source','command','version','epoch','seq','paused'].includes(k))&&msg.version===1&&msg.epoch===networkEpoch&&Number.isSafeInteger(msg.seq)&&msg.seq===networkControlSeq+1&&msg.seq<=1e8&&typeof msg.paused==='boolean'&&api.networkPause(msg.paused))networkControlSeq=msg.seq;return;
  }
  if(msg.command==='coop-net-close'){
   if(Object.keys(msg).every(k=>['source','command','version','epoch','seq'].includes(k))&&msg.version===1&&msg.epoch===networkEpoch&&Number.isSafeInteger(msg.seq)&&msg.seq===networkControlSeq+1&&msg.seq<=1e8)api.networkClose();return;
  }
  if(networkEpoch!==null)return;
  // Co-op messages retain the same parent identity and origin checks as all hub commands.
  if(msg.command==='coop-config'){if(Object.keys(msg).every(k=>['source','command','hero'].includes(k))&&Number.isInteger(msg.hero)&&msg.hero>=0&&msg.hero<=6)api.configureCoop({hero:msg.hero});return;}
  if(msg.command==='coop-input'){if(Object.keys(msg).every(k=>['source','command','input'].includes(k)))api.setRemoteInput(msg.input);return;}
  if(msg.command==='coop-snapshot'){if(Object.keys(msg).every(k=>['source','command'].includes(k)))send({type:'coop-snapshot',state:api.coopSnapshot()});return;}
  if(msg.command==='control-settings'){api.applyControls(msg.controls);return;}
  if(msg.command==='audio-settings'){api.applyAudio(msg.sfx);return;}
  if(msg.command==='background-pause'){guideWasPlaying=false;api.pause(true);return;}
  if(msg.command==='guide-pause'){guideWasPlaying=msg.resumeAfter===true||msg.resumeAfter===undefined&&['playing','countdown'].includes(api.state.phase);api.pause(true);return;}
  if(msg.command==='guide-resume'){if(guideWasPlaying)api.pause();guideWasPlaying=false;return;}
  if(msg.command!=='start')return;
  const hero=Math.max(0,Math.min(6,Number(msg.hero)||0));
  window.BioArcadeChapter=Math.max(1,Math.min(5,Number(msg.chapter)||1));
  guideWasPlaying=!!msg.resumeAfterGuide;window.BioArcadeStartPaused=!!msg.paused;api.applyAudio(msg.sfx);if(msg.controls)api.applyControls(msg.controls);
  document.querySelector('[data-ar-hero="'+hero+'"]')?.click();
  const select=document.querySelector('#arcade-difficulty');
  if(select&&['normal','hard','expert'].includes(msg.difficulty)){select.value=msg.difficulty;select.dispatchEvent(new Event('change',{bubbles:true}));}
  document.querySelector('[data-ar-command="start"]')?.click();
 });
 window.addEventListener('bio-arcade-phase',e=>{send({type:e.detail,at:performance.timeOrigin+performance.now()});if(networkEpoch!==null&&['started','paused','resumed','ended','load-error','menu'].includes(e.detail)){send({type:'coop-net-phase',version:1,epoch:networkEpoch,phase:e.detail});if(e.detail==='menu'){networkEpoch=null;networkSeq=-1;}}});
 window.addEventListener('bio-arcade-audio',e=>send({type:'sfx',value:e.detail}));
 window.addEventListener('DOMContentLoaded',()=>send({type:'ready'}),{once:true});
})();
