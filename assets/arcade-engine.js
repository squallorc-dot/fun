/* BIO-CITY / GUARDIAN ASSAULT — actual real-time action gameplay.
 * Vanilla Canvas 2D. No services / dependencies. Works with keyboard, mouse, touch.
 */
(()=>{'use strict';
const root=document.getElementById('arcade-root');if(!root)return;
const ja=document.documentElement.lang.startsWith('ja');
const lang=ja?{
 title:'ガーディアンを選択',subtitle:'移動・射撃・回避・固有スキルを使い、三波の敵と中枢ボスを迎撃する。',start:'作戦開始',how:'操作方法',desktop:'PC：WASD / 矢印キー＝移動、マウス＝照準、左クリック / Space＝射撃、Shift＝ダッシュ、E＝スキル、P＝一時停止',mobile:'スマートフォン：スティックで移動、射撃・回避・スキルを使用。操作設定で片手配置と自動射撃を選べます。射撃時は近くの敵を自動照準。',hp:'防衛力',skill:'スキル',wave:'WAVE',score:'SCORE',pause:'一時停止',resume:'戦線復帰',restart:'最初から',menu:'ヒーロー選択へ',victory:'中枢防衛成功',defeat:'防衛線が突破された',report:'戦闘リポート',kills:'撃破数',time:'作戦時間',best:'最高スコア',boss:'エントロピー・コア',fire:'射撃',dash:'回避',ability:'スキル',ready:'READY',cool:'回復中',tip:'波状攻撃を突破してボスを倒せ。HPが0になると敗北。',waveClear:'区域を確保',finalWave:'最終波・中枢襲来',stage:'ステージ',pauseHint:'P または一時停止ボタンで続行',playAgain:'再挑戦',loading:'守護者を起動中',autopause:'一時停止',audio:'効果音', mute:'音をオフ',unmute:'音をオン',difficulty:'挑戦難度',normal:'標準',hard:'上級',expert:'エキスパート',quit:'終了',healer:'回復アイテム',skillName:['プラズマ・ノヴァ','共鳴パルス','アイアン・ガード','光子ブレード','クロノ・フリーズ','補給ドローン','オラクル・オーバーライド'],names:['バーナー姐さん','MJ ロボット','モーモー阿哞','葉宝 EX','ゼリー三兄妹','野菜ソルジャー','オラクル'],traits:['高速連射・高機動','拡散射撃・範囲制圧','重装甲・盾','貫通射撃・高火力','機動射撃・時間減速','持久戦・回復','精密射撃・全域妨害']
}: {
 title:'選擇守護者',subtitle:'自由移動、瞄準射擊、閃避與施放專屬技能，擊退三波敵軍及最終 Boss。',start:'開始作戰',how:'操作指南',desktop:'電腦：WASD／方向鍵移動、滑鼠瞄準、左鍵／空白鍵射擊、Shift 閃避、E 技能、P 暫停',mobile:'手機：搖桿移動，長按射擊、點擊閃避與技能；操作設定可選單手配置及自動射擊，開火時自動瞄準附近敵人。',hp:'防線耐久',skill:'技能充能',wave:'WAVE',score:'SCORE',pause:'暫停',resume:'繼續作戰',restart:'重新挑戰',menu:'更換守護者',victory:'城市核心守住了',defeat:'城市防線遭突破',report:'戰鬥結算',kills:'擊破敵軍',time:'作戰時間',best:'本機最高紀錄',boss:'熵能核心',fire:'射擊',dash:'閃避',ability:'技能',ready:'就緒',cool:'冷卻中',tip:'連續擊退敵軍並擊破最終 Boss；耐久歸零即任務失敗。',waveClear:'區域已清除',finalWave:'最終波｜核心入侵',stage:'任務',pauseHint:'按 P 或暫停鍵繼續',playAgain:'再戰一次',loading:'守護者系統啟動中',autopause:'遊戲已暫停',audio:'音效',mute:'靜音',unmute:'開啟音效',difficulty:'挑戰難度',normal:'標準',hard:'進階',expert:'專家',quit:'結束任務',healer:'維修補給',skillName:['電漿新星','共振衝擊','鋼鐵護盾','光子劍陣','時間緩速','補給無人機','全域干擾'],names:['Burner 姐','MJ 機器人','萌牛阿哞','葉寶 EX','果凍三兄妹','野菜小將','守望者 Oracle'],traits:['高速連射・機動型','散射火力・範圍控制','重甲防衛・護盾','穿透火力・高爆發','高機動・時間緩速','續航補給・恢復','精準射擊・全域干擾']
};
const HEROES=[
{id:'burner',img:'funai-care-burner-sister.png',color:'#ff5577',hp:110,speed:230,rate:.135,damage:16,bullet:565,spread:0},
{id:'mj',img:'funai-care-mj-robot.png',color:'#48caff',hp:135,speed:205,rate:.27,damage:12,bullet:515,spread:2},
{id:'moo',img:'funai-care-moo-moo.png',color:'#ffb262',hp:180,speed:180,rate:.26,damage:25,bullet:500,spread:0},
{id:'yebao',img:'funai-care-ye-bao-ex.png',color:'#f4d77a',hp:95,speed:240,rate:.33,damage:36,bullet:780,spread:0,pierce:2},
{id:'jelly',img:'funai-care-jelly-trio.png',color:'#ad8bff',hp:110,speed:255,rate:.19,damage:17,bullet:540,spread:0},
{id:'veggie',img:'funai-care-veggie-kid.png',color:'#80e4a8',hp:140,speed:208,rate:.205,damage:18,bullet:530,spread:0},
{id:'oracle',img:'funai-care-oracle-guardian.png',color:'#8ddcff',hp:105,speed:218,rate:.32,damage:37,bullet:680,spread:0,pierce:1}
];
const diff={normal:{enemyHp:1,enemyDmg:1,spawn:1},hard:{enemyHp:1.25,enemyDmg:1.2,spawn:1.16},expert:{enemyHp:1.55,enemyDmg:1.4,spawn:1.3}};
let chosen=0,difficulty='normal',phase='select',pausedFrom='playing',game=null,canvas=null,ctx=null,W=960,H=540,dpr=1,lastFrame=0,lastHudPaint=0,frame=0;
const keys=new Set(),pointer={active:false,x:0,y:0},stick={id:null,x:0,y:0},touch={fire:false};
let stars=[];
let soundEnabled=true,soundVolume=55,lastSoundVolume=55,audioCtx=null,startEpoch=0,loadingHold=false;
const sounding=new Set();
let canvasPointer=null,controlInput=null,controlPlan={reservedLeft:0,reservedRight:0},controlsResume=false,controlsEpoch=0;const Controls=window.BioControlProfiles;
try{const prefs=window.BioArcadeAudioPolicy.normalize(JSON.parse(localStorage.getItem('bio_arcade_pref_v1')||'{}'));soundVolume=prefs.sfx;soundEnabled=soundVolume>0;lastSoundVolume=Number(localStorage.getItem('bio_arcade_sfx_last_v1'))||soundVolume||55;}catch{}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),rand=(a,b)=>a+Math.random()*(b-a),sqDist=(a,b)=>{const x=a.x-b.x,y=a.y-b.y;return x*x+y*y;};

 // Pulsing hazards are stationary level geometry with an explicit warning interval.
 // Placement leaves the initial center spawn open; chapter 1 remains hazard-free.
 const chapterHazards={
  1:[],
  2:[{x:.23,y:.33,r:57,period:4.5,offset:0,kind:'reactor'}],
  3:[{x:.25,y:.28,r:49,period:4.8,offset:0,kind:'skyway'},{x:.79,y:.65,r:51,period:4.8,offset:2.4,kind:'skyway'}],
  4:[{x:.25,y:.70,r:48,period:5.1,offset:0,kind:'fracture'},{x:.76,y:.29,r:54,period:5.1,offset:2.55,kind:'fracture'}],
  5:[{x:.22,y:.28,r:49,period:5.4,offset:0,kind:'entropy'},{x:.77,y:.33,r:49,period:5.4,offset:1.8,kind:'entropy'},{x:.52,y:.79,r:53,period:5.4,offset:3.6,kind:'entropy'}]
 };
 function hazardsFor(ch,w,h){const c=clamp(Number(ch)||1,1,5);return chapterHazards[c].map((z,i)=>({
   x:z.x*w,y:z.y*h,r:Math.min(z.r,Math.min(w,h)*.12),period:z.period,offset:z.offset,
   kind:z.kind,clock:0,warning:false,active:false,id:i
 }));}
 window.BioDefenseHazardPlan=(chapter)=>hazardsFor(chapter,W,H).map(z=>({kind:z.kind,x:z.x,y:z.y,r:z.r,period:z.period}));
 function pulseHazards(dt){
  if(!game||!game.hazards)return;
  for(const z of game.hazards){
   z.clock+=dt;const phase=(z.clock+z.offset)%z.period;
   z.warning=phase>=z.period*.56&&phase<z.period*.77;
   z.active=phase>=z.period*.77&&phase<z.period*.91;
   if(z.active&&game.transition===0&&Math.hypot(game.p.x-z.x,game.p.y-z.y)<z.r+game.p.r){
    harm(6*game.mode.enemyDmg);
   }
  }
 }
 function drawHazards(ctx,outlineOnly=false){
  if(!game?.hazards?.length)return;
  for(const z of game.hazards){
   if(outlineOnly&&!z.active&&!z.warning)continue;
   const radius=z.r,alpha=z.active?.85:z.warning?.52:.2;
   ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=z.kind==='entropy'?'#f5a7ff':z.kind==='reactor'?'#8effa6':'#ffcb9d';
   ctx.lineWidth=z.active?5:3;ctx.setLineDash(z.warning?[8,6]:[]);ctx.beginPath();ctx.arc(z.x,z.y,radius,0,Math.PI*2);ctx.stroke();
   if(!outlineOnly&&z.active){ctx.fillStyle='#ea729855';ctx.beginPath();ctx.arc(z.x,z.y,radius,0,Math.PI*2);ctx.fill();}
   if(outlineOnly){ctx.restore();continue;}
   ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(z.x-radius*.65,z.y);ctx.lineTo(z.x+radius*.65,z.y);
   ctx.moveTo(z.x,z.y-radius*.65);ctx.lineTo(z.x,z.y+radius*.65);ctx.stroke();ctx.restore();
  }
 }

 const txt=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function ga(event,params={}){window.dataLayer=window.dataLayer||[];window.dataLayer.push({event,...params});}
function unlockSound(){if(!soundEnabled)return;try{audioCtx=audioCtx&&audioCtx.state!=='closed'?audioCtx:new(window.AudioContext||window.webkitAudioContext)();audioCtx.resume()?.catch(()=>{});}catch{}}
function applyAudio(value,persist=false){soundVolume=clamp(Number(value)||0,0,100);soundEnabled=soundVolume>0;if(soundEnabled)lastSoundVolume=soundVolume;else{for(const node of sounding)try{node.stop();}catch{}sounding.clear();}const label=root.querySelector('#ar-sound-label');if(label)label.textContent=soundEnabled?'ON':'OFF';if(persist){try{const prefs=window.BioArcadeAudioPolicy.normalize(JSON.parse(localStorage.getItem('bio_arcade_pref_v1')||'{}'));prefs.sfx=soundVolume;localStorage.setItem('bio_arcade_pref_v1',JSON.stringify(prefs));localStorage.setItem('bio_arcade_sfx_last_v1',String(lastSoundVolume));}catch{}window.dispatchEvent(new CustomEvent('bio-arcade-audio',{detail:soundVolume}));}if(soundEnabled)unlockSound();}
function sound(freq=440,len=.055,type='sine',vol=.025){if(!soundEnabled)return;if(!audioCtx||audioCtx.state!=='running')unlockSound();if(!audioCtx||audioCtx.state!=='running')return;try{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.setValueAtTime(freq,audioCtx.currentTime);g.gain.setValueAtTime(vol*soundVolume/100,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+len);o.connect(g);g.connect(audioCtx.destination);sounding.add(o);o.onended=()=>sounding.delete(o);o.start();o.stop(audioCtx.currentTime+len);}catch{}}
function notify(type){root.dataset.phase=phase;window.dispatchEvent(new CustomEvent('bio-arcade-phase',{detail:type}));}
function resetInputs(){for(const node of sounding)try{node.stop();}catch{}sounding.clear();keys.clear();controlInput?.reset();touch.fire=false;canvasPointer=null;pointer.active=false;pointer.shooting=false;stick.id=null;stick.x=stick.y=0;const thumb=root.querySelector('.arcade-stick-thumb');if(thumb)thumb.style.transform='translate(-50%,-50%)';}
function highScore(){try{return Number(localStorage.getItem('bio-city-arcade-high-v1')||0)}catch{return 0}}
function setHighScore(v){try{if(v>highScore())localStorage.setItem('bio-city-arcade-high-v1',String(v));}catch{}}
let immersiveScroll=0,immersiveFocus=null;
function enterImmersive(){
 if(root.classList.contains('arcade-immersive'))return;
 immersiveScroll=window.scrollY||document.documentElement.scrollTop||0;
 immersiveFocus=document.activeElement;
 root.classList.add('arcade-immersive');
 root.setAttribute('role','dialog');
 root.setAttribute('aria-modal','true');
 root.setAttribute('aria-label',ja?'Bio-City ゲーム画面':'Bio-City 遊戲畫面');
 document.body.style.setProperty('--arcade-scroll-offset',(-immersiveScroll)+'px');
 document.documentElement.classList.add('arcade-scroll-locked');
 document.body.classList.add('arcade-scroll-locked');
}
function exitImmersive(){
 if(!root.classList.contains('arcade-immersive'))return;
 root.classList.remove('arcade-immersive');
 root.removeAttribute('role');root.removeAttribute('aria-modal');root.removeAttribute('aria-label');
 document.documentElement.classList.remove('arcade-scroll-locked');
 document.body.classList.remove('arcade-scroll-locked');
 document.body.style.removeProperty('--arcade-scroll-offset');
 window.scrollTo(0,immersiveScroll);
 const selected=root.querySelector('.arcade-hero.is-selected');
 if(selected)selected.focus({preventScroll:true});
 else if(immersiveFocus?.isConnected)immersiveFocus.focus({preventScroll:true});
 immersiveFocus=null;
}
function shell(){root.classList.toggle('arcade-embedded',window.BioArcadeHubBridge===true);root.innerHTML=`<div class="arcade-app"><div id="arcade-screen" class="arcade-screen" aria-live="polite"></div></div>`;renderSelect();}
function renderSelect(){phase='select';game=null;const screen=root.querySelector('#arcade-screen');screen.innerHTML=`<div class="arcade-select"><div class="arcade-select-top"><div><span class="arcade-overline">BIO-CITY / GUARDIAN ASSAULT</span><h3>${txt(lang.title)}</h3><p>${txt(lang.subtitle)}</p></div><span class="arcade-tag">2D ACTION / 3 WAVES</span></div><div class="arcade-roster" role="group" aria-label="${txt(lang.title)}">${HEROES.map((h,i)=>`<button class="arcade-hero ${i===chosen?'is-selected':''}" data-ar-hero="${i}" aria-pressed="${i===chosen}"><span class="arcade-hero-image" style="--hue:${h.color}"><img src="../images/${h.img}" alt="" loading="lazy"></span><strong>${txt(lang.names[i])}</strong><small>${txt(lang.traits[i])}</small></button>`).join('')}</div><div class="arcade-launch"><label><span>${txt(lang.difficulty)}</span><select id="arcade-difficulty"><option value="normal">${txt(lang.normal)}</option><option value="hard">${txt(lang.hard)}</option><option value="expert">${txt(lang.expert)}</option></select></label><button class="arcade-primary" data-ar-command="start">${txt(lang.start)} <span>→</span></button></div><details class="arcade-guide"><summary>${txt(lang.how)}</summary><p>${txt(lang.desktop)}</p><p>${txt(lang.mobile)}</p><p>${txt(lang.tip)}</p></details></div>`;const select=root.querySelector('#arcade-difficulty');select.value=difficulty;select.addEventListener('change',()=>difficulty=select.value);}
function renderPlay(){root.querySelector('#arcade-screen').innerHTML=`<div class="arcade-playing"><div class="arcade-topbar"><div class="arcade-badge">BIO-CITY / <b>DEFENSE GRID</b></div><div class="arcade-hud"><span>${txt(lang.hp)} <b id="ar-hp">100</b></span><span>${txt(lang.wave)} <b id="ar-wave">1/3</b></span><span>${txt(lang.score)} <b id="ar-score">0</b></span><span id="ar-skill-state">${txt(lang.skill)} 0%</span><span id="ar-dash-state">${txt(lang.dash)} ${txt(lang.ready)}</span></div><div class="arcade-top-actions"><button class="arcade-small arcade-sound" data-ar-command="sound" aria-label="${txt(lang.audio)}" title="${txt(lang.audio)}">♫ <span id="ar-sound-label">${soundEnabled?'ON':'OFF'}</span></button><button class="arcade-small" data-ar-command="controls" aria-label="操作設定" title="操作設定">✥</button><button class="arcade-small" data-ar-command="pause" aria-label="${txt(lang.pause)}">Ⅱ <span>${txt(lang.pause)}</span></button><button class="arcade-small arcade-leave" data-ar-command="leave" aria-label="${txt(lang.quit)}">× <span>${txt(lang.quit)}</span></button></div></div><div class="arcade-health-track"><i id="ar-health-fill"></i></div><div class="arcade-canvas-wrap"><canvas id="arcade-canvas" tabindex="0" aria-label="Bio-City real-time action battlefield"></canvas><div id="arcade-banner" class="arcade-event-banner" aria-live="polite"></div><div id="arcade-boss" class="arcade-boss" hidden><span>${txt(lang.boss)}</span><div><i></i></div></div><div id="arcade-overlay" class="arcade-overlay" hidden></div></div><div class="arcade-touch-controls"><div class="arcade-stick" id="arcade-stick" aria-label="${txt(lang.mobile)}"><span class="arcade-stick-ring"></span><span class="arcade-stick-thumb"></span></div><div class="arcade-touch-actions"><button class="arcade-action arcade-action--fire" data-ar-hold="fire">${txt(lang.fire)}<small>FIRE</small></button><div><button class="arcade-action" data-ar-command="dash">${txt(lang.dash)}<small>DASH</small></button><button class="arcade-action arcade-action--skill" data-ar-command="skill">${txt(lang.ability)}<small>SKILL</small></button></div></div></div><p class="arcade-control-note">${txt(lang.desktop)}<span>${txt(lang.mobile)}</span></p></div>`;canvas=root.querySelector('canvas');ctx=canvas.getContext('2d',{alpha:false});installControls();initResize();canvas.focus({preventScroll:true});}
function fitCanvas(){if(!canvas)return;const host=canvas.parentElement,box=host.getBoundingClientRect(),left=controlPlan.reservedLeft||0,right=controlPlan.reservedRight||0;host.style.paddingLeft=left+'px';host.style.paddingRight=right+'px';host.style.boxSizing='border-box';const edge=Math.max(60,Math.min(box.width-left-right,box.height));canvas.style.setProperty('width',edge+'px','important');canvas.style.setProperty('height',edge+'px','important');dpr=Math.max(Math.min(window.devicePixelRatio||1,2),Math.min(4,Math.ceil(edge/W*(window.devicePixelRatio||1)*4)/4));const changed=canvas.width!==W*dpr||canvas.height!==H*dpr;if(changed){canvas.width=W*dpr;canvas.height=H*dpr;}ctx.setTransform(dpr,0,0,dpr,0,0);if(changed&&game)draw();}
function installControls(){controlInput?.dispose();const element=root.querySelector('.arcade-touch-controls');W=H=600;controlInput=Controls.createInput({root:element,stick:root.querySelector('#arcade-stick'),knob:root.querySelector('.arcade-stick-thumb'),buttons:[{el:root.querySelector('[data-ar-hold="fire"]'),key:'fire'},{el:root.querySelector('[data-ar-command="dash"]'),key:'dodge'},{el:root.querySelector('[data-ar-command="skill"]'),key:'skill'}],context:()=>({game:'g02',axis:'xy'}),enabled:()=>phase==='playing'&&!!game,space:()=>canvas.parentElement,onLayout:plan=>{controlPlan=plan;fitCanvas();},onAction:key=>{if(key==='dodge')dash();else if(key==='skill')skill();}});}
function readControls(dt){const input=controlInput?.read(dt);if(!input)return;stick.x=input.x;stick.y=input.y;stick.id=controlInput.debug.id;touch.fire=input.actions.has('fire')||input.pulses.has('fire')||input.assist;}
function initResize(){W=600;H=600;fitCanvas();stars=Array.from({length:65},()=>({x:Math.random()*W,y:Math.random()*H,a:rand(.15,.5),r:rand(.4,1.2)}));const obs=new ResizeObserver(fitCanvas);obs.observe(canvas.parentElement);canvas._resizeObserver=obs;}
async function start(){
 const epoch=++startEpoch;simulation.reset();resumeClock.cancel();cancelAnimationFrame(frame);resetInputs();controlInput?.dispose();controlInput=null;controlPlan={reservedLeft:0,reservedRight:0};loadingHold=!!window.BioArcadeStartPaused||document.hidden;window.BioArcadeStartPaused=false;
 window.BioArcadeChapter=Math.max(1,Math.min(5,Number(window.BioArcadeChapter)||1));unlockSound();phase='loading';notify('loading');enterImmersive();
 if(canvas?._resizeObserver)canvas._resizeObserver.disconnect();canvas=null;game=null;
 root.querySelector('#arcade-screen').innerHTML='<div class="arcade-result" role="status"><h3>'+txt(lang.loading)+'</h3><p>'+(ja?'シーンとガーディアンを準備中…':'正在準備場景與守護者…')+'</p><button class="arcade-secondary" data-ar-command="menu">'+txt(lang.menu)+'</button></div>';
 try{await window.BioArcadeSession.prepare([window.BioGuardianArt?.preload([chosen,'enemy-grunt','enemy-brute','enemy-ranged','enemy-boss'])||Promise.resolve(false),window.BioWorldArt?.preload('defense')||Promise.resolve(false)]);}catch(error){
  if(epoch!==startEpoch)return;phase='load-error';notify('load-error');root.querySelector('#arcade-screen').innerHTML='<div class="arcade-result" role="alert"><h3>'+(ja?'読み込みに失敗しました':'素材載入失敗')+'</h3><p>'+(ja?'接続を確認して再試行してください。':'請確認連線後重試。')+'</p><button class="arcade-primary" data-ar-command="retry">'+txt(lang.playAgain)+'</button><button class="arcade-secondary" data-ar-command="menu">'+txt(lang.menu)+'</button></div>';return;
 }
 if(epoch!==startEpoch)return;const h=HEROES[chosen],mode=diff[difficulty];phase='playing';renderPlay();const now=performance.now();
 game={hero:h,mode,p:{x:W*.5,y:H*.55,r:13,hp:h.hp,maxHp:h.hp,inv:0,shot:0,dash:0,dashTime:0,dvx:0,dvy:0,skill:45,shield:0},wave:1,score:0,kills:0,t:0,spawnLeft:0,spawnTime:.55,enemies:[],projectiles:[],hostiles:[],pickups:[],fx:[],hazards:hazardsFor(window.BioArcadeChapter,W,H),boss:null,transition:0,over:false,shake:0};beginWave(1);lastFrame=now;ga('game_started',{game_mode:'action',hero_used:h.id,difficulty,arcade_version:'1'});draw();notify('started');
 if(loadingHold||document.hidden)pause(true);else frame=requestAnimationFrame(loop);
}
function beginWave(n){if(!game)return;game.wave=n;const ch=window.BioArcadeChapter||1;game.spawnLeft=(n===1?8:n===2?12:7)+Math.min(ch-1,3)*2;game.spawnTime=.8;game.transition=1.15;if(n===3){game.boss={x:W*.5,y:Math.max(75,H*.19),r:36,hp:420*game.mode.enemyHp,maxHp:420*game.mode.enemyHp,fire:2.5,phase:0,spin:0,awake:1.3};}else game.boss=null;banner(n===3?lang.finalWave:`${lang.wave} 0${n}`,1.2);}
function banner(label,duration=1.3){const x=root.querySelector('#arcade-banner');if(!x)return;x.textContent=label;x.classList.add('is-visible');x._hideAt=performance.now()+duration*1000;}
function edgeSpawn(){const edge=Math.floor(rand(0,4)),margin=35;return edge===0?{x:rand(20,W-20),y:-margin}:edge===1?{x:W+margin,y:rand(20,H-20)}:edge===2?{x:rand(20,W-20),y:H+margin}:{x:-margin,y:rand(20,H-20)};}
function spawn(){const ch=Math.max(1,Math.min(5,Number(window.BioArcadeChapter)||1)),roll=Math.random();
 const type=ch===1?(game.wave===1?(roll<.2?'dash':'drone'):game.wave===2?(roll<.22?'sniper':roll<.45?'dash':'drone'):(roll<.32?'brute':'dash')):
 ch===2?(roll<.50?'dash':roll<.80?'drone':'brute'):
 ch===3?(roll<.46?'sniper':roll<.77?'drone':'dash'):
 ch===4?(roll<.46?'brute':roll<.78?'dash':'sniper'):
 (roll<.27?'sniper':roll<.55?'brute':roll<.82?'dash':'drone');const specs={drone:{hp:33,spd:67,r:13,damage:11,value:20,color:'#fd7190'},dash:{hp:40,spd:94,r:11,damage:12,value:27,color:'#fcae6b'},sniper:{hp:45,spd:52,r:15,damage:9,value:35,color:'#e39cff'},brute:{hp:90,spd:42,r:20,damage:20,value:50,color:'#ff8787'}}[type];game.enemies.push({...edgeSpawn(),type,hp:specs.hp*game.mode.enemyHp,maxHp:specs.hp*game.mode.enemyHp,spd:specs.spd*(.98+.13*(game.wave-1))*game.mode.spawn,r:specs.r,damage:specs.damage*game.mode.enemyDmg,value:specs.value,color:specs.color,fire:rand(1.6,2.7),flash:0});}
function nearest(){let who=null,dist=Infinity;for(const e of [...game.enemies,...(game.boss?[game.boss]:[])]){if(e.hp<=0)continue;const d=sqDist(game.p,e);if(d<dist){dist=d;who=e;}}return who;}
function aim(){const p=game.p;let vx=0,vy=-1;const touchMode=window.matchMedia('(pointer:coarse)').matches;if(pointer.active&&!touchMode){vx=pointer.x-p.x;vy=pointer.y-p.y;}else{const target=nearest();if(target){vx=target.x-p.x;vy=target.y-p.y;}}let len=Math.hypot(vx,vy)||1;return {x:vx/len,y:vy/len};}
function shoot(){const p=game.p,h=game.hero,a=aim();if(p.shot>0)return;p.shot=h.rate;p.fireAnim=.20;p.artClip='attack1';p.artClock=0;const angles=h.spread?[-.21,0,.21]:[0];if(h.id==='jelly')angles.push(.13);for(const deviation of angles){const cs=Math.cos(deviation),ss=Math.sin(deviation),dx=a.x*cs-a.y*ss,dy=a.x*ss+a.y*cs;game.projectiles.push({x:p.x+dx*17,y:p.y+dy*17,vx:dx*h.bullet,vy:dy*h.bullet,r:h.id==='moo'?6:4,damage:h.damage,pierce:h.pierce||0,life:1.2,color:h.color});}sound(h.id==='moo'?175:420,.033,'triangle',.012);}
function dash(){if(phase!=='playing'||!game||game.p.dash>0)return;const p=game.p,desired=controlInput?.debug.desired||stick;let dx=desired.x+(keys.has('d')||keys.has('ArrowRight')?1:0)-(keys.has('a')||keys.has('ArrowLeft')?1:0),dy=desired.y+(keys.has('s')||keys.has('ArrowDown')?1:0)-(keys.has('w')||keys.has('ArrowUp')?1:0);let len=Math.hypot(dx,dy);if(len<.1){const a=aim();dx=a.x;dy=a.y;len=1;}p.dvx=dx/len;p.dvy=dy/len;p.dashTime=.18;p.inv=.36;p.dash=3.3;burst(p.x,p.y,game.hero.color,13);sound(210,.12,'sawtooth',.035);}
function skill(){if(phase!=='playing'||!game||game.p.skill<100)return;const p=game.p,id=game.hero.id;p.skill=0;p.skillAnim=.64;let radius=130,damage=70;
 if(id==='moo'){p.shield=5;p.hp=Math.min(p.maxHp,p.hp+22);radius=125;damage=58;}
 if(id==='veggie'){p.hp=Math.min(p.maxHp,p.hp+35);radius=140;damage=50;}
 if(id==='mj'){radius=200;damage=65;}
 if(id==='yebao'){radius=185;damage=96;}
 if(id==='jelly'){radius=175;damage=65;for(const e of game.enemies)e.slow=3;}
 if(id==='oracle'){radius=Math.max(W,H);damage=64;game.hostiles.length=0;for(const e of game.enemies)e.slow=2;}
 for(const e of game.enemies){if(Math.hypot(e.x-p.x,e.y-p.y)<radius+e.r)e.hp-=damage;}
 if(game.boss&&Math.hypot(game.boss.x-p.x,game.boss.y-p.y)<radius+game.boss.r)game.boss.hp-=Math.round(damage*.9);
 game.fx.push({type:'ring',x:p.x,y:p.y,life:.6,max:.6,radius,color:game.hero.color});burst(p.x,p.y,game.hero.color,28);sound(260,.3,'sawtooth',.065);banner(lang.skillName[chosen],.9);}
function burst(x,y,color,n=8){if(!game)return;for(let i=0;i<n;i++){const angle=rand(0,Math.PI*2),speed=rand(40,190);game.fx.push({type:'dot',x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:rand(.15,.45),max:.45,color,r:rand(1,3)});}}
function harm(amount){const p=game.p;if(p.inv>0||p.dashTime>0||p.shield>0)return;p.hp-=amount;p.hurtAnim=.25;p.inv=.72;game.shake=7;burst(p.x,p.y,'#ff496e',12);sound(95,.19,'sawtooth',.055);if(p.hp<=0){p.hp=0;end(false);}}
function end(win){if(phase!=='playing')return;phase=win?'victory':'defeat';resumeClock.cancel();simulation.clear();resetInputs();notify('ended');cancelAnimationFrame(frame);setHighScore(game.score);const time=Math.floor(game.t);ga('game_completed',{hero_used:game.hero.id,final_score:game.score,outcome:win?'victory':'defeat',waves_cleared:win?3:Math.max(0,game.wave-1),kills:game.kills,duration_seconds:time,difficulty,game_mode:'action',arcade_version:'1'});draw();root.querySelector('#arcade-overlay').hidden=false;root.querySelector('#arcade-overlay').innerHTML=`<div class="arcade-result"><span class="arcade-overline">BIO-CITY / MISSION REPORT</span><h3>${txt(win?lang.victory:lang.defeat)}</h3><p>${txt(lang.report)}</p><div class="arcade-results"><div><span>${txt(lang.score)}</span><strong>${game.score}</strong></div><div><span>${txt(lang.kills)}</span><strong>${game.kills}</strong></div><div><span>${txt(lang.time)}</span><strong>${time}s</strong></div><div><span>${txt(lang.best)}</span><strong>${highScore()}</strong></div></div><button data-ar-command="retry" class="arcade-primary">${txt(lang.playAgain)} →</button><button data-ar-command="menu" class="arcade-secondary">${txt(lang.menu)}</button></div>`;}
const simulation=window.BioArcadeSession.simulation();
const resumeClock=window.BioArcadeSession.countdown({
 tick:left=>{phase='countdown';root.dataset.phase=phase;const overlay=root.querySelector('#arcade-overlay');overlay.hidden=false;overlay.innerHTML='<div class="arcade-result" role="status"><h3>'+txt(lang.resume)+' · <span id="ar-resume-countdown">'+left+'</span></h3><p>'+(ja?'まもなく再開します':'準備恢復遊戲')+'</p><button class="arcade-secondary" data-ar-command="pause">'+txt(lang.pause)+'</button></div>';},
 done:()=>{if(document.hidden||!game||phase!=='countdown')return;simulation.clear();resetInputs();phase='playing';root.querySelector('#arcade-overlay').hidden=true;canvas.focus({preventScroll:true});lastFrame=performance.now();frame=requestAnimationFrame(loop);notify('resumed');}
});
function pause(force=false){
 if(phase==='loading'){loadingHold=force||document.hidden||!loadingHold;resetInputs();notify(loadingHold?'paused':'resuming');return;}
 if(phase==='playing'||phase==='countdown'){
  resumeClock.cancel();simulation.clear();phase='paused';cancelAnimationFrame(frame);resetInputs();notify('paused');const overlay=root.querySelector('#arcade-overlay');overlay.hidden=false;overlay.innerHTML='<div class="arcade-result"><span class="arcade-overline">BIO-CITY / SYSTEM PAUSED</span><h3>'+txt(lang.autopause)+'</h3><p>'+txt(lang.pauseHint)+'</p><button class="arcade-primary" data-ar-command="resume">'+txt(lang.resume)+' →</button><button class="arcade-secondary" data-ar-command="menu">'+txt(lang.menu)+'</button></div>';
 }else if(phase==='paused'&&!force&&!document.hidden){resetInputs();unlockSound();notify('resuming');resumeClock.start();}
}
function menu(){startEpoch++;simulation.reset();controlInput?.dispose();controlInput=null;controlPlan={reservedLeft:0,reservedRight:0};resumeClock.cancel();cancelAnimationFrame(frame);resetInputs();if(canvas?._resizeObserver)canvas._resizeObserver.disconnect();canvas=null;renderSelect();exitImmersive();notify('menu');}
function loop(now){if(phase!=='playing')return;const dt=Math.max(0,(now-lastFrame)/1000);lastFrame=now;simulation.advance(dt,step=>{readControls(step);update(step);return phase==='playing';});draw();if(now-lastHudPaint>=100){refreshHud();lastHudPaint=now;}if(phase==='playing')frame=requestAnimationFrame(loop);}
function update(dt){const g=game,p=g.p;g.t+=dt;p.shot=Math.max(0,p.shot-dt);p.dash=Math.max(0,p.dash-dt);p.inv=Math.max(0,p.inv-dt);p.shield=Math.max(0,p.shield-dt);p.dashTime=Math.max(0,p.dashTime-dt);p.skill=Math.min(100,p.skill+dt*3.5);g.shake=Math.max(0,g.shake-dt*18);
 let dx=stick.x+(keys.has('d')||keys.has('ArrowRight')?1:0)-(keys.has('a')||keys.has('ArrowLeft')?1:0);let dy=stick.y+(keys.has('s')||keys.has('ArrowDown')?1:0)-(keys.has('w')||keys.has('ArrowUp')?1:0);let mag=Math.hypot(dx,dy);if(mag>1){dx/=mag;dy/=mag;}if(p.dashTime>0){dx=p.dvx*3;dy=p.dvy*3;}p.x=clamp(p.x+dx*g.hero.speed*dt,18,W-18);p.y=clamp(p.y+dy*g.hero.speed*dt,20,H-20);pulseHazards(dt);
 for(const key of ['hurtAnim','skillAnim','fireAnim'])p[key]=Math.max(0,(p[key]||0)-dt);const clip=p.hurtAnim>0?'hurt':p.skillAnim>0?'skill':p.dashTime>0?'dodge':p.fireAnim>0?'attack1':Math.abs(dx)+Math.abs(dy)>.05?'walk':'idle';if(p.artClip!==clip){p.artClip=clip;p.artClock=0;}else p.artClock=(p.artClock||0)+dt;
 if((keys.has(' ')||pointer.active&&pointer.shooting||touch.fire)&&!g.transition)shoot();
 if(g.transition>0){g.transition-=dt;if(g.transition<0)g.transition=0;}
 if(!g.transition&&g.spawnLeft>0){g.spawnTime-=dt;if(g.spawnTime<=0){spawn();g.spawnLeft--;g.spawnTime=.72/g.mode.spawn;}}
 for(const e of g.enemies){const vx=p.x-e.x,vy=p.y-e.y,d=Math.max(1,Math.hypot(vx,vy));e.slow=Math.max(0,(e.slow||0)-dt);const speed=e.spd*(e.slow>0?.4:1);if(e.type==='sniper'&&d<145){e.x-=vx/d*speed*.6*dt;e.y-=vy/d*speed*.6*dt;}else{e.x+=vx/d*speed*dt;e.y+=vy/d*speed*dt;}e.fire-=dt;if(e.type==='sniper'&&e.fire<=0&&d<420){fireHostile(e.x,e.y,vx,vy,140,e.damage*.7);e.fire=2.4;}if(d<e.r+p.r)harm(e.damage*.85);e.flash=Math.max(0,e.flash-dt);entityAnimation(e,e.flash>0?'hurt':e.type==='sniper'&&e.fire<.45?'skill':e.type==='dash'?'dodge':'walk',dt);}
 if(g.boss){const b=g.boss;b.awake=Math.max(0,b.awake-dt);b.phase+=dt;b.spin+=dt;if(!b.awake){b.x=clamp(b.x+Math.sin(b.phase*1.3)*34*dt,b.r+20,W-b.r-20);b.y=clamp(b.y+Math.cos(b.phase*.9)*16*dt,b.r+16,Math.min(H*.45,H-b.r));b.fire-=dt;if(b.fire<=0){const ch=Math.max(1,Math.min(5,Number(window.BioArcadeChapter)||1));const wave=(b.hp/b.maxHp<.5?9:7)+(ch>=4?2:ch===3?1:0);for(let i=0;i<wave;i++){let angle=i*Math.PI*2/wave+b.spin;fireHostile(b.x,b.y,Math.cos(angle),Math.sin(angle),b.hp/b.maxHp<.5?154:128,12*g.mode.enemyDmg,true);}b.fire=(b.hp/b.maxHp<.5?1.75:2.4)*(Math.max(.78,1-(Math.max(0,(window.BioArcadeChapter||1)-1))*.05));}}entityAnimation(b,b.awake>0?'idle':b.fire<.5?'skill':'walk',dt);if(Math.hypot(p.x-b.x,p.y-b.y)<p.r+b.r-7)harm(15*g.mode.enemyDmg);}
 for(let i=g.projectiles.length-1;i>=0;i--){const q=g.projectiles[i];q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt;if(q.life<=0||q.x<-20||q.x>W+20||q.y<-20||q.y>H+20){g.projectiles.splice(i,1);continue;}let collided=false;for(const e of g.enemies){if(e.hp<=0)continue;if(Math.hypot(q.x-e.x,q.y-e.y)<q.r+e.r){e.hp-=q.damage;e.flash=.085;p.skill=Math.min(100,p.skill+2.1);burst(q.x,q.y,q.color,3);collided=true;break;}}if(!collided&&g.boss&&g.boss.hp>0&&Math.hypot(q.x-g.boss.x,q.y-g.boss.y)<q.r+g.boss.r){g.boss.hp-=q.damage;g.boss.flash=.07;p.skill=Math.min(100,p.skill+2.5);burst(q.x,q.y,q.color,3);collided=true;}if(collided){if(q.pierce<=0)g.projectiles.splice(i,1);else q.pierce--;}}
 for(let i=g.hostiles.length-1;i>=0;i--){const q=g.hostiles[i];q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt;if(q.life<=0||q.x<-30||q.x>W+30||q.y<-30||q.y>H+30){g.hostiles.splice(i,1);continue;}if(Math.hypot(q.x-p.x,q.y-p.y)<q.r+p.r){harm(q.damage);g.hostiles.splice(i,1);}}
 for(let i=g.enemies.length-1;i>=0;i--){const e=g.enemies[i];if(e.hp<=0){g.score+=e.value;g.kills++;p.skill=Math.min(100,p.skill+5);if(g.kills%6===0){g.pickups.push({x:e.x,y:e.y,r:11,t:8});}burst(e.x,e.y,e.color,14);g.enemies.splice(i,1);sound(740,.07,'triangle',.02);}}
 for(let i=g.pickups.length-1;i>=0;i--){const q=g.pickups[i];q.t-=dt;if(Math.hypot(q.x-p.x,q.y-p.y)<q.r+p.r){p.hp=Math.min(p.maxHp,p.hp+18);p.skill=Math.min(100,p.skill+12);burst(q.x,q.y,'#73eac1',10);g.pickups.splice(i,1);sound(980,.14,'sine',.035);}else if(q.t<=0)g.pickups.splice(i,1);}
 if(g.boss&&g.boss.hp<=0){g.score+=750;g.kills++;g.boss=null;end(true);return;}
 for(let i=g.fx.length-1;i>=0;i--){const e=g.fx[i];e.life-=dt;if(e.type==='dot'){e.x+=e.vx*dt;e.y+=e.vy*dt;}if(e.life<=0)g.fx.splice(i,1);}
 if(g.spawnLeft===0&&g.enemies.length===0&&g.transition===0&&!g.boss){if(g.wave<3){g.score+=125*g.wave;beginWave(g.wave+1);}else end(true);}

}
function refreshHud(){if(!game)return;const g=game,p=g.p; const health=root.querySelector('#ar-health-fill'),hp=root.querySelector('#ar-hp'),score=root.querySelector('#ar-score'),wave=root.querySelector('#ar-wave');if(health)health.style.width=(p.hp/p.maxHp*100)+'%';if(hp)hp.textContent=Math.ceil(p.hp)+'/'+p.maxHp;if(score)score.textContent=g.score;if(wave)wave.textContent=g.wave+'/3';const skillState=root.querySelector('#ar-skill-state');if(skillState)skillState.textContent=lang.skill+' '+Math.floor(p.skill)+'%';const dashState=root.querySelector('#ar-dash-state');if(dashState)dashState.textContent=lang.dash+' '+(p.dash>0?p.dash.toFixed(1)+'s':lang.ready);const boss=root.querySelector('#arcade-boss');if(boss){boss.hidden=!g.boss;if(g.boss)boss.querySelector('i').style.width=clamp(g.boss.hp/g.boss.maxHp*100,0,100)+'%';}const bannerEl=root.querySelector('#arcade-banner');if(bannerEl&&bannerEl._hideAt&&performance.now()>bannerEl._hideAt){bannerEl.classList.remove('is-visible');bannerEl._hideAt=0;}
}
function fireHostile(x,y,vx,vy,speed,damage,norm=false){let d=Math.hypot(vx,vy)||1;game.hostiles.push({x,y,vx:vx/d*speed,vy:vy/d*speed,r:6,life:4,damage});}
function entityAnimation(entity,clip,dt){if(entity.artClip!==clip){entity.artClip=clip;entity.artClock=0;}else entity.artClock=(entity.artClock||0)+dt;}
function contactShadow(x,y,r){ctx.save();ctx.globalAlpha=.17;ctx.fillStyle='#030b15';ctx.beginPath();ctx.ellipse(x+4,y+2,r*1.15,r*.30,.08,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.32;ctx.beginPath();ctx.ellipse(x,y,r*.7,r*.18,0,0,Math.PI*2);ctx.fill();ctx.restore();}
function shape(ctx,x,y,r,sides,rotation=0){ctx.beginPath();for(let i=0;i<sides;i++){const ang=rotation+i*2*Math.PI/sides;const px=x+Math.cos(ang)*r,py=y+Math.sin(ang)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();}
function draw(){if(!ctx||!game)return;const g=game,p=g.p,t=g.t;ctx.save();if(!window.BioWorldArt?.draw(ctx,'defense',W,H,{shade:.18+(window.BioArcadeChapter-1)*.015})){ctx.fillStyle='#06101e';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#23425a';for(let x=0;x<W;x+=42){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=0;y<H;y+=42){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}}window.BioWorldArt?.chapterAtmosphere?.(ctx,'defense',W,H,window.BioArcadeChapter||1,t);window.BioWorldArt?.chapterLandmarks?.(ctx,'defense',W,H,window.BioArcadeChapter||1,t);window.BioWorldArt?.playfield?.(ctx,'defense',W,H);
 drawHazards(ctx);ctx.translate(Math.sin(t*97)*g.shake,Math.cos(t*83)*g.shake);
 const coreX=W*.5,coreY=H*.5,outer=Math.min(W,H)*.30;ctx.beginPath();ctx.arc(coreX,coreY,outer,0,Math.PI*2);ctx.strokeStyle='rgba(34,135,161,.13)';ctx.lineWidth=2;ctx.stroke();for(let i=0;i<4;i++){const x=coreX+Math.cos(i*Math.PI/2+.8)*outer,y=coreY+Math.sin(i*Math.PI/2+.8)*outer;ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.strokeStyle='rgba(71,214,233,.21)';ctx.stroke();}
 for(const q of g.pickups){ctx.save();ctx.translate(q.x,q.y);ctx.rotate(t*2);ctx.strokeStyle='#83fbd0';ctx.shadowColor='#83fbd0';ctx.shadowBlur=13;ctx.strokeRect(-9,-9,18,18);ctx.beginPath();ctx.moveTo(-5,0);ctx.lineTo(5,0);ctx.moveTo(0,-5);ctx.lineTo(0,5);ctx.stroke();ctx.restore();}
 for(const q of g.projectiles){ctx.strokeStyle=q.color;ctx.lineWidth=q.r*1.1;ctx.shadowColor=q.color;ctx.shadowBlur=10;ctx.beginPath();ctx.moveTo(q.x-q.vx*.013,q.y-q.vy*.013);ctx.lineTo(q.x,q.y);ctx.stroke();ctx.shadowBlur=0;}
 for(const q of g.hostiles){ctx.strokeStyle='#ff738e77';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(q.x-q.vx*.045,q.y-q.vy*.045);ctx.lineTo(q.x,q.y);ctx.stroke();ctx.strokeStyle='#ff738e';ctx.lineWidth=3;ctx.beginPath();ctx.arc(q.x,q.y,q.r,0,2*Math.PI);ctx.stroke();}
 function paintEnemy(e){const key=e.type==='brute'?'enemy-brute':e.type==='sniper'?'enemy-ranged':'enemy-grunt',clip=e.flash>0?'hurt':e.type==='sniper'&&e.fire<.45?'skill':e.type==='dash'?'dodge':'walk',scale=e.type==='brute'?.52:.38;
  contactShadow(e.x,e.y+e.r,e.r*.85);const drawn=window.BioGuardianArt?.draw(ctx,key,e.artClip||clip,e.artClock||0,e.x,e.y+e.r,scale,p.x<e.x?-1:1,e.flash>0?.6:1);if(!drawn){ctx.save();ctx.translate(e.x,e.y);ctx.fillStyle=e.color;shape(ctx,0,0,e.r,5);ctx.fill();ctx.restore();}
  if(e.hp<e.maxHp){ctx.fillStyle='#2b374a';ctx.fillRect(e.x-18,e.y-e.r-22,36,3);ctx.fillStyle='#ff8296';ctx.fillRect(e.x-18,e.y-e.r-22,36*clamp(e.hp/e.maxHp,0,1),3);}}
 function paintBoss(b){contactShadow(b.x,b.y+35,29);const drawn=window.BioGuardianArt?.draw(ctx,'enemy-boss',b.artClip||'idle',b.artClock||0,b.x,b.y+35,.9,p.x<b.x?-1:1);if(!drawn){ctx.strokeStyle='#ff7190';ctx.lineWidth=3;shape(ctx,b.x,b.y,b.r,8);ctx.stroke();}if(b.fire<.5){ctx.strokeStyle='#ff7ca4';ctx.lineWidth=2;ctx.beginPath();ctx.arc(b.x,b.y,b.r+12,0,Math.PI*2);ctx.stroke();}}
 function paintPlayer(){
 // Player hull, directional reticle and layered protective shields.
 const angle=aim(),theta=Math.atan2(angle.y,angle.x)+Math.PI/2;contactShadow(p.x,p.y+24,17);if(p.fireAnim>.15){ctx.save();ctx.strokeStyle=g.hero.color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(p.x+angle.x*15,p.y+angle.y*15);ctx.lineTo(p.x+angle.x*29,p.y+angle.y*29);ctx.stroke();ctx.restore();}const hasSprite=window.BioGuardianArt?.draw(ctx,chosen,phase==='victory'?'celebrate':phase==='defeat'?'ko':p.artClip||'idle',phase==='defeat'?.55:p.artClock||0,p.x,p.y+24,.5,angle.x<0?-1:1,p.inv>0?.65:1);if(!hasSprite){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(theta);ctx.globalAlpha=p.inv>0?(.58+.35*Math.cos(t*36)):1;ctx.fillStyle='#0c1e30';ctx.strokeStyle=g.hero.color;ctx.lineWidth=2.7;ctx.shadowColor=g.hero.color;ctx.shadowBlur=15;shape(ctx,0,0,15,3,-Math.PI/2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(0,7);ctx.strokeStyle='#f0fbff';ctx.lineWidth=2;ctx.stroke();ctx.restore();}else{ctx.strokeStyle=g.hero.color;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(p.x,p.y,13,0,Math.PI*2);ctx.moveTo(p.x+angle.x*18,p.y+angle.y*18);ctx.lineTo(p.x+angle.x*27,p.y+angle.y*27);ctx.stroke();}if(p.shield>0){ctx.strokeStyle='#ffdda1';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,24+Math.sin(t*6)*2,0,Math.PI*2);ctx.stroke();}if(p.dashTime>0){ctx.strokeStyle=g.hero.color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,22,0,Math.PI*2);ctx.stroke();}ctx.globalAlpha=1;
 }
 const bodies=g.enemies.map(e=>({kind:'enemy',foot:e.y+e.r,value:e}));if(g.boss)bodies.push({kind:'boss',foot:g.boss.y+35,value:g.boss});bodies.push({kind:'player',foot:p.y+24});
 bodies.sort((a,b)=>a.foot-b.foot);for(const body of bodies){if(body.kind==='enemy')paintEnemy(body.value);else if(body.kind==='boss')paintBoss(body.value);else paintPlayer();}
 ctx.save();ctx.translate(-Math.sin(t*97)*g.shake,-Math.cos(t*83)*g.shake);drawHazards(ctx,true);ctx.restore();
 for(const f of g.fx){const k=clamp(f.life/f.max,0,1);ctx.globalAlpha=k;if(f.type==='ring'){ctx.beginPath();ctx.arc(f.x,f.y,f.radius*(1-k*.75),0,2*Math.PI);ctx.strokeStyle=f.color;ctx.lineWidth=5*k;ctx.stroke();}else{ctx.fillStyle=f.color;ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,2*Math.PI);ctx.fill();}}ctx.globalAlpha=1;
 if(pointer.active&&!window.matchMedia('(pointer:coarse)').matches){ctx.strokeStyle='rgba(180,248,255,.9)';ctx.lineWidth=1;const x=pointer.x,y=pointer.y;ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.moveTo(x-14,y);ctx.lineTo(x-5,y);ctx.moveTo(x+5,y);ctx.lineTo(x+14,y);ctx.moveTo(x,y-14);ctx.lineTo(x,y-5);ctx.moveTo(x,y+5);ctx.lineTo(x,y+14);ctx.stroke();}
 ctx.restore();}
function updatePointer(e){if(!canvas)return;const box=canvas.getBoundingClientRect();pointer.x=(e.clientX-box.left)*W/box.width;pointer.y=(e.clientY-box.top)*H/box.height;pointer.active=true;}
root.addEventListener('click',e=>{const button=e.target.closest('[data-ar-command],[data-ar-hero]');if(!button)return;const hero=button.dataset.arHero;if(hero!==undefined&&phase==='select'){chosen=Number(hero);renderSelect();return;}const action=button.dataset.arCommand;if(action==='start'){start();return;}if(action==='pause'||action==='resume'){pause();return;}if(action==='retry'){start();return;}
 if(action==='leave'){
  if(phase==='playing'||phase==='countdown')pause(true);
  if(phase==='victory'||phase==='defeat'){menu();return;}
  const overlay=root.querySelector('#arcade-overlay');
  if(overlay){overlay.hidden=false;overlay.innerHTML=`<div class="arcade-result"><span class="arcade-overline">BIO-CITY / EXIT</span><h3>${txt(lang.quit)}？</h3><button class="arcade-primary" data-ar-command="resume">${txt(lang.resume)}</button><button class="arcade-secondary" data-ar-command="menu">${txt(lang.menu)}</button></div>`;}
  return;
 }
 if(action==='controls'){if(window.BioArcadeHubBridge)parent.postMessage({source:'bio-city-shooter',type:'controls-open',resumeAfter:['playing','countdown'].includes(phase)},location.origin);else controlSettings.open();return;}if(action==='menu'){menu();return;}if(action==='dash'){if(e.detail===0)dash();return;}if(action==='skill'){if(e.detail===0)skill();return;}if(action==='sound'){applyAudio(soundEnabled?0:lastSoundVolume,true);return;}});
root.addEventListener('pointerdown',e=>{unlockSound();if(phase!=='playing'||Controls.settingsOpen)return;if(e.target===canvas&&canvasPointer===null){canvasPointer=e.pointerId;updatePointer(e);pointer.shooting=true;try{canvas.setPointerCapture(e.pointerId);}catch{}}});
root.addEventListener('pointermove',e=>{if(phase==='playing'&&!Controls.settingsOpen&&(e.target===canvas||canvas?.hasPointerCapture?.(e.pointerId)))updatePointer(e);});
function endPointer(e){if(canvasPointer===e.pointerId){canvasPointer=null;pointer.shooting=false;}}
for(const event of ['pointerup','pointercancel','lostpointercapture'])window.addEventListener(event,endPointer);
function reflectKeyboard(){controlInput?.setKeyboard([...(keys.has(' ')?['fire']:[]),...(keys.has('Shift')?['dodge']:[]),...(keys.has('e')?['skill']:[])]);}
const accepted=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Shift','ShiftLeft','ShiftRight','e','E','p','P','Escape','w','W','a','A','s','S','d','D'];
window.addEventListener('keydown',e=>{if(Controls.settingsOpen||!['playing','paused','countdown'].includes(phase)||!accepted.includes(e.key))return;if(e.target.matches('select,input,textarea')||e.target.matches('button')&&!['p','P','Escape'].includes(e.key))return;e.preventDefault();unlockSound();const key=e.key.length===1&&e.key!==' '?e.key.toLowerCase():e.key;if(key==='p'||key==='Escape'){if(!e.repeat)pause();return;}if(phase!=='playing')return;keys.add(key);reflectKeyboard();if(!e.repeat){if(key==='Shift')dash();if(key==='e')skill();}});
window.addEventListener('keyup',e=>{const key=e.key.length===1&&e.key!==' '?e.key.toLowerCase():e.key;keys.delete(key);reflectKeyboard();});
function backgroundPause(){resetInputs();if(['playing','countdown','loading'].includes(phase))pause(true);if(audioCtx?.state==='running')audioCtx.suspend()?.catch(()=>{});}
document.addEventListener('visibilitychange',()=>{if(document.hidden)backgroundPause();});window.addEventListener('blur',backgroundPause);
window.addEventListener('pagehide',menu);
window.BioArcadeShooter={pause,applyAudio,applyControls:value=>Controls.set(value,false),resetInputs,get state(){return {phase,keys:[...keys],stick:{...stick,id:controlInput?.debug.id??null},pointer:{...pointer},fire:!!controlInput?.debug.actions.includes('fire'),fireOwners:controlInput?.debug.actionOwners.fire||0,controls:controlInput?.debug||null,controlPrefs:Controls.prefs,player:game?{x:game.p.x,y:game.p.y,dash:game.p.dash,dashTime:game.p.dashTime,dvx:game.p.dvx,dvy:game.p.dvy,inv:game.p.inv,skill:game.p.skill}:null,projectiles:game?.projectiles.length||0,countdown:resumeClock.running,simulation:simulation.metrics,time:game?.t||0,sfx:soundVolume,context:audioCtx?.state||'not-created'};}};
window.addEventListener('keydown',e=>{
 if(Controls.settingsOpen||!root.classList.contains('arcade-immersive')||e.key!=='Tab')return;
 const focusables=[...root.querySelectorAll('button:not([disabled]),select,a[href],[tabindex="0"]')].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'&&!el.closest('[hidden]'));
 if(!focusables.length)return;
 const first=focusables[0],last=focusables[focusables.length-1];
 if(e.shiftKey&&(document.activeElement===first||!root.contains(document.activeElement))){e.preventDefault();last.focus();}
 else if(!e.shiftKey&&(document.activeElement===last||!root.contains(document.activeElement))){e.preventDefault();first.focus();}
});
const controlSettings=Controls.createSettings({onOpen(){controlsEpoch=startEpoch;controlsResume=phase==='playing'||phase==='countdown';if(controlsResume)pause(true);resetInputs();root.inert=true;},onClose(){root.inert=false;if(controlsResume&&controlsEpoch===startEpoch&&phase==='paused')pause();controlsResume=false;}});
window.addEventListener('bio-controls-change',resetInputs);
shell();
})();