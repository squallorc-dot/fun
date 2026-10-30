// One local signaling room, two independent Chromium processes and the real v1.6 lobby/session.
// Never logs, stores, or attaches SDP, ICE or room credentials.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {start,complete} from './lib/friends-browser.mjs';
import {signalingTestServer} from './lib/signaling-test-server.mjs';
const origin='http://127.0.0.1:8790',endpoint=origin;
const server=await signalingTestServer();const browsers=[];
try{
 for(let i=0;i<2;i++)browsers.push(await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})}));
 const pages=await Promise.all(browsers.map(b=>b.newPage()));await Promise.all(pages.map(p=>p.addInitScript(()=>{const Original=window.WebSocket;window.__testSockets=[];window.WebSocket=class extends Original{constructor(...args){super(...args);window.__testSockets.push(this);}};})));
 await Promise.all(pages.map(async(p,i)=>{await p.route('**/*',async route=>{const url=route.request().url();if(url.startsWith(origin+'/arcade/friends/index.html')){const response=await route.fetch();const html=(await response.text()).replace('name="bio-signaling-endpoint" content=""','name="bio-signaling-endpoint" content="'+endpoint+'"');await route.fulfill({response,body:html});}else if(url.startsWith(origin+'/')||url.startsWith(endpoint+'/'))await route.continue();else await route.abort();});await p.goto(origin+'/arcade/friends/index.html?lang='+(i?'ja':'zh'));await p.waitForFunction(()=>!!window.BioFriendsApp);}));
 await pages[0].locator('#auto-create').click();await pages[0].locator('#auto-name').fill('V161');await pages[0].locator('#auto-start').click();await pages[0].waitForFunction(()=>document.querySelector('#auto-room-code').textContent.length===8);
 const code=await pages[0].locator('#auto-room-code').textContent();await pages[1].locator('#auto-join').click();await pages[1].locator('#auto-code').fill(code);await pages[1].locator('#auto-start').click();
 await pages[0].waitForFunction(()=>!document.querySelector('#auto-approval').hidden);await pages[0].locator('#auto-yes').click();
 await Promise.all(pages.map(p=>p.waitForFunction(()=>document.body.classList.contains('auto-connected'),null,{timeout:50000})));
 await Promise.all(pages.map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='lobby'&&BioFriendsApp.inspect().session.configAck)));
 await pages[0].locator('#auto-lobby-hero').selectOption('2');await Promise.all(pages.map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.config?.heroes[0]===2&&BioFriendsApp.inspect().session.configAck)));
 await pages[1].locator('#auto-lobby-hero').selectOption('5');await Promise.all(pages.map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.config?.heroes[1]===5&&BioFriendsApp.inspect().session.configAck)));
 await start(pages[0],pages[1],'pong');const matchPromise=complete(pages[0],pages[1],'pong');await pages[0].waitForFunction(()=>BioFriendsApp.inspect().session.phase==='playing');await pages[0].evaluate(()=>window.__testSockets.find(s=>s.readyState===WebSocket.OPEN)?.close());await Promise.all(pages.map(p=>p.waitForFunction(()=>!!document.querySelector('#auto-signal-status')?.textContent&&BioFriendsApp.session.link.state==='connected')));const match=await matchPromise;assert(match.peers.every(x=>x.driver.contacts>0),'both players actually return the ball: '+JSON.stringify(match.peers.map(x=>x.driver)));
 console.log('PASS genuine RTC game survives signaling WebSocket closure: two players move, return balls and agree on result');
 await Promise.all(pages.map(p=>p.evaluate(()=>window.originalPeer=BioFriendsApp.session.link.pc)));
 await pages[0].locator('#return').click();await Promise.all(pages.map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='lobby'&&BioFriendsApp.inspect().session.configAck)));
 for(const mode of ['volley','coop','defense','race']){
  await start(pages[0],pages[1],mode);await Promise.all(pages.map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='playing',null,{timeout:60000})));
  await Promise.all(pages.map((p,i)=>p.evaluate(i=>{for(const key of ['j',i?'d':'a',...(BioFriendsApp.inspect().session.config.game==='g06'?['w']:[])])document.body.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true}));},i)));
  await pages[0].waitForFunction(()=>BioFriendsApp.inspect().session.tick>480,null,{timeout:20000});
  const views=await Promise.all(pages.map(p=>p.evaluate(()=>({same:originalPeer===BioFriendsApp.session.link.pc,view:BioFriendsApp.inspect().session}))));
  assert(views.every(v=>v.same&&v.view.phase==='playing'&&v.view.config.mode===mode),mode+' remains on original connection');
  await Promise.all(pages.map(p=>p.evaluate(()=>{for(const key of ['j','a','d','w'])document.body.dispatchEvent(new KeyboardEvent('keyup',{key,bubbles:true}));})));
  await pages[0].locator('#return').click();await Promise.all(pages.map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='lobby'&&BioFriendsApp.inspect().session.configAck)));
 }
 console.log('PASS automatic pairing same RTC: G05 pong and volley, G01, G02, G06 switch and return; other rounds short');
 const before=await pages[0].evaluate(()=>BioFriendsApp.inspect().session.room);await pages[1].evaluate(()=>BioFriendsApp.session.link.pc.close());await Promise.all(pages.map(p=>p.waitForFunction(()=>!document.querySelector('#auto-retry').hidden,null,{timeout:30000})));await Promise.all(pages.map(p=>p.locator('#auto-retry-start').click()));await Promise.all(pages.map(p=>p.waitForFunction(()=>document.body.classList.contains('auto-connected')&&BioFriendsApp.inspect().session.configAck,null,{timeout:50000})));const recovered=await Promise.all(pages.map(p=>p.evaluate(()=>BioFriendsApp.inspect().session)));assert(recovered.every(s=>s.room===before&&s.phase==='lobby'&&s.result===null&&s.resultCount===0),'same room, new lobby, no old result');await start(pages[0],pages[1],'volley');await Promise.all(pages.map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='playing')));await pages[0].locator('#return').click();await Promise.all(pages.map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='lobby'&&BioFriendsApp.inspect().session.configAck)));console.log('PASS real RTC disconnect and two-party same-room retry: prior result cleared; new round starts');
 await pages[0].locator('#leave').click();await pages[1].waitForFunction(()=>BioFriendsApp.inspect().session.phase==='disconnected');
 await pages[0].waitForFunction(()=>!document.querySelector('#auto-home').hidden);await pages[0].locator('#auto-create').click();await pages[0].locator('#auto-name').fill('Invite');await pages[0].locator('#auto-start').click();await pages[0].waitForFunction(()=>document.querySelector('#auto-link').hasAttribute('href'));
 const invite=await pages[0].locator('#auto-link').getAttribute('href');await pages[1].goto(invite);await Promise.all(pages.map(p=>p.waitForFunction(()=>document.body.classList.contains('auto-connected'),null,{timeout:50000})));assert.equal(await pages[1].evaluate(()=>location.hash),'','invitation capability removed from address');
 try{await Promise.all(pages.map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='lobby'&&BioFriendsApp.inspect().session.configAck)));}catch(error){const state=await Promise.all(pages.map(p=>p.evaluate(()=>{const s=BioFriendsApp.session;return {phase:s.phase,role:s.role,epoch:s.epoch,ack:s.configAck,game:s.config?.game,mode:s.config?.mode,peer:!!s.peerHello,link:s.link.state,rejected:s.rejected};})));console.error('SAFE REPAIR DIAGNOSTIC '+JSON.stringify(state));throw error;}console.log('PASS one-click invite: true RTC from URL fragment and shared lobby');
 await pages[0].locator('#leave').click();
}finally{for(const b of browsers)await b.close();await new Promise(r=>server.close(r));}
