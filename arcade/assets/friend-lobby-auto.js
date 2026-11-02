/* Unlinked v1.6.1 candidate. Signaling endpoint remains empty until authorized configuration. */
(()=>{'use strict';
const ja=new URLSearchParams(location.search).get('lang')==='ja',L=ja?{
 title:'Bio-City｜フレンドロビー',beta:'公開ベータ版：接続が切れる場合があります。Google公開STUNを使用します。Googleに送信元IPが見える場合があります。',create:'部屋を作る',join:'部屋に参加',back:'ゲームセンターへ',lang:'言語',room:'部屋の名前',hero:'ガーディアン',code:'8文字の部屋コード',start:'続ける',cancel:'前の画面へ',copy:'招待リンクをコピー',share:'招待リンクを共有',waiting:'友達を待っています',joining:'接続中…',approve:'参加リクエストを許可しますか？',yes:'許可',no:'拒否',unavailable:'接続サービスは準備中です。',rate:'操作が多すぎます。しばらく待って再試行してください。',denied:'ホストが参加を拒否しました。',expired:'相手が退出したか、接続が切れたか、部屋が無効になりました。新しい部屋を作ってください。',timeout:'接続がタイムアウトしました。新しい招待をお試しください。',error:'接続できません。部屋とネットワークを確認して再試行してください。',copied:'コピーしました',copyFail:'リンクを選択してコピーしてください。',invalid:'招待リンクが無効です。',signalLost:'招待サービスとの接続が切れました。対局は継続し、接続の回復を試みます。',signalRestored:'招待サービスに再接続しました。',signalFail:'招待サービスを回復できません。現在の対局は続行できますが、次の接続には新しい部屋が必要です。',retryTitle:'対局の接続が切れました。再接続するか、新しい部屋を作ってください。',retry:'再接続（両者が操作）',newRoom:'新しい部屋を作る',retryWait:'友達の再接続を待っています。',retryFail:'この部屋では再接続できません。ホストが部屋を作り直し、新しい招待を共有してください。',rejoin:'部屋コードで再参加',inviteUsed:'古い招待リンクは再利用できません。部屋コードでホストに承認を依頼するか、新しい招待を受け取ってください。',qr:'招待 QR コード',codePending:'ホストの許可を待っています。',privacy:'同じ Wi-Fi を推奨します。別ネットワークでの接続は保証できません。',
}:{title:'Bio-City｜好友大廳',beta:'公開 Beta 測試：連線可能中斷。使用 Google 公開 STUN 協助配對，Google 可能取得你的對外 IP。',create:'建立房間',join:'加入房間',back:'返回遊戲中心',lang:'語言',room:'房間名稱',hero:'守護者',code:'8 位房間碼',start:'繼續',cancel:'返回上一頁',copy:'複製邀請連結',share:'分享邀請連結',waiting:'等待朋友加入',joining:'正在連線…',approve:'有朋友想加入房間，是否允許？',yes:'允許',no:'拒絕',unavailable:'連線服務尚在準備中。',rate:'操作過於頻繁，請稍後再試。',denied:'房主拒絕了加入請求。',expired:'對方已離開、連線中斷或房間已失效，請重新建立房間。',timeout:'連線逾時，請使用新邀請重試。',error:'連線失敗，請檢查房間與網路後重試。',copied:'已複製',copyFail:'請選取連結後手動複製。',invalid:'邀請連結無效。',signalLost:'邀請服務已中斷；目前對局可繼續，正在嘗試恢復服務。',signalRestored:'邀請服務已重新連線。',signalFail:'無法恢復邀請服務；目前對局可繼續，下次配對請建立新房間。',retryTitle:'對局連線已中斷。可嘗試重新連線，若持續失敗請建立新房間。',retry:'重新連線（雙方皆需操作）',newRoom:'重新建立房間',retryWait:'等待朋友重新連線。',retryFail:'本房間無法再重新連線。請房主重新建立房間，再分享新邀請。',rejoin:'用房間碼重新加入',inviteUsed:'舊邀請不能重複使用。請用房間碼請房主核准，或請房主建立新房間。',qr:'邀請 QR Code',codePending:'等待房主確認。',privacy:'建議使用同一 Wi-Fi；不保證不同網路可以連線。'};
const heroes=ja?['バーナー姐さん','MJ ロボット','モーモー','葉宝 EX','ゼリー三兄妹','野菜ソルジャー','オラクル']:['Burner 姐','MJ 機器人','萌牛阿哞','葉寶 EX','果凍三兄妹','野菜小將','Oracle 守望者'];
 const heroArtNames=['burner-sister','mj-robot','moo-moo','ye-bao-ex','jelly-trio','veggie-kid','oracle-guardian'];
 // Official repository artwork is bundled by the existing Cloudflare static allowlist.
 const heroArt=i=>'../../images/funai-care-'+heroArtNames[i] + '.png';
 const heroDescriptions=ja?['情熱とリズムで仲間を導くガーディアン','精密な判断でチームを支えるロボット','力強く前線を守るパートナー','ひらめきで未知のステージに挑む','チームワークで困難を切り開く','元気いっぱいの冒険サポーター','未来を見据える知恵の守護者']:['熱情節奏，與隊友一同突破挑戰','精準判斷，協助隊友掌握節奏','堅定守護，勇闖生醫城市','靈活應變，迎接全新冒險','三人默契，攜手面對關卡','活力滿滿，一起守護每場挑戰','沉著觀察，帶領隊友迎向未知'];
const entry=document.getElementById('auto-entry');entry.innerHTML=`<p class="auto-kicker" aria-hidden="true">BIO-CITY · MULTIPLAYER</p><h1>${L.title}</h1><p class="auto-tagline">${ja?'ガーディアンと一緒に、次のゲームへ':'選擇守護者，與好友展開雙人街機冒險'}</p><p class="auto-beta-notice" role="note">${L.beta}</p><div id="auto-home"><div class="auto-poster"><img src="../assets/covers/bio-city-arcade-cover.webp" alt="" loading="lazy"><span>${ja?'2人で遊ぶ · 友達を招待':'雙人連線 · 一起闖關'}</span></div><div class="auto-actions"><button id="auto-create">${L.create}</button><button id="auto-join">${L.join}</button></div><a class="auto-back-button" href="https://squallorc-dot.github.io/fun/${ja?'ja':'zh'}/play.html">← ${L.back}</a> <label>${L.lang}<select id="auto-language"><option value="zh">繁體中文</option><option value="ja">日本語</option></select></label></div><div id="auto-form" hidden><label id="auto-code-label">${L.code}<input id="auto-code" maxlength="8" autocomplete="off" autocapitalize="characters"></label><label>${L.hero}<select id="auto-hero"></select></label><div id="auto-hero-choices" class="auto-hero-choices" role="group" aria-label="${L.hero}"></div><div class="auto-hero-card"><div class="auto-portrait-wrap"><img id="auto-hero-portrait" width="420" height="420" alt="" decoding="async"><canvas id="auto-hero-art" width="180" height="180" role="img" aria-label="${ja?'選択したガーディアン':'選擇的守護者'}" hidden></canvas></div><div class="auto-hero-copy"><small>${ja?'ガーディアン選択':'守護者選角'}</small><strong id="auto-hero-name"></strong><span id="auto-hero-description"></span><span class="auto-player-tag">${ja?'あなたのキャラクター':'你在雙人遊戲中的角色'}</span></div></div><div class="auto-actions"><button id="auto-start">${L.start}</button><button id="auto-back">${L.cancel}</button></div></div><div id="auto-wait" hidden><p id="auto-room-code"></p><p>${L.waiting}</p><div id="auto-share-actions" class="auto-actions"><button id="auto-copy">${L.copy}</button><button id="auto-share">${L.share}</button></div><a id="auto-link"></a><canvas id="auto-qr" role="img" aria-label="${L.qr}" hidden></canvas><div id="auto-approval" hidden><p>${L.approve}</p><div class="auto-actions"><button id="auto-yes">${L.yes}</button><button id="auto-no">${L.no}</button></div></div><button id="auto-stop">${L.cancel}</button></div><div id="auto-retry" hidden><p>${L.retryTitle}</p><div class="auto-actions"><button id="auto-retry-start">${L.retry}</button><button id="auto-retry-new">${L.newRoom}</button><button id="auto-retry-cancel">${L.cancel}</button></div><details id="auto-diagnostic-details" hidden><summary>${ja?'接続の詳細':'進階連線診斷'}</summary><p id="auto-diagnostic"></p></details></div><p id="auto-privacy" hidden>${L.privacy}</p><p id="auto-status" role="status" aria-live="polite"></p><details id="auto-tech-details" hidden><summary>${ja?'接続診断を表示':'展開連線診斷資訊'}</summary><p id="auto-tech-note"></p></details>`;
const $=id=>document.getElementById(id),endpoint=document.querySelector('meta[name="bio-signaling-endpoint"]').content.trim(),session=BioFriendsApp.session;let role='',connection=null,room=null,invite=window.bioPendingInvite||null,requestId=null,busy=false,sequence=0;
window.bioPendingInvite=null;heroes.forEach((h,i)=>{const option=document.createElement('option');option.value=i;option.textContent=h;$('auto-hero').appendChild(option);});$('auto-language').value=ja?'ja':'zh';
const drawGuardian=(canvas,hero,time)=>{if(!canvas||!rootGuardian())return;const ctx=canvas.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,canvas.width,canvas.height);BioGuardianArt.draw(ctx,hero,'idle',time/1000,canvas.width/2,canvas.height*.92,Math.min(canvas.width/175,canvas.height/175));};
const rootGuardian=()=>typeof BioGuardianArt!=='undefined'&&typeof BioGuardianArt.draw==='function';
function selectGuardian(){const h=Number($('auto-hero').value),portrait=$('auto-hero-portrait'),fallback=$('auto-hero-art');$('auto-hero-name').textContent=heroes[h]||heroes[0];$('auto-hero-description').textContent=heroDescriptions[h]||heroDescriptions[0];
  portrait.alt=heroes[h]||heroes[0];portrait.hidden=false;fallback.hidden=true;
  portrait.onerror=()=>{portrait.hidden=true;fallback.hidden=false;if(rootGuardian())BioGuardianArt.preload([h]).then(()=>drawGuardian(fallback,h,performance.now())).catch(()=>{});};
  portrait.src=heroArt(h);}
$('auto-hero').addEventListener('change',()=>{selectGuardian();refreshHeroChoices();centerGuardian(Number($('auto-hero').value));});
function refreshHeroChoices(){
 const i=Number($('auto-hero').value);
 document.querySelectorAll('.auto-hero-choice').forEach(b=>{
  const chosen=Number(b.dataset.hero)===i;
  b.setAttribute('aria-pressed',String(chosen));
  b.setAttribute('aria-selected',String(chosen));
  b.dataset.position=chosen?'center':Number(b.dataset.hero)===i-1?'previous':Number(b.dataset.hero)===i+1?'next':'hidden';
  b.setAttribute('aria-hidden',b.dataset.position==='hidden'?'true':'false');
  b.tabIndex=chosen?0:-1;
 });
 if($('auto-hero-progress'))$('auto-hero-progress').textContent=(i+1)+' / '+heroes.length;
 if($('auto-hero-prev'))$('auto-hero-prev').disabled=i===0;
 if($('auto-hero-next'))$('auto-hero-next').disabled=i===heroes.length-1;
}
heroes.forEach((name,i)=>{const b=document.createElement('button');b.className='auto-hero-choice';b.type='button';b.dataset.hero=String(i);b.setAttribute('aria-pressed',String(i===0));const picture=document.createElement('img');picture.src=heroArt(i);picture.alt='';picture.loading='lazy';picture.decoding='async';picture.width=176;picture.height=176;b.appendChild(picture);
  const c=document.createElement('canvas');c.width=c.height=90;c.hidden=true;b.appendChild(c);
  picture.onerror=()=>{picture.hidden=true;c.hidden=false;if(rootGuardian())BioGuardianArt.preload([i]).then(()=>drawGuardian(c,i,0)).catch(()=>{});};
  const label=document.createElement('span');label.textContent=name;b.appendChild(label);
  b.setAttribute('aria-label',name);b.onclick=()=>chooseGuardian(i);$('auto-hero-choices').appendChild(b);});
// The carousel owns presentation only. Hero IDs, room permissions, and
// the hidden native <select> remains the authoritative selection contract.
const heroForm=$('auto-form'),heroStrip=$('auto-hero-choices');
const pickerPane=document.createElement('section');pickerPane.className='auto-picker-pane';
pickerPane.setAttribute('aria-label',ja?'ガーディアンを選ぶ':'選擇守護者');
const selectLabel=$('auto-hero').closest('label');
// Keep the original select as the authoritative hero value for signaling,
// but do not show a second visual picker beside the accessible carousel.
selectLabel.hidden=true;
const stage=document.createElement('div');stage.className='auto-hero-stage';
const previous=document.createElement('button'),next=document.createElement('button');
for(const [btn,id,txt,aria] of [
 [previous,'auto-hero-prev','‹',ja?'前のガーディアン':'上一位守護者'],
 [next,'auto-hero-next','›',ja?'次のガーディアン':'下一位守護者']
]){btn.type='button';btn.id=id;btn.className='auto-hero-nav';btn.textContent=txt;btn.setAttribute('aria-label',aria);}
heroStrip.setAttribute('role','group');heroStrip.setAttribute('aria-label',ja?'ガーディアンを左右にスライド':'左右滑動選擇守護者');
heroStrip.tabIndex=0;
stage.append(previous,heroStrip,next);
const progress=document.createElement('output');progress.id='auto-hero-progress';progress.className='auto-hero-progress';progress.setAttribute('aria-live','polite');
heroForm.insertBefore(pickerPane,heroForm.firstChild);
pickerPane.append($('auto-code-label'),stage,progress,selectLabel);
// A fixed-width stage avoids nested flex scroll-width expansion on phones.
// Side cards are transformed into view; horizontal swipes move the selection.
function centerGuardian(){refreshHeroChoices();}
function chooseGuardian(i){
 const index=Math.max(0,Math.min(heroes.length-1,i));
 $('auto-hero').value=String(index);selectGuardian();refreshHeroChoices();
}
previous.addEventListener('click',()=>chooseGuardian(Number($('auto-hero').value)-1));
next.addEventListener('click',()=>chooseGuardian(Number($('auto-hero').value)+1));
heroStrip.addEventListener('keydown',e=>{
 if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){
  e.preventDefault();const index=Number($('auto-hero').value);
  chooseGuardian(e.key==='Home'?0:e.key==='End'?heroes.length-1:index+(e.key==='ArrowRight'?1:-1));
 }
});
let swipeStart=null,swipeIgnored=false;
heroStrip.addEventListener('pointerdown',e=>{if(e.isPrimary)swipeStart={x:e.clientX,y:e.clientY};});
heroStrip.addEventListener('pointerup',e=>{
 if(!swipeStart)return;
 const dx=e.clientX-swipeStart.x,dy=e.clientY-swipeStart.y;swipeStart=null;
 if(Math.abs(dx)>35&&Math.abs(dx)>Math.abs(dy)*1.15){
  swipeIgnored=true;chooseGuardian(Number($('auto-hero').value)+(dx<0?1:-1));
  setTimeout(()=>{swipeIgnored=false;},180);
 }
});
heroStrip.addEventListener('pointercancel',()=>{swipeStart=null;});
heroStrip.addEventListener('click',e=>{if(swipeIgnored){e.preventDefault();e.stopImmediatePropagation();}},true);
window.addEventListener('resize',()=>{if(!heroForm.hidden)centerGuardian(Number($('auto-hero').value),'instant');});

