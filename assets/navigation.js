/* Shared, dependency-free navigation. Native dialog owns focus and Escape. */
(()=>{'use strict';
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
 document.querySelectorAll('.site-header a,.site-bottom-nav a,.site-explore a').forEach(a=>a.addEventListener('click',()=>{window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:'site_navigation_click',navigation_label:a.textContent.trim(),navigation_target:a.getAttribute('href'),navigation_position:a.closest('.site-explore')?'explore':a.closest('.site-bottom-nav')?'bottom':'header'});}));
 // Section location is visible without adding another fixed bar to phone screens.
 const links=[...document.querySelectorAll('.page-index a[href^="#"]')];
 if(links.length&&'IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;for(const a of links){if(a.hash==='#'+entry.target.id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');}}},{rootMargin:'-90px 0px -55% 0px'});
  for(const a of links){const target=document.getElementById(a.hash.slice(1));if(target)observer.observe(target);}
 }
})();
