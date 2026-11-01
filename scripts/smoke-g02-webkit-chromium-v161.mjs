// Cross-engine G02 launch barrier: Chromium mobile + WebKit iPhone 13 emulation.
// Uses a real locally authenticated Worker and two independent browser engines.
// WebKit on Linux is NOT an iPhone/Safari hardware certification.
// Never log or retain room codes, tokens, SDP, ICE addresses or invite links.
import assert from 'node:assert/strict';
import {chromium,webkit,devices} from 'playwright';
import {start} from './lib/friends-browser.mjs';
import {signalingTestServer} from './lib/signaling-test-server.mjs';
const origin='http://127.0.0.1:8790';
const server=await signalingTestServer();
const browsers=[];let pages=[];
async function safe(page){
 try{return await page.evaluate(()=>{
  const app=window.BioFriendsApp;if(!app)return {loaded:false};
  const s=app.inspect().session;
  return {loaded:true,role:s.role,phase:s.phase,epoch:s.epoch,
   game:s.config?.game,chapter:s.config?.chapter,difficulty:s.config?.difficulty,
   heroes:s.config?.heroes,ready:s.ready,configAck:s.configAck,
   startPending:s.startPending,adapter:!!app.session.adapter,
   playing:document.body.classList.contains('playing'),transport:app.session.link.transport,
   link:app.session.link.state,appRejected:app.session.rejected};
 });}catch{return {unavailable:true};}
}
try{
 browsers.push(await chromium.launch({headless:true,args:['--no-sandbox']}));
 browsers.push(await webkit.launch({headless:true}));
 const contexts=[
  await browsers[0].newContext({viewport:{width:412,height:915},deviceScaleFactor:2,hasTouch:true,isMobile:true}),
  await browsers[1].newContext({...devices['iPhone 13'],locale:'zh-TW'})
 ];
 pages=await Promise.all(contexts.map(c=>c.newPage()));
 await Promise.all(pages.map(async(p,i)=>{
  await p.route('**/*',async route=>{
   const url=route.request().url();
   if(url.startsWith(origin+'/arcade/friends/index.html')){
    const response=await route.fetch();
    const html=(await response.text()).replace('name="bio-signaling-endpoint" content=""','name="bio-signaling-endpoint" content="'+origin+'"');
    await route.fulfill({response,body:html});
   }else if(url.startsWith(origin+'/'))await route.continue();
   else await route.abort();
  });
  await p.goto(origin+'/arcade/friends/index.html?lang=zh');
  await p.waitForFunction(()=>!!window.BioFriendsApp);
 }));
 const [host,guest]=pages;
 await host.locator('#auto-create').click();
 await host.locator('#auto-start').click();
 await host.waitForFunction(()=>document.querySelector('#auto-room-code')?.textContent.length===8);
 const code=await host.locator('#auto-room-code').textContent();
 await guest.locator('#auto-join').click();
 await guest.locator('#auto-code').fill(code);
 await guest.locator('#auto-start').click();
 await host.waitForFunction(()=>!document.querySelector('#auto-approval').hidden,{},{timeout:50000});
 await host.locator('#auto-yes').click();
 await Promise.all(pages.map(p=>p.waitForFunction(()=>{
  const s=BioFriendsApp.inspect().session;
  return document.body.classList.contains('auto-connected')&&s.phase==='lobby'&&s.configAck;
 },null,{timeout:60000})));
 await host.locator('#mode').selectOption('defense');
 await Promise.all(pages.map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.config?.game==='g02'&&BioFriendsApp.inspect().session.configAck,null,{timeout:25000})));
 await host.locator('#coop-chapter').selectOption('2');
 await Promise.all(pages.map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.config?.chapter===2&&BioFriendsApp.inspect().session.configAck,null,{timeout:25000})));
 // start() ensures the host does not expose gameplay until WebKit confirms
 // its actual G02 adapter, and both engines agree on epoch/hero/chapter.
 await start(host,guest,'defense');
 await Promise.all(pages.map(p=>p.waitForFunction(()=>{
  const v=BioFriendsApp.inspect();
  return v.session.phase==='playing'&&v.session.tick>240&&v.session.config?.game==='g02';
 },null,{timeout:60000})));
 const snapshots=await Promise.all(pages.map(safe));
 assert(snapshots.every(s=>s.playing&&s.adapter&&!s.startPending&&s.chapter===2),'both engines show real G02 game');
 assert.equal(snapshots[0].epoch,snapshots[1].epoch,'G02 epoch shared across browser engines');
 assert.deepEqual(snapshots[0].heroes,snapshots[1].heroes,'G02 guardians consistent');
 assert(Math.abs(snapshots[0].epoch-snapshots[1].epoch)===0,'game start never diverged');
 assert(snapshots.every(s=>s.phase==='playing'&&s.configAck),'both engines received same configuration');
 await host.locator('#return').click();
 await Promise.all(pages.map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='lobby'&&BioFriendsApp.inspect().session.configAck,null,{timeout:30000})));
 console.log('PASS WebKit iPhone 13 emulation + Chromium mobile: G02 both start, shared epoch, chapter 2, hero state and return');
}catch(error){
 console.error('SAFE G02 CROSS-ENGINE STATES '+JSON.stringify(await Promise.all(pages.map(safe))));
 throw error;
}finally{
 for(const b of browsers)await b.close();
 await new Promise(resolve=>server.close(resolve));
}
