/* Friends lobby. No SDP logging or analytics. */
(()=>{'use strict';
const $=id=>document.getElementById(id),ja=new URLSearchParams(location.search).get('lang')==='ja';document.documentElement.lang=ja?'ja':'zh-Hant';$('language').value=ja?'ja':'zh';$('single').href='https://squallorc-dot.github.io/fun/arcade/'+(ja?'ja':'zh')+'/index.html';
const L=ja?{title:'Bio-City｜フレンドロビー',private:'フレンドと手動接続して遊べます。シングルプレイの記録は変更しません。',single:'シングルプレイへ',language:'言語',pair:'招待と手動接続',instructions:'同じLANの2台を推奨。Aが招待を作成→Bが貼り付けて返信を作成→Aが返信を貼り付けて受信。接続後は同じ回線で協力戦、卓球、バレー、レースを切り替えられます。',privacy:'接続情報にはネットワーク情報が含まれます。信頼する相手だけに共有してください。STUN/TURNや照合サーバーは使いません。別ネットワークの接続は保証できません。',room:'部屋の表示名',hero:'ガーディアン',host:'A：招待作成',guest:'B：招待から返信作成',accept:'A：返信を受信',local:'相手へ渡す接続情報',remote:'相手の情報を貼り付け',copy:'コピー',noCode:'部屋名は表示用です。短いコードで自動検索する機能はありません。',mode:'対戦種目',pong:'卓球',volley:'バレーボール',coop:'G01 協力バトル',chapter:'章',difficulty:'難易度',dodge:'回避',skill:'スキル',ready:'準備完了',cancelReady:'準備を解除',controls:'操作設定',leave:'部屋を退出／リセット',rules:'ホストが種目を選択。両者が準備完了すると3秒後に開始。卓球7点・バレー5点先取。',coopRules:'協力バトル：両者が倒れると失敗。倒れた仲間に近づきスキルで救援（エネルギー50、最大2回）。',coopKeys:'WASD 移動・J 攻撃・K ジャンプ・L 回避・E スキル／救援。',pause:'一時停止',resume:'再開に同意',return:'ロビーへ',rematch:'再試合',hit:'打球',jump:'ジャンプ',keys:'卓球：W/S・↑/↓で移動、J/Spaceで打球。バレー：A/D・←/→で移動、K/Spaceでジャンプ、Jで打球。',audio:'OST・効果音',audioMode:'再生モード',playMusic:'音楽の再生／停止',loop:'ループ',auto:'開始時に再生',quality:'接続品質と匿名レポート',qualityNote:'RTTはアプリの往復時間です。入力応答は権威状態の確認までで、表示遅延を含みません。同機自動試験は実機LANの検証ではありません。',export:'匿名の数値を表示',idle:'未接続',pairing:'接続中',lobby:'ロビー・準備待ち',countdown:'スタート準備',playing:'対戦中',paused:'一時停止・両者の同意で再開',finished:'試合終了',disconnected:'切断・未完了の試合は無効。再接続してください。',left:'あなたは左側を操作',right:'あなたは右側を操作',error:'処理できません。接続情報・ブラウザー権限を確認し、必要ならリセットしてください。',copied:'コピーしました',manualCopy:'選択した文字を手動コピーしてください',winner:'勝者',preparing:'画像を準備中',audioBlocked:'タップして音楽を有効にしてください'}:{title:'Bio-City｜好友大廳',private:'手動連線後與朋友同樂，不變更單人闖關紀錄。',single:'返回單人遊戲',language:'語言',pair:'邀請與手動配對',instructions:'建議同一 LAN 的兩台裝置。A 建立邀請 → B 貼上並產生回覆 → A 貼上回覆完成配對。連線後可在同一大廳切換合作戰鬥、城市防衛、球類與競速。',privacy:'連線資訊含網路候選位置，只分享給可信朋友。沒有使用 STUN／TURN 或配對伺服器，跨不同網路不保證連得上。',room:'房間顯示名稱',hero:'守護者',host:'A：建立邀請',guest:'B：讀取邀請並產生回覆',accept:'A：接收回覆',local:'分享給對方的連線資訊',remote:'貼上對方的連線資訊',copy:'複製',noCode:'房名只是顯示名稱，沒有短碼自動搜尋房間功能。',mode:'比賽項目',pong:'桌球',volley:'排球',coop:'G01 合作戰鬥',chapter:'章節',difficulty:'難度',dodge:'閃避',skill:'技能',ready:'確認準備',cancelReady:'取消準備',controls:'操作設定',leave:'離開房間／重設',rules:'房主選擇球類；雙方準備後倒數三秒開始。桌球先得7分、排球先得5分。',coopRules:'合作戰鬥：雙方倒下才失敗；靠近倒下隊友按技能救援（消耗50能量，最多2次）。',coopKeys:'WASD 移動、J 攻擊、K 跳躍、L 閃避、E 技能／救援。',pause:'暫停',resume:'同意繼續',return:'返回好友大廳',rematch:'重賽',hit:'擊球',jump:'跳躍',keys:'桌球：W/S、↑/↓移動，J／Space 揮拍。排球：A/D、←/→移動，K／Space 跳躍，J 擊球。',audio:'OST 與音效',audioMode:'播放模式',playMusic:'播放／暫停配樂',loop:'循環',auto:'開始時播放',quality:'連線品質與匿名報告',qualityNote:'RTT 是應用訊息往返時間；輸入回應是收到權威確認，尚未含畫面顯示延遲。同機自動測試不能代表真機 LAN 結果。',export:'顯示匿名數據',idle:'未連線',pairing:'配對中',lobby:'好友大廳・等待準備',countdown:'賽前倒數',playing:'遊戲中',paused:'已暫停・雙方確認後繼續',finished:'比賽結束',disconnected:'連線中斷，未完成對局作廢；請重新配對。',left:'你控制左側',right:'你控制右側',error:'無法完成，請檢查連線資訊或瀏覽器權限，必要時重設後再試。',copied:'已複製',manualCopy:'請手動複製已反白內容',winner:'勝方',preparing:'正在準備圖像',audioBlocked:'請點擊播放以啟用音樂'};
for(const el of document.querySelectorAll('[data-i18n]'))el.textContent=L[el.dataset.i18n];
$('mode').querySelector('[value="defense"]').textContent=ja?'G02 都市防衛':'G02 城市防衛';
if($('help')){$('help').textContent=ja?'操作ガイド':'操作說明';$('help-title').textContent=ja?'操作ガイド':'操作說明';$('help-close').textContent=ja?'閉じる':'收合';$('help-close').setAttribute('aria-label',ja?'操作ガイドを閉じる':'收合操作說明');}$('race-chapter-text').textContent=ja?'コース':'賽道';$('race-difficulty-text').textContent=ja?'難易度':'難度';$('mode').querySelector('[value="race"]').textContent=ja?'G06 レース':'G06 競速';$('mode').querySelector('[value="stairs"]').textContent=ja?'G03 階段チャレンジ':'G03 極限下樓梯';$('mode').querySelector('[value="pinball"]').textContent=ja?'G04 エナジーピンボール':'G04 能源彈珠';
const heroes=ja?['バーナー姐さん','MJ ロボット','モーモー','葉宝 EX','ゼリー三兄妹','野菜ソルジャー','オラクル']:['Burner 姐','MJ 機器人','萌牛阿哞','葉寶 EX','果凍三兄妹','野菜小將','Oracle 守望者'];heroes.forEach((name,i)=>{const o=document.createElement('option');o.value=i;o.textContent=name;$('hero').appendChild(o);});
const canvas=$('game-canvas'),ctx=canvas.getContext('2d'),keys=new Set(),pulses=new Set();let session,controls,plan={reservedLeft:0,reservedRight:0},epoch=-1,lastPhase='',last=performance.now(),lastUI=0;
let helpChoice=null,helpGame=null;
const oppDock=$('opponent-dock'),oppPanel=$('opponent-preview'),oppShow=$('opponent-show'),oppCanvas=$('opponent-canvas');
const oppCtx=oppCanvas?.getContext('2d')||null,oppPreferenceKey='bio-city-peer-preview-collapsed-v2';
let oppCollapsed=false,oppEpoch=-1,lastOppDraw=0;
try{oppCollapsed=localStorage.getItem(oppPreferenceKey)==='1';}catch{}
const phoneDual=()=>window.matchMedia('(max-width:700px), (pointer:coarse) and (max-height:700px)').matches;
function updateOpponentUI(s,active){
 if(!oppDock||!oppPanel||!oppShow)return; // Legacy QA entry has no production PiP controls.
 if(s.epoch!==oppEpoch)oppEpoch=s.epoch; // Preserve collapse preference across rounds.
 const enabled=active&&['g03','g04'].includes(s.config?.game)&&phoneDual()&&['countdown','playing','paused'].includes(s.phase);
 oppDock.hidden=!enabled;
 oppPanel.hidden=!enabled||oppCollapsed;oppShow.hidden=!enabled||!oppCollapsed;
 $('opponent-name').textContent=s.role==='host'?(ja?'相手の画面 · ゲスト':'好友即時畫面'):(ja?'相手の画面 · ホスト':'房主即時畫面');
 $('opponent-hide').textContent=ja?'閉じる':'收合';
 oppShow.textContent=ja?'相手の画面を表示':'顯示對手即時畫面';
 oppShow.setAttribute('aria-expanded',String(!oppCollapsed));
 $('opponent-hide').setAttribute('aria-expanded',String(!oppCollapsed));
}
function setOpponentCollapsed(collapsed){
 oppCollapsed=collapsed;
 try{localStorage.setItem(oppPreferenceKey,collapsed?'1':'0');}catch{}
 updateOpponentUI(session.inspect(),!$('arena').hidden);
}
$('opponent-hide')?.addEventListener('click',()=>setOpponentCollapsed(true));
$('opponent-show')?.addEventListener('click',()=>setOpponentCollapsed(false));
function setHelpOpen(open){if(!$('help')||!$('help-panel'))return;$('help-panel').hidden=!open;$('help').setAttribute('aria-expanded',String(open));$('help').textContent=ja?(open?'説明を閉じる':'操作ガイド'):(open?'收合說明':'操作說明');}
const audio=new BioFriendAudio(()=>{const a=audio?.prefs;if(!a)return;$('audio-status').textContent=audio.status==='blocked'?L.audioBlocked:audio.status;});
function resetInputs(){keys.clear();pulses.clear();controls?.reset();}
function readInput(dt=1/120){
 const c=controls?.read(dt)||{x:0,y:0,actions:new Set(),pulses:new Set()},mode=session.config?.mode||'pong';const held=k=>keys.has(k)||pulses.has(k),act=k=>c.actions.has(k)||c.pulses.has(k);
 const left=held('a')||held('ArrowLeft'),right=held('d')||held('ArrowRight'),up=held('w')||held('ArrowUp')||mode==='race'&&act('jump'),down=held('s')||held('ArrowDown')||act('down')||mode==='race'&&c.y>.35;
 const v={moveX:Math.max(-1,Math.min(1,(right?1:0)-(left?1:0)+c.x)),moveY:Math.max(-1,Math.min(1,(down||mode==='pong'&&right?1:0)-(up||mode==='pong'&&left?1:0)+c.y)),left,right,up,down,fire:held('j')||['pong','pinball','race','defense'].includes(mode)&&held(' ')||mode==='race'&&held('u')||act('fire'),jump:held('k')||['volley','stairs','coop'].includes(mode)&&held(' ')||act('jump'),actionAssist:!!c.assist};if(['g01','g02'].includes(session.config?.game))v.dodge=held('l')||act('dodge');if(['g01','g02','g04'].includes(session.config?.game))v.skill=held('e')||held('u')||act('skill');pulses.clear();return v;
}
function size(){
 if(!session?.adapter)return;
 const viewport=$('viewport'),w=viewport.clientWidth,ratio=session.adapter.game.h/session.adapter.game.w;const displayRatio=session.adapter.game.w+'/'+session.adapter.game.h;if(viewport.style.getPropertyValue('--bio-play-aspect')!==displayRatio)viewport.style.setProperty('--bio-play-aspect',displayRatio);
 const available=Math.max(100,w-(plan.reservedLeft||0)-(plan.reservedRight||0));
 // Treat the playfield like the single-player stage: fill the real available
 // viewport after the shared HUD and one touch dock have been laid out.
 // Do not impose the old 640px limit or subtract an estimated 245px twice.
 const box=viewport.getBoundingClientRect();
 const immersive=document.body.dataset.autoLobby==='true'&&document.body.classList.contains('playing')&&!document.body.classList.contains('round-finished');
 const budget=immersive?Math.max(120,box.height||innerHeight-100):Math.max(120,innerHeight-120);
 const h=Math.min(available*ratio,budget,immersive?Infinity:640);
 const cw=Math.min(available,h/ratio),ch=cw*ratio,dpr=Math.min(3,devicePixelRatio||1);
 const style={width:cw+'px',height:ch+'px',marginLeft:(plan.reservedLeft||0)+'px',marginRight:(plan.reservedRight||0)+'px'};
 for(const [k,v] of Object.entries(style))if(canvas.style[k]!==v)canvas.style[k]=v;
 const bw=Math.ceil(cw*dpr),bh=Math.ceil(ch*dpr);
 if(canvas.width!==bw||canvas.height!==bh){canvas.width=bw;canvas.height=bh;ctx.setTransform(bw/session.adapter.game.w,0,0,bh/session.adapter.game.h,0,0);}
}
function render(){
 if(!session)return;// The guest iframe must be laid out while starting: hiding its parent stalls
 // WebKit canvas/asset initialization. Only the host waits in the lobby.
 const s=session.inspect(),connected=session.link.state==='connected',active=!!session.adapter&&(s.role==='guest'||!s.startPending);
 if(epoch!==s.epoch){epoch=s.epoch;resetInputs();}
 if(lastPhase!==s.phase){resetInputs();if(['paused','disconnected','idle'].includes(s.phase))audio.pause();if(s.phase==='lobby')audio.resume();if(s.phase==='playing'){if(lastPhase==='countdown')audio.round();else audio.resume();}lastPhase=s.phase;controls?.schedule();}
 $('connection').hidden=connected;$('language').disabled=connected||s.phase==='pairing';$('hero').disabled=s.phase==='pairing';if(connected){$('local').value='';$('remote').value='';}
 $('room-name').textContent=s.room||L.title;$('status').textContent=L[s.phase]||L.disconnected;$('role').textContent=s.role==='host'?(ja?'ホスト':'房主'):s.role==='guest'?(ja?'ゲスト':'好友'):'';
 $('mode').disabled=s.role!=='host'||s.phase!=='lobby'||!s.configAck;if(s.config)$('mode').value=s.config.mode;
 $('ready').disabled=s.phase!=='lobby'||!s.configAck||s.preparing;const continuing=s.phase==='lobby'&&s.config?.continuation===true;$('ready').hidden=continuing&&(s.preparing||s.ready[s.role==='host'?0:1]);$('ready').textContent=s.preparing?L.preparing:s.ready[s.role==='host'?0:1]?L.cancelReady:L.ready;$('readiness').textContent=s.startPending?(ja?'フレンドのゲーム開始を確認中…':'正在等待好友完成遊戲畫面同步…'):continuing?(ja?'次の試合を準備中…':'正在接續下一局，準備倒數…'):s.ready.filter(Boolean).length+'/2';
 $('arena').hidden=!active;document.body.classList.toggle('playing',active);document.body.classList.toggle('round-finished',s.phase==='finished');$('viewport').dataset.game=s.config?.game||'';$('game-shell').dataset.game=s.config?.game||'';updateOpponentUI(s,active);const compactDual=['g03','g04'].includes(s.config?.game)&&phoneDual();$('side').textContent=compactDual?(ja?'自分の画面':'自己畫面'):s.role==='guest'?L.right:L.left;$('return').textContent=compactDual?(ja?'ロビー':'大廳'):L.return;$('pause').textContent=s.phase==='paused'?L.resume:L.pause;$('pause').disabled=!['playing','paused','countdown'].includes(s.phase);$('rematch').hidden=s.phase!=='finished';const hasChapters=['g01','g02','g03','g04','g06'].includes(s.config?.game),completed=s.config?.game==='g06'?(s.result?.players?.length===2&&s.result.players.every(p=>p.status==='finished')):!!s.result?.win;const nextChapter=hasChapters&&completed&&(s.config?.chapter||1)<5;const nextLabel=nextChapter?(ja?`次のチャプター（${s.config.chapter+1}/5）`:`下一關（${s.config.chapter+1}/5）`):hasChapters?(completed?(ja?'新しい周回を始める':'重新闖關'):(ja?'このチャプターをもう一度':'重試本關')):(ja?'次の試合へ':'再玩下一局');$('rematch').textContent=s.nextRequested?(ja?'ホストの開始を待っています':'等待房主開始下一局'):nextLabel;$('rematch').disabled=!!s.nextRequested;
 if($('help')){const key=s.config?.game+':'+s.config?.mode;if(helpGame!==key){helpGame=key;helpChoice=null;}const compactDual=['g03','g04'].includes(s.config?.game)&&phoneDual();const visible=active&&document.body.dataset.autoLobby==='true'&&['countdown','playing','paused'].includes(s.phase)&&(helpChoice??!compactDual);setHelpOpen(visible);}
  const race=s.config?.game==='g06',dual=['g03','g04'].includes(s.config?.game),time=v=>Number.isFinite(v)?v.toFixed(2)+'s':'—';$('result').textContent=s.result?(dual?`${s.config.game==='g03'?(ja?'階段チャレンジ':'極限下樓梯'):(ja?'ピンボール':'能源彈珠')} · ${(ja?'ホスト':'房主')} ${s.result.players[0].score} : ${(ja?'ゲスト':'好友')} ${s.result.players[1].score} · ${s.result.winner===null?(ja?'引き分け':'平手'):(ja?'勝者':'勝方')+' '+(s.result.winner===0?(ja?'ホスト':'房主'):(ja?'ゲスト':'好友'))}`:race?s.result.standings.map(r=>`${r.position}. ${r.name} ${r.status==='finished'?(ja?'完走':'完賽'):r.status==='dnf'?(ja?'リタイア':'未完賽'):(ja?'進行中':'比賽中')} ${time(r.time)}`).join(' · ')+' | '+s.result.players.map(p=>`${p.id==='player'?(ja?'ホスト':'房主'):(ja?'ゲスト':'好友')} 第${p.rank}${ja?'位':'名'} ${ja?'ベスト':'最佳圈'} ${time(p.bestLap)} ${ja?'追越':'超車'} ${p.overtakes} ${ja?'衝突':'碰撞'} ${p.collisions}`).join(' · '):['g01','g02'].includes(s.config?.game)?`${s.result.win?'勝利':(ja?'失敗':'挑戰失敗')} · ${ja?'スコア':'得分'} ${s.result.score} · ${ja?'撃破':'擊倒'} ${s.result.kills}`:`${L.winner}：${s.result.winner===0?(ja?'ホスト':'房主'):(ja?'ゲスト':'好友')} · ${s.result.points.join(' : ')}`):'';if(session.adapter&&dual)$('score').innerHTML=session.adapter.game.hud();else if(session.adapter&&race)$('score').innerHTML=s.role==='guest'?session.adapter.game.guestHud():session.adapter.game.hud();else $('score').textContent=session.adapter?(['g01','g02'].includes(s.config?.game)?String(session.adapter.game.inspectCombat().score):session.adapter.game.inspectMatch().points.join(' : ')):'';
 // The joint result is a readable scoreboard on desktop and both phones.
 let dualBoard=$('dual-result-board');
 if(!dualBoard){dualBoard=document.createElement('section');dualBoard.id='dual-result-board';dualBoard.className='dual-result-board';dualBoard.setAttribute('aria-live','polite');dualBoard.hidden=true;$('round-message').insertAdjacentElement('afterend',dualBoard);}
 dualBoard.hidden=!(dual&&s.phase==='finished'&&s.result?.players?.length===2);
 if(!dualBoard.hidden){
  const result=s.result;
  dualBoard.replaceChildren();
  const heading=document.createElement('h3');heading.textContent=s.config?.game==='g03'?(ja?'G03 階段チャレンジ · 最終結果':'G03 極限下樓梯 · 共同結算'):(ja?'G04 エナジーピンボール · 最終結果':'G04 能源彈珠 · 共同結算');
  dualBoard.appendChild(heading);
  const summary=document.createElement('p');summary.textContent=result.winner===null?(ja?'引き分け':'平手'):(ja?'勝者：':'勝方：')+(result.winner===0?(ja?'ホスト':'房主'):(ja?'ゲスト':'好友'));
  dualBoard.appendChild(summary);
  const cards=document.createElement('div');cards.className='dual-result-cards';
  result.players.forEach((p,i)=>{
   const card=document.createElement('article');card.className='dual-result-card'+(result.winner===i?' dual-result-winner':'');
   const title=document.createElement('strong');title.textContent=i===0?(ja?'ホスト':'房主'):(ja?'ゲスト':'好友');
   const score=document.createElement('b');score.textContent=String(p.score);
   const progress=document.createElement('span');progress.textContent=(ja?'進度：':'進度：')+p.progress+(s.config?.game==='g03'?' m':'');
   const state=document.createElement('small');state.textContent=p.finished?(ja?'終了':'已結束'):(ja?'途中で共同集計':'共同結算時進行中');
   card.append(title,score,progress,state);cards.appendChild(card);
  });
  dualBoard.appendChild(cards);
 }
 let roundMessage='';
 if(s.phase==='finished'&&s.result){
  if(race){
   const players=(s.result.players||[]).map(p=>(p.id==='player'?(ja?'ホスト':'房主'):p.id==='guest'?(ja?'ゲスト':'好友'):p.id)+' 第'+p.rank+(ja?'位':'名')).join(' · ');
   roundMessage=L.finished+' · '+players;
  }else roundMessage=L.finished+' · '+$('result').textContent;
 }else if(s.phase==='paused')roundMessage=L.paused+' · '+s.resume.filter(Boolean).length+'/2';
 const banner=$('round-message');if(banner.textContent!==roundMessage)banner.textContent=roundMessage;
 banner.hidden=!roundMessage;
 const details=$('round-details');details.hidden=!(s.phase==='finished'&&race);
 if(!details.hidden){$('round-detail-text').textContent=$('result').textContent;$('round-detail-label').textContent=ja?'全順位と記録を見る':'展開完整六車排名與紀錄';}else details.open=false;
 const m=s.metrics;$('metrics').textContent=`RTT p50/p95 ${m.rtt50?.toFixed(1)||'—'} / ${m.rtt95?.toFixed(1)||'—'} ms · jitter ${m.jitter.toFixed(1)} ms · FPS ${m.fps?.toFixed(1)||'—'} · input ACK p50/p95 ${m.inputAck50?.toFixed(1)||'—'} / ${m.inputAck95?.toFixed(1)||'—'} ms · corrections ${m.corrections} · rejected ${s.rejected+m.rejected}`;
 $('countdown').textContent=s.phase==='countdown'?Math.ceil(session.countdown):s.phase==='paused'?'Ⅱ':'';
 if(s.phase==='paused'){
  const why=s.pauseReason==='input-timeout'?(ja?'相手の入力が途切れました':'對方輸入中斷'):s.pauseReason==='engine-backpressure'?(ja?'ゲーム処理を待機中':'遊戲處理暫停'):s.pauseReason==='user'?(ja?'手動で一時停止':'手動暫停'):(ja?'相手が一時停止':'雙方暫停');
  $('metrics').textContent+=' · '+why+' · '+(ja?'再開の同意':'繼續確認')+' '+s.resume.filter(Boolean).length+'/2';
 }
 const isCoop=['g01','g02'].includes(s.config?.game),dualGame=['g03','g04'].includes(s.config?.game),hasStage=isCoop||dualGame,defense=s.config?.game==='g02';for(const id of ['coop-chapter','coop-difficulty']){$(id+'-label').hidden=!hasStage;$(id).disabled=s.role!=='host'||s.phase!=='lobby'||!s.configAck;}if(hasStage){$('coop-chapter').value=String(s.config.chapter);$('coop-difficulty').value=s.config.difficulty;}for(const id of ['race-chapter','race-difficulty']){$(id+'-label').hidden=!race;$(id).disabled=s.role!=='host'||s.phase!=='lobby'||!s.configAck;}if(race){$('race-chapter').value=String(s.config.chapter);$('race-difficulty').value=s.config.difficulty;}if($('help-text'))$('help-text').textContent=race?(ja?'自動加速・左右で操作、下でブレーキ、Jでブースト。スマホはスティックとボタン。':'自動加速；左右轉向、下壓煞車，J／氮氣鍵加速。'):defense?(ja?'スティック／WASDで移動、Jで射撃、Lで回避、Eでスキル。':'搖桿／WASD 移動、J／射擊鍵攻擊、L 閃避、E 技能。'):isCoop?(ja?'スティック／WASDで移動、J攻撃、Kジャンプ、L回避、Eスキル。':'搖桿／WASD 移動、J 攻擊、K 跳躍、L 閃避、E 技能。'):dualGame?window.BioArcadeGuide.get(s.config.game).touch:s.config?.mode==='volley'?(ja?'スティック／A・Dで左右移動、Kでジャンプ、Jでアタック。':'搖桿／A、D 左右移動，K 跳躍，J／擊球鍵攻擊。'):(ja?'スティック／W・Sで上下移動、J／Spaceで打つ。':'搖桿／W、S 上下移動，J／空白鍵／擊球鍵揮拍。');$('rules').textContent=race?(ja?'自動加速・左右でステアリング・下でブレーキ・Jでブースト。':'自動加速、左右轉向、下壓煞車、J 使用氮氣。'):dualGame?(ja?'同時にスタート。各自で操作し、先に終了した時点で両者の記録を確定します。':'雙方同步開始、獨立操控；任一方結束時共同結算分數。'):isCoop?L.coopRules:L.rules;document.querySelector('#game-instructions').textContent=defense?(ja?'WASDで移動、Jで射撃、Lで回避、Eでスキル／救助。':'WASD 移動、J 射擊、L 閃避、E 技能／救援。'):dualGame?(s.config.game==='g03'?(ja?'左右移動・K ジャンプ・下へ降りる':'左右移動、K 跳躍、向下穿越平台'):(ja?'左右エイム・上下パワー・J 発射':'左右瞄準、上下調整力道、J 發射')):isCoop?L.coopKeys:L.keys;const guideButtons=window.BioArcadeGuide?.get(s.config?.game,s.config?.mode||'volley')?.buttons||{};const buttonLabels=s.config?.game==='g02'?{fire:ja?'射撃':'射擊',dodge:ja?'回避':'閃避',skill:ja?'スキル':'技能'}:guideButtons;for(const button of $('touch-controls').querySelectorAll('[data-action]')){const label=button.dataset.action==='down'&&!['g03','g06'].includes(s.config?.game)?null:buttonLabels[button.dataset.action];button.hidden=!label;if(label){button.textContent=label;button.setAttribute('aria-label',label);}}const controlKey=s.config?.game+':'+s.config?.mode;if(controlGame!==controlKey){controlGame=controlKey;rebuildControls();}size();
}
session=new BioFriends.Session({readInput,onChange:render,locale:ja?'ja':'zh',betaStun:document.body.dataset.autoLobby==='true'||new URLSearchParams(location.search).get('auto')==='1',sfx:(f,l)=>audio.effect(f,l)});
const settings=BioControlProfiles.createSettings({onOpen:()=>{session.pause('settings');resetInputs();},onClose:()=>{resetInputs();controls.schedule();}});
let controlGame;function rebuildControls(){controls?.dispose();const game=session.config?.game||'g05',buttons=[...document.querySelectorAll('#touch-controls [data-action]')].filter(el=>!el.hidden);
// Standalone G03 puts DOWN at the inner/left action slot and JUMP at the outer/right.
// This order feeds the shared control-layout engine; DOM order alone is not visual order.
if(game==='g03')buttons.sort((a,b)=>['down','jump'].indexOf(a.dataset.action)-['down','jump'].indexOf(b.dataset.action));
controls=BioControlProfiles.createInput({root:$('touch-controls'),stick:$('stick-pad'),knob:$('stick-knob'),buttons:buttons.map(el=>({el,key:el.dataset.action})),context:()=>({game,mode:session.config?.mode||'pong',axis:['g01','g02','g04','g06'].includes(game)?'xy':game==='g03'?'x':session.config?.mode==='volley'?'x':'y'}),enabled:()=>['countdown','playing'].includes(session.phase),space:()=>$('viewport'),onLayout:p=>{plan=p;size();}});}rebuildControls();
async function act(task){$('error').textContent='';audio.unlock();try{await task();}catch{$('error').textContent=L.error;}render();}
$('host').onclick=()=>act(async()=>{$('local').value=await session.host($('room').value,Number($('hero').value));});
$('guest').onclick=()=>act(async()=>{$('local').value=await session.join($('remote').value,Number($('hero').value));$('remote').value='';});
$('accept').onclick=()=>act(async()=>{await session.accept($('remote').value);$('remote').value='';$('local').value='';});
$('copy').onclick=()=>act(async()=>{try{await navigator.clipboard.writeText($('local').value);}catch{$('local').focus();$('local').select();$('error').textContent=L.manualCopy;}});
$('ready').onclick=()=>act(()=>session.ready(!session.readyFlags[session.role==='host'?0:1]));$('mode').onchange=()=>{const mode=$('mode').value;session.configure(mode,mode==='coop'?'g01':mode==='defense'?'g02':mode==='stairs'?'g03':mode==='pinball'?'g04':mode==='race'?'g06':'g05');controls.schedule();};for(const id of ['coop-chapter','coop-difficulty'])$(id).onchange=()=>session.configure(session.config.mode,session.config.game,{chapter:Number($('coop-chapter').value),difficulty:$('coop-difficulty').value});for(const id of ['race-chapter','race-difficulty'])$(id).onchange=()=>session.configure('race','g06',{chapter:Number($('race-chapter').value),difficulty:$('race-difficulty').value});$('pause').onclick=()=>{resetInputs();session.phase==='paused'?session.resume():session.pause();};if($('help')){$('help').onclick=()=>{helpChoice=$('help-panel').hidden;setHelpOpen(helpChoice);};$('help-close').onclick=()=>{helpChoice=false;setHelpOpen(false);$('help').focus({preventScroll:true});};}$('return').onclick=()=>{resetInputs();session.lobby();};$('rematch').onclick=()=>act(()=>{resetInputs();if(!session.next())throw Error('next-unavailable');});$('leave').onclick=()=>{resetInputs();session.leave();$('local').value=$('remote').value='';};$('controls-settings').onclick=()=>settings.open();
$('language').onchange=()=>{session.leave();location.search='?lang='+$('language').value;};
const bindings=['a','d','w','s','j','k','l','e',' ','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'];window.addEventListener('keydown',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;if(BioControlProfiles.settingsOpen||!session.adapter||e.target?.matches?.('textarea,input,select'))return;if(bindings.includes(k)){e.preventDefault();keys.add(k);if(!e.repeat)pulses.add(k);}if(k==='Escape'&&!e.repeat&&$('help-panel')&&!$('help-panel').hidden){e.preventDefault();helpChoice=false;setHelpOpen(false);return;}if((k==='p'||k==='Escape')&&!e.repeat){e.preventDefault();session.phase==='paused'?session.resume():session.pause();resetInputs();}});window.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));// Losing browser focus must release held keys, not reset both players' resume votes.
window.addEventListener('blur',()=>{resetInputs();});document.addEventListener('visibilitychange',()=>{if(document.hidden){resetInputs();audio.pause();}else if(['lobby','playing','countdown','finished'].includes(session.phase))audio.resume();});window.addEventListener('pagehide',()=>{resetInputs();session.leave();audio.dispose();});
for(const [id,key]of [['audio-mode','playMode'],['track','track'],['volume','volume'],['sfx','sfx'],['loop','loop'],['auto','auto']]){const e=$(id);if(e.type==='checkbox')e.checked=audio.prefs[key];else e.value=audio.prefs[key];e.addEventListener('change',()=>audio.set({[key]:e.type==='checkbox'?e.checked:key==='playMode'?e.value:Number(e.value)}));}
$('music-toggle').onclick=()=>audio.media.paused?audio.play():audio.pause();$('export').onclick=()=>{$('report').textContent=JSON.stringify({version:BioG05Network.TAG,browser:navigator.userAgent.includes('Firefox')?'Firefox':navigator.userAgent.includes('Safari')&&!navigator.userAgent.includes('Chrome')?'Safari':'Chromium',metrics:session.inspect().metrics,results:session.totalResults,physicalLAN:'pending'},null,2);};
new ResizeObserver(()=>{controls.schedule();size();}).observe($('viewport'));
function frame(now){const dt=Math.max(0,(now-last)/1000);last=now;session.update(dt);if(session.adapter){if(session.config?.game==='g06'&&session.role==='guest')session.adapter.game.drawGuest(ctx);else session.adapter.game.draw(ctx);if(oppPanel&&!oppPanel.hidden&&oppCtx&&now-lastOppDraw>=100&&typeof session.adapter.drawOpponent==='function'){session.adapter.drawOpponent(oppCtx);lastOppDraw=now;}}if(now-lastUI>200){lastUI=now;render();}requestAnimationFrame(frame);}render();requestAnimationFrame(frame);
rootExpose();function rootExpose(){window.BioFriendsApp={session,inspect:()=>({session:session.inspect(),match:session.adapter?(['g01','g02'].includes(session.config?.game)?session.adapter.game.inspectCoop():session.config?.game==='g06'?(session.role==='guest'?session.adapter.game.inspectGuestRace():session.adapter.game.inspectRace()):['g03','g04'].includes(session.config?.game)?session.adapter.capture():session.adapter.game.inspectMatch()):null,combat:session.config?.game==='g01'?session.adapter?.game.inspectCombat()||null:null,controls:controls.debug,canvas:{width:canvas.width,height:canvas.height,css:canvas.getBoundingClientRect().toJSON()}})};}
})();
