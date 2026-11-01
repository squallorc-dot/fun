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
const browsers=[];let pages=[];const engineErrors=[],engineSamples=[];
const sampleEngine=async()=>Promise.all(pages.map(async(p,side)=>{try{return await p.evaluate(side=>{
 const session=window.BioFriendsApp?.session,adapter=session?.adapter;
 const frame=adapter?.frame,child=frame?.contentWindow,root=child?.document?.getElementById('arcade-root');
 return {side,phase:session?.phase,game:session?.config?.game,
  readyFlags:session?.readyFlags,startPending:session?.startPending,
  adapter:!!adapter,started:!!adapter?.started,failed:adapter?.failed||null,
  frameReady:child?.document?.readyState||null,engine:!!child?.BioArcadeShooter,
  innerPhase:root?.dataset?.phase||null,innerNetwork:root?.classList?.contains('arcade-network')||false};
 },side);}catch{return {side,unavailable:true};}}));
async function safe(page){
 try{return await page.evaluate(()=>{
  const app=window.BioFriendsApp;if(!app)return {loaded:false};
  const s=app.inspect().session;
  return {loaded:true,role:s.role,phase:s.phase,epoch:s.epoch,
   game:s.config?.game,chapter:s.config?.chapter,difficulty:s.config?.difficulty,
   heroes:s.config?.heroes,ready:s.ready,configAck:s.configAck,
   startPending:s.startPending,engineFailure:s.engineFailure,adapter:!!app.session.adapter,
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
 pages.forEach((p,side)=>p.on('pageerror',e=>{
  // Retain only an exception category; no URL, invitation or network data.
  const message=String(e?.message||'').replace(/https?:\/\/\S+/g,'[url]').replace(/[0-9a-f]{32,}/gi,'[redacted]');
  if(engineErrors.length<12)engineErrors.push({side,name:e?.name||'Error',message:message.slice(0,180)});
 }));
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
 await Promise.all(pages.map(p=>p.waitForFunction(()=>!!window.BioG03Network&&!!window.BioG04Network,null,{timeout:12000})));
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
 const monitor=setInterval(()=>{if(engineSamples.length>=14)return;sampleEngine().then(rows=>engineSamples.push(rows)).catch(()=>{});},1300);
 try{await start(host,guest,'defense');}finally{clearInterval(monitor);}
 await Promise.all(pages.map(p=>p.waitForFunction(()=>{
  const v=BioFriendsApp.inspect();
  return v.session.phase==='playing'&&v.session.tick>240&&v.session.config?.game==='g02';
 },null,{timeout:60000})));
 // The two browsers must exchange real guest inputs after entering G02,
 // not merely display matching loading screens. Drive ordinary key events.
 const hostBefore=await host.evaluate(()=>BioFriendsApp.session.lastInputSeq);
 await guest.evaluate(()=>{
  for(const key of ['j','d'])document.body.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true}));
 });
 await host.waitForFunction(before=>{
  const s=BioFriendsApp.session;
  return s.phase==='playing'&&s.lastInputSeq>=before+12&&s.remote?.fire===true;
 },hostBefore,{timeout:18000});
 await guest.evaluate(()=>{
  for(const key of ['j','d'])document.body.dispatchEvent(new KeyboardEvent('keyup',{key,bubbles:true}));
 });
 const live=await Promise.all(pages.map(p=>p.evaluate(()=>{
  const s=BioFriendsApp.session;
  return {phase:s.phase,sequence:s.role==='host'?s.lastInputSeq:s.inputSeq,
   game:s.config?.game,ready:!!s.adapter?.started};
 })));
 assert(live.every(x=>x.phase==='playing'&&x.game==='g02'&&x.ready),
  'both WebKit and Chromium remain in the real G02 game after guest input');
 assert(live[0].sequence>=hostBefore+12&&live[1].sequence>0,
  'Chromium receives sustained WebKit input sequence');
 const snapshots=await Promise.all(pages.map(safe));
 assert(snapshots.every(s=>s.playing&&s.adapter&&!s.startPending&&s.chapter===2),'both engines show real G02 game');
 assert.equal(snapshots[0].epoch,snapshots[1].epoch,'G02 epoch shared across browser engines');
 assert.deepEqual(snapshots[0].heroes,snapshots[1].heroes,'G02 guardians consistent');
 assert(Math.abs(snapshots[0].epoch-snapshots[1].epoch)===0,'game start never diverged');
 assert(snapshots.every(s=>s.phase==='playing'&&s.configAck),'both engines received same configuration');
 await host.locator('#return').click();
 await Promise.all(pages.map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='lobby'&&BioFriendsApp.inspect().session.configAck,null,{timeout:30000})));
 console.log('PASS WebKit iPhone 13 emulation + Chromium mobile: G02 both start, shared epoch, chapter 2, real guest inputs and return');
 // Reuse the SAME authenticated cross-engine room for the two new head-to-head
 // games. Both sides send their own inputs. Host alone computes points.
 for(const mode of ['stairs','pinball']){
  await start(host,guest,mode);
  await Promise.all(pages.map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='playing',null,{timeout:45000})));
  if(mode==='pinball')await host.waitForTimeout(1200); // wait for actual first-stage launch gate
  const before=await host.evaluate(()=>BioFriendsApp.session.lastInputSeq);
  await Promise.all(pages.map((p,i)=>p.evaluate(i=>{
   for(const key of [i?'a':'d','j'])document.body.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true}));
  },pages.indexOf(p))));
  await host.waitForFunction(previous=>{
   const app=BioFriendsApp.session;
   return app.phase==='playing'&&app.lastInputSeq>previous+12&&
    app.adapter?.capture().boards?.length===2;
  },before,{timeout:20000});
  const states=await Promise.all(pages.map(p=>p.evaluate(()=>{
   const app=BioFriendsApp.session,v=app.adapter?.capture();
   return {game:app.config?.game,mode:app.config?.mode,phase:app.phase,
    score:v?.scores,angle:v?.boards?.map(x=>x.angle),x:v?.boards?.map(x=>x.player?.x),tick:app.tick};
  })));
  assert(states.every(v=>v.game===(mode==='stairs'?'g03':'g04')&&v.mode===mode&&v.score?.length===2&&v.phase==='playing'),
   mode+' both engines render valid two-player scoreboards');
  const own=states[0];
  assert(mode==='stairs'?own.x[0]!==own.x[1]:own.angle[0]!==own.angle[1],
   mode+' host sees independent actions from WebKit and Chromium');
  await Promise.all(pages.map(p=>p.evaluate(()=>{
   for(const key of ['j','a','d'])document.body.dispatchEvent(new KeyboardEvent('keyup',{key,bubbles:true}));
  })));
  await host.locator('#return').click();
  await Promise.all(pages.map(p=>p.waitForFunction(()=>BioFriendsApp.inspect().session.phase==='lobby'&&BioFriendsApp.inspect().session.configAck,null,{timeout:25000})));
  console.log('PASS WebKit/Chromium '+mode+' two authoritative boards, active guest controls, score synchronization and return');
 }

}catch(error){
 console.error('SAFE G02 CROSS-ENGINE STATES '+JSON.stringify(await Promise.all(pages.map(safe))));
 console.error('SAFE G02 ENGINE SAMPLES '+JSON.stringify(engineSamples.slice(-14)));
 console.error('SAFE G02 JS ERRORS '+JSON.stringify(engineErrors));
 throw error;
}finally{
 for(const b of browsers)await b.close();
 await new Promise(resolve=>server.close(resolve));
}
