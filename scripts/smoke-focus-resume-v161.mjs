// Genuine WebRTC in two tabs of one Chromium context: regression for the real P0 cloud incident.
// Never log room codes, invite URLs, SDP, ICE candidates or IP addresses.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {start} from './lib/friends-browser.mjs';
import {signalingTestServer} from './lib/signaling-test-server.mjs';
const origin='http://127.0.0.1:8790',server=await signalingTestServer();
const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
try{
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 const tabs=[await context.newPage(),await context.newPage()];
 for(const tab of tabs){
  await tab.route('**/*',async route=>{
   const url=route.request().url();
   if(url.startsWith(origin+'/arcade/friends/index.html')){
    const response=await route.fetch();
    const html=(await response.text()).replace('name="bio-signaling-endpoint" content=""','name="bio-signaling-endpoint" content="'+origin+'"');
    await route.fulfill({response,body:html});
   }else if(url.startsWith(origin+'/'))await route.continue();else await route.abort();
  });
  await tab.goto(origin+'/arcade/friends/index.html?lang=zh');
  await tab.waitForFunction(()=>!!window.BioFriendsApp);
 }
 const [host,guest]=tabs;
 await host.locator('#auto-create').click();await host.locator('#auto-name').fill('Focus');
 await host.locator('#auto-start').click();
 await host.waitForFunction(()=>document.querySelector('#auto-room-code').textContent.length===8);
 const code=await host.locator('#auto-room-code').textContent();
 await guest.locator('#auto-join').click();await guest.locator('#auto-code').fill(code);await guest.locator('#auto-start').click();
 await host.waitForFunction(()=>!document.querySelector('#auto-approval').hidden);await host.locator('#auto-yes').click();
 await Promise.all(tabs.map(p=>p.waitForFunction(()=>document.body.classList.contains('auto-connected')&&BioFriendsApp.inspect().session.configAck,null,{timeout:50000})));
 await start(host,guest,'race');
 await Promise.all(tabs.map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='playing',null,{timeout:30000})));
 for(let i=0;i<6;i++){
  await tabs[i%2].bringToFront();
  await new Promise(r=>setTimeout(r,70));
 }
 assert((await Promise.all(tabs.map(p=>p.evaluate(()=>BioFriendsApp.inspect().session.phase)))).every(x=>x==='playing'),'tab focus transitions must not auto-pause match');
 await host.bringToFront();await host.locator('#pause').click();
 await Promise.all(tabs.map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='paused')));
 await host.locator('#pause').click(); // Host votes first.
 const first=await host.evaluate(()=>BioFriendsApp.inspect().session.resume);
 assert.deepEqual(first,[true,false],'host vote is retained');
 await guest.bringToFront();
 await guest.locator('#pause').click();
 await Promise.all(tabs.map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='playing',null,{timeout:30000})));
 const tick=await host.evaluate(()=>BioFriendsApp.inspect().session.tick);
 await host.bringToFront();
 await host.waitForFunction(before=>BioFriendsApp.inspect().session.tick>before+30,tick,{timeout:12000});
 await host.evaluate(()=>document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'w',bubbles:true})));
 await host.waitForFunction(()=>BioFriendsApp.inspect().match?.progress>2,null,{timeout:15000});
 await host.evaluate(()=>document.body.dispatchEvent(new KeyboardEvent('keyup',{key:'w',bubbles:true})));
 assert((await Promise.all(tabs.map(p=>p.evaluate(()=>BioFriendsApp.inspect().session.phase)))).every(x=>x==='playing'),'G06 race continues after resume and acceleration');
 console.log('PASS genuine RTC, same Chromium two tabs: focus x6, both vote to resume, G06 race timer + movement');
}finally{await browser.close();await new Promise(r=>server.close(r));}
