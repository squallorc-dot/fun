// UI and QR tests only: the WebSocket is stubbed. RTC is tested separately without a stub.
// Never persist invitation or screenshots containing it.
import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {chromium} from 'playwright';import {signalingTestServer} from './lib/signaling-test-server.mjs';
const require=createRequire(import.meta.url),jsQR=require(process.env.JSQR_TEST_PATH||'jsqr');const origin='http://127.0.0.1:8790',endpoint=origin;
const server=await signalingTestServer();const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
try{
 for(const locale of ['zh','ja'])for(const viewport of [{width:390,height:844},{width:844,height:390},{width:1280,height:800}]){
  const page=await browser.newPage({viewport});await page.addInitScript(()=>{window.WebSocket=class{static OPEN=1;constructor(){this.readyState=1;setTimeout(()=>this.onopen?.(),0);}send(){}close(){this.readyState=3;this.onclose?.();}};});await page.route('**/*',async route=>{const url=route.request().url();if(url.startsWith(origin+'/arcade/friends/index.html')){const response=await route.fetch();const html=(await response.text()).replace('name="bio-signaling-endpoint" content=""','name="bio-signaling-endpoint" content="'+endpoint+'"');await route.fulfill({response,body:html});}else if(url.startsWith(origin+'/')||url.startsWith(endpoint+'/'))await route.continue();else await route.abort();});
  await page.goto(origin+'/arcade/friends/index.html?lang='+locale);assert(await page.locator('#auto-create').isVisible());assert(await page.locator('#auto-join').isVisible());assert(!(await page.locator('#connection').isVisible()));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'initial view fits screen');
  if(locale==='zh'&&viewport.width===390){
   await page.locator('#auto-create').click();await page.locator('#auto-name').fill('測試');await page.locator('#auto-start').click();await page.waitForFunction(()=>!document.querySelector('#auto-qr').hidden||document.querySelector('#auto-status').textContent.includes('失敗'),null,{timeout:12000});assert.equal(await page.locator('#auto-qr').isVisible(),true,'QR available: '+await page.locator('#auto-status').textContent());
   const pixels=await page.locator('#auto-qr').evaluate(c=>({width:c.width,height:c.height,data:Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data)}));const decoded=jsQR(Uint8ClampedArray.from(pixels.data),pixels.width,pixels.height);const invite=await page.locator('#auto-link').getAttribute('href');assert(decoded&&decoded.data===invite,'local QR encodes exact invitation');assert(new URL(invite).hash.includes('token='));assert(!new URL(invite).search.includes('token='));
   const guest=await browser.newPage({viewport});await guest.goto(invite);assert.equal(await guest.evaluate(()=>location.hash),'');if(process.env.BIO_WORKER_ASSETS==='1'){assert(await guest.locator('#auto-wait').isVisible(),'configured candidate starts joining automatically');assert(await guest.locator('#auto-share-actions').isHidden(),'guest does not share host invitation');}else assert(await guest.locator('#auto-form').isVisible());assert(!(await guest.locator('#auto-code-label').isVisible()));assert(!(await guest.locator('#connection').isVisible()));await guest.close();
  }
  if(locale==='zh'&&viewport.width===1280){
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
   assert.match(view.replay,/回大廳/,'replay clearly requires new readiness');
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
    if(mode.game==='g06'){assert.equal(ui.details,true);assert.match(ui.banner,/Host #1/);assert.match(ui.banner,/Guest #2/);}
    else assert.equal(ui.details,false,mode.game+' needs no verbose score panel');
   }
  }
  await page.close();
 }
 console.log('PASS candidate UI: zh/ja, portrait/landscape/desktop, QR and all four game-mode results in compact layouts');
}finally{await browser.close();await new Promise(r=>server.close(r));}
