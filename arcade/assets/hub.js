/* Bio-City Arcade — shared lobby, audio, saves, controls and stage shell. */
(()=>{'use strict';
const ja=document.documentElement.lang.startsWith('ja');
const I=ja?{
name:'Bio-City ゲームセンター',desc:'6つの挑戦、ひとつの生命都市。ガーディアンを選んで冒険を始めよう。',play:'プレイ',music:'OST 設定',back:'本編サイト',games:'ゲーム一覧',count:'好きなゲームから挑戦しよう',sound:'サウンド設定',song:'曲を選択',playMusic:'再生',pauseMusic:'停止',volume:'BGM 音量',sfx:'効果音',loop:'ループ',auto:'ゲーム開始時に再生',mute:'オフ',close:'閉じる',resume:'再開',again:'もう一度',hall:'ロビーへ',paused:'一時停止',won:'MISSION COMPLETE',lost:'MISSION FAILED',result:'プレイ結果',best:'自己ベスト',difficulty:'難易度',normal:'標準',hard:'上級',expert:'エキスパート',character:'ガーディアンを選択',mode:'モード',volley:'バレーボール',pong:'卓球',ready:'作戦を開始',keys:'操作',heroAlt:'ガーディアン',end:'任務終了',tip:'開始ボタンを押してから音楽を再生できます。',winHint:'クリア！',loseHint:'もう一度チャレンジ！',
names:['ガーディアン大乱闘','都市防衛戦','極限階段','エナジーマーブル','エナジー競技場','超高速レース'], descs:['横スクロール格闘・コンボ・スキル・ボス','7組のヒーローで3つのウェーブとボスに挑む','落ち続けるプラットフォーム生存','3ステージの反射ターゲットチャレンジ','バレーと卓球の2モードでコンピューターと対戦','3周の都市レース、9つのゲートとブースト'], hints:['A/D移動・W/S奥行き、J攻撃、Kジャンプ、L回避、Uスキル','7人のガーディアンで敵ウェーブとボスを攻略','左右移動、Spaceでジャンプ、Sで足場を下へ通過。目標深度へ進む','A/Dで角度、W/Sでパワー、Space発射。球が壁で跳ね返る','バレー：左右移動・Spaceジャンプ・J打球／卓球：上下でラケット移動、Jでタイミングよく打ち返す','A/Dで操舵、自動加速、Sブレーキ、Spaceブースト。3周で9つのゲートを順番に通過'],hero:['バーナー姐さん','MJ ロボット','モーモー','葉宝 EX','ゼリー三兄妹','野菜ソルジャー','オラクル'],skillLabels:['炎の灼熱','電磁チェイン','衝撃シールド','高速ダッシュ','ゼリー分身','回復ガーデン','時空停止'],selectIntro:'キャラクターと難易度を選んで出撃',trackNames:['Bio-City 覺醒時刻（熱血女聲版）','Burner 姐召喚（搖滾男聲版）','MJロボット刻む（日文版 Ver. A）','MJロボット刻む（日文版 Ver. B）'],record:'今回の記録',instructions:'デスクトップはキーボード、スマートフォンは画面内の方向／アクションボタン。音楽設定は端末内に保存します。',offline:'再生できません。ネットワークと音源を確認してください。'
}:{
name:'Bio-City 守護者遊戲中心',desc:'六種挑戰，一座生命之城。選好守護者，從這裡展開你的冒險。',play:'開始遊戲',music:'OST 音樂',back:'返回守護者網站',games:'六款遊戲',count:'選一款遊戲，開始你的挑戰',sound:'遊戲音樂與音效',song:'選擇配樂',playMusic:'播放',pauseMusic:'暫停',volume:'背景音樂音量',sfx:'音效音量',loop:'循環播放',auto:'開始遊戲時播放',mute:'不播放配樂',close:'關閉',resume:'繼續',again:'重新挑戰',hall:'返回遊戲大廳',paused:'遊戲已暫停',won:'MISSION COMPLETE',lost:'MISSION FAILED',result:'本次遊戲成績',best:'個人最高紀錄',difficulty:'遊戲難度',normal:'標準',hard:'進階',expert:'專家',character:'選擇守護者',mode:'比賽模式',volley:'排球',pong:'桌球',ready:'準備作戰',keys:'操作方式',heroAlt:'守護者',end:'任務結束',tip:'瀏覽器需要你主動點擊後才會播放音樂。',winHint:'通關成功！',loseHint:'下次挑戰再突破！',
names:['守護者大亂鬥','城市防衛戰','極限下樓梯','能源彈珠競技','能量競技場','極速競賽'],descs:['2.5D 格鬥：連招、閃避、技能與 Boss','七組守護者、三波敵軍與最終 Boss','不斷下落的平台、陷阱與生存判斷','三關靶場、調整角度、蓄力射擊與反彈','排球與桌球雙模式，挑戰電腦對手','三圈城市競速、九個檢查點與氮氣超車'],hints:['A/D 左右、W/S 前後、J 攻擊、K 跳躍、L 閃避、U 技能','操控七組守護者迎戰三波敵軍與 Boss','左右移動、Space 跳躍、S 向下穿過平台，突破指定深度','A/D 調整角度、W/S 調整力道、Space 發射','排球：左右移動、Space 跳、J 擊球；桌球：上下移動球拍、J 抓準時機回擊','A/D 轉向、自動加速、S 煞車、Space 氮氣；三圈依序通過九個檢查點'],hero:['Burner 姐','MJ 機器人','萌牛阿哞','葉寶 EX','果凍三兄妹','野菜小將','Oracle 守望者'],skillLabels:['烈焰灼燒','電磁連鎖','衝擊護盾','光速衝刺','果凍分身','療癒花園','時空凍結'],selectIntro:'先選英雄與難度，再進入遊戲',trackNames:['Bio-City 覺醒時刻（熱血女聲版）','Burner 姐召喚（搖滾男聲版）','MJロボット刻む（日文版 Ver. A）','MJロボット刻む（日文版 Ver. B）'],record:'本次表現',instructions:'電腦可用鍵盤；手機使用畫面中的移動與動作按鍵。音樂設定僅儲存於這台裝置。',offline:'音訊載入失敗，請確認網路及音源。'
};
const ids=['g01','g02','g03','g04','g05','g06'];
const HEROES=['burner-sister','mj-robot','moo-moo','ye-bao-ex','jelly-trio','veggie-kid','oracle-guardian'];
const srcTrack=['bio-city-awakening-theme-v2.mp3','burner-sister-summoning-theme.mp3','mj-robot-kizamu-japanese-v1.mp3','mj-robot-kizamu-japanese-v2.mp3'];
const safeJson=(key,defaultValue)=>{try{return JSON.parse(localStorage.getItem(key))||defaultValue}catch{return defaultValue}};
let prefs=window.BioArcadeAudioPolicy.normalize(safeJson('bio_arcade_pref_v1',{}),srcTrack.length);
const savePrefs=()=>{try{localStorage.setItem('bio_arcade_pref_v1',JSON.stringify(prefs))}catch{}};
savePrefs();
const currentLocale=ja?'ja':'zh'; const trackUrl=i=>'../../music/'+srcTrack[i];
const stageSongs={g01:[1,1,1,3,1],g02:[2,2,3,2,3],g03:[0,0,3,0,2],g04:[3,3,2,3,1],g05:[0,0,3,2,1],g06:[1,0,2,1,3]};
let previousStageTrack=null;
function selectStageSong(id){
 if(prefs.playMode==='off')return false;
 if(prefs.playMode==='scene')prefs.track=(stageSongs[id]||stageSongs.g03)[Math.max(1,Math.min(5,sessionKind==='campaign'?chapter:1))-1];
 else if(prefs.playMode==='shuffle'){
   prefs.track=window.BioArcadeAudioPolicy.nextTrack(srcTrack.length,previousStageTrack);
 }
 previousStageTrack=prefs.track;
 savePrefs();syncAudio();return true;
}
let musicElement=new Audio();musicElement.id='arcade-bgm';musicElement.hidden=true;musicElement.preload='metadata';musicElement.loop=!!prefs.loop;musicElement.volume=prefs.volume/100;
let lastMusicGesture=0;
let audioAttempt=0,audioState='idle',resumeMusicOnContinue=false,lastPlayError=null;
const audioLabels=ja?{idle:'ゲーム開始時に再生',loading:'音楽を読み込み中',playing:'再生中',paused:'一時停止中',blocked:'タップして音楽を有効にする',error:'音楽を読み込めません'}:{idle:'開始遊戲時播放',loading:'音樂載入中',playing:'播放中',paused:'已暫停',blocked:'點擊啟用音樂',error:'音樂載入失敗'};
function audioStatus(state){
 audioState=state;const el=document.querySelector('#music-status');if(el){el.dataset.state=state;el.textContent=audioLabels[state]+(state==='playing'?' · '+I.trackNames[prefs.track]:'');}
 const muted=prefs.playMode==='off'||prefs.volume===0,disabledAuto=!prefs.auto&&state==='idle';
 const label=muted?(ja?'BGM オフ':'配樂已靜音'):disabledAuto?(ja?'自動再生オフ':'自動播放已關閉'):audioLabels[state];
 const bar=document.querySelector('#stage-audio-status');if(bar){bar.dataset.state=muted?'muted':state;bar.textContent='♪ OST · '+label;}
 const button=document.querySelector('#stage-audio-play');if(button){button.hidden=muted||!['blocked','error','paused','idle'].includes(state);button.textContent=state==='error'?(ja?'再試行':'重試'):(ja?'再生':'播放');}
 const info=document.querySelector('#audio-diagnostics');if(info)info.textContent=JSON.stringify({state,mode:prefs.playMode,auto:prefs.auto,volume:prefs.volume,sfx:prefs.sfx,track:srcTrack[prefs.track],readyState:musicElement.readyState,networkState:musicElement.networkState,mediaError:musicElement.error?.code||null,playError:lastPlayError,userActivation:navigator.userActivation?{active:navigator.userActivation.isActive,hasBeenActive:navigator.userActivation.hasBeenActive}:null,audioContext:ac?.state||'not-created'},null,2);
}
let ac=null;const sounding=new Set();
function stopEffects(){for(const node of sounding)try{node.stop();}catch{}sounding.clear();}
function unlockSfx(){if(prefs.sfx<1)return;try{ac=ac&&ac.state!=='closed'?ac:new(window.AudioContext||window.webkitAudioContext)();ac.resume()?.catch(()=>{});}catch{}}
function sfx(freq=420,len=.08){if(prefs.sfx<1)return;if(!ac||ac.state!=='running')unlockSfx();if(!ac||ac.state!=='running')return;try{const osc=ac.createOscillator(),gain=ac.createGain();osc.type='triangle';osc.frequency.value=freq;gain.gain.value=.045*prefs.sfx/100;gain.gain.exponentialRampToValueAtTime(.00001,ac.currentTime+len);osc.connect(gain);gain.connect(ac.destination);sounding.add(osc);osc.onended=()=>sounding.delete(osc);osc.start();osc.stop(ac.currentTime+len);}catch{}}
function loadSong(){const url=trackUrl(prefs.track);if(!musicElement.src.endsWith(srcTrack[prefs.track])||musicElement.error){musicElement.pause();musicElement.src=url;musicElement.load();}musicElement.volume=prefs.volume/100;musicElement.loop=!!prefs.loop;}
function playSong(){
 if(document.hidden||prefs.playMode==='off'||prefs.volume===0)return;
 const attempt=++audioAttempt;lastPlayError=null;loadSong();audioStatus('loading');
 const failed=error=>{if(attempt!==audioAttempt)return;lastPlayError=error?.name||'UnknownError';parentMusic()?.otherAudioStopped(musicElement);audioStatus(lastPlayError==='NotAllowedError'?'blocked':lastPlayError==='AbortError'?'paused':'error');syncAudio();};
 try{const task=musicElement.play();Promise.resolve(task).then(()=>{if(attempt!==audioAttempt)return;parentMusic()?.otherAudioStarted(musicElement);audioStatus(musicElement.paused?'paused':'playing');syncAudio();},failed);}catch(error){failed(error);}syncAudio();
}
function requestMusic(){lastMusicGesture=performance.timeOrigin+performance.now();unlockSfx();playSong();}
function pauseSong(){audioAttempt++;resumeMusicOnContinue=false;musicElement.pause();parentMusic()?.otherAudioStopped(musicElement);audioStatus('paused');syncAudio();}
function holdMusic(){stopEffects();const resume=resumeMusicOnContinue||!musicElement.paused;pauseSong();resumeMusicOnContinue=resume;}
function continueMusic(){unlockSfx();if(resumeMusicOnContinue){resumeMusicOnContinue=false;playSong();}}
musicElement.addEventListener('playing',()=>{if(document.hidden){musicElement.pause();return;}if(musicElement.paused)return;audioStatus('playing');syncAudio();});
musicElement.addEventListener('pause',()=>{if(musicElement.paused&&!['blocked','error','loading'].includes(audioState))audioStatus('paused');syncAudio();});
musicElement.addEventListener('error',()=>{if(musicElement.error){lastPlayError='MediaError:'+musicElement.error.code;audioStatus('error');syncAudio();}});
musicElement.addEventListener('waiting',()=>{if(!musicElement.paused)audioStatus('loading');});
musicElement.addEventListener('ended',()=>{if(musicElement.ended||musicElement.paused)audioStatus('paused');syncAudio();});
const ga=(name,detail={})=>{window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:name,...detail})};
const parentMusic=()=>{try{return window.parent!==window&&window.parent.BioGlobalOST||null}catch{return null}};

