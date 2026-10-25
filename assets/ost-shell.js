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
const mini=document.querySelector('#persistent-mini');
const leaveBtn=document.querySelector('#persistent-leave');
let gameActive=false,otherAudio=false,shouldResume=false,explicitlyPaused=true,track=0;
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
tracks.forEach(([name],i)=>{const opt=document.createElement('option');opt.value=String(i);opt.textContent=name;select.append(opt)});
try{const prefs=JSON.parse(localStorage.getItem('bio_persistent_ost_v1')||'{}');track=Number.isInteger(prefs.track)?Math.max(0,Math.min(3,prefs.track)):0;volume.value=Number.isFinite(prefs.volume)?Math.max(0,Math.min(100,prefs.volume)):36;}catch{volume.value=36}
audio.loop=true;audio.volume=Number(volume.value)/100;
function persist(){try{localStorage.setItem('bio_persistent_ost_v1',JSON.stringify({track,volume:Number(volume.value)}))}catch{}}
function update(){select.value=String(track);play.textContent=audio.paused?'▶ '+i18n.play:'Ⅱ '+i18n.pause;mini.textContent=(audio.paused?'♪ ':'♫ ')+tracks[track][0];mini.setAttribute('aria-label',i18n.open);document.body.classList.toggle('bio-game-active',gameActive)}
function load(i){track=Math.max(0,Math.min(3,Number(i)||0));if(audio.dataset.track!==String(track)){audio.pause();audio.src=new URL(tracks[track][1],root);audio.dataset.track=String(track)}persist();update()}
function start(){explicitlyPaused=false;shouldResume=true;if(gameActive||otherAudio){update();return;}const p=audio.play();if(p&&p.catch)p.catch(()=>{explicitlyPaused=true;update()});update()}
function stop(){explicitlyPaused=true;shouldResume=false;audio.pause();update()}
function suspend(){shouldResume=shouldResume&&!explicitlyPaused||(!audio.paused&&!explicitlyPaused);audio.pause();update()}
function resume(){if(shouldResume&&!explicitlyPaused&&!gameActive&&!otherAudio){const p=audio.play();if(p&&p.catch)p.catch(()=>update());}update()}
function emit(name,detail){try{const w=frame.contentWindow;w.dataLayer=w.dataLayer||[];w.dataLayer.push({event:name,...detail})}catch{}}
function playIndex(i){load(i);start();emit('play_ost_audio',{ost_name:tracks[track][0],audio_source:'persistent_shell'});emit('ost_persistent_track',{track_id:tracks[track][1]});}
function route(path){const next=safePage(path);if(next){const current=new URL(location.href);current.searchParams.set('page',next);history.replaceState(null,'',current);}}
const api={route,playIndex,otherAudioStarted(){otherAudio=true;suspend()},otherAudioStopped(){otherAudio=false;resume()},gameStart(){gameActive=true;suspend()},gameEnd(){gameActive=false;resume()},get state(){return {track,src:audio.currentSrc||audio.src,paused:audio.paused,gameActive,otherAudio,route:new URL(frame.src).pathname,element:audio}}};
Object.defineProperty(window,'BioGlobalOST',{value:api,writable:false});
const initial=safePage(new URL(location.href).searchParams.get('page'))||(ja?'FUNAI-CARE_jp.html':'FUNAI-CARE.html');
frame.src=new URL(initial,root);
frame.addEventListener('load',()=>{try{if(frame.contentWindow.location.origin===location.origin){const path=frame.contentWindow.location.pathname.slice(root.pathname.length)+frame.contentWindow.location.search+frame.contentWindow.location.hash;route(path)}}catch{}});
load(track);
select.addEventListener('change',e=>playIndex(e.target.value));
play.addEventListener('click',()=>{audio.paused?start():stop()});
volume.addEventListener('input',()=>{audio.volume=Number(volume.value)/100;persist()});
audio.addEventListener('play',update);audio.addEventListener('pause',update);audio.addEventListener('ended',update);
function show(){panel.hidden=false;panel.setAttribute('aria-hidden','false');document.querySelector('#persistent-expand').setAttribute('aria-expanded','true');select.focus({preventScroll:true})}
function hide(){panel.hidden=true;panel.setAttribute('aria-hidden','true');document.querySelector('#persistent-expand').setAttribute('aria-expanded','false');document.querySelector('#persistent-expand').focus({preventScroll:true})}
document.querySelector('#persistent-expand').addEventListener('click',()=>panel.hidden?show():hide());
document.querySelector('#persistent-close').addEventListener('click',hide);
mini.addEventListener('click',show);
leaveBtn.addEventListener('click',()=>{let path='FUNAI-CARE.html';try{path=safePage(frame.contentWindow.location.href)||path}catch{}location.assign(new URL(path,root))});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){hide();e.preventDefault()}});
update();
})();
