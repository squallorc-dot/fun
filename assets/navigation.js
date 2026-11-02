/* Shared, dependency-free navigation. Native dialog owns focus and Escape. */
(()=>{'use strict';
 // Load the optional persistent music bridge without changing canonical routes.
 const bridge=document.createElement('script');
 const own=document.currentScript?.src;
 if(own){bridge.src=new URL('ost-bridge.js?v=20261025.11',own).href;bridge.defer=true;document.head.appendChild(bridge);}
 const toggle=document.querySelector('.mobile-explore-toggle');
 const panel=document.querySelector('#mobile-explore-panel');
 const language=document.querySelector('.mobile-language');
 if(toggle&&panel){
  const close=()=>{if(panel.open)panel.close();};
  toggle.addEventListener('click',()=>{
   if(panel.open){close();return;}
   if(language)language.open=false;
   panel.showModal();toggle.setAttribute('aria-expanded','true');
   document.documentElement.classList.add('explore-open');
   panel.querySelector('a[aria-current="page"],.explore-close')?.focus({preventScroll:true});
  });
  panel.querySelector('.explore-close')?.addEventListener('click',close);
  panel.addEventListener('click',e=>{if(e.target===panel){const r=panel.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
  panel.addEventListener('close',()=>{toggle.setAttribute('aria-expanded','false');document.documentElement.classList.remove('explore-open');});
  panel.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
  matchMedia('(min-width:1101px)').addEventListener('change',e=>{if(e.matches){close();if(language)language.open=false;}});
 }
 document.addEventListener('click',e=>{if(language?.open&&!e.target.closest('.mobile-language'))language.open=false;});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&language?.open){language.open=false;language.querySelector('summary')?.focus();}});
 const progress=document.querySelector('.reading-progress'),back=document.querySelector('.backtop');
 let scheduled=false;
 const update=()=>{scheduled=false;const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);if(progress)progress.style.width=Math.min(100,Math.round(scrollY/max*100))+'%';back?.classList.toggle('is-visible',scrollY>400);};
 addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(update);}},{passive:true});
 addEventListener('resize',update);update();
 back?.addEventListener('click',()=>scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'}));
 // Keep legacy fields stable; add resolved destinations for <base> PLAY routes.
 const languageCode=()=>document.documentElement.lang.startsWith('ja')?'ja':'zh';
 const emit=(event,detail)=>{window.dataLayer=window.dataLayer||[];window.dataLayer.push({event,...detail});};
 document.querySelectorAll('.site-header a,.site-bottom-nav a,.site-explore a').forEach(a=>a.addEventListener('click',()=>{
  const url=a.href;
  emit('site_navigation_click',{navigation_label:a.textContent.trim(),navigation_target:a.getAttribute('href'),navigation_target_url:url,navigation_position:a.closest('.site-explore')?'explore':a.closest('.site-bottom-nav')?'bottom':'header',language:languageCode()});
  const targetLanguage=a.getAttribute('lang');
  if((targetLanguage==='ja'||targetLanguage==='zh-TW')&&(targetLanguage==='ja'?'ja':'zh')!==languageCode())
   emit('site_language_switch',{language_from:languageCode(),language_to:targetLanguage==='ja'?'ja':'zh',navigation_target_url:url});
 }));
 // Same-page anchor actions are not additional GA4 page views.
 document.addEventListener('click',e=>{
  const link=e.target.closest('a[href]');if(!link)return;
  const target=new URL(link.href);
  if(target.origin===location.origin&&target.pathname===location.pathname&&target.hash==='#game-list')
   emit('arcade_catalog_click',{entry_point:link.closest('.play-feature')?'feature':link.closest('.hub-hero')?'hero':'other',language:languageCode()});
  // Measure entry before leaving the production site; Beta itself has no production GTM.
  if(target.hostname==='bio-city-v161-signaling.squall-orc.workers.dev'&&target.pathname.startsWith('/arcade/friends/'))
   emit('arcade_friends_beta_click',{entry_point:'play',language:languageCode(),navigation_target_url:target.href});
 });
 // Section location is visible without adding another fixed bar to phone screens.
 const links=[...document.querySelectorAll('.page-index a[href^="#"]')];
 if(links.length&&'IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;for(const a of links){if(a.hash==='#'+entry.target.id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');}}},{rootMargin:'-90px 0px -55% 0px'});
  for(const a of links){const target=document.getElementById(a.hash.slice(1));if(target)observer.observe(target);}
 }
})();
