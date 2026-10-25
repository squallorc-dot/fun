/* Persistent audio lives in this document; site routes remain independently indexable. */
(()=>{'use strict';
const root=new URL('./',location.href),ja=/^(?:ja\/|FUNAI-CARE_jp)/.test(new URL(location.href).searchParams.get('page')||'');
const tracks=[
 ['Bio-City 覺醒時刻','music/bio-city-awakening-theme-v2.mp3'],
 ['Burner 姐召喚','music/burner-sister-summoning-theme.mp3'],
 ['MJ ロボット Ver. A','music/mj-robot-kizamu-japanese-v1.mp3'],
 ['MJ ロボット Ver. B','music/mj-robot-kizamu-japanese-v2.mp3']
];
const frame=document.querySelector('#bio-website');
const audio=document.querySelector('#persistent-audio');
const select=document.querySelector('#persistent-track');
const play=document.querySelector('#persistent-toggle');
const volume=document.querySelector('#persistent-volume');
const panel=document.querySelector('#persistent-panel');
const expand=document.querySelector('#persistent-expand');
const leaveBtn=document.querySelector('#persistent-leave');
const prev=document.querySelector('#persistent-prev'),next=document.querySelector('#persistent-next'),seek=document.querySelector('#persistent-progress'),clock=document.querySelector('#persistent-clock'),modeChoice=document.querySelector('#persistent-mode');
let gameActive=false,shouldResume=false,explicitlyPaused=true,track=0,playMode='list';
const otherAudioSources=new Set();
const manualSoundSource=Symbol('arcade soundtrack');
const isOtherAudioPlaying=()=>otherAudioSources.size>0;
function safePage(candidate){
 try{const url=new URL(candidate||'FUNAI-CARE.html',root);
 if(url.origin!==location.origin||!url.pathname.startsWith(root.pathname))return null;
 const path=url.pathname.slice(root.pathname.length);
 if(!/^(?:FUNAI-CARE(?:_jp)?\.html|(?:zh|ja)\/(?:home|world|heroes|story|music|play|strategy)\.html|arcade\/(?:zh|ja)\/index\.html)$/.test(path))return null;
 return path+url.search+url.hash;
 }catch{return null}
}
const i18n={
 zh:{title:'BIO-CITY 連續 OST',open:'開啟音樂控制',close:'收合',play:'播放',pause:'暫停',back:'離開連續模式',note:'切換頁面不會中斷；遊戲與其他音訊優先。首次播放需手動點擊。'},
 ja:{title:'BIO-CITY 連続OST',open:'音楽設定を開く',close:'閉じる',play:'再生',pause:'一時停止',back:'通常表示に戻る',note:'ページ移動中も再生。ゲーム・音声を優先。最初は再生操作が必要です。'}
}[ja?'ja':'zh'];
document.querySelector('#persistent-title').textContent=i18n.title;
document.querySelector('#persistent-note').textContent=i18n.note;
document.querySelector('#persistent-expand').setAttribute('aria-label',i18n.open);
leaveBtn.textContent=i18n.back;
const labels=ja?['全曲リピート','1曲リピート','シャッフル']:['清單循環','單曲循環','隨機播放'];
[...modeChoice.options].forEach((opt,i)=>{opt.textContent=labels[i]});
prev.setAttribute('aria-label',ja?'前の曲':'上一首');next.setAttribute('aria-label',ja?'次の曲':'下一首');
document.querySelector('#persistent-seek-label').textContent=ja?'再生位置':'播放進度';document.querySelector('#persistent-mode-label').textContent=ja?'再生モード':'播放模式';
tracks.forEach(([name],i)=>{const opt=document.createElement('option');opt.value=String(i);opt.textContent=name;select.append(opt)});
try{const prefs=JSON.parse(localStorage.getItem('bio_persistent_ost_v1')||'{}');track=Number.isInteger(prefs.track)?Math.max(0,Math.min(3,prefs.track)):0;volume.value=Number.isFinite(prefs.volume)?Math.max(0,Math.min(100,prefs.volume)):40;playMode=['list','single','shuffle'].includes(prefs.mode)?prefs.mode:'list';}catch{volume.value=40}
audio.loop=playMode==='single';audio.volume=Number(volume.value)/100;modeChoice.value=playMode;
function persist(){try{localStorage.setItem('bio_persistent_ost_v1',JSON.stringify({track,volume:Number(volume.value),mode:playMode}))}catch{}}
function update(){select.value=String(track);play.textContent=audio.paused?'▶ '+i18n.play:'Ⅱ '+i18n.pause;expand.textContent=(audio.paused?'♪ ':'♫ ')+'OST · '+tracks[track][0]+(panel.hidden?' ⌄':' ⌃');expand.setAttribute('aria-label',(panel.hidden?i18n.open:i18n.close)+'：'+tracks[track][0]);document.body.classList.toggle('bio-game-active',gameActive)}
function stamp(t){if(!Number.isFinite(t)||t<0)return '--:--';t=Math.floor(t);return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')}
function timeDisplay(){const duration=audio.duration,valid=Number.isFinite(duration)&&duration>0;seek.disabled=!valid;seek.value=valid?String(Math.round(Math.max(0,Math.min(1,audio.currentTime/duration))*1000)):'0';clock.textContent=stamp(audio.currentTime)+' / '+stamp(duration)}
function jump(direction){let nextIndex=(track+direction+tracks.length)%tracks.length;if(playMode==='shuffle'&&tracks.length>1){const n=Math.floor(Math.random()*(tracks.length-1));nextIndex=n>=track?n+1:n;}playIndex(nextIndex)}
function load(i){track=Math.max(0,Math.min(3,Number(i)||0));if(audio.dataset.track!==String(track)){audio.pause();audio.src=new URL(tracks[track][1],root);audio.dataset.track=String(track)}persist();update()}
function start(){explicitlyPaused=false;shouldResume=true;if(gameActive||isOtherAudioPlaying()){update();return;}const p=audio.play();if(p&&p.catch)p.catch(()=>{explicitlyPaused=true;update()});update()}
function stop(){explicitlyPaused=true;shouldResume=false;audio.pause();update()}
function suspend(){shouldResume=shouldResume&&!explicitlyPaused||(!audio.paused&&!explicitlyPaused);audio.pause();update()}
function resume(){if(shouldResume&&!explicitlyPaused&&!gameActive&&!isOtherAudioPlaying()){const p=audio.play();if(p&&p.catch)p.catch(()=>update());}update()}
function emit(name,detail){try{const w=frame.contentWindow;w.dataLayer=w.dataLayer||[];w.dataLayer.push({event:name,...detail})}catch{}}
function playIndex(i){load(i);start();emit('play_ost_audio',{ost_name:tracks[track][0],audio_source:'persistent_shell'});emit('ost_persistent_track',{track_id:tracks[track][1]});}
function route(path){const next=safePage(path);if(next){const current=new URL(location.href);current.searchParams.set('page',next);history.replaceState(null,'',current);}}
const api={
 route,playIndex,
 otherAudioStarted(source){otherAudioSources.add(source||manualSoundSource);suspend();},
 otherAudioStopped(source){otherAudioSources.delete(source||manualSoundSource);resume();},
 gameStart(){gameActive=true;suspend();},
 gameEnd(){gameActive=false;resume();},
 get state(){return {track,src:audio.src,paused:audio.paused,gameActive,
  otherAudio:isOtherAudioPlaying(),otherAudioCount:otherAudioSources.size,
  route:new URL(frame.src).pathname,element:audio}}
};
Object.defineProperty(window,'BioGlobalOST',{value:api,writable:false});
const initial=safePage(new URL(location.href).searchParams.get('page'))||(ja?'FUNAI-CARE_jp.html':'FUNAI-CARE.html');
frame.src=new URL(initial,root);
frame.addEventListener('load',()=>{otherAudioSources.clear();gameActive=false;resume();try{if(frame.contentWindow.location.origin===location.origin){const path=frame.contentWindow.location.pathname.slice(root.pathname.length)+frame.contentWindow.location.search+frame.contentWindow.location.hash;route(path)}}catch{}});
load(track);
seek.disabled=true;
seek.addEventListener('input',()=>{const d=audio.duration;if(Number.isFinite(d)&&d>0)audio.currentTime=d*Number(seek.value)/1000;timeDisplay()});
for(const event of ['loadedmetadata','durationchange','timeupdate','seeked'])audio.addEventListener(event,timeDisplay);
audio.addEventListener('ended',()=>{if(playMode!=='single'&&!explicitlyPaused)jump(1)});
prev.addEventListener('click',()=>jump(-1));next.addEventListener('click',()=>jump(1));
modeChoice.addEventListener('change',()=>{playMode=modeChoice.value;audio.loop=playMode==='single';persist()});
select.addEventListener('change',e=>playIndex(e.target.value));
play.addEventListener('click',()=>{audio.paused?start():stop()});
volume.addEventListener('input',()=>{audio.volume=Number(volume.value)/100;persist()});
audio.addEventListener('play',update);audio.addEventListener('pause',update);audio.addEventListener('ended',update);
function show(){panel.hidden=false;panel.setAttribute('aria-hidden','false');expand.setAttribute('aria-expanded','true');update();select.focus({preventScroll:true})}
function hide(){panel.hidden=true;panel.setAttribute('aria-hidden','true');expand.setAttribute('aria-expanded','false');update();expand.focus({preventScroll:true})}
expand.addEventListener('click',()=>panel.hidden?show():hide());
document.querySelector('#persistent-close').addEventListener('click',hide);
leaveBtn.addEventListener('click',()=>{let path='FUNAI-CARE.html';try{path=safePage(frame.contentWindow.location.href)||path}catch{}location.assign(new URL(path,root))});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){hide();e.preventDefault()}});
update();
})();
