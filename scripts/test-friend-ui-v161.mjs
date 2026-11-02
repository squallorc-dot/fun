// UI and QR tests only: the WebSocket is stubbed. RTC is tested separately without a stub.
// Never persist invitation or screenshots containing it.
import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {chromium} from 'playwright';import {signalingTestServer} from './lib/signaling-test-server.mjs';
const require=createRequire(import.meta.url),jsQR=require(process.env.JSQR_TEST_PATH||'jsqr');const origin='http://127.0.0.1:8790',endpoint=origin;
const server=await signalingTestServer();const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
try{
 for(const locale of ['zh','ja'])for(const viewport of [{width:390,height:844},{width:844,height:390},{width:1280,height:800}]){
  const page=await browser.newPage({viewport});await page.addInitScript(()=>{window.WebSocket=class{static OPEN=1;constructor(){this.readyState=1;setTimeout(()=>this.onopen?.(),0);}send(){}close(){this.readyState=3;this.onclose?.();}};});await page.route('**/*',async route=>{const url=route.request().url();if(url.startsWith(origin+'/arcade/friends/index.html')){const response=await route.fetch();const html=(await response.text()).replace('name="bio-signaling-endpoint" content=""','name="bio-signaling-endpoint" content="'+endpoint+'"');await route.fulfill({response,body:html});}else if(url.startsWith(origin+'/')||url.startsWith(endpoint+'/'))await route.continue();else await route.abort();});
  await page.goto(origin+'/arcade/friends/index.html?lang='+locale);assert(await page.locator('#auto-create').isVisible());
  if(locale==='zh'&&viewport.width===390){
   // Multiplayer touch buttons must follow the exact standalone game's guide.
   const parity=await page.evaluate(()=>{
    const s=window.BioFriendsApp.session,original=s.config,output={};
    try{
     for(const [game,mode] of [['g03','stairs'],['g04','pinball'],['g06','race'],['g05','volley'],['g05','pong']]){
      s.config={game,mode,chapter:1,difficulty:'normal'};s.changed();
      output[game+':'+mode]=[...document.querySelectorAll('#touch-controls [data-action]')]
       .filter(el=>!el.hidden).map(el=>[el.dataset.action,el.textContent.trim()]);
     }
    }finally{s.config=original;s.changed();}
    return output;
   });
   assert.deepEqual(parity['g03:stairs'],[['jump','跳躍'],['down','向下']],'G03 retains exactly one jump and one drop, as in single-player');
   assert.deepEqual(parity['g04:pinball'],[['fire','發射'],['skill','收球']],'G04 offers solo shot and recall, not duplicated controls');
   assert.deepEqual(parity['g06:race'],[['fire','氮氣'],['down','煞車']],'G06 retains solo boost and brake');
   assert.deepEqual(parity['g05:volley'],[['fire','擊球'],['jump','跳躍']],'G05 volley retains solo attack and jump');
   assert.deepEqual(parity['g05:pong'],[['fire','揮拍']],'G05 pong removes unnecessary jump');
  }assert(await page.locator('#auto-join').isVisible());assert(!(await page.locator('#connection').isVisible()));
  assert(await page.locator('.auto-poster img').isVisible(),'player-first Bio-City arcade art is visible');
  assert.equal(await page.locator('.auto-poster img').getAttribute('src'),'../assets/covers/bio-city-arcade-cover.webp','poster uses an allowlisted Worker asset');
  assert(await page.locator('.auto-kicker').isVisible(),'arcade heading visible');
  assert(await page.locator('.auto-back-button').isVisible(),'return to arcade is a player-facing button');
  assert(await page.locator('#help').count()===1,'in-game help button is available');
   assert(await page.locator('#help-close').count()===1,'inline instructions have their own close button');
   assert.equal(await page.locator('#help-panel').isVisible(),false,'help is hidden outside active gameplay');
  assert.equal(await page.locator('.auto-back-button').getAttribute('href'),'https://squallorc-dot.github.io/fun/arcade/'+locale+'/index.html','return points to current production Arcade in selected language');
  assert.equal(await page.locator('#single').getAttribute('href'),'https://squallorc-dot.github.io/fun/arcade/'+locale+'/index.html','secondary back link never points at outdated Worker hub');
  assert(await page.locator('.auto-back-button').evaluate(el=>getComputedStyle(el).borderRadius!=='0px'),'return button has a capsule boundary');
  assert(await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundImage.includes('gradient')),'arcade background uses visual gradients');
  assert.equal(await page.locator('#auto-tech-details').isVisible(),false,'ICE diagnostics stay hidden until failure');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'initial view fits screen');
  if(locale==='zh'&&viewport.width===390){
   await page.locator('#auto-create').click();
   assert(await page.locator('#auto-hero-portrait').isVisible(),'selected guardian official PNG is shown prominently');
    assert.match(await page.locator('#auto-hero-portrait').getAttribute('src'),/images\/funai-care-burner-sister\.png$/,'portrait loads the approved original character artwork');
    assert(await page.locator('#auto-hero-description').isVisible(),'character description appears in the large portrait card');
   assert.equal(await page.locator('.auto-hero-choice').count(),7,'seven character cards are available');
    assert.equal(await page.locator('.auto-hero-choice img').count(),7,'all guardians have original portrait art');
    const carousel=await page.evaluate(()=>{
      const strip=document.querySelector('.auto-hero-choices'),card=document.querySelector('.auto-hero-choice[data-position="center"]');
      const field=document.querySelector('.auto-hero-stage').getBoundingClientRect(),root=document.querySelector('#auto-entry').getBoundingClientRect();
      const box=strip.getBoundingClientRect(),center=card.getBoundingClientRect();
      const left=document.querySelector('#auto-hero-prev').getBoundingClientRect(),right=document.querySelector('#auto-hero-next').getBoundingClientRect();
      return {display:getComputedStyle(strip).display,stageWidth:box.width,arrowGap:right.left-left.right,scrollWidth:document.documentElement.scrollWidth,
        windowWidth:innerWidth,fieldRight:field.right,rootRight:root.right,
        cardX:(center.left+center.right)/2,stageX:(box.left+box.right)/2,visible:card.offsetWidth>0,
        nextVisible:!!document.querySelector('.auto-hero-choice[data-position="next"]')};
    });
    assert.equal(carousel.display,'block','fixed-stage phone carousel never expands to all seven card widths');
    assert(carousel.stageWidth>=240&&carousel.arrowGap>=16,'phone arrows have separate clickable areas without a room-name field');
    assert(carousel.visible&&Math.abs(carousel.cardX-carousel.stageX)<5,'selected portrait is centered on screen');
    assert(carousel.nextVisible,'next guardian is partially visible');
    assert(carousel.scrollWidth<=carousel.windowWidth+1&&carousel.fieldRight<=carousel.windowWidth+1&&carousel.rootRight<=carousel.windowWidth+1,
      'phone hero stage, portrait and form must not overflow horizontally');
    assert.equal(await page.locator('.auto-hero-choice').count(),7,'all seven guardians remain reachable');
   await page.locator('#auto-hero-next').click();
   assert.equal(await page.locator('#auto-hero').inputValue(),'1','next arrow selects second guardian');
   assert.equal((await page.locator('#auto-hero-progress').textContent()).trim(),'2 / 7','carousel displays selected index');
   await page.locator('#auto-hero-prev').click();
   assert.equal(await page.locator('#auto-hero').inputValue(),'0','previous arrow restores initial guardian');
   await page.locator('#auto-hero-next').click();
   await page.locator('#auto-hero-next').click();
   await page.locator('#auto-hero-next').click();
   assert.equal(await page.locator('#auto-hero').inputValue(),'3','switched to fourth guardian with visible arrow');
   await page.locator('.auto-hero-choice[data-hero="3"]').click();
   assert.equal(await page.locator('#auto-hero').inputValue(),'3','hero card updates native accessible selector');
    assert.match(await page.locator('#auto-hero-portrait').getAttribute('src'),/images\/funai-care-ye-bao-ex\.png$/,'large portrait follows chosen guardian');
   assert.equal(await page.locator('.auto-hero-choice[data-hero="3"]').getAttribute('aria-pressed'),'true','selected card is highlighted');
   assert.equal(await page.locator('#auto-hero').inputValue(),'3','carousel and dropdown stay in sync');
   await page.locator('#auto-hero-choices').focus();
   await page.keyboard.press('ArrowRight');
   assert.equal(await page.locator('#auto-hero').inputValue(),'4','keyboard arrows update central selection');
   await page.locator('#auto-hero').evaluate(el=>{el.value='3';el.dispatchEvent(new Event('change',{bubbles:true}));});
   assert.equal(await page.locator('#auto-hero').inputValue(),'3','accessible native dropdown remains a fallback');
   await page.locator('#auto-hero-choices').dispatchEvent('pointerdown',{pointerType:'touch',isPrimary:true,clientX:280,clientY:360});
   await page.locator('#auto-hero-choices').dispatchEvent('pointerup',{pointerType:'touch',isPrimary:true,clientX:180,clientY:362});
   assert.equal(await page.locator('#auto-hero').inputValue(),'4','touch swipe selects next guardian');
   await page.locator('#auto-hero-prev').click();
   assert.equal(await page.locator('#auto-hero').inputValue(),'3','arrow and swipe stay synchronized');
   assert(await page.locator('#auto-hero-name').isVisible(),'selected guardian name is visible');
   assert.equal(await page.locator('#auto-tech-details').isVisible(),false,'ICE counts are not main gameplay content');
   assert.equal(await page.locator('#auto-name').count(),0,'room naming is automatic, no input required');
   assert.equal(await page.locator('#auto-hero').isVisible(),false,'native hero value is hidden behind accessible portrait carousel');
   await page.locator('#auto-start').click();await page.waitForFunction(()=>!document.querySelector('#auto-qr').hidden||document.querySelector('#auto-status').textContent.includes('失敗'),null,{timeout:12000});assert.equal(await page.locator('#auto-qr').isVisible(),true,'QR available: '+await page.locator('#auto-status').textContent());
   const pixels=await page.locator('#auto-qr').evaluate(c=>({width:c.width,height:c.height,data:Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data)}));const decoded=jsQR(Uint8ClampedArray.from(pixels.data),pixels.width,pixels.height);const invite=await page.locator('#auto-link').getAttribute('href');assert(decoded&&decoded.data===invite,'local QR encodes exact invitation');assert(new URL(invite).hash.includes('token='));assert(!new URL(invite).search.includes('token='));
   assert(await page.locator('#auto-room-code').isVisible(),'clear room number for the host');
   assert(await page.locator('#auto-qr').isVisible(),'visible join QR for the friend');
   assert.equal(await page.locator('#auto-tech-details').isVisible(),false,'engineering details are collapsed');
   const diagnostic=await page.evaluate(()=>{
    const disclosure=document.querySelector('#auto-tech-details'),line=document.querySelector('#auto-tech-note');
    disclosure.hidden=false;line.textContent='ICE: checking · local 1/1/0';disclosure.open=false;
    const hidden=getComputedStyle(line).display==='none';
    disclosure.hidden=true;line.textContent='';return hidden;
   });
   assert(diagnostic,'technical candidate numbers are collapsed behind disclosure');
   const guest=await browser.newPage({viewport});await guest.goto(invite);assert.equal(await guest.evaluate(()=>location.hash),'');if(process.env.BIO_WORKER_ASSETS==='1'){assert(await guest.locator('#auto-wait').isVisible(),'configured candidate starts joining automatically');assert(await guest.locator('#auto-share-actions').isHidden(),'guest does not share host invitation');}else assert(await guest.locator('#auto-form').isVisible());assert(!(await guest.locator('#auto-code-label').isVisible()));assert(!(await guest.locator('#connection').isVisible()));await guest.close();
  }
  if(locale==='zh'&&viewport.width===390){
   // UI-only: the real two-board host/guest state is exercised by engine and RTC tests.
   const state=await page.evaluate(async()=>{
    const s=BioFriendsApp.session;s.adapter?.dispose?.();s.role='guest';s.epoch=1;
    s.config={game:'g03',mode:'stairs',heroes:[0,3],chapter:1,difficulty:'normal',room:'',epoch:1};
    s.adapter={game:{w:640,h:480,hud:()=>'<span>自己 122m · 對手 122m</span>',draw:()=>{}},
      drawOpponent:ctx=>{ctx.fillStyle='#245768';ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);return true;},dispose:()=>{}};
    s.phase='playing';s.result=null;document.body.classList.add('auto-connected');s.changed();
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const bounds=id=>{const b=document.getElementById(id).getBoundingClientRect();return {w:b.width,h:b.height,top:b.top,bottom:b.bottom,left:b.left,right:b.right};};
    return {main:bounds('game-canvas'),peer:bounds('opponent-preview'),peerCanvas:bounds('opponent-canvas'),
      dock:bounds('opponent-dock'),controls:bounds('touch-controls'),stage:bounds('viewport'),
      shown:!document.getElementById('opponent-preview').hidden,
      touchVisible:getComputedStyle(document.getElementById('touch-controls')).display!=='none',
      dockBeforeStage:document.getElementById('game-shell').firstElementChild.id==='opponent-dock',
      moveRemoved:!document.getElementById('opponent-move'),
      helpHidden:document.getElementById('help-panel').hidden,
      score:document.getElementById('score').textContent,overflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert(state.shown&&state.helpHidden,'G03 phone peer ribbon shown and play instructions initially collapsed');
   assert(state.dockBeforeStage&&state.moveRemoved,'peer ribbon precedes primary stage and no obsolete move control remains');
   assert(state.main.w>state.peerCanvas.w*2,'own game stays more than twice the live peer image width');
   assert(Math.abs(state.main.w/state.main.h-4/3)<.12,'own G03 board maintains its ratio');
   assert(state.dock.bottom<=state.stage.top+2,'peer ribbon is fully ABOVE the own playfield, never overlaying it');
   assert(!state.touchVisible||state.main.bottom<=state.controls.top+3,'own playfield does not overlap enabled touch controls: '+JSON.stringify({main:state.main,stage:state.stage,controls:state.controls,dock:state.dock}));
   assert(!state.touchVisible||state.controls.h>=145,'visible touch controls retain a usable height');
   assert(state.score.includes('自己')&&state.score.includes('對手'),'own and peer share compact HUD');
   assert(!state.overflow,'peer ribbon does not cause horizontal overflow');
   await page.locator('#opponent-hide').click();
   assert(await page.locator('#opponent-preview').isHidden(),'peer ribbon can be collapsed');
   assert(await page.locator('#opponent-show').isVisible(),'peer ribbon can be reopened');
   const collapsed=await page.evaluate(()=>({controls:document.getElementById('touch-controls').getBoundingClientRect().top,
     dock:document.getElementById('opponent-dock').getBoundingClientRect().height,
     saved:localStorage.getItem('bio-city-peer-preview-collapsed-v2')}));
   assert(Math.abs(collapsed.controls-state.controls.top)<2,'collapsing peer image never moves the touch buttons');
   assert(Math.abs(collapsed.dock-state.dock.h)<2,'collapsed peer ribbon reserves the same vertical space');
   assert.equal(collapsed.saved,'1','collapsed preference persists locally');
   await page.locator('#opponent-show').click();
   assert(await page.locator('#opponent-preview').isVisible(),'peer ribbon reopens without restarting the game');
   assert.equal(await page.evaluate(()=>localStorage.getItem('bio-city-peer-preview-collapsed-v2')),'0','expanded preference persists locally');
   assert.equal(await page.locator('#opponent-dock').evaluate(el=>{const gap=document.getElementById('viewport').getBoundingClientRect().top-el.getBoundingClientRect().bottom;return gap>=-1&&gap<=8;}),true,'reopened ribbon stays above game stage with small intentional gap');
   await page.evaluate(()=>{
     const s=BioFriendsApp.session;s.config={...s.config,game:'g04',mode:'pinball'};s.changed();
   });
   assert(await page.locator('#opponent-preview').isVisible(),'G04 also uses live peer preview');
   assert(await page.locator('#touch-controls [data-action="fire"]').evaluate(el=>!el.hidden&&el.textContent.trim()==='發射'),'G04 shot control matches single-player');
   assert(await page.locator('#touch-controls [data-action="skill"]').evaluate(el=>!el.hidden&&el.textContent.trim()==='收球'),'G04 recall control matches single-player');
   await page.evaluate(()=>{const s=BioFriendsApp.session;s.adapter?.dispose?.();s.adapter=null;s.phase='lobby';document.body.classList.remove('auto-connected');s.changed();});
  }
  if(locale==='zh'&&viewport.width===1280){
   await page.locator('#auto-create').click();
   const desktop=await page.evaluate(()=>{
    const root=document.querySelector('#auto-entry'),form=document.querySelector('#auto-form'),pane=document.querySelector('.auto-picker-pane'),preview=document.querySelector('.auto-hero-card');
    return {root:root.getBoundingClientRect().width,formDisplay:getComputedStyle(form).display,
      formColumns:getComputedStyle(form).gridTemplateColumns.split(' ').filter(Boolean).length,
      paneWidth:pane.getBoundingClientRect().width,previewWidth:preview.getBoundingClientRect().width,
      overflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert(desktop.root>=1080,'desktop lobby expands horizontally, not a narrow centered form');
   assert.equal(desktop.formDisplay,'grid','desktop form uses side-by-side chooser and preview');
   assert.equal(desktop.formColumns,2,'desktop lobby has two content columns');
   assert(desktop.paneWidth>330&&desktop.previewWidth>390,'both desktop columns use available space');
   assert.equal(desktop.overflow,false,'desktop layout does not create a scrollbar horizontally');
   await page.locator('#auto-hero-next').click();
   assert.equal(await page.locator('#auto-hero').inputValue(),'1','desktop arrow navigates carousel');
   await page.locator('#auto-back').click();
   // Real-device regression: victory and returning to lobby must not mute music.
   // Count media pauses directly, without autoplay or streaming any copyrighted track.
   const musicTransitions=await page.evaluate(()=>{
    const old=HTMLMediaElement.prototype.pause;let calls=0;
    HTMLMediaElement.prototype.pause=function(){calls++;};
    try{
     const s=BioFriendsApp.session;
     s.phase='playing';s.changed();calls=0;
     s.phase='finished';s.changed();const finishedCalls=calls;
     s.phase='lobby';s.changed();const lobbyCalls=calls;
     s.phase='paused';s.changed();const pausedCalls=calls;
     return {finishedCalls,lobbyCalls,pausedCalls};
    }finally{HTMLMediaElement.prototype.pause=old;}
   });
   assert.equal(musicTransitions.finishedCalls,0,'finishing a game leaves OST uninterrupted');
   assert.equal(musicTransitions.lobbyCalls,0,'returning to lobby leaves OST uninterrupted');
   assert(musicTransitions.pausedCalls>0,'actual pause still suspends OST');
   // Synthetic finished round tests display only; real RTC game tests remain separate.
   const view=await page.evaluate(()=>{
    const s=BioFriendsApp.session;
    s.role='host';s.hero=0;s.epoch=1;
    s.config={game:'g05',mode:'pong',heroes:[0,3],room:'',epoch:1};
    s.createRound();s.phase='finished';s.resultCount=1;s.result={winner:0,points:[7,3]};
    document.body.classList.add('auto-connected');s.changed();
    const message=document.querySelector('#round-message');
    return {lobby:getComputedStyle(document.querySelector('#lobby')).display,
      arena:document.querySelector('#arena').hidden,
      banner:message.hidden?null:message.textContent,
      bannerVisible:getComputedStyle(message).display!=='none',
      replay:document.querySelector('#rematch').textContent,
      pause:getComputedStyle(document.querySelector('#pause')).display,
      dock:getComputedStyle(document.querySelector('#touch-controls')).display,
      overflow:document.documentElement.scrollWidth>innerWidth,
      canvasHeight:document.querySelector('#game-canvas').getBoundingClientRect().height,
      viewportHeight:innerHeight};
   });
   assert.equal(view.lobby,'none','finished round collapses setup lobby');
   assert.equal(view.arena,false,'finished arena stays visible for result');
   assert.match(view.banner,/7 : 3/,'result shown alongside playfield');
   assert.equal(view.bannerVisible,true,'result is actually visible after round');
    assert(!/Host|Guest/.test(view.banner),'localized identities in victory banner');
   assert.match(view.replay,/再玩下一局/,'finished round offers a direct next match instead of returning to lobby');
   assert.equal(view.pause,'none','do not show disabled pause after a finished match');
   assert.equal(view.dock,'none','finished screen removes touch-control dock');
   assert.equal(view.overflow,false,'finished screen has no horizontal overflow');
   assert(view.canvasHeight<view.viewportHeight-100,'arena respects available viewport height');
  }

  if(locale==='zh'&&viewport.width!==390){
   // Exercise every game mode's finished UX with no fake network success.
   // The real physics, network, and results are tested in separate RTC jobs.
   for(const mode of [
    {game:'g01',id:'coop',w:640,h:480,result:{win:true,score:1200,kills:11}},
    {game:'g02',id:'defense',w:600,h:600,result:{win:true,score:2200,kills:19}},
    {game:'g05',id:'volley',w:640,h:480,result:{winner:1,points:[3,5]}},
    {game:'g06',id:'race',w:640,h:480,result:{standings:[
      {position:1,name:'Host',status:'finished',time:81},{position:2,name:'Guest',status:'finished',time:83}],
      players:[{id:'player',rank:1,bestLap:22,overtakes:2,collisions:0},{id:'guest',rank:2,bestLap:24,overtakes:1,collisions:1}]}}
   ]){
    const ui=await page.evaluate(mode=>{
     const s=BioFriendsApp.session;s.adapter?.dispose?.();
     s.role='host';s.hero=0;s.epoch=1;s.phase='finished';s.resultCount=1;s.result=mode.result;
     s.config={game:mode.game,mode:mode.id,heroes:[0,3],chapter:1,difficulty:'normal',room:'',epoch:1};
     s.adapter={game:{w:mode.w,h:mode.h,hud:()=>'',guestHud:()=>'',inspectCombat:()=>({score:300}),inspectMatch:()=>({points:[7,3]}),draw:()=>{},drawGuest:()=>{}},dispose:()=>{}};
     document.body.classList.add('auto-connected');s.changed();
     const banner=document.querySelector('#round-message'),details=document.querySelector('#round-details');
     const c=document.querySelector('#game-canvas').getBoundingClientRect();
     return {banner:banner.textContent,bannerVisible:getComputedStyle(banner).display!=='none',
       details:!details.hidden,detailsLabel:details.querySelector('summary').textContent,
       arena:document.querySelector('#arena').hidden,fieldHeight:c.height,
       controls:getComputedStyle(document.querySelector('#touch-controls')).display,
       lobby:getComputedStyle(document.querySelector('#lobby')).display,
       overflow:document.documentElement.scrollWidth>innerWidth};
    },mode);
    assert.equal(ui.arena,false,mode.game+' finished arena remains visible');
    assert.equal(ui.lobby,'none',mode.game+' active UI hides tall lobby');
    assert.equal(ui.controls,'none',mode.game+' finished touch dock hidden');
    assert.equal(ui.bannerVisible,true,mode.game+' result stays visible');
    assert(ui.banner.includes('比賽結束')&&ui.banner.length<160,mode.game+' concise result');
    assert(ui.fieldHeight<=viewport.height-90,mode.game+' field fits short viewport');
    assert.equal(ui.overflow,false,mode.game+' has no horizontal overflow');
    if(mode.game==='g06'){assert.equal(ui.details,true);assert.match(ui.banner,/房主 第1名/);assert.match(ui.banner,/好友 第2名/);}
    else assert.equal(ui.details,false,mode.game+' needs no verbose score panel');
   }
  }
  if(locale==='zh'&&(viewport.width===390||viewport.width===1280)){
   // UI-only live playing state: no mocked RTC connection or fake result.
   // Controls must match the single-player race: auto accelerate, brake, nitro.
   await page.evaluate(()=>{
    const s=BioFriendsApp.session;s.adapter?.dispose?.();s.role='host';s.epoch=1;
    s.config={game:'g06',mode:'race',heroes:[0,3],chapter:1,difficulty:'normal',room:'',epoch:1};
    s.adapter={game:{w:640,h:800,hud:()=>'',guestHud:()=>'',draw:()=>{},drawGuest:()=>{}},dispose:()=>{}};
    s.result=null;s.phase='playing';document.body.classList.add('auto-connected');s.changed();
   });
   await page.waitForFunction(()=>document.querySelector('#arena').getBoundingClientRect().height>=innerHeight*.93,null,{timeout:5000});
   const play=await page.evaluate(()=>{
    const rect=q=>{const v=document.querySelector(q).getBoundingClientRect();return {w:v.width,h:v.height,top:v.top,left:v.left}};
    const jump=document.querySelector('#touch-controls [data-action="jump"]'),fire=document.querySelector('#touch-controls [data-action="fire"]');
    return {arena:rect('#arena'),stage:rect('#viewport'),canvas:rect('#game-canvas'),gas:jump.hidden,
     nitro:!fire.hidden&&fire.textContent.includes('氮氣'),instructions:document.querySelector('#rules').textContent,
     overflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert(play.arena.h>=viewport.height*.93,'full-height arcade play surface');
   assert(play.stage.h>=viewport.height*(viewport.width===390?.40:.70),'playfield occupies available stage');
   assert(play.canvas.h>0&&play.canvas.w>0,'canvas stays visible');
   assert(play.gas&&play.nitro&&play.instructions.includes('自動加速'),'no gas key and nitro preserved');
   assert(await page.locator('#help-panel').isVisible(),'short in-game instructions are shown by default');
   assert.equal(await page.locator('#help').getAttribute('aria-expanded'),'true','guide button reflects open status');
   const guide=await page.locator('#help-panel').evaluate(el=>({position:getComputedStyle(el).position,rect:el.getBoundingClientRect().toJSON(),canvas:document.querySelector('#game-canvas').getBoundingClientRect().toJSON()}));
   assert.equal(guide.position,'relative','guide must be in normal flow, not covering game');
   assert(guide.rect.bottom<=guide.canvas.top+1,'guide sits above canvas without obstructing action');
   await page.locator('#help-close').click();
   assert.equal(await page.locator('#help-panel').isVisible(),false,'one tap on Close dismisses guide');
   await page.locator('#help').click();
   assert(await page.locator('#help-panel').isVisible(),'guide can be opened again');
   await page.locator('#help').click();
   assert.equal(await page.locator('#help-panel').isVisible(),false,'toolbar button can toggle off');
   assert(!play.overflow,'no horizontal overflow during play');
  }
  if(locale==='zh'&&viewport.width===1280){
    // UI-only in-room carousel; live RTC game completion runs separately.
    await page.goto(origin+'/arcade/friends/index.html?lang=zh');
    await page.evaluate(()=>{
      const s=BioFriendsApp.session;
      BioFriendSignaling.createRoom=async()=>({room:'ABCD2345',host:'a'.repeat(64),guest:'b'.repeat(64)});
      BioFriendSignaling.connect=()=>({result:Promise.resolve(),close(){},retry(){}});
      s.prepareAuto=(role,room,hero)=>{s.role=role;s.room=room;s.hero=hero;s.peerHello={hero:3,games:['feature:hero-v1']};s.phase='lobby';s.configAck=true;s.readyFlags=[false,false];};
      s.link.state='connected';s.link.send=()=>true;
      s.setHero=id=>{s.hero=id;s.changed();return true;};
    });
    await page.locator('#auto-create').click();
    assert.equal(await page.locator('#auto-name').count(),0,'host does not need to type a room name');
    await page.locator('#auto-start').click();
    await page.waitForSelector('#auto-lobby-carousel',{timeout:5000});
    assert.equal(await page.locator('.auto-connected-card').count(),7,'joined-room picker shows seven official cards');
    assert.equal(await page.locator('#auto-lobby-hero-label').isVisible(),false,'no duplicate visible hero dropdown after pairing');
    assert.equal(await page.locator('#challenge-link').count(),0,'no retired async friend challenge after pairing');
    assert.equal(await page.locator('.auto-connected-card[data-position="center"]').count(),1,'joined room has one centered portrait');
    await page.locator('#auto-lobby-next').click();
    assert.equal(await page.locator('#auto-lobby-hero').inputValue(),'1','in-room carousel synchronizes the hidden hero value through session.setHero');
    assert.equal(await page.locator('.auto-connected-card[data-hero="1"]').getAttribute('aria-pressed'),'true','joined room reflects selection');
   }
  await page.close();
 }
 // Short-height iPhone-style portrait: opponent is above the board, keys stay accessible.
 const shortPhone=await browser.newPage({viewport:{width:390,height:664},isMobile:true,hasTouch:true});
 try{
  await shortPhone.goto(origin+'/arcade/friends/index.html?lang=zh');
  const shortLayout=await shortPhone.evaluate(async()=>{
   const s=BioFriendsApp.session;s.role='host';s.epoch=1;
   s.config={game:'g03',mode:'stairs',heroes:[0,3],chapter:1,difficulty:'normal',room:'',epoch:1};
   s.adapter={game:{w:640,h:480,hud:()=>'<span>自己 12m · 對手 12m</span>',draw:()=>{}},
     drawOpponent:()=>true,dispose:()=>{}};
   s.phase='playing';document.body.classList.add('auto-connected');s.changed();
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   const r=id=>document.getElementById(id).getBoundingClientRect();
   const action=(key)=>document.querySelector('#touch-controls [data-action="'+key+'"]');
   const down=action('down'),jump=action('jump');
   const downBounds=down.getBoundingClientRect(),jumpBounds=jump.getBoundingClientRect();
   return {peerAbove:r('opponent-dock').bottom<=r('viewport').top+2,
     ownAboveControls:r('game-canvas').bottom<=r('touch-controls').top+3,
     touchVisible:getComputedStyle(document.getElementById('touch-controls')).display!=='none',
     keysVisible:r('touch-controls').top<innerHeight-80,
     peerShown:!document.getElementById('opponent-preview').hidden,
     down:{left:downBounds.left,right:downBounds.right,text:down.textContent.trim(),shown:!down.hidden},
     jump:{left:jumpBounds.left,right:jumpBounds.right,text:jump.textContent.trim(),shown:!jump.hidden},
     overflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert(shortLayout.peerShown&&shortLayout.peerAbove&&shortLayout.ownAboveControls,
    'short phone portrait has non-overlapping opponent / main stage / controls');
  assert(shortLayout.touchVisible&&shortLayout.keysVisible&&!shortLayout.overflow,
    'short phone portrait controls remain in view without sideways overflow');
  assert(shortLayout.down.shown&&shortLayout.jump.shown&&shortLayout.down.text==='向下'&&shortLayout.jump.text==='跳躍',
    'G03 both actions retain their solo key labels and remain enabled');
  assert(shortLayout.down.left+6<shortLayout.jump.left,
    'G03 mobile touch geometry matches standalone: DOWN on inner-left, JUMP on outer-right');
 }finally{await shortPhone.close();}
 // Batch 4: tall Samsung-style portrait reclaims blank space for G03's real
 // draw-only taller world, while the peer remains an independent, readable ribbon.
 const tallPhone=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 try{
  await tallPhone.goto(origin+'/arcade/friends/index.html?lang=zh');
  const tall=await tallPhone.evaluate(async()=>{
   const s=BioFriendsApp.session;s.role='host';s.epoch=1;
   s.config={game:'g03',mode:'stairs',heroes:[0,3],chapter:1,difficulty:'normal',room:'',epoch:1};
   s.adapter={game:{w:640,h:720,hud:()=>'<span>自己 90m · 對手 90m</span>',draw:()=>{}},
    visualHeight:()=>720,mobile:()=>true,drawOpponent:()=>true,dispose:()=>{}};
   s.phase='playing';document.body.classList.add('auto-connected');s.changed();
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   const bounds=id=>{const b=document.getElementById(id).getBoundingClientRect();return {top:b.top,bottom:b.bottom,width:b.width,height:b.height};};
   const own=bounds('game-canvas'),dock=bounds('opponent-dock'),peer=bounds('opponent-canvas');
   const controls=bounds('touch-controls'),viewport=bounds('viewport');
   const caption=document.getElementById('opponent-name').getBoundingClientRect(),button=document.getElementById('opponent-hide').getBoundingClientRect();
   return {own,dock,peer,controls,viewport,captionTop:caption.top,buttonTop:button.top,
    overflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert(tall.dock.bottom<=tall.viewport.top+2&&tall.own.bottom<=tall.controls.top+3,
   'tall phone: larger local stage stays below opponent ribbon and above action buttons');
  assert(tall.own.height>=350&&tall.own.width>=370,
   'tall G03 phone renders a genuinely taller near-full-width playfield, not an empty tall wrapper');
  assert(tall.peer.width>=98&&tall.dock.height<=105,
   'peer preview remains readable inside a compact single-row ribbon');
  assert(Math.abs(tall.captionTop-tall.buttonTop)<30,
   'peer label and collapse button share one horizontal row');
  assert(tall.controls.height<=200&&tall.controls.bottom<=844&&844-tall.controls.bottom<155,
   'tall phone: touch dock stays compact and no long blank area remains below it');
  assert(!tall.overflow,'tall phone avoids horizontal overflow');
 }finally{await tallPhone.close();}
 // Real touch-capable landscape viewport: orientation and screen-space regression.
 const sideways=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
 try{
  await sideways.goto(origin+'/arcade/friends/index.html?lang=zh');
  const layout=await sideways.evaluate(()=>{
   const s=BioFriendsApp.session;s.role='host';s.epoch=1;
   s.config={game:'g04',mode:'pinball',heroes:[0,3],chapter:1,difficulty:'normal',room:'',epoch:1};
   s.adapter={game:{w:640,h:480,hud:()=>'<span>自己 100 · 對手 90</span>',draw:()=>{}},
     drawOpponent:()=>true,dispose:()=>{}};
   s.phase='playing';document.body.classList.add('auto-connected');s.changed();
   const canvas=document.getElementById('game-canvas').getBoundingClientRect();
   return {phone:matchMedia('(pointer:coarse) and (max-height:700px)').matches,
     preview:!document.getElementById('opponent-preview').hidden,
     canvasWidth:canvas.width,canvasHeight:canvas.height,
     overflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert(layout.phone&&layout.preview,'touch landscape phone uses full own board plus PiP');
  assert(layout.canvasWidth>0&&layout.canvasHeight>0&&!layout.overflow,'touch landscape PiP does not overflow or hide primary canvas');
 }finally{await sideways.close();}
 console.log('PASS candidate UI: zh/ja, portrait/landscape/desktop, QR and all four game-mode results in compact layouts');
}finally{await browser.close();await new Promise(r=>server.close(r));}