setInterval(()=>{const now=performance.now();if(!$('auto-form').hidden&&$('auto-hero-portrait').hidden)drawGuardian($('auto-hero-art'),Number($('auto-hero').value),now);if(document.body.classList.contains('auto-connected')&&!document.body.classList.contains('playing')){for(const [id,hero]of [['auto-avatar-host',session.role==='host'?session.hero:session.peerHello?.hero],['auto-avatar-guest',session.role==='guest'?session.hero:session.peerHello?.hero]])if(Number.isInteger(hero)&&$(id)&&!$(id).hidden)drawGuardian($(id),hero,now);}},160);

function screen(name){$('auto-home').hidden=name!=='home';$('auto-form').hidden=name!=='form';$('auto-wait').hidden=name!=='wait';$('auto-retry').hidden=name!=='retry';$('auto-privacy').hidden=name==='home';if(name!=='form')$('auto-tech-details').hidden=true;}
function status(text){$('auto-status').textContent=text;}
function ensurePlayerCards(){if($('auto-avatar-cards'))return;const row=document.createElement('div');row.id='auto-avatar-cards';row.className='auto-avatar-cards';row.innerHTML='<div class="auto-avatar"><img id="auto-avatar-host-image" width="128" height="128" alt=""><canvas id="auto-avatar-host" width="104" height="104" aria-hidden="true" hidden></canvas><div><small>'+(ja?'ホスト':'房主')+'</small><strong id="auto-name-host"></strong></div></div><span class="auto-versus">×</span><div class="auto-avatar"><img id="auto-avatar-guest-image" width="128" height="128" alt=""><canvas id="auto-avatar-guest" width="104" height="104" aria-hidden="true" hidden></canvas><div><small>'+(ja?'ゲスト':'好友')+'</small><strong id="auto-name-guest"></strong></div></div>';$('lobby').insertBefore(row,$('room-name'));}
function refreshPlayers(){if(!$('auto-avatar-cards')||!session.peerHello)return;const host=session.role==='host'?session.hero:session.peerHello.hero,guest=session.role==='guest'?session.hero:session.peerHello.hero;$('auto-name-host').textContent=heroes[host]||'';$('auto-name-guest').textContent=heroes[guest]||'';for(const [key,n]of [['host',host],['guest',guest]]){const img=$('auto-avatar-'+key+'-image'),fallback=$('auto-avatar-'+key);if(img.dataset.hero!==String(n)){img.dataset.hero=String(n);img.src=heroArt(n);img.alt=heroes[n]||'';img.hidden=false;fallback.hidden=true;img.onerror=()=>{img.hidden=true;fallback.hidden=false;if(rootGuardian())BioGuardianArt.preload([n]).then(()=>drawGuardian(fallback,n,performance.now())).catch(()=>{});};}}}
// An in-room carousel stays available to BOTH players until they prepare.
// It sends hero changes through the existing host-authoritative session.setHero.
function ensureConnectedPicker(){
 if($('auto-lobby-carousel'))return;
 const shell=document.createElement('section');shell.id='auto-lobby-carousel';shell.className='auto-connected-picker';
 const head=document.createElement('div');head.className='auto-connected-picker-heading';
 const name=document.createElement('strong');name.textContent=ja?'ガーディアンを選ぶ':'守護者選角';
 const progress=document.createElement('span');progress.id='auto-lobby-progress';progress.setAttribute('aria-live','polite');head.append(name,progress);
 const stage=document.createElement('div');stage.className='auto-connected-stage';
 const left=document.createElement('button');left.type='button';left.id='auto-lobby-prev';left.className='auto-hero-nav';left.textContent='‹';left.setAttribute('aria-label',ja?'前のガーディアン':'上一位守護者');
 const right=document.createElement('button');right.type='button';right.id='auto-lobby-next';right.className='auto-hero-nav';right.textContent='›';right.setAttribute('aria-label',ja?'次のガーディアン':'下一位守護者');
 const track=document.createElement('div');track.className='auto-connected-track';track.id='auto-lobby-track';track.tabIndex=0;track.setAttribute('role','group');track.setAttribute('aria-label',ja?'左右にスワイプして選ぶ':'左右滑動選擇守護者');
 for(let i=0;i<heroes.length;i++){const card=document.createElement('button');card.type='button';card.className='auto-connected-card';card.dataset.hero=String(i);card.setAttribute('aria-label',heroes[i]);const img=document.createElement('img');img.src=heroArt(i);img.alt='';img.loading='lazy';img.width=260;img.height=260;const label=document.createElement('span');label.textContent=heroes[i];card.append(img,label);card.onclick=()=>chooseLobbyHero(i);track.appendChild(card);}
 stage.append(left,track,right);
 const hint=document.createElement('p');hint.className='auto-connected-hint';hint.textContent=ja?'準備完了前に変更できます。変更は相手と同期されます。':'準備前可切換守護者，選角將與好友同步。';
 shell.append(head,stage,hint);$('lobby').insertBefore(shell,$('room-name'));
 left.onclick=()=>chooseLobbyHero(Number($('auto-lobby-hero').value)-1);
 right.onclick=()=>chooseLobbyHero(Number($('auto-lobby-hero').value)+1);
 track.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const index=Number($('auto-lobby-hero').value);chooseLobbyHero(e.key==='Home'?0:e.key==='End'?6:index+(e.key==='ArrowRight'?1:-1));}};
 let pointer=null,ignoreClick=false;
 track.addEventListener('pointerdown',e=>{if(e.isPrimary)pointer={x:e.clientX,y:e.clientY};});
 track.addEventListener('pointerup',e=>{if(!pointer)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;pointer=null;if(Math.abs(dx)>35&&Math.abs(dx)>Math.abs(dy)*1.15){ignoreClick=true;chooseLobbyHero(Number($('auto-lobby-hero').value)+(dx<0?1:-1));setTimeout(()=>ignoreClick=false,180);}});
 track.addEventListener('pointercancel',()=>pointer=null);
 track.addEventListener('click',e=>{if(ignoreClick){e.preventDefault();e.stopImmediatePropagation();}},true);
}
function updateLobbyCarousel(index,canChange){
 const track=$('auto-lobby-track');if(!track)return;
 const selected=Math.max(0,Math.min(heroes.length-1,index));
 // The hidden select is the authoritative value for arrow navigation.
 // Initialize it now, not only in the 500ms room refresh, otherwise the
 // first arrow click can move a guest from 0 instead of their chosen hero.
 const select=$('auto-lobby-hero');if(select)select.value=String(selected);
 for(const card of track.children){
  const i=Number(card.dataset.hero);
  card.dataset.position=i===selected?'center':i===selected-1?'previous':i===selected+1?'next':'hidden';
  card.setAttribute('aria-pressed',String(i===selected));
  card.setAttribute('aria-hidden',String(card.dataset.position==='hidden'));
  card.tabIndex=i===selected&&canChange?0:-1;
  card.disabled=!canChange;
 }
 $('auto-lobby-progress').textContent=heroes[selected]+' · '+(selected+1)+' / 7';
 $('auto-lobby-prev').disabled=!canChange||selected===0;
 $('auto-lobby-next').disabled=!canChange||selected===6;
 track.classList.toggle('is-locked',!canChange);
}
function chooseLobbyHero(i){
 const select=$('auto-lobby-hero');if(!select)return;
 const old=Number(select.value),index=Math.max(0,Math.min(heroes.length-1,i));
 if(select.disabled){updateLobbyCarousel(old,false);return;}
 if(!session.setHero(index)){select.value=String(session.hero);updateLobbyCarousel(session.hero,true);return;}
 select.value=String(index);updateLobbyCarousel(index,true);
}

