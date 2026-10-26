/* Same-origin G02 bridge; shared by both language wrappers. */
(()=>{'use strict';
 window.dataLayer=window.dataLayer||[];
 const originalPush=window.dataLayer.push.bind(window.dataLayer);
 const send=data=>parent.postMessage({source:'bio-city-shooter',...data},location.origin);
 window.dataLayer.push=function(event){if(event&&event.event)send({event});return originalPush(event);};
 let guideWasPlaying=false;
 window.addEventListener('message',e=>{
  if(e.origin!==location.origin||e.source!==parent||e.data?.source!=='bio-city-hub')return;
  const api=window.BioArcadeShooter,msg=e.data;if(!api)return;
  if(msg.command==='audio-settings'){api.applyAudio(msg.sfx);return;}
  if(msg.command==='background-pause'){guideWasPlaying=false;api.pause(true);return;}
  if(msg.command==='guide-pause'){guideWasPlaying=msg.resumeAfter===true||msg.resumeAfter===undefined&&['playing','countdown'].includes(api.state.phase);api.pause(true);return;}
  if(msg.command==='guide-resume'){if(guideWasPlaying)api.pause();guideWasPlaying=false;return;}
  if(msg.command!=='start')return;
  const hero=Math.max(0,Math.min(6,Number(msg.hero)||0));
  window.BioArcadeChapter=Math.max(1,Math.min(5,Number(msg.chapter)||1));
  window.BioArcadeStartPaused=!!msg.paused;api.applyAudio(msg.sfx);
  document.querySelector('[data-ar-hero="'+hero+'"]')?.click();
  const select=document.querySelector('#arcade-difficulty');
  if(select&&['normal','hard','expert'].includes(msg.difficulty)){select.value=msg.difficulty;select.dispatchEvent(new Event('change',{bubbles:true}));}
  document.querySelector('[data-ar-command="start"]')?.click();
 });
 window.addEventListener('bio-arcade-phase',e=>send({type:e.detail}));
 window.addEventListener('bio-arcade-audio',e=>send({type:'sfx',value:e.detail}));
 window.addEventListener('DOMContentLoaded',()=>send({type:'ready'}),{once:true});
})();
