// UI and QR tests only: the WebSocket is stubbed. RTC is tested separately without a stub.
// Never persist invitation or screenshots containing it.
import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {chromium} from 'playwright';import {signalingTestServer} from './lib/signaling-test-server.mjs';
const require=createRequire(import.meta.url),jsQR=require(process.env.JSQR_TEST_PATH||'jsqr');const origin='http://127.0.0.1:8790',endpoint=origin;
const server=await signalingTestServer();const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
try{
 for(const locale of ['zh','ja'])for(const viewport of [{width:390,height:844},{width:844,height:390},{width:1280,height:800}]){
  const page=await browser.newPage({viewport});await page.addInitScript(()=>{window.WebSocket=class{static OPEN=1;constructor(){this.readyState=1;setTimeout(()=>this.onopen?.(),0);}send(){}close(){this.readyState=3;this.onclose?.();}};});await page.route('**/*',async route=>{const url=route.request().url();if(url.startsWith(origin+'/arcade/friends/index.html')){const response=await route.fetch();const html=(await response.text()).replace('name="bio-signaling-endpoint" content=""','name="bio-signaling-endpoint" content="'+endpoint+'"');await route.fulfill({response,body:html});}else if(url.startsWith(origin+'/')||url.startsWith(endpoint+'/'))await route.continue();else await route.abort();});
  await page.goto(origin+'/arcade/friends/index.html?lang='+locale);assert(await page.locator('#auto-create').isVisible());assert(await page.locator('#auto-join').isVisible());assert(!(await page.locator('#connection').isVisible()));
  assert(await page.locator('.auto-poster img').isVisible(),'player-first Bio-City arcade art is visible');
  assert.equal(await page.locator('.auto-poster img').getAttribute('src'),'../assets/covers/bio-city-arcade-cover.webp','poster uses an allowlisted Worker asset');
  assert(await page.locator('.auto-kicker').isVisible(),'arcade heading visible');
  assert(await page.locator('.auto-back-button').isVisible(),'return to arcade is a player-facing button');
  assert(await page.locator('#help').count()===1,'in-game help button is available');
   assert(await page.locator('#help-close').count()===1,'inline instructions have their own close button');
   assert.equal(await page.locator('#help-panel').isVisible(),false,'help is hidden outside active gameplay');
  assert.equal(await page.locator('.auto-back-button').getAttribute('href'),'../'+locale+'/index.html','return navigation stays in selected language');
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
    const carousel=await page.locator('.auto-hero-choices').evaluate(el=>({display:getComputedStyle(el).display,overflow:getComputedStyle(el).overflowX,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth}));
    assert.equal(carousel.display,'flex','guardian chooser uses a horizontal carousel');
    assert(carousel.scrollWidth>carousel.clientWidth,'phone carousel has room to swipe');
    assert.equal(await page.locator('.auto-hero-choice').count(),7,'all seven guardians remain reachable');
   await page.locator('#auto-hero-next').click();
   assert.equal(await page.locator('#auto-hero').inputValue(),'1','next arrow selects second guardian');
   assert.equal((await page.locator('#auto-hero-progress').textContent()).trim(),'2 / 7','carousel displays selected index');
   await page.locator('#auto-hero-prev').click();
   assert.equal(await page.locator('#auto-hero').inputValue(),'0','previous arrow restores initial guardian');
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
   assert(await page.locator('#auto-hero-name').isVisible(),'selected guardian name is visible');
   assert.equal(await page.locator('#auto-tech-details').isVisible(),false,'ICE counts are not main gameplay content');
   await page.locator('#auto-name').fill('測試');await page.locator('#auto-start').click();await page.waitForFunction(()=>!document.querySelector('#auto-qr').hidden||document.querySelector('#auto-status').textContent.includes('失敗'),null,{timeout:12000});assert.equal(await page.locator('#auto-qr').isVisible(),true,'QR available: '+await page.locator('#auto-status').textContent());
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
  await page.close();
 }
 console.log('PASS candidate UI: zh/ja, portrait/landscape/desktop, QR and all four game-mode results in compact layouts');
}finally{await browser.close();await new Promise(r=>server.close(r));}
