/* Bio-City OST continuation bridge: opt-in only; normal URLs and SEO remain unchanged. */
(()=>{'use strict';
const script=document.currentScript,base=new URL('../',script.src),ja=document.documentElement.lang.startsWith('ja');
const shell=(()=>{try{return window.parent!==window&&window.parent.location.origin===location.origin&&!!window.parent.BioGlobalOST}catch{return false}})();
function trackPage(){
 const src=new URL(location.href);if(!src.pathname.startsWith(base.pathname))return null;
 return src.pathname.slice(base.pathname.length)+src.search+src.hash;
}
const mark=(event,data={})=>{window.dataLayer=window.dataLayer||[];window.dataLayer.push({event,...data})};
if(shell){
 const controller=window.parent.BioGlobalOST;
 controller.route(trackPage());
 // External destinations should not get trapped in the persistent same-origin iframe.
 document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a||a.target||e.defaultPrevented)return;const u=new URL(a.href);if(u.origin!==location.origin||!u.pathname.startsWith(base.pathname))a.target='_top'},true);
 const tracks=[...document.querySelectorAll('.ost-player-card')];
 tracks.forEach((card,i)=>{
  const audio=card.querySelector('audio');if(!audio||i>3)return;
  audio.hidden=true;audio.removeAttribute('controls');
  const btn=document.createElement('button');btn.type='button';btn.className='ost-shell-play';btn.textContent=ja?'♪ この曲を連続再生':'♪ 全站連續播放此曲';
  btn.addEventListener('click',()=>controller.playIndex(i));
  audio.after(btn);
 });
 document.addEventListener('play',e=>{if(e.target instanceof HTMLAudioElement){controller.otherAudioStarted(e.target);}},true);
 document.addEventListener('pause',e=>{if(e.target instanceof HTMLAudioElement){controller.otherAudioStopped(e.target);}},true);
 return;
}
const ostList=document.querySelector('.ost-container');
if(!ostList||document.querySelector('#bio-ost-entry'))return;
const btn=document.createElement('button');btn.type='button';btn.id='bio-ost-entry';
btn.textContent=ja?'♪ 連続OST':'♪ 連續OST';
btn.title=ja?'ページを移動しても再生を続ける':'切換網站頁面也不會中斷 OST';
btn.setAttribute('aria-label',btn.title);
btn.addEventListener('click',()=>{const page=trackPage()||'FUNAI-CARE.html';location.assign(new URL('listen.html?page='+encodeURIComponent(page),base));});
ostList.before(btn);
})();
