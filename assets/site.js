"use strict";
(()=>{
 const s=document.querySelector(".reading-progress"),b=document.querySelector(".backtop");
 const update=()=>{const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);if(s)s.style.width=Math.round(scrollY/max*100)+"%";if(b)b.classList.toggle("is-visible",scrollY>400)};
 document.addEventListener("scroll",update,{passive:true});update();
 b?.addEventListener("click",()=>scrollTo({top:0,behavior:"smooth"}));
 const audio=()=>[...document.querySelectorAll("audio")];
 document.addEventListener("play",e=>{if(!(e.target instanceof HTMLAudioElement))return;audio().forEach(x=>{if(x!==e.target&&!x.paused)x.pause()})},true);
 document.querySelectorAll(".char-img-clickable").forEach(el=>{el.setAttribute("tabindex","0");el.setAttribute("role","button");el.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();el.click()}})});
 document.addEventListener("pause",e=>{
 if(!(e.target instanceof HTMLAudioElement)||!e.target.closest(".card"))return;
 const card=e.target.closest(".card");
 card.querySelectorAll(".char-img-container.is-playing").forEach(el=>el.classList.remove("is-playing"));
 if(!document.querySelector(".char-img-container.is-playing"))
  document.getElementById("global-audio-player")?.classList.remove("is-visible");
},true);
 document.addEventListener("click",e=>{
  const link=e.target.closest('a[href*="www.funaicare.com/item/"]');
  if(!link)return;
  const card=link.closest(".card");
  const heroName=card?.querySelector("h3")?.textContent?.trim() || document.querySelector("#quiz-res-title")?.textContent?.trim() || "";
  window.dataLayer=window.dataLayer||[];
  window.dataLayer.push({event:"product_link_click",hero_name:heroName,product_url:link.href});
 });
 document.querySelectorAll("a[target=_blank]").forEach(a=>a.setAttribute("rel","noopener noreferrer"));
})();
    /* ── HERO AUDIO CONTROLLER (單純穩定版) ── */
    function playHeroAudio(audioId, heroName, imgContainer) {
        const allAudios = document.querySelectorAll('.card audio');
        const targetAudio = document.getElementById(audioId);
        const floatingPlayer = document.getElementById('global-audio-player');
        const floatingName = document.getElementById('f-audio-name');

        if (!targetAudio.paused) {
            stopAllHeroAudio();
            return;
        }

        allAudios.forEach(audio => {
            if (audio.id !== audioId) {
                audio.pause();
                audio.currentTime = 0; 
            }
        });

        document.querySelectorAll('.char-img-container').forEach(container => {
            container.classList.remove('is-playing');
            container.style.animation = 'none';
            container.offsetHeight; 
            container.style.animation = null;
        });

        targetAudio.play().then(() => {
            if (targetAudio.paused) return; // Another track replaced this one before playback settled.
            imgContainer.classList.add('is-playing');
            
            floatingName.innerText = heroName;
            floatingPlayer.classList.add('is-visible');

            // 🌟 埋設：發送播放音樂事件到 GA4 🌟
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                'event': 'play_hero_audio',
                'hero_name': heroName 
            });

            targetAudio.onended = function() {
                imgContainer.classList.remove('is-playing');
                floatingPlayer.classList.remove('is-visible');
            };
        }).catch(error => {
            console.log("播放失敗，請檢查音檔路徑或瀏覽器權限", error);
        });
    }

    function stopAllHeroAudio() {
        const allAudios = document.querySelectorAll('audio');
        const floatingPlayer = document.getElementById('global-audio-player');
        
        allAudios.forEach(audio => {
            audio.pause();
        });
        
        document.querySelectorAll('.char-img-container').forEach(container => {
            container.classList.remove('is-playing');
        });
        
        floatingPlayer.classList.remove('is-visible');
    }

    /* 🌟 補強：全域追蹤 OST 原聲帶與守護者語音播放 🌟 */
    document.addEventListener('play', function(e){
        let audioTitle = "未知音軌";
        
        // 1. 檢查是否為 OST 播放器卡片
        const ostCard = e.target.closest('.ost-player-card');
        if (ostCard) {
            audioTitle = "OST: " + ostCard.querySelector('h4').innerText.split('\n')[0];
        } 
        // 2. 檢查是否為守護者語音播放器
        else if (e.target.closest('.voice-player') && e.target.getAttribute('data-title')) {
            audioTitle = "Voice: " + e.target.getAttribute('data-title');
        }

        if (audioTitle !== "未知音軌") {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                'event': 'play_ost_audio',
                'ost_name': audioTitle
            });
        }
    }, true);

    /* 🌟 假名開關功能 🌟 */
    function toggleFurigana() {
        const box = document.getElementById('jp-lyrics-box');
        const btn = document.getElementById('furigana-toggle');
        const furiganaLabel = document.documentElement.lang === 'ja' ? 'ふりがな' : '假名';
        
        if (box.classList.contains('hide-furigana')) {
            box.classList.remove('hide-furigana');
            btn.innerText = furiganaLabel + ': ON';
            btn.setAttribute('aria-pressed', 'true');
            btn.classList.remove('is-off');
        } else {
            box.classList.add('hide-furigana');
            btn.innerText = furiganaLabel + ': OFF';
            btn.setAttribute('aria-pressed', 'false');
            btn.classList.add('is-off');
        }
    }



// Activate YouTube only after deliberate click; before activation the link remains a
// working external YouTube URL (keyboard-accessible and privacy-respecting).
document.addEventListener('click',function(event){
 const opener=event.target.closest('a[data-youtube-embed]');
 if(!opener)return;
 const id=opener.dataset.youtubeEmbed||'';
 if(!/^[A-Za-z0-9_-]{11}$/.test(id))return;
 const holder=opener.closest('.film-shell');
 if(!holder)return;
 event.preventDefault();
 const iframe=document.createElement('iframe');
 iframe.src='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(id)+'?autoplay=1&rel=0';
 iframe.title=opener.dataset.videoTitle||'FUNAI CARE Bio-City video';
 iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
 iframe.allowFullscreen=true;
 iframe.loading='eager';
 iframe.referrerPolicy='strict-origin-when-cross-origin';
 holder.replaceChildren(iframe);
 window.dataLayer=window.dataLayer||[];
 window.dataLayer.push({event:'story_video_play',video_id:id,video_context:holder.dataset.filmContext||'unknown'});
},false);


// Resolve a sharp thumbnail on first visit. YouTube sometimes returns a tiny
// placeholder for unavailable maxresdefault thumbnails with HTTP 200.
(function initVideoPosters(){
 const qualities=['maxresdefault','sddefault','hqdefault'];
 document.querySelectorAll('img[data-youtube-thumb]').forEach(img=>{
  const id=img.dataset.youtubeThumb;
  if(!/^[A-Za-z0-9_-]{11}$/.test(id))return;
  let qualityIndex=0;
  const advance=()=>{
   qualityIndex++;
   if(qualityIndex>=qualities.length)return;
   img.src='https://i.ytimg.com/vi/'+id+'/'+qualities[qualityIndex]+'.jpg';
  };
  const check=()=>{
   const minimumWidth=qualityIndex===0?900:qualityIndex===1?600:200;
   if(!img.naturalWidth||img.naturalWidth<minimumWidth)advance();
  };
  img.addEventListener('error',advance);
  img.addEventListener('load',check);
  if(img.complete)check();
 });
})();