let legacyReadyTimer=null;
let launchEpoch=0,loading=false,pauseRequested=false;
let legacyFrame=null,selected=0,heroIdx=Math.max(0,Math.min(6,Number(safeJson('bio_arcade_hero_v1',0))||0)),mode='volley',difficulty='normal',active=null,game=null,loopId=0,last=0,lastHudUpdate=0,lastHud='',resize=null,commands=new Set(),inputPulses=new Set(),touchKeys=new Set(),touchOwners=new Map(),pointer={x:0,y:0,down:false};
const requestedHero=new URLSearchParams(location.search).get('hero');if(requestedHero!==null&&/^[0-6]$/.test(requestedHero))heroIdx=Number(requestedHero);
const $=s=>document.querySelector(s);const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));const rnd=(a,b)=>Math.random()*(b-a)+a;const choice=(a)=>a[Math.floor(Math.random()*a.length)];
const GUIDE=window.BioArcadeGuide,Controls=window.BioControlProfiles;
let controlInput=null,controlSettings=null,controlPlan={reservedLeft:0,reservedRight:0},controlsResume=false,controlsEpoch=0;
const CAMPAIGN=window.BioCampaign;
const C=ja?{campaign:'連続ミッション',quick:'単発チャレンジ',chapter:'チャプター',next:'次のステージ →',retry:'このステージを再挑戦',done:'全5ステージ制覇！',save:'この端末に進行状況を保存',locked:'未開放',total:'累積スコア'}:{campaign:'連續闖關',quick:'單局挑戰',chapter:'闖關進度',next:'下一關 →',retry:'從本關重試',done:'五章戰役全部完成！',save:'進度保存在目前瀏覽器',locked:'尚未解鎖',total:'累計分數'};
let sessionKind='campaign',chapter=1,chapterScore=0,chapterDifficulty='normal';
function campaignProgress(g=ids[selected]){return CAMPAIGN.read(g,mode,difficulty)}
function chapterLabel(){return sessionKind==='campaign'?' · '+C.chapter+' '+chapter+'/'+CAMPAIGN.TOTAL:''}
const chapterBriefs=ja?{
 g01:['中央市街｜基本コンボとボスの予告攻撃を習得','エネルギー工場｜連続弾幕を回避','空中プラットフォーム｜突進を避けて反撃','崩壊地区｜衝撃波と両側の敵に注意','エントロピー中枢｜突進・衝撃・弾幕の総合戦'],
 g02:['中央広場｜基本射撃と回避を練習','動力施設｜警告エリアを避ける','高架防衛線｜複数の放電ゾーン','崩壊地区｜交互に作動する危険区域','中枢防衛｜三方向の危険区域と強化ボス'],
 g03:['整備縦坑｜安全な足場で移動','昇降機エリア｜速い可動足場','送風設備｜横風で着地点が変化','崩落地区｜脆い足場が素早く崩壊','エントロピー裂け目｜気流と可動足場の混合'],
 g04:['精密射撃｜射線と角度を学ぶ','反射グリッド｜反射先を予測','可動反射板｜動く装置の位置を読む','装甲ターゲット｜複数回命中させる','エネルギー中枢｜強化コアを破壊'],
 g05:['練習試合｜基本操作とサーブ','都市アリーナ｜守備型 AI と対戦','屋外コート｜先読みする AI と対戦','ナイトリーグ｜攻撃的なコース取り','決勝戦｜最終 AI に勝利'],
 g06:['都市環状線｜直線と緩いカーブ','緑の山道｜上り坂と木立','高架スカイウェイ｜連続 S 字と高架設備','キャニオン｜急坂と岩壁','エントロピー回路｜複合カーブとエネルギー塔']
}:{
 g01:['中央街區｜熟悉連擊與 Boss 預警','能源工廠｜躲避連續彈幕','空中月台｜閃避衝刺並抓準反擊時機','崩裂城區｜防範震地及兩側敵軍','熵核決戰｜衝刺、震地與彈幕綜合挑戰'],
 g02:['中央廣場｜練習射擊與基本閃避','能源設施｜觀察預警區域並迴避','高架防線｜應付雙區域能源放電','崩裂城區｜躲避交錯啟動的危險區','城市核心｜三處危險區與強化 Boss'],
 g03:['維修深井｜利用安全平台下降','移動升降區｜掌握加速移動的平台','強風通道｜橫向氣流影響落點','崩塌區域｜脆弱平台更快破裂','熵能裂隙｜氣流與移動平台混合挑戰'],
 g04:['精準射擊｜掌握角度與蓄力','反射網格｜預判多次反彈','移動機關｜抓準動態反射器位置','裝甲靶場｜需要多次命中','核心超載｜擊破額外強化核心'],
 g05:['基礎練習｜熟悉發球與回球','都市競技場｜挑戰防守型 AI','戶外球場｜AI 逐步預判落點','夜間聯賽｜AI 改變進攻路線','冠軍決賽｜挑戰最高級 AI'],
 g06:['都市環線｜直線與平緩彎道','山區林道｜上下坡與樹林景觀','天空高架｜連續 S 彎與高架設施','峽谷急降｜陡坡與岩壁','熵核賽道｜複合彎道與能源塔']
};
function updateChapterBrief(){const target=$('#campaign-brief'),id=$('#setup-play').dataset.game;if(!target||!id)return;const effective=sessionKind==='quick'?1:chapter;target.textContent=(ja?'第':'第')+effective+(ja?'章 · ':'章｜')+(chapterBriefs[id]?.[effective-1]||'');}
function campaignSettings(){
 const g=$('#setup-play').dataset.game;if(!g)return;
 let host=$('#campaign-settings');
 if(!host){
  host=document.createElement('div');host.id='campaign-settings';host.className='campaign-settings';
  host.innerHTML=`<label><span>${ja?'プレイモード':'遊戲模式'}</span><select id="campaign-kind"><option value="campaign">${C.campaign}</option><option value="quick">${C.quick}</option></select></label><label><span>${C.chapter}</span><select id="campaign-chapter" aria-describedby="campaign-save-hint"></select></label><small id="campaign-save-hint"></small><p class="campaign-brief" id="campaign-brief" aria-live="polite"></p>`;
  $('#setup .setup-row').appendChild(host);
  $('#campaign-kind').addEventListener('change',e=>{sessionKind=e.target.value;campaignSettings()});
  $('#campaign-chapter').addEventListener('change',e=>{chapter=Number(e.target.value)||1;updateChapterBrief()});
 }
 const unlocked=campaignProgress(g).unlocked;$('#campaign-kind').value=sessionKind;
 const select=$('#campaign-chapter');chapter=Math.max(1,Math.min(chapter,unlocked));
 select.innerHTML=Array.from({length:CAMPAIGN.TOTAL},(_,i)=>`<option value="${i+1}" ${i>=unlocked?'disabled':''}>${ja?'チャプター '+(i+1):'第 '+(i+1)+' 章'}${i>=unlocked?' · '+C.locked:''}</option>`).join('');
 select.value=String(sessionKind==='quick'?1:chapter);select.disabled=sessionKind==='quick';
 $('#campaign-save-hint').textContent=sessionKind==='quick'?(ja?'最初のステージで単発チャレンジ':'從第一章進行單局挑戰'):(ja?`全 ${CAMPAIGN.TOTAL} 章 · ${unlocked} 章まで解放 · ${C.save}`:`共 ${CAMPAIGN.TOTAL} 章 · 已解鎖至第 ${unlocked} 章 · ${C.save}`);
 updateChapterBrief();
}

