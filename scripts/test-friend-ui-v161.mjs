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
      overflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert.equal(view.lobby,'none','finished round collapses setup lobby');
   assert.equal(view.arena,false,'finished arena stays visible for result');
   assert.match(view.banner,/7 : 3/,'result shown alongside playfield');
   assert.equal(view.bannerVisible,true,'result is actually visible after round');
   assert.match(view.replay,/回大廳/,'replay clearly requires new readiness');
   assert.equal(view.pause,'none','do not show disabled pause after a finished match');
   assert.equal(view.dock,'none','finished screen removes touch-control dock');
   assert.equal(view.overflow,false,'finished screen has no horizontal overflow');
  }
  await page.close();
 }
 console.log('PASS candidate UI: zh/ja, portrait/landscape/desktop, QR plus compact finished round');
}finally{await browser.close();await new Promise(r=>server.close(r));}