function safeDiagnostic(){const d=session.link.diagnose?.();if(!d||d.ice==='none')return '';const count=c=>['host','srflx','relay'].map(k=>Number(c?.[k]||0)).join('/');return 'ICE: '+d.ice+' · '+(ja?'自分':'本機')+' '+count(d.candidates)+' · '+(ja?'相手':'對方')+' '+count(d.remoteCandidates); }
function close(){const signal=$('auto-signal-status');if(signal)signal.remove();$('auto-tech-details').hidden=true;$('auto-diagnostic-details').hidden=true;sequence++;busy=false;$('auto-start').disabled=false;connection?.close();connection=null;room=null;requestId=null;session.leave();document.body.classList.remove('auto-connected');$('auto-link').removeAttribute('href');$('auto-link').textContent='';const qr=$('auto-qr');qr.width=qr.height=1;qr.hidden=true;}
function form(kind){role=kind;screen('form');$('auto-code-label').hidden=kind!=='guest'||!!invite;$('auto-hero').value=kind==='guest'?'3':'0';selectGuardian();refreshHeroChoices();requestAnimationFrame(()=>centerGuardian(Number($('auto-hero').value),'instant'));status(invite&&kind==='guest'?L.joining:'');}
$('auto-create').onclick=()=>form('host');$('auto-join').onclick=()=>form('guest');$('auto-back').onclick=()=>{close();invite=null;screen('home');status('');};$('auto-stop').onclick=()=>{close();invite=null;screen('home');status('');};
$('leave').addEventListener('click',()=>{close();invite=null;screen('home');status('');});
$('auto-retry-cancel').onclick=()=>{close();invite=null;screen('home');status('');};
$('auto-retry-new').onclick=()=>{const previousRole=role,previousCode=$('auto-room-code').textContent.trim();close();invite=null;form(previousRole==='guest'?'guest':'host');if(previousRole==='guest')$('auto-code').value=previousCode;$('auto-start').disabled=false;};
$('auto-retry-start').onclick=async()=>{if(busy||!connection)return;busy=true;let exhausted=false;$('auto-retry-start').disabled=true;status(L.retryWait);try{session.prepareAuto(role,session.room||'',session.hero);await connection.retry();status('');document.body.classList.add('auto-connected');}catch(error){exhausted=error?.message==='retry-unavailable';status(L.retryFail);}finally{busy=false;$('auto-retry-start').disabled=exhausted;}};
$('auto-language').onchange=()=>{close();location.search='?lang='+$('auto-language').value;};
$('auto-yes').onclick=()=>{if(connection&&requestId)connection.approveJoin(requestId,true);requestId=null;$('auto-approval').hidden=true;};$('auto-no').onclick=()=>{if(connection&&requestId)connection.approveJoin(requestId,false);requestId=null;$('auto-approval').hidden=true;};
$('auto-start').onclick=async()=>{
 if(busy)return;if(!endpoint){status(L.unavailable);return;}busy=true;const attempt=++sequence;$('auto-start').disabled=true;status(L.joining);
 try{
  const hero=Number($('auto-hero').value),name='Bio-City';if(role==='host'){room=await BioFriendSignaling.createRoom(endpoint);if(attempt!==sequence){room=null;return;}}
  const code=role==='host'?room.room:invite?.room||$('auto-code').value.trim().toUpperCase(),token=role==='host'?room.host:invite?.token??null;
  session.prepareAuto(role,role==='host'?name:'',hero);connection=BioFriendSignaling.connect({endpoint,room:code,role,token,link:session.link,onJoinRequest:id=>{requestId=id;$('auto-approval').hidden=false;},onJoinCancelled:id=>{if(requestId===id){requestId=null;$('auto-approval').hidden=true;}},onSignalingLost:()=>{let el=$('auto-signal-status');if(!el){el=document.createElement('p');el.id='auto-signal-status';el.setAttribute('role','status');$('lobby').prepend(el);}el.textContent=L.signalLost;},onSignalingRestored:()=>{const el=$('auto-signal-status');if(el)el.textContent=L.signalRestored;},onSignalingUnavailable:()=>{const el=$('auto-signal-status');if(el)el.textContent=L.signalFail;},onProgress:stage=>{const labels=ja?{signaling:'フレンドを探しています',authenticated:'部屋に入りました','peer-joined':'フレンドが参加',offer:'接続しています',answer:'ゲームを同期しています',failed:'接続できませんでした'}:{signaling:'正在尋找好友',authenticated:'已進入房間','peer-joined':'好友已就位',offer:'正在建立雙人連線',answer:'正在同步遊戲',failed:'連線尚未完成'};if(labels[stage])status(L.joining+' · '+labels[stage]);}});
  screen('wait');$('auto-room-code').textContent=code;$('auto-share-actions').hidden=role!=='host';$('auto-link').hidden=role!=='host';
  if(role==='host'){const href=BioFriendInvite.create(location.href,room.room,room.guest,ja?'ja':'zh');$('auto-link').href=href;$('auto-link').textContent=href;const qr=qrcode(0,'M');qr.addData(href);qr.make();const canvas=$('auto-qr'),size=qr.getModuleCount(),scale=4,margin=4;canvas.width=canvas.height=(size+margin*2)*scale;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#000';for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(qr.isDark(y,x))ctx.fillRect((x+margin)*scale,(y+margin)*scale,scale,scale);canvas.hidden=false;status(L.waiting);}else status(token?L.joining:L.codePending);
  await connection.result;invite=null;room=null;$('auto-link').removeAttribute('href');$('auto-link').textContent='';$('auto-qr').width=$('auto-qr').height=1;$('auto-qr').hidden=true;status('');let players=$('auto-players');if(!players){players=document.createElement('p');players.id='auto-players';$('lobby').prepend(players);}let heroLabel=$('auto-lobby-hero-label');if(!heroLabel){heroLabel=document.createElement('label');heroLabel.id='auto-lobby-hero-label';heroLabel.textContent=L.hero;const select=document.createElement('select');select.id='auto-lobby-hero';heroes.forEach((name,i)=>{const o=document.createElement('option');o.value=i;o.textContent=name;select.appendChild(o);});select.onchange=()=>{const desired=Number(select.value);select.value=String(session.pendingHero??session.hero);chooseLobbyHero(desired);};heroLabel.appendChild(select);heroLabel.hidden=true;$('lobby').prepend(heroLabel);}const peer=session.peerHello;players.textContent=role==='host'?(ja?'ホスト: ':'房主：')+heroes[hero]+' · '+(ja?'ゲスト: ':'好友：')+heroes[peer?.hero??0]:(ja?'ホスト: ':'房主：')+heroes[peer?.hero??0]+' · '+(ja?'ゲスト: ':'好友：')+heroes[hero];
  ensurePlayerCards();ensureConnectedPicker();refreshPlayers();updateLobbyCarousel(session.pendingHero??session.hero,true);document.body.classList.add('auto-connected');
 }catch(error){if(attempt===sequence){const reason=error?.message;const detail=session.link.diagnose?.();
   // QR guest tokens are single-use after authentication, regardless of RTC success.
   // A failed guest must not silently retry the same invitation capability.
   const invitedGuest=role==='guest'&&!!invite;
   if(invitedGuest)$('auto-code').value=invite.room;
   close();if(invitedGuest){invite=null;$('auto-code-label').hidden=false;}screen('form');const stage=detail?.ice==='failed'?'ICE':detail?.gathering==='gathering'?'ICE gathering':detail&&['failed','disconnected','closed'].includes(detail.connection)?'RTC':null;
   // Safe failure fingerprint for real devices: states and candidate-type counts only.
   // Never display SDP, addresses, room tokens or the invitation fragment.
   const count=d=>['host','srflx','relay'].map(k=>Number(d?.[k]||0)).join('/');
   const iceNote=detail&&((detail.ice&&detail.ice!=='none')||Object.values(detail.candidates||{}).some(Boolean))?
    'ICE: '+detail.ice+'; '+(ja?'自分':'本機')+':'+count(detail.candidates)+'; '+(ja?'相手':'對方')+':'+count(detail.remoteCandidates):'';
   status((reason==='rate-limited'?L.rate:reason==='service-unavailable'?L.unavailable:reason==='join-denied'?L.denied:reason==='pairing-timeout'||reason==='rtc-timeout'?L.timeout:reason==='signaling-closed'||reason==='peer-left'||reason==='peer-missing'?L.expired:L.error)+(invitedGuest?' '+L.inviteUsed:''));$('auto-tech-note').textContent=iceNote;$('auto-tech-details').hidden=!iceNote;$('auto-tech-details').open=false;}}finally{if(attempt===sequence){busy=false;$('auto-start').disabled=false;}}
};
$('auto-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('auto-link').href);status(L.copied);}catch{status(L.copyFail);}};
$('auto-share').onclick=async()=>{try{if(navigator.share)await navigator.share({url:$('auto-link').href});else await navigator.clipboard.writeText($('auto-link').href);}catch{status(L.copyFail);}};
window.addEventListener('pagehide',()=>connection?.close());
setInterval(()=>{if(!document.body.classList.contains('auto-connected'))return;if(session.phase==='disconnected'){document.body.classList.remove('auto-connected');screen('retry');$('auto-retry-new').textContent=role==='guest'?L.rejoin:L.newRoom;const diagnostic=safeDiagnostic();$('auto-diagnostic').textContent=diagnostic;$('auto-diagnostic-details').hidden=!diagnostic;$('auto-diagnostic-details').open=false;status(L.retryTitle);return;}const peer=session.peerHello,select=$('auto-lobby-hero');if(select){select.disabled=session.phase!=='lobby'||!session.configAck||session.preparing||session.readyFlags.some(Boolean)||session.pendingHero!=null||!peer?.games.includes('feature:hero-v1');select.value=String(session.pendingHero??session.hero);updateLobbyCarousel(Number(select.value),!select.disabled);}if(peer&&$('auto-players')){$('auto-players').textContent=role==='host'?(ja?'ホスト: ':'房主：')+heroes[session.hero]+' · '+(ja?'ゲスト: ':'好友：')+heroes[peer.hero]:(ja?'ホスト: ':'房主：')+heroes[peer.hero]+' · '+(ja?'ゲスト: ':'好友：')+heroes[session.hero];refreshPlayers();}},500);
if(window.bioInviteError)status(L.invalid);else if(invite){form('guest');if(endpoint)queueMicrotask(()=>$('auto-start').click());}
})();