const coverAlt=ja?['ガーディアンの格闘','都市防衛の射撃戦','足場を降りるガーディアン','反射ターゲットと発射台','ガーディアンのバレーボール','Bio-Cityのレースコース']:['守護者近身格鬥','城市防衛射擊戰','守護者平台下落','三關反彈靶場與發射台','守護者排球對戰','Bio-City 城市賽道'];
function renderCards(){const el=$('#game-list');el.innerHTML=ids.map((g,i)=>`<article class="game-card" data-game="${g}"><div class="game-thumb"><img src="../assets/covers/${g}.webp?v=20261025.5" alt="${coverAlt[i]}" width="960" height="540" loading="lazy"><span>G0${i+1}</span><small>${GUIDE.labels.preview}</small></div><div class="game-body"><div class="game-meta"><span>${['BEAT ’EM UP','SHOOTER','PLATFORM','PHYSICS','SPORTS','RACING'][i]}</span><span id="best-${g}">${recordText(g)}</span></div><h3>${I.names[i]}</h3><p>${I.descs[i]}</p><div class="card-actions"><button class="btn" data-launch="${g}">${I.play} <span aria-hidden="true">→</span></button><button class="btn secondary card-help" data-guide="${g}" aria-label="${I.names[i]} · ${GUIDE.labels.title}">${ja?'遊び方':'玩法說明'}</button></div></div></article>`).join('');}
function guideMarkup(g,submode=mode){const v=GUIDE.get(g,submode),l=GUIDE.labels;return `<div class="guide-goal"><span class="guide-eyebrow">${l.goal}</span><p>${v.goal}</p></div><h3>${l.keyboard}</h3><dl class="guide-keys">${v.keys.map(([key,meaning])=>`<div><dt><kbd>${key}</kbd></dt><dd>${meaning}</dd></div>`).join('')}</dl><h3>${l.touch}</h3><p>${v.touch}</p><div class="guide-tip"><b>${l.tip}</b><p>${v.tip}</p></div>`;}
function renderSetupGuide(){const g=$('#setup-play').dataset.game;if(!g)return;const v=GUIDE.get(g,mode);$('#setup-guide-content').innerHTML=guideMarkup(g);$('#setup-desc').textContent=v.goal;$('#setup-quick-guide').innerHTML=`<p>${v.touch}</p><button class="setup-guide-link" id="setup-help" type="button">${GUIDE.labels.title} ↗</button>`;$('#setup-selected').innerHTML=`<img src="../../images/funai-care-${HEROES[heroIdx]}.png" alt="" width="94" height="118"><div><span class="guide-eyebrow">${GUIDE.labels.selected}</span><h3>${I.hero[heroIdx]}</h3><p>${g==='g01'?I.skillLabels[heroIdx]:g==='g02'?GUIDE.shooterSkills[heroIdx]:v.role}</p></div>`;}
function setBackgroundInert(on){for(const el of document.querySelectorAll('.hub-head,.hub-main,.hub-foot,.site-bottom-nav,.backtop'))el.inert=on;}
let setupReturn=null,helpReturn=null,helpResume=false,legacyHelpResume;
function closeSetup(){if(!$('#setup').classList.contains('show'))return;$('#setup').classList.remove('show');document.body.classList.remove('setup-active');setBackgroundInert(!!active);setupReturn?.focus({preventScroll:true});}
function openHelp(g=active){if(!g)return;helpReturn=document.activeElement;helpResume=!!(active&&active!=='g02'&&game&&!game.paused&&!game.ended);if(helpResume)pause();if(active==='g02')legacyFrame?.contentWindow.postMessage({source:'bio-city-hub',command:'guide-pause',resumeAfter:legacyHelpResume},location.origin);resetInputs();$('#guide-title').textContent=I.names[ids.indexOf(g)]+' · '+GUIDE.labels.title;$('#guide-content').innerHTML=guideMarkup(g);$('#guide-close').textContent=active?GUIDE.labels.close:I.close;$('#game-help').hidden=false;setBackgroundInert(true);if(active)$('#stage').inert=true;document.body.classList.add('help-active');$('#guide-close').focus({preventScroll:true});ga('arcade_help_open',{game_id:g,mode:g==='g05'?mode:undefined,language:currentLocale});}
function closeHelp(){if($('#game-help').hidden)return;$('#game-help').hidden=true;document.body.classList.remove('help-active');$('#stage').inert=false;setBackgroundInert(!!active||$('#setup').classList.contains('show'));if(active==='g02')legacyFrame?.contentWindow.postMessage({source:'bio-city-hub',command:'guide-resume'},location.origin);legacyHelpResume=undefined;if(helpResume&&game?.paused&&!game.ended)pause();const resumed=helpResume;helpResume=false;if(active&&resumed)$('#stage').focus({preventScroll:true});else if(active!=='g02')helpReturn?.focus({preventScroll:true});}
function syncStageControls(){const v=GUIDE.get(active,mode),left=$('.touch-left'),right=$('.touch-right');const pad=active==='g01'||active==='g04';$('#stage-controls').dataset.layout=pad?'dpad':active==='g05'&&mode==='pong'?'vertical':'pair';$('#stage-controls').dataset.stickAxis=pad?'xy':active==='g05'&&mode==='pong'?'y':'x';
 const rightDirs=active==='g03'?['down']:active==='g06'?['down']:[];
 for(const el of document.querySelectorAll('[data-touch]')){const key=el.dataset.touch,label=v.buttons[key];el.hidden=!label;if(label){el.textContent=label;el.setAttribute('aria-label',label);}const dir=['left','right','up','down'].includes(key);(dir&&!rightDirs.includes(key)?left:right).appendChild(el);if(dir&&!rightDirs.includes(key))el.hidden=true;}
 $('.stage-footer').textContent=v.keys.map(([key,meaning])=>key+' '+meaning).join(' · ');$('#stage-help').setAttribute('aria-label',GUIDE.labels.title);$('#stage-help').title=GUIDE.labels.title;}
