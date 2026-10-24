"use strict";
(()=>{
 const s=document.querySelector(".reading-progress"),b=document.querySelector(".backtop");
 const update=()=>{const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);if(s)s.style.width=Math.round(scrollY/max*100)+"%";if(b)b.classList.toggle("is-visible",scrollY>400)};
 document.addEventListener("scroll",update,{passive:true});update();
 b?.addEventListener("click",()=>scrollTo({top:0,behavior:"smooth"}));
 const audio=()=>[...document.querySelectorAll("audio")];
 document.addEventListener("play",e=>{if(!(e.target instanceof HTMLAudioElement))return;audio().forEach(x=>{if(x!==e.target&&!x.paused)x.pause()})},true);
 document.querySelectorAll(".char-img-clickable").forEach(el=>{el.setAttribute("tabindex","0");el.setAttribute("role","button");el.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();el.click()}})});
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
        const allAudios = document.querySelectorAll('.card audio');
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
        
        if (box.classList.contains('hide-furigana')) {
            box.classList.remove('hide-furigana');
            btn.innerText = '假名: ON';
            btn.classList.remove('is-off');
        } else {
            box.classList.add('hide-furigana');
            btn.innerText = '假名: OFF';
            btn.classList.add('is-off');
        }
    }