const bestKey=(g,submode)=>'bio_arcade_best_'+g+(g==='g05'&&submode?'-'+submode:'');
const readScore=key=>{const n=Number(safeJson(key,0));return Number.isFinite(n)&&n>=0?Math.floor(n):0;};
function getBest(g,submode){
 if(g==='g05'&&!submode)return Math.max(readScore(bestKey(g)),readScore(bestKey(g,'volley')),readScore(bestKey(g,'pong')));
 if(g==='g02')return Math.max(readScore(bestKey(g)),readScore('bio-city-arcade-high-v1'));
 return readScore(bestKey(g,submode));
}
function recordText(g){const n=getBest(g);return n?`${I.best} ${n}`:'NEW'}
function storeBest(g,v,submode){const n=Number(v);if(!Number.isFinite(n)||n<0)return;if(n>getBest(g,submode)){try{localStorage.setItem(bestKey(g,submode),JSON.stringify(Math.floor(n)))}catch{}}}
function renderHero(){const el=$('#hero-choices'),savedScroll=el.scrollLeft,g=$('#setup-play')?.dataset.game,showSkill=g==='g01'||g==='g02';el.innerHTML=HEROES.map((id,i)=>`<button type="button" class="hero-chip ${heroIdx===i?'chosen':''}" data-hero="${i}" aria-pressed="${heroIdx===i}" aria-label="${I.hero[i]}${showSkill?' · '+(g==='g01'?I.skillLabels[i]:GUIDE.shooterSkills[i]):''}"><div class="hero-card-image"><img src="../../images/funai-care-${id}.png" alt="" loading="lazy" width="160" height="180"><span class="hero-check" aria-hidden="true">✓</span></div><span>${I.hero[i]}</span>${showSkill?`<small class="hero-skill">${g==='g01'?I.skillLabels[i]:GUIDE.shooterSkills[i]}</small>`:''}</button>`).join('');el.scrollLeft=savedScroll;renderSetupGuide();}
function initHub(){document.title=I.name+' | FUNAI CARE';$('#title').textContent=ja?'ガーディアン\nゲームセンター':'守護者\n遊戲中心';$('#subtitle').textContent=I.desc;$('#catalog-title').textContent=I.games;$('#catalog-count').textContent=I.count;$('#settings-label').textContent=I.music;$('#instructions').textContent=I.instructions;$('#audio-title').textContent=I.sound;$('#track-label').textContent=I.song;
 $('#music-mode-label').textContent=ja?'再生モード':'播放模式';
 const labels=ja?['シーン別おすすめ','曲を指定','ステージごとにランダム','BGMをオフ']:['依場景推薦','自選歌曲','每關隨機','關閉配樂'];
 [...$('#music-mode').options].forEach((opt,i)=>opt.textContent=labels[i]);
 $('#music-mode').value=prefs.playMode;$('#volume-label').textContent=I.volume;$('#sfx-label').textContent=I.sfx;$('#loop-label').textContent=I.loop;$('#auto-label').textContent=I.auto;$('#close-audio').textContent=I.close;$('#track-select').innerHTML=I.trackNames.map((name,i)=>`<option value="${i}">${name}</option>`).join('')+`<option value="off">${I.mute}</option>`;$('#track-select').value=prefs.volume===0?'off':String(prefs.track);$('#music-volume').value=prefs.volume;$('#sfx-volume').value=prefs.sfx;$('#music-loop').checked=prefs.loop;$('#music-auto').checked=prefs.auto;for(const [id,long,short]of [['stage-back','← '+I.hall,'←'],['stage-pause',I.paused,'Ⅱ'],['stage-restart',I.again,'↻'],['stage-music','♪ OST','♪'],['stage-help',GUIDE.labels.title,'?'],['stage-controls-settings',ja?'操作設定':'操作設定','✥']]){const el=$('#'+id);el.innerHTML=`<span class="stage-label-long">${long}</span><span class="stage-label-short" aria-hidden="true">${short}</span>`;el.setAttribute('aria-label',long);el.title=long;}$('#pause-resume').textContent=I.resume;$('#pause-leave').textContent=I.hall;renderCards();renderHero();syncAudio();}
function syncAudio(){audioStatus(audioState);$('#music-toggle').textContent=musicElement.paused?'▶ '+I.playMusic:'Ⅱ '+I.pauseMusic;$('#track-select').value=prefs.playMode==='off'||prefs.volume===0?'off':String(prefs.track);$('#music-mode').value=prefs.playMode;}
function toast(s){const x=$('#toast');x.textContent=s;x.classList.add('show');clearTimeout(x._id);x._id=setTimeout(()=>x.classList.remove('show'),2800)}
function stageUI(g){selected=ids.indexOf(g);$('#stage').dataset.game=g;setBackgroundInert(true);syncStageControls();const area=$('#stage');area.classList.add('active');area.setAttribute('aria-hidden','false');document.body.classList.add('stage-active');$('#stage-title').textContent=I.names[selected]+chapterLabel();$('#stage-hud').textContent='';lastHud='';lastHudUpdate=0;$('#stage-inner').innerHTML='';$('#stage-dialog-layer').classList.remove('show');$('#stage-dialog-layer').setAttribute('aria-hidden','true');delete $('#pause-resume').dataset.restart;delete $('#pause-resume').dataset.next;$('#pause-resume').textContent=I.resume;$('#stage-controls').style.display='';$('#stage-pause').style.display='';$('#stage-restart').style.display='';$('#stage-content').style.display='flex';$('#stage').focus({preventScroll:true});}
function stopLoop(){if(loopId){cancelAnimationFrame(loopId);loopId=0;}}
function queueFrame(){if(!loopId&&active&&active!=='g02'&&game&&!game.paused&&!game.ended)loopId=requestAnimationFrame(frame);}
const resumeClock=window.BioArcadeSession.countdown({
 tick:left=>{$('#stage').dataset.phase='countdown';$('#dialog-title').textContent=I.resume+' · '+left;$('#dialog-desc').textContent=ja?'まもなく再開します':'準備恢復遊戲';$('#pause-resume').disabled=true;},
 done:()=>{if(!active||!game||game.ended||document.hidden)return;resetInputs();game.paused=false;$('#stage').dataset.phase='playing';$('#pause-resume').disabled=false;$('#stage-dialog-layer').classList.remove('show');$('#stage-dialog-layer').setAttribute('aria-hidden','true');last=performance.now();$('#stage').focus({preventScroll:true});queueFrame();}
});
function leave(){if(!active)return;clearTimeout(legacyReadyTimer);launchEpoch++;controlInput?.dispose();controlInput=null;controlPlan={reservedLeft:0,reservedRight:0};$('#stage-inner').style.paddingLeft=$('#stage-inner').style.paddingRight='';$('#stage-controls').classList.remove('bio-controls');loading=false;pauseRequested=false;resumeClock.cancel();stopEffects();stopLoop();resize?.disconnect();resize=null;if(active==='g02'){if(legacyFrame){legacyFrame.src='about:blank';legacyFrame.remove();legacyFrame=null;}$('#stage-inner').replaceChildren();}game=null;ga('arcade_game_exit',{game_id:active,language:currentLocale});pauseSong();parentMusic()?.gameEnd();active=null;setBackgroundInert(false);$('#stage').classList.remove('active');$('#stage').setAttribute('aria-hidden','true');$('#stage').dataset.phase='idle';document.body.classList.remove('stage-active');$('#stage-dialog-layer').classList.remove('show');$('#pause-resume').disabled=false;resetInputs();for(const i of ids){const e=$('#best-'+i);if(e)e.textContent=recordText(i);}document.querySelector('[data-launch="'+ids[selected]+'"]')?.focus({preventScroll:true});}
function pause(force=false){
 if(!active||active==='g02'||game?.ended)return;
 if(loading){pauseRequested=true;holdMusic();resetInputs();return;}
 if(!game)return;
 if(force||!game.paused||resumeClock.running){
  resumeClock.cancel();game.paused=true;pauseRequested=true;holdMusic();stopLoop();resetInputs();$('#stage').dataset.phase='paused';$('#stage-dialog-layer').classList.add('show');$('#stage-dialog-layer').setAttribute('aria-hidden','false');$('#dialog-title').textContent=I.paused;$('#dialog-desc').textContent=I.hints[selected];$('#pause-resume').disabled=false;$('#pause-resume').textContent=I.resume;$('#pause-resume').focus({preventScroll:true});
 }else if(!document.hidden){pauseRequested=false;resetInputs();continueMusic();resumeClock.start();}
}
function showCampaignResult(win,score,note){
 const continuous=sessionKind==='campaign';
 if(continuous){
  if(win){CAMPAIGN.complete(active,mode,difficulty,chapter,chapterScore+Math.max(0,score));chapterScore+=Math.max(0,score);}
  $('#dialog-title').textContent=win?(chapter===CAMPAIGN.TOTAL?C.done:I.won+' · '+C.chapter+' '+chapter+'/'+CAMPAIGN.TOTAL):I.lost;
  $('#dialog-desc').textContent=`${I.result} · ${Math.floor(score)} / ${C.total} ${Math.floor(chapterScore)} · ${note||''}`;
  delete $('#pause-resume').dataset.restart;delete $('#pause-resume').dataset.next;
  if(win&&chapter<CAMPAIGN.TOTAL){$('#pause-resume').dataset.next='1';$('#pause-resume').textContent=C.next;}
  else if(win){$('#pause-resume').dataset.restart='1';$('#pause-resume').textContent=I.again;}
  else{$('#pause-resume').dataset.restart='1';$('#pause-resume').textContent=C.retry;}
  ga('arcade_campaign_stage',{game_id:active,chapter,mode:active==='g05'?mode:undefined,outcome:win?'win':'loss',language:currentLocale});
 }else{
  $('#dialog-title').textContent=win?I.won:I.lost;
  $('#dialog-desc').textContent=`${I.result} · ${Math.floor(score)}  |  ${note||''}`;
  $('#pause-resume').textContent=I.again;$('#pause-resume').dataset.restart='1';
 }
 $('#stage-dialog-layer').classList.add('show');$('#stage-dialog-layer').setAttribute('aria-hidden','false');$('#pause-resume').focus({preventScroll:true});
}
function finish(win,score,note){if(!game||game.ended)return;game.ended=true;game.paused=true;resumeClock.cancel();$('#pause-resume').disabled=false;stopLoop();resetInputs();storeBest(active,score,active==='g05'?mode:undefined);showCampaignResult(win,score,note);ga('game_completed',{game_id:active,hero_used:HEROES[heroIdx],mode:active==='g05'?mode:undefined,outcome:win?'win':'loss',final_score:Math.floor(score),difficulty:chapterDifficulty,chapter:sessionKind==='campaign'?chapter:undefined,game_version:'1'});ga('arcade_game_finish',{game_id:active,mode:active==='g05'?mode:undefined,outcome:win?'win':'loss',final_score:Math.floor(score),difficulty:chapterDifficulty,chapter:sessionKind==='campaign'?chapter:undefined,language:currentLocale});sfx(win?850:190,.25);}
let touchPointerId=null;
function installControls(){
 controlInput?.dispose();const element=$('#stage-controls');
 controlInput=Controls.createInput({root:element,stick:$('#stick-pad'),knob:$('#stick-knob'),buttons:[...element.querySelectorAll('[data-touch]')].map(el=>({el,key:el.dataset.touch})),context:()=>({game:active,mode,axis:element.dataset.stickAxis}),enabled:()=>!!game&&!loading&&!game.paused&&!game.ended,space:()=>$('#stage-inner'),onLayout:plan=>{controlPlan=plan;resizeCanvas();}});
}
function readInputs(dt){
 const input=controlInput?.read(dt)||{x:0,y:0,actions:new Set(),pulses:new Set()},pulses=new Set([...inputPulses,...input.pulses]);inputPulses.clear();
 const key=(...names)=>names.some(k=>commands.has(k)),action=k=>input.actions.has(k)||pulses.has(k);
 const left=key('a','ArrowLeft')||pulses.has('left'),right=key('d','ArrowRight')||pulses.has('right'),up=key('w','ArrowUp')||pulses.has('up'),down=key('s','ArrowDown')||pulses.has('down');
 const moveX=clamp((right?1:0)-(left?1:0)+input.x,-1,1),moveY=clamp(((active==='g05'&&mode==='pong'?(down||right):(down))?1:0)-((active==='g05'&&mode==='pong'?(up||left):up)?1:0)+input.y,-1,1);
 touchKeys.clear();for(const k of [...input.actions,...input.pulses,...(controlInput?.debug.dirs||[])])touchKeys.add(k);
 const aim={...pointer,down:pointer.down||pulses.has('pointer')};pointer.released=false;
 return {moveX,moveY,left:left||input.x<-.2,right:right||input.x>.2,up:up||input.y<-.2,down:down||action('down')||input.y>.2,fire:key('j')||((active==='g04'||active==='g06'||active==='g05'&&mode==='pong')&&key(' '))||action('fire'),jump:key('k')||((active==='g01'||active==='g03'||active==='g05'&&mode==='volley')&&key(' '))||action('jump'),dodge:key('l')||action('dodge'),skill:key('u')||action('skill'),actionAssist:!!input.assist,pointer:aim};
}
function resetInputs(){commands.clear();inputPulses.clear();touchKeys.clear();controlInput?.reset();pointer.down=false;pointer.released=false;pointer.moved=false;pointer.dragRatio=0;const previous=touchPointerId;touchPointerId=null;try{const canvas=$('#hub-canvas');if(previous!==null&&canvas?.hasPointerCapture(previous))canvas.releasePointerCapture(previous);}catch{}}
const viewports={g01:[800,600],g03:[480,720],g04:[600,720],g05:[640,480],g06:[640,800]};
function logicalViewport(id){return id==='g06'&&innerWidth/Math.max(1,innerHeight)>=4/3?[960,540]:viewports[id];}
function resizeCanvas(){
 const canvas=$('#hub-canvas');if(!canvas||!active||active==='g02')return;const host=$('#stage-inner'),[w,h]=logicalViewport(active),space=host.getBoundingClientRect(),left=controlPlan.reservedLeft||0,right=controlPlan.reservedRight||0;
 host.style.paddingLeft=left+'px';host.style.paddingRight=right+'px';host.style.boxSizing='border-box';
 const availableWidth=Math.max(60,space.width-left-right),zoom=Math.min(availableWidth/w,Math.max(60,space.height)/h),cssW=w*zoom,cssH=h*zoom;
 canvas.style.setProperty('width',cssW+'px','important');canvas.style.setProperty('height',cssH+'px','important');canvas.style.flex='none';const ratio=Math.min(devicePixelRatio||1,2);const changed=canvas.width!==w*ratio||canvas.height!==h*ratio;
 if(changed){canvas.width=w*ratio;canvas.height=h*ratio;}canvas.getContext('2d').setTransform(ratio,0,0,ratio,0,0);if(game){game.w=w;game.h=h;if(changed&&game.paused)game.draw(canvas.getContext('2d'));}
}
function prewarm(g){if(g!=='g02')void Promise.all(assetsFor(g));}
function assetsFor(g){const world=({g01:'street',g02:'defense',g03:'shaft',g04:'laboratory',g05:'arena',g06:'race'})[g];const heroes=(g==='g01'||g==='g02')?[heroIdx,'enemy-grunt','enemy-brute','enemy-ranged','enemy-boss']:g==='g05'?[heroIdx,(heroIdx+3)%7]:[heroIdx];return [window.BioWorldArt?.preload(world)||Promise.resolve(false),window.BioGuardianArt?.preload(heroes)||Promise.resolve(false)];}
async function start(g){
 if(active)leave();const epoch=++launchEpoch;active=g;loading=true;pauseRequested=false;resetInputs();parentMusic()?.gameStart();chapterDifficulty=sessionKind==='campaign'?CAMPAIGN.difficultyFor(difficulty,chapter):difficulty;
 // Keep media/AudioContext activation in the START gesture, before any asset await.
 unlockSfx();selectStageSong(g);if(prefs.auto&&prefs.volume>0&&prefs.playMode!=='off')playSong();else audioStatus('idle');
 stageUI(g);$('#stage').dataset.phase='loading';$('#stage-pause').disabled=true;$('#stage-restart').disabled=true;$('#stage-controls').style.display='none';
 if(g==='g02'){stageLegacy();return;}
 const host=$('#stage-inner');host.innerHTML='<div class="stage-loading" role="status">'+(ja?'シーンとガーディアンを準備中…':'正在準備場景與守護者…')+'</div>';
 try{await window.BioArcadeSession.prepare(assetsFor(g));}catch(error){
  if(epoch!==launchEpoch||active!==g)return;loading=false;holdMusic();$('#stage').dataset.phase='load-error';host.innerHTML='<div class="stage-loading" role="alert"><p>'+(ja?'読み込みに失敗しました。接続を確認して再試行してください。':'素材載入失敗，請確認連線後重試。')+'</p><button class="btn" id="stage-load-retry">'+(ja?'再試行':'重新載入')+'</button></div>';return;
 }
 if(epoch!==launchEpoch||active!==g)return;
 const gameCode=window.BioSuiteGames?.[g];if(!gameCode){toast('Game module unavailable');leave();return;}
 host.innerHTML='<canvas id="hub-canvas" aria-label="'+I.names[selected]+'" tabindex="0"></canvas>';const canvas=$('#hub-canvas');
 game=gameCode({hero:heroIdx,difficulty:chapterDifficulty,chapter:sessionKind==='campaign'?chapter:1,mode,I,clamp,rnd,sfx,finish,ga});installControls();resizeCanvas();game.start();loading=false;resize=new ResizeObserver(resizeCanvas);resize.observe(host);resetInputs();$('#stage-hud').textContent='';$('#stage-controls').style.display='';$('#stage-pause').disabled=false;$('#stage-restart').disabled=false;$('#stage').dataset.phase='playing';game.draw(canvas.getContext('2d'));
 ga('game_started',{game_id:g,hero_used:HEROES[heroIdx],difficulty:chapterDifficulty,chapter:sessionKind==='campaign'?chapter:undefined,mode:g==='g05'?mode:undefined,game_version:'1'});ga('arcade_game_start',{game_id:g,hero_id:HEROES[heroIdx],difficulty:chapterDifficulty,chapter:sessionKind==='campaign'?chapter:undefined,mode:g==='g05'?mode:undefined,language:currentLocale});
 last=performance.now();if(pauseRequested||document.hidden||!$('#game-help').hidden||$('#audio-drawer').classList.contains('open')||Controls.settingsOpen)pause(true);else queueFrame();
}
function frame(now){loopId=0;const running=game;if(!running||!active||running.paused||running.ended)return;const dt=clamp((now-last)/1000,0,.05);last=now;const canvas=$('#hub-canvas');if(!canvas)return;const ctx=canvas.getContext('2d');running.update(dt,readInputs(dt));if(game!==running||!active)return;running.draw(ctx);if(now-lastHudUpdate>=100){const hud=running.hud();if(hud!==lastHud){$('#stage-hud').innerHTML=hud;lastHud=hud;}lastHudUpdate=now;}queueFrame();}
function stageLegacy(){const host=$('#stage-inner');$('#stage-controls').style.display='none';$('#stage-pause').style.display='none';$('#stage-restart').style.display='none';host.replaceChildren();const f=document.createElement('iframe');f.id='g02-frame';f.title=I.names[1];f.setAttribute('allow','autoplay');f.setAttribute('loading','eager');f.style.cssText='display:block;width:100%;height:100%;border:0;background:#051426';f.src=`../${currentLocale}/shooter.html`;legacyFrame=f;host.appendChild(f);const failed=()=>{if(legacyFrame!==f||active!=='g02')return;f.remove();legacyFrame=null;loading=false;holdMusic();$('#stage').dataset.phase='load-error';host.innerHTML='<div class="stage-loading" role="alert"><p>'+(ja?'読み込みに失敗しました':'遊戲載入失敗')+'</p><button class="btn" id="stage-load-retry">'+(ja?'再試行':'重新載入')+'</button></div>';};legacyReadyTimer=setTimeout(failed,18000);f.addEventListener('error',failed,{once:true});f.addEventListener('error',()=>{if(legacyFrame===f&&active==='g02')toast('G02 shooter failed to load');},{once:true});ga('arcade_game_open',{game_id:'g02',language:currentLocale});}
window.addEventListener('message',e=>{if(e.origin!==location.origin||active!=='g02'||!legacyFrame||e.source!==legacyFrame.contentWindow)return;const msg=e.data;
 if(!msg||msg.source!=='bio-city-shooter')return;
 if(msg.type==='controls-open'){legacyHelpResume=!!msg.resumeAfter;controlSettings.open();return;}
 if(msg.type==='resuming'||msg.type==='resumed'){continueMusic();return;}
 // A blur caused by clicking the outer Play control can arrive after that click.
 if(msg.type==='paused'||msg.type==='menu'){if(!Number.isFinite(msg.at)||msg.at>lastMusicGesture)holdMusic();return;}
 if(msg.type==='sfx'){if(Number.isFinite(msg.value)){prefs.sfx=clamp(msg.value,0,100);$('#sfx-volume').value=prefs.sfx;savePrefs();audioStatus(audioState);}return;}
 if(msg.type==='load-error'){clearTimeout(legacyReadyTimer);loading=false;holdMusic();$('#stage').dataset.phase='load-error';return;}
 if(msg.type==='ready'){
  if(legacyFrame.dataset.ready!=='1'){
   legacyFrame.dataset.ready='1';
   legacyFrame.contentWindow.postMessage({source:'bio-city-hub',command:'start',hero:heroIdx,difficulty:chapterDifficulty,chapter:sessionKind==='campaign'?chapter:1,sfx:prefs.sfx,controls:Controls.prefs,resumeAfterGuide:Controls.settingsOpen&&legacyHelpResume===true&&!pauseRequested&&!document.hidden,paused:document.hidden||pauseRequested||Controls.settingsOpen},location.origin);
  }
  return;
 }
 if(msg.type==='started'){clearTimeout(legacyReadyTimer);loading=false;$('#stage').dataset.phase='playing';continueMusic();ga('arcade_game_start',{game_id:'g02',hero_id:HEROES[heroIdx],difficulty:chapterDifficulty,chapter:sessionKind==='campaign'?chapter:undefined,language:currentLocale});return;}
 if(!msg.event||typeof msg.event.event!=='string')return;
 const ev=msg.event;if(ev.event==='game_completed'){const completed=ev.outcome==='win'||ev.outcome==='victory'||ev.outcome==='success'||ev.result==='win';const finalScore=Number(ev.final_score)||0;storeBest('g02',finalScore);ga('arcade_game_finish',{game_id:'g02',outcome:ev.outcome||'unknown',final_score:finalScore,difficulty:chapterDifficulty,chapter:sessionKind==='campaign'?chapter:undefined,language:currentLocale});$('#best-g02').textContent=recordText('g02');if(sessionKind==='campaign')showCampaignResult(completed,finalScore,'G02');}ga(ev.event,{...ev,game_id:'g02',language:currentLocale});});
let audioReturn=null;
function openAudio(){
 audioReturn=document.activeElement;const drawer=$('#audio-drawer');drawer.classList.add('open');drawer.setAttribute('aria-hidden','false');$('#settings-label').setAttribute('aria-expanded','true');document.body.classList.add('audio-active');setBackgroundInert(true);$('#stage').inert=true;$('#setup').inert=true;
 if(active==='g02')legacyFrame?.contentWindow.postMessage({source:'bio-city-hub',command:'guide-pause',resumeAfter:legacyHelpResume},location.origin);
 $('#close-audio').focus({preventScroll:true});
}
function closeAudio(){
 const drawer=$('#audio-drawer');drawer.classList.remove('open');drawer.setAttribute('aria-hidden','true');$('#settings-label').setAttribute('aria-expanded','false');document.body.classList.remove('audio-active');$('#stage').inert=false;$('#setup').inert=false;setBackgroundInert(!!active||$('#setup').classList.contains('show'));
 if(active==='g02')legacyFrame?.contentWindow.postMessage({source:'bio-city-hub',command:'guide-resume'},location.origin);
 legacyHelpResume=undefined;audioReturn?.focus({preventScroll:true});
}
function bind(){for(const id of ['stage-help','stage-music','stage-controls-settings'])$('#'+id).addEventListener('pointerdown',()=>{if(active==='g02')legacyHelpResume=!!legacyFrame?.contentDocument?.querySelector('#arcade-overlay')?.hidden;});document.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return; if(t.dataset.launch){openSetup(t.dataset.launch);return;}if(t.dataset.guide){openHelp(t.dataset.guide);return;}if(['controls-settings','setup-controls','stage-controls-settings'].includes(t.id)){controlSettings.open();return;}if(t.id==='stage-help'){openHelp();return;}if(t.id==='setup-help'){openHelp($('#setup-play').dataset.game);return;}if(t.id==='guide-close'){closeHelp();return;}if(t.dataset.hero!==undefined){heroIdx=Number(t.dataset.hero);try{localStorage.setItem('bio_arcade_hero_v1',JSON.stringify(heroIdx))}catch{}renderHero();prewarm($('#setup-play').dataset.game);document.querySelector('[data-hero="'+heroIdx+'"]')?.focus({preventScroll:true});return;}if(t.id==='settings-label'||t.id==='open-audio'){openAudio();return;}if(t.id==='close-audio'){closeAudio();return;}if(t.id==='stage-load-retry'){start(active);return;}if(t.id==='stage-audio-play'){requestMusic();return;}if(t.id==='music-toggle'){if(prefs.playMode==='off'){prefs.playMode='manual';if(prefs.volume===0)prefs.volume=40;$('#music-volume').value=prefs.volume;savePrefs();}musicElement.paused?requestMusic():pauseSong();return;}if(t.id==='stage-back'||t.id==='pause-leave'){leave();return;}if(t.id==='stage-music'){if(active&&active!=='g02'&&!game?.paused&&!game?.ended)pause();openAudio();return;}if(t.id==='stage-pause'){pause();return;}if(t.id==='stage-restart'){start(active);return;}if(t.id==='pause-resume'){if(t.dataset.next){delete t.dataset.next;chapter=Math.min(CAMPAIGN.TOTAL,chapter+1);start(active)}else if(t.dataset.restart){delete t.dataset.restart;if(sessionKind==='campaign'&&chapter===CAMPAIGN.TOTAL)chapter=1;start(active)}else pause();return;}if(t.dataset.mode){mode=t.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.mode===mode)));chapter=CAMPAIGN.read($('#setup-play').dataset.game,mode,difficulty).unlocked;campaignSettings();renderSetupGuide();return;}if(t.id==='setup-play'){const g=t.dataset.game;closeSetup();start(g);return;}});
$('#track-select').addEventListener('change',e=>{if(e.target.value==='off'){prefs.playMode='off';prefs.volume=0;$('#music-volume').value=0;pauseSong();}else{prefs.playMode='manual';prefs.track=Number(e.target.value);if(prefs.volume===0){prefs.volume=40;$('#music-volume').value=prefs.volume;}const wasPlaying=!musicElement.paused;loadSong();if(wasPlaying)playSong();}savePrefs();syncAudio();ga('arcade_ost_select',{track_id:e.target.value==='off'?'off':srcTrack[prefs.track],language:currentLocale});});$('#music-mode').addEventListener('change',e=>{
 const playing=!musicElement.paused;prefs.playMode=e.target.value;
 if(prefs.playMode==='off'){pauseSong();}
 else{if(prefs.volume===0){prefs.volume=40;$('#music-volume').value=prefs.volume;}
 if(active)selectStageSong(active);
 if(playing)playSong();}
 savePrefs();syncAudio();
 });
 $('#music-volume').addEventListener('input',e=>{prefs.volume=Number(e.target.value);musicElement.volume=prefs.volume/100;if(!prefs.volume)pauseSong();savePrefs();audioStatus(audioState);});$('#sfx-volume').addEventListener('input',e=>{prefs.sfx=Number(e.target.value);if(prefs.sfx>0){try{localStorage.setItem('bio_arcade_sfx_last_v1',String(prefs.sfx));}catch{}}else stopEffects();savePrefs();unlockSfx();legacyFrame?.contentWindow.postMessage({source:'bio-city-hub',command:'audio-settings',sfx:prefs.sfx},location.origin);audioStatus(audioState)});$('#music-loop').addEventListener('change',e=>{prefs.loop=e.target.checked;musicElement.loop=prefs.loop;savePrefs()});$('#music-auto').addEventListener('change',e=>{prefs.auto=e.target.checked;savePrefs()});
window.addEventListener('keydown',e=>{if(Controls.settingsOpen||!$('#game-help').hidden||$('#audio-drawer').classList.contains('open'))return;if(!active||active==='g02')return;const k=e.key.length===1?e.key.toLowerCase():e.key;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','j','k','l','u','w','a','s','d'].includes(k)){if(e.target?.matches('button,select,input,textarea'))return;e.preventDefault();if(loading||game?.paused)return;commands.add(k);if(!e.repeat){const action=k==='j'?'fire':k==='k'?'jump':k==='l'?'dodge':k==='u'?'skill':k===' '?(active==='g04'||active==='g06'||active==='g05'&&mode==='pong'?'fire':'jump'):({a:'left',d:'right',w:'up',s:'down',ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'})[k];if(action)inputPulses.add(action);}}if(k==='Escape'||k==='p'){e.preventDefault();if(!e.repeat)pause();}});
window.addEventListener('keyup',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;commands.delete(k)});
const stage=$('#stage');
function updateStagePointer(e){const canvas=$('#hub-canvas');if(!canvas||!game)return;const r=canvas.getBoundingClientRect();pointer.x=(e.clientX-r.left)*game.w/r.width;pointer.y=(e.clientY-r.top)*game.h/r.height;if(active==='g04'){const distance=Math.hypot(pointer.x-pointer.startX,pointer.y-pointer.startY);pointer.moved=pointer.moved||distance>8;pointer.dragRatio=clamp(distance/(Math.min(game.w,game.h)*.55),0,1);}}
stage.addEventListener('pointerdown',e=>{if(e.target.id!=='hub-canvas'||game?.paused||loading||Controls.settingsOpen||touchPointerId!==null)return;touchPointerId=e.pointerId;updateStagePointer(e);pointer.startX=pointer.x;pointer.startY=pointer.y;pointer.moved=false;pointer.dragRatio=0;pointer.released=false;pointer.down=true;pointer.aiming=active==='g04';if(active!=='g04')inputPulses.add('pointer');try{e.target.setPointerCapture(e.pointerId);}catch{}});
stage.addEventListener('pointermove',e=>{if(e.pointerId===touchPointerId)updateStagePointer(e);});
const releaseStagePointer=e=>{if(e.pointerId!==touchPointerId)return;if(e.type==='pointerup'){updateStagePointer(e);if(active==='g04')pointer.released=true;}pointer.down=false;const previous=touchPointerId;touchPointerId=null;try{const canvas=$('#hub-canvas');if(canvas?.hasPointerCapture(previous))canvas.releasePointerCapture(previous);}catch{}};
for(const type of ['pointerup','pointercancel','lostpointercapture'])window.addEventListener(type,releaseStagePointer);
function backgroundPause(){holdMusic();if(active==='g02'){pauseRequested=true;legacyFrame?.contentWindow.postMessage({source:'bio-city-hub',command:'background-pause'},location.origin);}else pause(true);resetInputs();}
window.addEventListener('blur',()=>{if(active&&active!=='g02')backgroundPause();else resetInputs();});document.addEventListener('visibilitychange',()=>{if(document.hidden)backgroundPause();});window.addEventListener('resize',()=>{if(active&&active!=='g02')resizeCanvas();});
}
function openSetup(g){prewarm(g);setupReturn=document.activeElement;$('#setup').classList.add('show');document.body.classList.add('setup-active');setBackgroundInert(true);$('#setup-title').textContent=I.names[ids.indexOf(g)];$('#difficulty-label').textContent=I.difficulty;$('#setup-hero-label').textContent=GUIDE.labels.choose;$('#setup-mode-label').textContent=I.mode;$('#setup-play').textContent=GUIDE.labels.start+' →';$('#setup-play').dataset.game=g;$('#setup-cancel').textContent=I.close;$('#setup-cancel').onclick=closeSetup;$('#setup-mode').style.display=g==='g05'?'block':'none';$('#difficulty-select').value=difficulty;$('#difficulty-select').onchange=e=>{difficulty=e.target.value;chapter=CAMPAIGN.read(g,mode,difficulty).unlocked;campaignSettings()};chapter=sessionKind==='campaign'?campaignProgress(g).unlocked:1;chapterScore=0;campaignSettings();$('#hero-choices').style.display='grid';$('#setup-guide-heading').textContent=GUIDE.labels.title;$('#hero-carousel-hint').textContent=GUIDE.labels.swipe;renderHero();$('.setup-dialog').scrollTop=0;$('#difficulty-select').focus({preventScroll:true});}
// Each modal owns keyboard focus. Escape closes help/setup before reaching game controls.
document.addEventListener('keydown',e=>{if(Controls.settingsOpen)return;const layer=$('#audio-drawer').classList.contains('open')?$('#audio-drawer'):!$('#game-help').hidden?$('#game-help'):$('#setup').classList.contains('show')?$('#setup'):null;if(!layer)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();layer.id==='audio-drawer'?closeAudio():layer.id==='game-help'?closeHelp():closeSetup();return;}if(e.key==='Tab'){const focusable=[...layer.querySelectorAll('button:not([hidden]),select,input,a[href],summary,[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}},true);
window.BioSuiteHub={get I(){return I},get active(){return active},get hero(){return heroIdx},get difficulty(){return difficulty},inspectGame:()=>game?.inspectCombat?.()||game?.inspectMatch?.()||game?.debugGeometry?.()||game?.debugPhysics?.()||game?.inspectRace?.()||null,get debugState(){return {active,loading,countdown:resumeClock.running,audioState,playError:lastPlayError,sessionKind,chapter,chapterDifficulty,chapterScore,rafQueued:!!loopId,paused:!!game?.paused,touch:[...(controlInput?.debug.actions||[]),...(controlInput?.debug.dirs||[])],pointerDown:pointer.down,stick:{held:!!controlInput?.debug.held,dirs:controlInput?.debug.dirs||[]},controls:controlInput?.debug||null,controlPrefs:Controls.prefs,viewport:active&&viewports[active]?{width:game?.w,height:game?.h}:null}},musicElement,recordText,finish,sfx,ga,loadSong};
window.addEventListener('pagehide',()=>{if(active)leave();else pauseSong();});
function ready(){document.body.appendChild(musicElement);initHub();audioStatus('idle');
 controlSettings=Controls.createSettings({onOpen(){controlsEpoch=launchEpoch;controlsResume=!!(active&&active!=='g02'&&!game?.ended&&(loading||!game?.paused||resumeClock.running));if(active==='g02'){if(loading)legacyHelpResume=!pauseRequested&&!document.hidden;legacyFrame?.contentWindow.postMessage({source:'bio-city-hub',command:'guide-pause',resumeAfter:legacyHelpResume},location.origin);}else if(controlsResume)pause(true);resetInputs();setBackgroundInert(true);$('#stage').inert=true;$('#setup').inert=true;},onClose(){$('#stage').inert=false;$('#setup').inert=false;setBackgroundInert(!!active||$('#setup').classList.contains('show'));if(active==='g02')legacyFrame?.contentWindow.postMessage({source:'bio-city-hub',command:'guide-resume'},location.origin);else if(controlsResume&&controlsEpoch===launchEpoch){if(loading)pauseRequested=false;else if(game?.paused&&!game.ended)pause();}controlsResume=false;legacyHelpResume=undefined;}});
 window.addEventListener('bio-controls-change',()=>{resetInputs();legacyFrame?.contentWindow.postMessage({source:'bio-city-hub',command:'control-settings',controls:Controls.prefs},location.origin);});bind();const requestedGame=new URLSearchParams(location.search).get('game');if(ids.includes(requestedGame)){document.querySelector(`[data-launch="${requestedGame}"]`)?.focus({preventScroll:true});openSetup(requestedGame);}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
